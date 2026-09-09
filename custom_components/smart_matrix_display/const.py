"""Constants for the Smart Matrix Display integration."""

from homeassistant.const import Platform

DOMAIN = "smart_matrix_display"
PLATFORMS = [Platform.BINARY_SENSOR, Platform.BUTTON, Platform.SENSOR]

CONF_HOST = "host"
CONF_PORT = "port"
CONF_TOKEN = "token"
CONF_NAME = "name"

DEFAULT_PORT = 80
DEFAULT_TIMEOUT = 10
DEFAULT_SCAN_INTERVAL = 30

SERVICE_SEND_MESSAGE = "send_message"
SERVICE_CLEAR_DISPLAY = "clear_display"
SERVICE_RESTART = "restart"

ATTR_TITLE = "title"
ATTR_MESSAGE = "message"
ATTR_DURATION = "duration"
ATTR_COLOR = "color"
ATTR_ALIGNMENT = "alignment"
ATTR_PRIORITY = "priority"

ALIGNMENTS = ("left", "center", "right")
