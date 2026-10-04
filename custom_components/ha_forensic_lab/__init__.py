"""HA Forensic Lab integration."""

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.frontend import async_panel_exists
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .capture import ForensicCapture
from .const import (
    DATA_CAPTURE,
    DATA_STORE,
    DOMAIN,
    NAME,
    PANEL_COMPONENT_NAME,
    PANEL_FILENAME,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
)
from .store import RollingForensicStore
from .websocket import async_register_websocket_api

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

_DATA_STATIC_REGISTERED = "static_registered"
_DATA_WEBSOCKET_REGISTERED = "websocket_registered"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration-wide resources."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    if not domain_data.get(_DATA_STATIC_REGISTERED):
        frontend_dir = Path(__file__).parent / "frontend"
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    url_path=PANEL_STATIC_URL,
                    path=str(frontend_dir),
                    cache_headers=False,
                )
            ]
        )
        domain_data[_DATA_STATIC_REGISTERED] = True

    if not domain_data.get(_DATA_WEBSOCKET_REGISTERED):
        async_register_websocket_api(hass)
        domain_data[_DATA_WEBSOCKET_REGISTERED] = True

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HA Forensic Lab from a config entry."""
    domain_data = hass.data.setdefault(DOMAIN, {})

    if existing_capture := domain_data.pop(DATA_CAPTURE, None):
        existing_capture.stop()
    if existing_store := domain_data.pop(DATA_STORE, None):
        await existing_store.async_flush()

    store = RollingForensicStore(hass)
    restored_events = await store.async_load()

    capture = ForensicCapture(
        hass,
        initial_events=restored_events,
        on_change=store.schedule_save,
    )
    store.bind_snapshot_provider(lambda: capture.events)

    capture.start()
    domain_data[DATA_CAPTURE] = capture
    domain_data[DATA_STORE] = store

    if not async_panel_exists(hass, PANEL_URL_PATH):
        await panel_custom.async_register_panel(
            hass=hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=PANEL_COMPONENT_NAME,
            sidebar_title=NAME,
            sidebar_icon="mdi:magnify",
            module_url=f"{PANEL_STATIC_URL}/{PANEL_FILENAME}",
            require_admin=True,
        )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a HA Forensic Lab config entry."""
    domain_data = hass.data.get(DOMAIN, {})

    if capture := domain_data.pop(DATA_CAPTURE, None):
        capture.stop()
    if store := domain_data.pop(DATA_STORE, None):
        await store.async_flush()

    if async_panel_exists(hass, PANEL_URL_PATH):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)

    return True
