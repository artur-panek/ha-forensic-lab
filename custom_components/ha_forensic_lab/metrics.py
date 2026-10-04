"""Low-overhead runtime metrics for HA Forensic Lab."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class CaptureDropReason(StrEnum):
    """Why a normalized runtime event did not enter retention."""

    DISABLED_KIND = "disabled_kind"
    EXCLUDED_ENTITY = "excluded_entity"
    EXCLUDED_DOMAIN = "excluded_domain"
    EXCLUDED_TARGETS = "excluded_targets"


@dataclass(slots=True)
class CaptureMetrics:
    """Aggregate capture counters without retaining user data."""

    observed_events: int = 0
    normalized_events: int = 0
    normalization_drops: int = 0
    retained_events: int = 0
    evicted_events: int = 0
    filtered_service_targets: int = 0
    dropped_disabled_kind: int = 0
    dropped_excluded_entity: int = 0
    dropped_excluded_domain: int = 0
    dropped_excluded_targets: int = 0
    handler_calls: int = 0
    handler_total_ns: int = 0
    handler_max_ns: int = 0

    def record_drop(self, reason: CaptureDropReason) -> None:
        """Increment one privacy/scope drop counter."""
        if reason is CaptureDropReason.DISABLED_KIND:
            self.dropped_disabled_kind += 1
        elif reason is CaptureDropReason.EXCLUDED_ENTITY:
            self.dropped_excluded_entity += 1
        elif reason is CaptureDropReason.EXCLUDED_DOMAIN:
            self.dropped_excluded_domain += 1
        elif reason is CaptureDropReason.EXCLUDED_TARGETS:
            self.dropped_excluded_targets += 1

    def record_handler_duration(self, duration_ns: int) -> None:
        """Record one event-bus callback duration."""
        self.handler_calls += 1
        self.handler_total_ns += duration_ns
        self.handler_max_ns = max(self.handler_max_ns, duration_ns)

    def as_dict(self) -> dict[str, int | float]:
        """Return a JSON-safe aggregate snapshot."""
        average_ns = (
            self.handler_total_ns / self.handler_calls if self.handler_calls else 0.0
        )
        return {
            "observed_events": self.observed_events,
            "normalized_events": self.normalized_events,
            "normalization_drops": self.normalization_drops,
            "retained_events": self.retained_events,
            "evicted_events": self.evicted_events,
            "filtered_service_targets": self.filtered_service_targets,
            "dropped_disabled_kind": self.dropped_disabled_kind,
            "dropped_excluded_entity": self.dropped_excluded_entity,
            "dropped_excluded_domain": self.dropped_excluded_domain,
            "dropped_excluded_targets": self.dropped_excluded_targets,
            "handler_calls": self.handler_calls,
            "handler_average_ms": round(average_ns / 1_000_000, 6),
            "handler_max_ms": round(self.handler_max_ns / 1_000_000, 6),
        }


@dataclass(slots=True)
class PersistenceMetrics:
    """Aggregate Store call counters; HA may log disk errors without raising."""

    load_count: int = 0
    restored_events: int = 0
    load_total_ns: int = 0
    load_max_ns: int = 0
    dirty_notifications: int = 0
    scheduled_writes: int = 0
    completed_writes: int = 0
    failed_writes: int = 0
    flush_calls: int = 0
    write_total_ns: int = 0
    write_max_ns: int = 0
    last_snapshot_events: int = 0

    def record_load(self, duration_ns: int, event_count: int) -> None:
        """Record one rolling snapshot load."""
        self.load_count += 1
        self.restored_events = event_count
        self.load_total_ns += duration_ns
        self.load_max_ns = max(self.load_max_ns, duration_ns)

    def record_write(
        self,
        duration_ns: int,
        event_count: int,
        *,
        failed: bool,
    ) -> None:
        """Record one attempted rolling snapshot write."""
        self.write_total_ns += duration_ns
        self.write_max_ns = max(self.write_max_ns, duration_ns)
        if failed:
            self.failed_writes += 1
            return
        self.completed_writes += 1
        self.last_snapshot_events = event_count

    def as_dict(
        self,
        *,
        pending_save: bool,
        dirty_generation: int,
        persisted_generation: int,
    ) -> dict[str, int | float | bool]:
        """Return a JSON-safe aggregate snapshot."""
        load_average_ns = self.load_total_ns / self.load_count if self.load_count else 0
        write_attempts = self.completed_writes + self.failed_writes
        write_average_ns = self.write_total_ns / write_attempts if write_attempts else 0

        return {
            "load_count": self.load_count,
            "restored_events": self.restored_events,
            "load_average_ms": round(load_average_ns / 1_000_000, 6),
            "load_max_ms": round(self.load_max_ns / 1_000_000, 6),
            "dirty_notifications": self.dirty_notifications,
            "scheduled_writes": self.scheduled_writes,
            "completed_writes": self.completed_writes,
            "failed_writes": self.failed_writes,
            "flush_calls": self.flush_calls,
            "write_average_ms": round(write_average_ns / 1_000_000, 6),
            "write_max_ms": round(self.write_max_ns / 1_000_000, 6),
            "last_snapshot_events": self.last_snapshot_events,
            "pending_save": pending_save,
            "dirty_generation": dirty_generation,
            "persisted_generation": persisted_generation,
        }
