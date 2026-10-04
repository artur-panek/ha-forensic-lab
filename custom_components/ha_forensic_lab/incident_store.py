"""Persistent store for user-saved forensic incidents."""

from __future__ import annotations

import asyncio
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store

from .const import INCIDENT_STORAGE_KEY, INCIDENT_STORAGE_VERSION
from .incident_codec import deserialize_incidents, serialize_incidents
from .incidents import Incident

MAX_SAVED_INCIDENTS = 50


class IncidentLimitReached(ValueError):
    """Raised when the saved-incident collection reaches its bound."""


class IncidentStore:
    """Persist a bounded collection of manually saved incidents."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the incident store."""
        self._hass = hass
        self._save_lock = asyncio.Lock()
        self._store = Store[dict[str, Any]](
            hass,
            INCIDENT_STORAGE_VERSION,
            INCIDENT_STORAGE_KEY,
            private=True,
            atomic_writes=True,
            serialize_in_event_loop=False,
        )
        self._incidents: dict[str, Incident] = {}

    @property
    def incidents(self) -> tuple[Incident, ...]:
        """Return saved incidents newest first."""
        return tuple(
            sorted(
                self._incidents.values(),
                key=lambda incident: incident.created_at,
                reverse=True,
            )
        )

    async def async_load(self) -> None:
        """Load saved incidents from private Home Assistant storage."""
        loaded = deserialize_incidents(await self._store.async_load())
        newest = sorted(
            loaded,
            key=lambda incident: incident.created_at,
            reverse=True,
        )[:MAX_SAVED_INCIDENTS]
        self._incidents = {incident.incident_id: incident for incident in newest}

    def get(self, incident_id: str) -> Incident | None:
        """Return one incident by ID."""
        return self._incidents.get(incident_id)

    async def async_add(self, incident: Incident) -> None:
        """Persist a newly saved incident."""
        async with self._save_lock:
            if (
                incident.incident_id not in self._incidents
                and len(self._incidents) >= MAX_SAVED_INCIDENTS
            ):
                raise IncidentLimitReached(
                    f"saved incident limit of {MAX_SAVED_INCIDENTS} reached"
                )

            await self._async_save(self._incidents | {incident.incident_id: incident})

    async def async_delete(self, incident_id: str) -> None:
        """Delete one saved incident."""
        async with self._save_lock:
            updated = dict(self._incidents)
            del updated[incident_id]
            await self._async_save(updated)

    async def _async_save(self, updated: dict[str, Incident]) -> None:
        # Store defers writes during shutdown, so read-back would see pending data.
        if self._hass.is_stopping:
            raise HomeAssistantError("Cannot save incidents while Home Assistant stops")

        data = serialize_incidents(updated.values())
        await self._store.async_save(data)
        # HA's Store logs some write errors without raising. Verify these infrequent
        # user-initiated writes before acknowledging them or changing visible state.
        if await self._store.async_load() != data:
            raise HomeAssistantError(
                "Incident changes were not saved; check Home Assistant storage logs"
            )
        self._incidents = updated
