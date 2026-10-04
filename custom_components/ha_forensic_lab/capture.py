"""Runtime capture layer for HA Forensic Lab."""

from __future__ import annotations

from collections import deque
from collections.abc import Callable, Iterable
from itertools import count
from uuid import uuid4

from homeassistant.components.automation import EVENT_AUTOMATION_TRIGGERED
from homeassistant.components.script import EVENT_SCRIPT_STARTED
from homeassistant.const import EVENT_CALL_SERVICE, EVENT_STATE_CHANGED
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback

from .capture_policy import CapturePolicy
from .const import DEFAULT_CAPTURE_BUFFER_SIZE
from .models import ForensicEvent, normalize_event

_CAPTURE_EVENT_TYPES = (
    EVENT_STATE_CHANGED,
    EVENT_CALL_SERVICE,
    EVENT_AUTOMATION_TRIGGERED,
    EVENT_SCRIPT_STARTED,
)


class ForensicCapture:
    """Capture a bounded in-memory stream of normalized runtime evidence."""

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        max_events: int = DEFAULT_CAPTURE_BUFFER_SIZE,
        initial_events: Iterable[ForensicEvent] = (),
        on_change: Callable[[], None] | None = None,
        policy: CapturePolicy | None = None,
    ) -> None:
        """Initialize the capture layer."""
        if max_events < 1:
            raise ValueError("max_events must be at least 1")

        self._hass = hass
        self._events: deque[ForensicEvent] = deque(
            initial_events,
            maxlen=max_events,
        )
        self._on_change = on_change
        self._policy = policy or CapturePolicy()
        self._session_id = uuid4().hex
        self._sequence = count(1)
        self._remove_listeners: list[CALLBACK_TYPE] = []

    @property
    def events(self) -> tuple[ForensicEvent, ...]:
        """Return an immutable snapshot of currently retained events."""
        return tuple(self._events)

    @property
    def max_events(self) -> int:
        """Return the configured in-memory retention bound."""
        return self._events.maxlen or 0

    @callback
    def start(self) -> None:
        """Start listening for supported Home Assistant runtime events."""
        if self._remove_listeners:
            return

        self._remove_listeners.extend(
            self._hass.bus.async_listen(event_type, self._handle_event)
            for event_type in _CAPTURE_EVENT_TYPES
        )

    @callback
    def stop(self) -> None:
        """Stop capture and release all event-bus subscriptions."""
        while self._remove_listeners:
            self._remove_listeners.pop()()

    @callback
    def _handle_event(self, event: Event) -> None:
        """Normalize, filter and retain one Home Assistant runtime event."""
        normalized = normalize_event(
            event,
            next(self._sequence),
            self._session_id,
        )
        if normalized is None:
            return

        retained = self._policy.apply(normalized)
        if retained is None:
            return

        self._events.append(retained)
        if self._on_change is not None:
            self._on_change()
