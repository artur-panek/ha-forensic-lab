"""Keep cancelled rolling writes from overwriting a newer snapshot."""

import asyncio
import threading
from types import SimpleNamespace

import pytest


@pytest.fixture
def ha():
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers import storage

    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )
    from custom_components.ha_forensic_lab.store import RollingForensicStore

    events = tuple(
        ForensicEvent(
            event_id=f"event-{index}",
            kind=ForensicEventKind.STATE_CHANGED,
            timestamp=float(index),
            context_id=None,
            parent_context_id=None,
            user_id=None,
        )
        for index in range(2)
    )
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        storage=storage,
        Store=RollingForensicStore,
        events=events,
    )


@pytest.mark.parametrize("cancel_count", [1, 2])
def test_cancelled_write_finishes_before_newer_snapshot(
    ha, tmp_path, monkeypatch, cancel_count
):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        snapshot = ha.events[:1]
        store.bind_snapshot_provider(lambda: snapshot)
        entered = asyncio.Event()
        release = threading.Event()
        write = ha.storage.write_utf8_file_atomic
        writes = 0
        tasks = []

        def paused_write(*args, **kwargs):
            nonlocal writes
            writes += 1
            if writes == 1:
                hass.loop.call_soon_threadsafe(entered.set)
                if not release.wait(5):
                    raise TimeoutError("Test did not release the disk write")
            return write(*args, **kwargs)

        monkeypatch.setattr(ha.storage, "write_utf8_file_atomic", paused_write)
        store.schedule_save()
        first = asyncio.create_task(store.async_flush())
        tasks.append(first)
        try:
            async with asyncio.timeout(5):
                await entered.wait()
                for _ in range(cancel_count):
                    first.cancel()
                    await asyncio.sleep(0)  # Deliver cancellation while I/O is blocked.

                snapshot = ha.events
                store.schedule_save()
                latest = asyncio.create_task(store.async_flush())
                tasks.append(latest)
                await asyncio.sleep(0)
                assert not first.done()
                assert not latest.done()
                assert writes == 1
                assert store.diagnostics["persisted_generation"] == 0

                release.set()
                with pytest.raises(asyncio.CancelledError):
                    await first
                await latest
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)
            await hass.async_block_till_done()

        restored = await ha.Store(hass).async_load()
        assert restored == ha.events
        assert writes == 2
        assert store.diagnostics["persisted_generation"] == 2
        assert store.diagnostics["completed_writes"] == 2
        assert not store.diagnostics["pending_save"]

    asyncio.run(run())


def test_cancelled_queued_flush_does_not_start_a_write(ha, tmp_path, monkeypatch):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        store.bind_snapshot_provider(lambda: ha.events)
        entered = asyncio.Event()
        release = asyncio.Event()
        save = store._store.async_save
        writes = 0

        async def paused_save(data):
            nonlocal writes
            writes += 1
            entered.set()
            await release.wait()
            await save(data)

        monkeypatch.setattr(store._store, "async_save", paused_save)
        store.schedule_save()
        first = asyncio.create_task(store.async_flush())
        tasks = [first]
        try:
            async with asyncio.timeout(5):
                await entered.wait()
                queued = asyncio.create_task(store.async_flush())
                tasks.append(queued)
                await asyncio.sleep(0)
                queued.cancel()
                with pytest.raises(asyncio.CancelledError):
                    await queued
                assert writes == 1
                release.set()
                await first
        finally:
            release.set()
            await asyncio.gather(*tasks, return_exceptions=True)

        assert await ha.Store(hass).async_load() == ha.events
        assert store.diagnostics["completed_writes"] == 1

    asyncio.run(run())


@pytest.mark.parametrize("cancel", [False, True])
def test_failed_write_keeps_snapshot_dirty(ha, tmp_path, monkeypatch, cancel):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        store = ha.Store(hass)
        store.bind_snapshot_provider(lambda: ha.events)
        entered = asyncio.Event()
        release = asyncio.Event()

        async def failed_save(data):
            entered.set()
            await release.wait()
            raise RuntimeError("storage unavailable")

        with monkeypatch.context() as patch:
            patch.setattr(store._store, "async_save", failed_save)
            store.schedule_save()
            first = asyncio.create_task(store.async_flush())
            try:
                async with asyncio.timeout(5):
                    await entered.wait()
                    if cancel:
                        first.cancel()
                        await asyncio.sleep(0)
                        assert not first.done()
                    release.set()
                    error = asyncio.CancelledError if cancel else RuntimeError
                    with pytest.raises(error):
                        await first
            finally:
                release.set()
                await asyncio.gather(first, return_exceptions=True)

        assert store.diagnostics["persisted_generation"] == 0
        assert store.diagnostics["completed_writes"] == 0
        assert store.diagnostics["failed_writes"] == 1
        await store.async_flush()
        assert await ha.Store(hass).async_load() == ha.events
        assert store.diagnostics["persisted_generation"] == 1

    asyncio.run(run())
