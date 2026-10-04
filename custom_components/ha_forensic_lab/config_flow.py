"""Config flow for HA Forensic Lab."""

from __future__ import annotations

from typing import Any, override

import probatio
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
)

from .const import (
    CONF_CAPTURE_BUFFER_SIZE,
    CONF_CAPTURE_EVENT_KINDS,
    CONF_EXCLUDED_DOMAINS,
    CONF_EXCLUDED_ENTITIES,
    CONF_PERSIST_INTERVAL_SECONDS,
    DEFAULT_CAPTURE_BUFFER_SIZE,
    DEFAULT_PERSIST_INTERVAL_SECONDS,
    DOMAIN,
    MAX_CAPTURE_BUFFER_SIZE,
    MAX_PERSIST_INTERVAL_SECONDS,
    MIN_CAPTURE_BUFFER_SIZE,
    MIN_PERSIST_INTERVAL_SECONDS,
    NAME,
)
from .models import ForensicEventKind

_DEFAULT_EVENT_KINDS = [kind.value for kind in ForensicEventKind]


class HAForensicLabConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the HA Forensic Lab config flow."""

    VERSION = 1

    @staticmethod
    @callback
    @override
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> HAForensicLabOptionsFlow:
        """Return the options flow."""
        return HAForensicLabOptionsFlow()

    @override
    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Create the single local HA Forensic Lab instance."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(
                title=NAME,
                data={},
                options=_default_options(),
            )

        return self.async_show_form(step_id="user")


class HAForensicLabOptionsFlow(OptionsFlow):
    """Configure capture scope and rolling retention."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Manage HA Forensic Lab options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = _default_options() | dict(self.config_entry.options)

        return self.async_show_form(
            step_id="init",
            data_schema=probatio.Schema(
                {
                    probatio.Required(
                        CONF_CAPTURE_BUFFER_SIZE,
                        default=options[CONF_CAPTURE_BUFFER_SIZE],
                    ): probatio.All(
                        int,
                        probatio.Range(
                            min=MIN_CAPTURE_BUFFER_SIZE,
                            max=MAX_CAPTURE_BUFFER_SIZE,
                        ),
                    ),
                    probatio.Required(
                        CONF_PERSIST_INTERVAL_SECONDS,
                        default=options[CONF_PERSIST_INTERVAL_SECONDS],
                    ): probatio.All(
                        int,
                        probatio.Range(
                            min=MIN_PERSIST_INTERVAL_SECONDS,
                            max=MAX_PERSIST_INTERVAL_SECONDS,
                        ),
                    ),
                    probatio.Required(
                        CONF_CAPTURE_EVENT_KINDS,
                        default=options[CONF_CAPTURE_EVENT_KINDS],
                    ): SelectSelector(
                        SelectSelectorConfig(
                            options=_DEFAULT_EVENT_KINDS,
                            multiple=True,
                        )
                    ),
                    probatio.Optional(
                        CONF_EXCLUDED_ENTITIES,
                        default=options[CONF_EXCLUDED_ENTITIES],
                    ): EntitySelector(EntitySelectorConfig(multiple=True)),
                    probatio.Optional(
                        CONF_EXCLUDED_DOMAINS,
                        default=options[CONF_EXCLUDED_DOMAINS],
                    ): SelectSelector(
                        SelectSelectorConfig(
                            custom_value=True,
                            options=[],
                            multiple=True,
                        )
                    ),
                }
            ),
        )


def _default_options() -> dict[str, Any]:
    return {
        CONF_CAPTURE_BUFFER_SIZE: DEFAULT_CAPTURE_BUFFER_SIZE,
        CONF_PERSIST_INTERVAL_SECONDS: DEFAULT_PERSIST_INTERVAL_SECONDS,
        CONF_CAPTURE_EVENT_KINDS: list(_DEFAULT_EVENT_KINDS),
        CONF_EXCLUDED_ENTITIES: [],
        CONF_EXCLUDED_DOMAINS: [],
    }
