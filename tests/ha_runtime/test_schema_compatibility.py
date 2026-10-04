"""Compatibility checks against installed HA, not a real-instance release gate."""

import asyncio
from types import SimpleNamespace

import pytest


@pytest.fixture
def ha_modules():
    pytest.importorskip("homeassistant")
    import voluptuous as vol

    from custom_components.ha_forensic_lab import config_flow, websocket

    return vol, config_flow, websocket


def test_websocket_defaults_and_error_types_match_home_assistant(ha_modules):
    vol, _config_flow, websocket = ha_modules
    schema = websocket.websocket_timeline._ws_schema
    message = {"id": 1, "type": "ha_forensic_lab/timeline"}
    assert schema(message)["limit"] == 100
    for invalid in (0, 501, "bad-limit"):
        # HA catches voluptuous.Invalid. A probatio error escapes that handler.
        with pytest.raises(vol.Invalid):
            schema(message | {"limit": invalid})


def test_required_fields_are_rejected_by_home_assistant_schema(ha_modules):
    vol, _config_flow, websocket = ha_modules
    with pytest.raises(vol.Invalid):
        websocket.websocket_incidents_get._ws_schema(
            {"id": 1, "type": "ha_forensic_lab/incidents/get"}
        )


def test_options_form_uses_home_assistant_schema_and_validates_bounds(ha_modules):
    vol, config_flow, _websocket = ha_modules

    class OptionsUnderTest(config_flow.HAForensicLabOptionsFlow):
        @property
        def config_entry(self):
            return SimpleNamespace(options={})

    result = asyncio.run(OptionsUnderTest().async_step_init())
    schema = result["data_schema"]
    assert isinstance(schema, vol.Schema)
    valid = config_flow._default_options()
    assert schema(valid)["capture_buffer_size"] == 2048
    with pytest.raises(vol.Invalid):
        schema(valid | {"capture_buffer_size": 0})
