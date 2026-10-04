"""Constants for HA Forensic Lab."""

DOMAIN = "ha_forensic_lab"
NAME = "HA Forensic Lab"

DEFAULT_CAPTURE_BUFFER_SIZE = 2048
DEFAULT_PERSIST_INTERVAL_SECONDS = 10.0

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
