"""Keep incident writes ordered across integration reloads."""

import asyncio
from dataclasses import replace
from types import SimpleNamespace

import pytest


@pytest.fixture
def ha(monkeypatch):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
    from homeassistant.exceptions import HomeAssistantError

    from custom_components import ha_forensic_lab as integration
    from custom_components.ha_forensic_lab.incident_store import IncidentStore
    from custom_components.ha_forensic_lab.incidents import create_incident
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )

    # Panel registration is covered separately; use the real capture and stores.
    monkeypatch.setattr(integration, "async_panel_exists", lambda *args: True)
    monkeypatch.setattr(integration.frontend, "async_remove_panel", lambda *args: None)
    event = ForensicEvent(
        event_id="target",
        kind=ForensicEventKind.STATE_CHANGED,
        timestamp=1.0,
        context_id="context",
        parent_context_id=None,
        user_id=None,
    )
    first = create_incident((event,), "target", incident_id="first", created_at=1)
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        Error=HomeAssistantError,
        integration=integration,
        Store=IncidentStore,
        first=first,
        second=replace(first, incident_id="second", created_at=2),
        third=replace(first, incident_id="third", created_at=3),
    )


@pytest.mark.parametrize("operation", ["add", "delete"])
@pytest.mark.parametrize("replace_without_unload", [False, True])
def test_reload_waits_for_incident_write(
    ha, tmp_path, monkeypatch, operation, replace_without_unload
):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        cleanup = []
        entry = SimpleNamespace(
            options={},
            async_on_unload=cleanup.append,
            add_update_listener=lambda listener: lambda: None,
        )
        integration = ha.integration
        await integration.async_setup_entry(hass, entry)
        data = hass.data[integration.DOMAIN]
        store = data[integration.DATA_INCIDENT_STORE]
        await store.async_add(ha.first)
        if operation == "delete":
            await store.async_add(ha.second)

        entered = asyncio.Event()
        release = asyncio.Event()
        reload_started = asyncio.Event()
        save = store._store.async_save

        async def paused_save(value):
            entered.set()
            await release.wait()
            await save(value)

        async def reload():
            reload_started.set()
            if not replace_without_unload:
                await integration.async_unload_entry(hass, entry)
            await integration.async_setup_entry(hass, entry)

        monkeypatch.setattr(store._store, "async_save", paused_save)
        try:
            async with asyncio.timeout(5):
                async with asyncio.TaskGroup() as tasks:
                    if operation == "add":
                        tasks.create_task(store.async_add(ha.second))
                    else:
                        tasks.create_task(store.async_delete(ha.first.incident_id))
                    await entered.wait()
                    reloading = tasks.create_task(reload())
                    await reload_started.wait()
                    try:
                        assert not reloading.done()
                        assert data.get(integration.DATA_INCIDENT_STORE) is store
                    finally:
                        release.set()

            replacement = data[integration.DATA_INCIDENT_STORE]
            assert replacement is not store
            expected = (ha.second, ha.first) if operation == "add" else (ha.second,)
            assert replacement.incidents == expected

            # A later write must not discard an acknowledged save or undo a delete.
            await replacement.async_add(ha.third)
            restored = ha.Store(hass)
            await restored.async_load()
            assert restored.incidents == (ha.third, *expected)
        finally:
            release.set()
            await integration.async_unload_entry(hass, entry)
            for unsubscribe in cleanup:
                unsubscribe()

    asyncio.run(run())


@pytest.mark.parametrize("operation", ["add", "delete"])
def test_close_rejects_queued_and_new_mutations(ha, tmp_path, monkeypatch, operation):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        await store.async_add(ha.first)
        entered = asyncio.Event()
        release = asyncio.Event()
        queued = asyncio.Event()
        closing = asyncio.Event()
        save = store._store.async_save

        async def paused_save(value):
            entered.set()
            await release.wait()
            await save(value)

        async def rejected_mutation():
            queued.set()
            with pytest.raises(ha.Error, match="closing"):
                if operation == "add":
                    await store.async_add(ha.third)
                else:
                    await store.async_delete(ha.first.incident_id)

        async def close():
            closing.set()
            await store.async_close()

        monkeypatch.setattr(store._store, "async_save", paused_save)
        async with asyncio.timeout(5):
            async with asyncio.TaskGroup() as tasks:
                tasks.create_task(store.async_add(ha.second))
                await entered.wait()
                tasks.create_task(rejected_mutation())
                await queued.wait()
                closed = tasks.create_task(close())
                await closing.wait()
                try:
                    assert not closed.done()
                finally:
                    release.set()

        await store.async_close()  # Closing an already closed store is harmless.
        await rejected_mutation()
        restored = ha.Store(hass)
        await restored.async_load()
        assert restored.incidents == (ha.second, ha.first)

    asyncio.run(run())
