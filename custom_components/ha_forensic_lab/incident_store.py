"""Persistent store for user-saved forensic incidents."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
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
        if (
            incident.incident_id not in self._incidents
            and len(self._incidents) >= MAX_SAVED_INCIDENTS
        ):
            raise IncidentLimitReached(
                f"saved incident limit of {MAX_SAVED_INCIDENTS} reached"
            )

        self._incidents[incident.incident_id] = incident
        await self._async_save()

    async def async_delete(self, incident_id: str) -> None:
        """Delete one saved incident."""
        if incident_id not in self._incidents:
            raise KeyError(incident_id)

        del self._incidents[incident_id]
        await self._async_save()

    async def _async_save(self) -> None:
        await self._store.async_save(serialize_incidents(self.incidents))
