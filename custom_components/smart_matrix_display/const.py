"""Constants for the Smart Matrix Display integration."""

from homeassistant.const import Platform

DOMAIN = "smart_matrix_display"
PLATFORMS = [Platform.BINARY_SENSOR, Platform.BUTTON, Platform.SENSOR, Platform.NUMBER, Platform.SELECT, Platform.SWITCH]

CONF_HOST = "host"
CONF_PORT = "port"
CONF_TOKEN = "token"
CONF_NAME = "name"
CONF_WEATHER_ENTITY = "weather_entity"

DEFAULT_PORT = 80
DEFAULT_TIMEOUT = 10
DEFAULT_SCAN_INTERVAL = 30

SERVICE_SEND_MESSAGE = "send_message"
SERVICE_CLEAR_DISPLAY = "clear_display"
SERVICE_RESTART = "restart"
SERVICE_SEND_WEATHER = "send_weather"
SERVICE_SEND_P2000 = "send_p2000"
SERVICE_SEND_ALERT = "send_alert"
SERVICE_SHOW_MESSAGE = "show_message"
SERVICE_SHOW_LAYOUT = "show_layout"
SERVICE_SHOW_EVENT = "show_event"
SERVICE_CLEAR = "clear"
SERVICE_SET_BRIGHTNESS = "set_brightness"
SERVICE_SET_POWER = "set_power"
SERVICE_SET_LAYOUT = "set_layout"
SERVICE_SET_PROFILE = "set_profile"
SERVICE_SKIP_EVENT = "skip_event"
SERVICE_AUDIO_TEST = "audio_test"
SERVICE_AUDIO_START = "audio_start"
SERVICE_AUDIO_STOP = "audio_stop"

ATTR_TITLE = "title"
ATTR_MESSAGE = "message"
ATTR_DURATION = "duration"
ATTR_COLOR = "color"
ATTR_ALIGNMENT = "alignment"
ATTR_PRIORITY = "priority"
ATTR_WEATHER_ENTITY = "weather_entity_id"
ATTR_LOCATION = "location"
ATTR_CAPCODE = "capcode"
ATTR_LAYOUT_ID = "layout_id"
ATTR_PAYLOAD = "payload"
ATTR_SOURCE = "source"
ATTR_EVENT_TYPE = "event_type"
ATTR_PROFILE_ID = "profile_id"
ATTR_BRIGHTNESS = "brightness"
ATTR_ENABLED = "enabled"
ATTR_DISCIPLINE = "discipline"
ATTR_STREET = "street"
ATTR_PLACE = "place"
ATTR_REGION = "region"
ATTR_UNITS = "units"
ATTR_INCIDENT_ID = "incident_id"

ALIGNMENTS = ("left", "center", "right")
