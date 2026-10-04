"""Exercise incident writes using HA's Store helper and a temporary directory."""

import asyncio
from types import SimpleNamespace

import pytest


@pytest.fixture
def ha():
    pytest.importorskip("homeassistant")
    from homeassistant.core import CoreState, HomeAssistant
    from homeassistant.exceptions import HomeAssistantError
    from homeassistant.helpers import storage

    from custom_components.ha_forensic_lab.incident_store import IncidentStore
    from custom_components.ha_forensic_lab.incidents import create_incident
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )

    event = ForensicEvent(
        event_id="target",
        kind=ForensicEventKind.STATE_CHANGED,
        timestamp=1.0,
        context_id="context",
        parent_context_id=None,
        user_id=None,
    )
    first = create_incident((event,), "target", incident_id="first", created_at=1)
    second = create_incident((event,), "target", incident_id="second", created_at=2)
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        CoreState=CoreState,
        Error=HomeAssistantError,
        storage=storage,
        Store=IncidentStore,
        first=first,
        second=second,
    )


@pytest.mark.parametrize("operation", ["add", "delete"])
def test_disk_failure_does_not_change_visible_incidents(
    ha, tmp_path, monkeypatch, operation
):
    def disk_full(*args, **kwargs):
        raise ha.storage.WriteError("disk full")

    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        await store.async_load()
        await store.async_add(ha.first)

        with monkeypatch.context() as patch:
            # HA catches WriteError and returns normally from Store.async_save.
            patch.setattr(ha.storage, "write_utf8_file_atomic", disk_full)
            with pytest.raises(ha.Error, match="not saved"):
                if operation == "add":
                    await store.async_add(ha.second)
                else:
                    await store.async_delete(ha.first.incident_id)

        assert store.incidents == (ha.first,)
        restored = ha.Store(hass)
        await restored.async_load()
        assert restored.incidents == (ha.first,)

        # A failed operation releases the lock and can be retried.
        if operation == "add":
            await store.async_add(ha.second)
            expected = (ha.second, ha.first)
        else:
            await store.async_delete(ha.first.incident_id)
            expected = ()
        await restored.async_load()
        assert store.incidents == restored.incidents == expected

    asyncio.run(run())


def test_concurrent_adds_wait_for_commit_and_survive_reload(
    ha, tmp_path, monkeypatch
):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        entered = asyncio.Event()
        release = asyncio.Event()
        second_started = asyncio.Event()
        save = store._store.async_save
        writes = 0

        async def paused_save(data):
            nonlocal writes
            writes += 1
            entered.set()
            await release.wait()
            await save(data)

        async def add_second():
            second_started.set()
            await store.async_add(ha.second)

        monkeypatch.setattr(store._store, "async_save", paused_save)
        async with asyncio.timeout(5):
            async with asyncio.TaskGroup() as tasks:
                tasks.create_task(store.async_add(ha.first))
                await entered.wait()
                tasks.create_task(add_second())
                await second_started.wait()
                assert writes == 1
                assert store.incidents == ()
                release.set()

        assert writes == 2
        restored = ha.Store(hass)
        await restored.async_load()
        assert store.incidents == restored.incidents == (ha.second, ha.first)

    asyncio.run(run())


def test_shutdown_does_not_acknowledge_a_deferred_incident_write(ha, tmp_path):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        hass.set_state(ha.CoreState.stopping)
        with pytest.raises(ha.Error, match="Home Assistant stops"):
            await store.async_add(ha.first)
        assert store.incidents == ()

    asyncio.run(run())
