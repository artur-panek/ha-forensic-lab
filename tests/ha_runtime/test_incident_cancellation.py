"""Finish an incident write before a cancelled caller releases its lock."""

import asyncio
import threading
from dataclasses import replace
from types import SimpleNamespace

import pytest


@pytest.fixture
def ha():
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
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
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        storage=storage,
        Store=IncidentStore,
        first=first,
        second=replace(first, incident_id="second", created_at=2),
        third=replace(first, incident_id="third", created_at=3),
    )


@pytest.mark.parametrize("operation", ["add", "delete"])
@pytest.mark.parametrize("cancel_count", [1, 2])
def test_cancelled_disk_write_finishes_before_close(
    ha, tmp_path, monkeypatch, operation, cancel_count
):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        await store.async_add(ha.first)
        entered = asyncio.Event()
        release = threading.Event()
        write = ha.storage.write_utf8_file_atomic
        tasks = []

        def paused_write(*args, **kwargs):
            hass.loop.call_soon_threadsafe(entered.set)
            if not release.wait(5):
                raise TimeoutError("Test did not release the disk write")
            return write(*args, **kwargs)

        monkeypatch.setattr(ha.storage, "write_utf8_file_atomic", paused_write)
        mutation = asyncio.create_task(
            store.async_add(ha.second)
            if operation == "add"
            else store.async_delete(ha.first.incident_id)
        )
        tasks.append(mutation)
        try:
            async with asyncio.timeout(5):
                await entered.wait()
                for _ in range(cancel_count):
                    mutation.cancel()
                    await asyncio.sleep(0)  # Deliver cancellation while I/O is blocked.
                closing = asyncio.create_task(store.async_close())
                tasks.append(closing)
                await asyncio.sleep(0)
                assert not mutation.done()
                assert not closing.done()
                assert store.incidents == (ha.first,)

                release.set()
                with pytest.raises(asyncio.CancelledError):
                    await mutation
                await closing
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)

        expected = (ha.second, ha.first) if operation == "add" else ()
        restored = ha.Store(hass)
        await restored.async_load()
        assert store.incidents == restored.incidents == expected
        await restored.async_add(ha.third)
        await restored.async_load()
        assert restored.incidents == (ha.third, *expected)

    asyncio.run(run())


@pytest.mark.parametrize("operation", ["add", "delete"])
def test_cancelled_readback_commits_visible_state(ha, tmp_path, monkeypatch, operation):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        await store.async_add(ha.first)
        entered = asyncio.Event()
        release = asyncio.Event()
        load = store._store.async_load

        async def paused_load():
            entered.set()
            await release.wait()
            return await load()

        with monkeypatch.context() as patch:
            patch.setattr(store._store, "async_load", paused_load)
            mutation = asyncio.create_task(
                store.async_add(ha.second)
                if operation == "add"
                else store.async_delete(ha.first.incident_id)
            )
            try:
                async with asyncio.timeout(5):
                    await entered.wait()
                    mutation.cancel()
                    await asyncio.sleep(0)
                    assert not mutation.done()
                    release.set()
                    with pytest.raises(asyncio.CancelledError):
                        await mutation
            finally:
                release.set()
                await asyncio.gather(mutation, return_exceptions=True)

        expected = (ha.second, ha.first) if operation == "add" else ()
        assert store.incidents == expected
        await store.async_add(ha.third)
        restored = ha.Store(hass)
        await restored.async_load()
        assert restored.incidents == (ha.third, *expected)

    asyncio.run(run())


def test_cancelled_queued_mutation_never_writes(ha, tmp_path, monkeypatch):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        entered = asyncio.Event()
        release = asyncio.Event()
        save = store._store.async_save

        async def paused_save(data):
            entered.set()
            await release.wait()
            await save(data)

        monkeypatch.setattr(store._store, "async_save", paused_save)
        first = asyncio.create_task(store.async_add(ha.first))
        tasks = [first]
        try:
            async with asyncio.timeout(5):
                await entered.wait()
                queued = asyncio.create_task(store.async_add(ha.second))
                tasks.append(queued)
                await asyncio.sleep(0)  # Queue behind the first mutation's lock.
                queued.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await queued
                release.set()
                await first
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)

        restored = ha.Store(hass)
        await restored.async_load()
        assert store.incidents == restored.incidents == (ha.first,)

    asyncio.run(run())


def test_cancelled_failed_write_preserves_previous_incidents(ha, tmp_path, monkeypatch):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        await store.async_add(ha.first)
        entered = asyncio.Event()
        release = threading.Event()

        def failed_write(*args, **kwargs):
            hass.loop.call_soon_threadsafe(entered.set)
            if not release.wait(5):
                raise TimeoutError("Test did not release the disk write")
            raise ha.storage.WriteError("disk full")

        with monkeypatch.context() as patch:
            patch.setattr(ha.storage, "write_utf8_file_atomic", failed_write)
            mutation = asyncio.create_task(store.async_add(ha.second))
            try:
                async with asyncio.timeout(5):
                    await entered.wait()
                    mutation.cancel()
                    await asyncio.sleep(0)
                    assert not mutation.done()
                    release.set()
                    with pytest.raises(asyncio.CancelledError):
                        await mutation
            finally:
                release.set()
                await asyncio.gather(mutation, return_exceptions=True)

        restored = ha.Store(hass)
        await restored.async_load()
        assert store.incidents == restored.incidents == (ha.first,)
        await store.async_add(ha.second)
        await restored.async_load()
        assert restored.incidents == (ha.second, ha.first)

    asyncio.run(run())
