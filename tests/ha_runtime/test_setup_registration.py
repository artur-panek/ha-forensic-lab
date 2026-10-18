"""Do not start recording when the sidebar panel cannot be registered."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest


@pytest.fixture
def ha(monkeypatch):
    pytest.importorskip("homeassistant")
    from homeassistant.core import HomeAssistant

    from custom_components import ha_forensic_lab as integration
    from custom_components.ha_forensic_lab.const import CONF_EXCLUDED_ENTITIES
    from custom_components.ha_forensic_lab.models import (
        ForensicEvent,
        ForensicEventKind,
    )

    monkeypatch.setattr(integration, "async_panel_exists", lambda *args: False)
    return SimpleNamespace(
        HomeAssistant=HomeAssistant,
        integration=integration,
        excluded_entities=CONF_EXCLUDED_ENTITIES,
        event=ForensicEvent(
            event_id="stored-event",
            kind=ForensicEventKind.STATE_CHANGED,
            timestamp=1.0,
            context_id="context",
            parent_context_id=None,
            user_id=None,
            entity_id="light.excluded",
            old_state="off",
            new_state="on",
        ),
    )


@pytest.mark.parametrize("error", [RuntimeError, asyncio.CancelledError])
def test_failed_panel_registration_leaves_capture_stopped(
    ha, tmp_path, monkeypatch, error
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
        register = AsyncMock(side_effect=error("panel registration failed"))
        monkeypatch.setattr(integration.panel_custom, "async_register_panel", register)
        try:
            with pytest.raises(error):
                await integration.async_setup_entry(hass, entry)

            data = hass.data[integration.DOMAIN]
            assert integration.DATA_CAPTURE not in data
            assert integration.DATA_STORE not in data
            assert integration.DATA_INCIDENT_STORE not in data
            assert cleanup == []
            register.assert_awaited_once()

            # Retrying setup must start one working recorder, not a second one.
            register.side_effect = None
            assert await integration.async_setup_entry(hass, entry)
            hass.states.async_set("light.test", "on")
            await hass.async_block_till_done()
            capture = data[integration.DATA_CAPTURE]
            assert len(capture.events) == 1
            assert capture.events[0].entity_id == "light.test"
        finally:
            await integration.async_unload_entry(hass, entry)
            for unsubscribe in cleanup:
                unsubscribe()

    asyncio.run(run())


def test_failed_panel_registration_does_not_schedule_restore_write(
    ha, tmp_path, monkeypatch
):
    async def run():
        hass = ha.HomeAssistant(str(tmp_path))
        integration = ha.integration
        seed = integration.RollingForensicStore(hass)
        seed.bind_snapshot_provider(lambda: (ha.event,))
        seed.schedule_save()
        await seed.async_flush()

        cleanup = []
        entry = SimpleNamespace(
            options={ha.excluded_entities: [ha.event.entity_id]},
            async_on_unload=cleanup.append,
            add_update_listener=lambda listener: lambda: None,
        )
        schedule = Mock()
        monkeypatch.setattr(integration.RollingForensicStore, "schedule_save", schedule)
        monkeypatch.setattr(
            integration.panel_custom, "async_register_panel",
            AsyncMock(side_effect=RuntimeError("panel registration failed")),
        )
        try:
            with pytest.raises(RuntimeError, match="panel registration failed"):
                await integration.async_setup_entry(hass, entry)

            schedule.assert_not_called()
            assert await seed.async_load() == (ha.event,)
        finally:
            await integration.async_unload_entry(hass, entry)
            for unsubscribe in cleanup:
                unsubscribe()

    asyncio.run(run())
