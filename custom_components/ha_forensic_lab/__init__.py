"""HA Forensic Lab integration."""

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.frontend import async_panel_exists
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_FINAL_WRITE
from homeassistant.core import Event, HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .capture import ForensicCapture
from .capture_policy import CapturePolicy
from .const import (
    CONF_CAPTURE_BUFFER_SIZE,
    CONF_PERSIST_INTERVAL_SECONDS,
    DATA_CAPTURE,
    DATA_INCIDENT_STORE,
    DATA_STORE,
    DEFAULT_CAPTURE_BUFFER_SIZE,
    DEFAULT_PERSIST_INTERVAL_SECONDS,
    DOMAIN,
    NAME,
    PANEL_COMPONENT_NAME,
    PANEL_FILENAME,
    PANEL_STATIC_URL,
    PANEL_URL_PATH,
)
from .incident_store import IncidentStore
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
    domain_data.pop(DATA_INCIDENT_STORE, None)

    options = entry.options
    max_events = int(
        options.get(CONF_CAPTURE_BUFFER_SIZE, DEFAULT_CAPTURE_BUFFER_SIZE)
    )
    persist_interval = int(
        options.get(
            CONF_PERSIST_INTERVAL_SECONDS,
            DEFAULT_PERSIST_INTERVAL_SECONDS,
        )
    )
    policy = CapturePolicy.from_options(options)

    store = RollingForensicStore(
        hass,
        save_interval=persist_interval,
    )
    raw_restored_events = await store.async_load()
    restored_events = policy.filter_snapshot(raw_restored_events)

    incident_store = IncidentStore(hass)
    await incident_store.async_load()

    capture = ForensicCapture(
        hass,
        max_events=max_events,
        initial_events=restored_events,
        on_change=store.schedule_save,
        policy=policy,
    )
    store.bind_snapshot_provider(lambda: capture.events)

    if (
        len(raw_restored_events) > max_events
        or restored_events != raw_restored_events
    ):
        store.schedule_save()

    capture.start()
    domain_data[DATA_CAPTURE] = capture
    domain_data[DATA_INCIDENT_STORE] = incident_store
    domain_data[DATA_STORE] = store

    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    async def flush_on_shutdown(_event: Event) -> None:
        capture.stop()
        await store.async_flush()

    entry.async_on_unload(
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_FINAL_WRITE, flush_on_shutdown)
    )

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
    domain_data.pop(DATA_INCIDENT_STORE, None)

    if async_panel_exists(hass, PANEL_URL_PATH):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)

    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload capture and retention settings after options change."""
    await hass.config_entries.async_reload(entry.entry_id)
