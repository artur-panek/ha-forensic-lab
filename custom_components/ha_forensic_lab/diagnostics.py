"""Home Assistant diagnostics support for HA Forensic Lab."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .capture import ForensicCapture
from .const import DATA_CAPTURE, DATA_INCIDENT_STORE, DATA_STORE, DOMAIN
from .diagnostics_data import build_runtime_diagnostics
from .incident_store import IncidentStore
from .store import RollingForensicStore


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
) -> dict[str, Any]:
    """Return privacy-safe aggregate diagnostics for a config entry."""
    domain_data = hass.data.get(DOMAIN, {})

    capture = domain_data.get(DATA_CAPTURE)
    store = domain_data.get(DATA_STORE)
    incident_store = domain_data.get(DATA_INCIDENT_STORE)

    return build_runtime_diagnostics(
        config_entry.options,
        capture=capture if isinstance(capture, ForensicCapture) else None,
        store=store if isinstance(store, RollingForensicStore) else None,
        incident_store=(
            incident_store
            if isinstance(incident_store, IncidentStore)
            else None
        ),
    )
