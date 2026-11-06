"""Verify actual HA Store failure handling and retry without new capture events."""

import asyncio

import pytest


def test_swallowed_write_error_stays_dirty_and_retries(tmp_path, monkeypatch):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant
    from homeassistant.exceptions import HomeAssistantError
    from homeassistant.helpers import storage

    from custom_components.ha_forensic_lab.store import RollingForensicStore

    async def run():
        hass = HomeAssistant(str(tmp_path))
        store = RollingForensicStore(hass, save_interval=0.01)
        store.bind_snapshot_provider(lambda: ())
        store.schedule_save()

        def failed_write(*args, **kwargs):
            raise storage.WriteError("synthetic disk full")

        with monkeypatch.context() as patch:
            patch.setattr(storage, "write_utf8_file_atomic", failed_write)
            with pytest.raises(HomeAssistantError, match="not saved"):
                await store.async_flush()
        assert store.diagnostics["persisted_generation"] == 0
        assert store.diagnostics["pending_save"] is True
        saved = asyncio.Event()
        original = store._store.async_save

        async def observed_save(data):
            await original(data)
            saved.set()

        monkeypatch.setattr(store._store, "async_save", observed_save)
        async with asyncio.timeout(2):
            await saved.wait()
        await store.async_flush()
        assert store.diagnostics["dirty_notifications"] == 1
        assert store.diagnostics["completed_writes"] == 1
        assert store.diagnostics["failed_writes"] >= 1
        assert await store._store.async_load() == {"events": []}

    asyncio.run(run())


def test_shutdown_deferral_is_not_a_verified_checkpoint(tmp_path):
    pytest.importorskip("homeassistant")
    from homeassistant.core import CoreState, HomeAssistant

    from custom_components.ha_forensic_lab.store import RollingForensicStore

    async def run():
        hass = HomeAssistant(str(tmp_path))
        store = RollingForensicStore(hass)
        store.bind_snapshot_provider(lambda: ())
        store.schedule_save()
        hass.set_state(CoreState.stopping)
        await store.async_flush()
        assert store.diagnostics["persisted_generation"] == 0
        assert store.diagnostics["deferred_writes"] == 1
        hass.set_state(CoreState.final_write)
        await store.async_flush()
        assert store.diagnostics["persisted_generation"] == 1

    asyncio.run(run())
