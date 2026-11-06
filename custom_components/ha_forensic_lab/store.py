"""Rolling persistence for normalized HA Forensic Lab events."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import datetime
from time import perf_counter_ns
from typing import Any

from homeassistant.core import CALLBACK_TYPE, CoreState, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_PERSIST_INTERVAL_SECONDS,
    STORAGE_KEY,
    STORAGE_VERSION,
)
from .metrics import PersistenceMetrics
from .models import ForensicEvent
from .storage_codec import deserialize_events, serialize_events

SnapshotProvider = Callable[[], tuple[ForensicEvent, ...]]


class RollingForensicStore:
    """Persist bounded forensic snapshots without blocking event capture."""

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        save_interval: float = DEFAULT_PERSIST_INTERVAL_SECONDS,
    ) -> None:
        """Initialize rolling persistence."""
        if save_interval <= 0:
            raise ValueError("save_interval must be greater than zero")

        self._hass = hass
        self._save_interval = save_interval
        self._store = Store[dict[str, Any]](
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
            private=True,
            atomic_writes=True,
            serialize_in_event_loop=False,
        )
        self._snapshot_provider: SnapshotProvider | None = None
        self._cancel_scheduled_save: CALLBACK_TYPE | None = None
        self._save_lock = asyncio.Lock()
        self._generation = 0
        self._persisted_generation = 0
        self._metrics = PersistenceMetrics()

    @property
    def diagnostics(self) -> dict[str, int | float | bool]:
        """Return privacy-safe rolling persistence diagnostics."""
        return self._metrics.as_dict(
            pending_save=self._cancel_scheduled_save is not None,
            dirty_generation=self._generation,
            persisted_generation=self._persisted_generation,
        )

    async def async_load(self) -> tuple[ForensicEvent, ...]:
        """Load the last persisted bounded snapshot."""
        started_ns = perf_counter_ns()
        events = deserialize_events(await self._store.async_load())
        self._metrics.record_load(perf_counter_ns() - started_ns, len(events))
        return events

    @callback
    def bind_snapshot_provider(self, provider: SnapshotProvider) -> None:
        """Bind the immutable snapshot provider used for future writes."""
        self._snapshot_provider = provider

    @callback
    def schedule_save(self) -> None:
        """Mark the snapshot dirty and schedule a bounded-delay write."""
        self._metrics.dirty_notifications += 1
        self._generation += 1
        self._schedule_pending_write()

    @callback
    def _schedule_pending_write(self) -> None:
        if self._cancel_scheduled_save is not None or self._hass.is_stopping:
            return

        self._metrics.scheduled_writes += 1
        self._cancel_scheduled_save = async_call_later(
            self._hass,
            self._save_interval,
            self._async_scheduled_save,
        )

    async def async_flush(self) -> None:
        """Cancel a pending timer and immediately persist the latest snapshot."""
        self._metrics.flush_calls += 1
        if self._cancel_scheduled_save is not None:
            self._cancel_scheduled_save()
            self._cancel_scheduled_save = None

        try:
            await self._async_write_snapshot()
        except Exception:
            self._schedule_pending_write()
            raise

    async def _async_scheduled_save(self, _now: datetime) -> None:
        self._cancel_scheduled_save = None
        try:
            await self._async_write_snapshot()
        except Exception:
            self._schedule_pending_write()
            raise

    async def _async_write_snapshot(self) -> None:
        async with self._save_lock:
            if self._generation == self._persisted_generation:
                return

            provider = self._snapshot_provider
            if provider is None:
                return

            generation = self._generation
            snapshot = provider()
            data = serialize_events(snapshot)
            started_ns = perf_counter_ns()

            # Cancelling an await cannot stop an executor write. Retain the lock
            # until it finishes so an older snapshot cannot overwrite a newer one.
            write = self._hass.async_create_task(
                self._async_save_verified(data), "ha_forensic_lab rolling write"
            )
            cancellation: asyncio.CancelledError | None = None
            try:
                while True:
                    try:
                        verified = await asyncio.shield(write)
                        break
                    except asyncio.CancelledError as err:
                        if write.cancelled():
                            raise
                        cancellation = err
            except Exception as err:
                self._metrics.record_write(
                    perf_counter_ns() - started_ns,
                    len(snapshot),
                    failed=True,
                )
                if cancellation is not None:
                    raise cancellation from err
                raise

            self._metrics.record_write(
                perf_counter_ns() - started_ns,
                len(snapshot),
                failed=False,
                deferred=not verified,
            )
            if verified:
                self._persisted_generation = max(
                    self._persisted_generation,
                    generation,
                )
            if cancellation is not None:
                raise cancellation

    async def _async_save_verified(self, data: dict[str, Any]) -> bool:
        deferred = self._hass.state is CoreState.stopping
        await self._store.async_save(data)
        if deferred:
            # HA queues this write for FINAL_WRITE; pending data is not proof of
            # disk persistence. The final flush can verify once writes resume.
            return False
        if await self._store.async_load() != data:
            raise HomeAssistantError(
                "Rolling snapshot was not saved; check Home Assistant storage logs"
            )
        return True
