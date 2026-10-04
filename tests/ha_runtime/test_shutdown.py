"""Test shutdown flushing with HA's event bus, without booting an installation."""

import asyncio
from types import SimpleNamespace

import pytest


def test_final_write_flushes_events_before_the_rolling_timer(tmp_path, monkeypatch):
    pytest.importorskip("homeassistant")
    from homeassistant.const import EVENT_HOMEASSISTANT_FINAL_WRITE
    from homeassistant.core import CoreState, HomeAssistant

    from custom_components import ha_forensic_lab as integration

    async def run():
        hass = HomeAssistant(str(tmp_path))
        cleanup = []
        entry = SimpleNamespace(
            options={},
            async_on_unload=cleanup.append,
            add_update_listener=lambda listener: lambda: None,
        )
        # The panel belongs to the real-instance UI gate; exercise storage here.
        monkeypatch.setattr(integration, "async_panel_exists", lambda *args: True)
        await integration.async_setup_entry(hass, entry)
        hass.states.async_set("light.test", "on")
        await hass.async_block_till_done()
        capture = hass.data[integration.DOMAIN][integration.DATA_CAPTURE]
        expected = capture.events
        assert len(expected) == 1

        hass.set_state(CoreState.final_write)
        hass.bus.async_fire(EVENT_HOMEASSISTANT_FINAL_WRITE)
        await hass.async_block_till_done()
        restored = await integration.RollingForensicStore(hass).async_load()
        assert restored == expected

        hass.states.async_set("light.test", "off")
        await hass.async_block_till_done()
        assert capture.events == expected
        for unsubscribe in cleanup:
            unsubscribe()

    asyncio.run(run())
