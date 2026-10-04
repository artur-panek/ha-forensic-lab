"""Constants for HA Forensic Lab."""

DOMAIN = "ha_forensic_lab"
NAME = "HA Forensic Lab"

DEFAULT_CAPTURE_BUFFER_SIZE = 2048
MIN_CAPTURE_BUFFER_SIZE = 256
MAX_CAPTURE_BUFFER_SIZE = 8192

DEFAULT_PERSIST_INTERVAL_SECONDS = 10
MIN_PERSIST_INTERVAL_SECONDS = 5
MAX_PERSIST_INTERVAL_SECONDS = 60

CONF_CAPTURE_BUFFER_SIZE = "capture_buffer_size"
CONF_PERSIST_INTERVAL_SECONDS = "persist_interval_seconds"
CONF_CAPTURE_EVENT_KINDS = "capture_event_kinds"
CONF_CAPTURE_UNCHANGED_STATES = "capture_unchanged_states"
CONF_EXCLUDED_ENTITIES = "excluded_entities"
CONF_EXCLUDED_DOMAINS = "excluded_domains"

DATA_CAPTURE = "capture"
DATA_INCIDENT_STORE = "incident_store"
DATA_STORE = "store"

STORAGE_KEY = f"{DOMAIN}.events"
STORAGE_VERSION = 1

INCIDENT_STORAGE_KEY = f"{DOMAIN}.incidents"
INCIDENT_STORAGE_VERSION = 1

PANEL_COMPONENT_NAME = "ha-forensic-lab-panel"
PANEL_FILENAME = "ha-forensic-lab-panel.js"
PANEL_STATIC_URL = "/ha_forensic_lab_static"
PANEL_URL_PATH = "ha-forensic-lab"
