"""Tests for privacy-safe runtime performance metrics."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).parents[1]
METRICS_PATH = ROOT / "custom_components" / "ha_forensic_lab" / "metrics.py"


def _load_metrics() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "ha_forensic_lab_metrics",
        METRICS_PATH,
    )
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


metrics = _load_metrics()


def test_capture_metrics_tracks_drop_reasons_and_handler_cost() -> None:
    data = metrics.CaptureMetrics()
    data.observed_events = 5
    data.normalized_events = 4
    data.normalization_drops = 1
    data.retained_events = 2
    data.evicted_events = 1
    data.filtered_service_targets = 3
    data.record_drop(metrics.CaptureDropReason.DISABLED_KIND)
    data.record_drop(metrics.CaptureDropReason.EXCLUDED_ENTITY)
    data.record_handler_duration(1_000_000)
    data.record_handler_duration(3_000_000)

    result = data.as_dict()

    assert result["observed_events"] == 5
    assert result["dropped_disabled_kind"] == 1
    assert result["dropped_excluded_entity"] == 1
    assert result["handler_calls"] == 2
    assert result["handler_average_ms"] == 2.0
    assert result["handler_max_ms"] == 3.0


def test_persistence_metrics_tracks_success_and_failure_without_payloads() -> None:
    data = metrics.PersistenceMetrics()
    data.record_load(2_000_000, 42)
    data.dirty_notifications = 7
    data.scheduled_writes = 2
    data.flush_calls = 1
    data.record_write(4_000_000, 40, failed=False)
    data.record_write(6_000_000, 41, failed=True)

    result = data.as_dict(
        pending_save=True,
        dirty_generation=7,
        persisted_generation=6,
    )

    assert result["restored_events"] == 42
    assert result["completed_writes"] == 1
    assert result["failed_writes"] == 1
    assert result["write_average_ms"] == 5.0
    assert result["write_max_ms"] == 6.0
    assert result["last_snapshot_events"] == 40
    assert result["pending_save"] is True
