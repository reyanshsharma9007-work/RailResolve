# training/category_label_map.py
# Maps the dataset's raw `Type` values onto RailResolve's EXISTING department
# codes (express-backend config/constants.js DEPARTMENT_CODES), so a predicted
# class is directly routable with no second translation layer.
#
# This mapping is a judgement call, not ground truth: the raw Type column is
# noisy ("service", "facility", "others", "miscellaneous" are catch-alls).
# Edit here and retrain; training fails loudly on any unmapped Type.

import re

TRAIN_OPERATIONS = "TRAIN_OPERATIONS"
TRAIN_MAINTENANCE = "TRAIN_MAINTENANCE"
STATION_MAINTENANCE = "STATION_MAINTENANCE"
FOOD_WATER = "FOOD_WATER"
BOOKING_REFUND = "BOOKING_REFUND"
TICKET_TTE = "TICKET_TTE"
GENERAL_SUPPORT = "GENERAL_SUPPORT"

DEPARTMENT_NAMES = {
    TICKET_TTE: "Ticket / TTE",
    STATION_MAINTENANCE: "Station Maintenance",
    TRAIN_MAINTENANCE: "Train Maintenance",
    FOOD_WATER: "Food & Water",
    TRAIN_OPERATIONS: "Train Operations",
    BOOKING_REFUND: "Booking & Refund",
    GENERAL_SUPPORT: "General Support",
}

TYPE_TO_DEPARTMENT = {
    # Delays, cancellations, on-board safety/security, overcrowding
    "punctuality": TRAIN_OPERATIONS, "train delay": TRAIN_OPERATIONS, "delay": TRAIN_OPERATIONS,
    "cancelled train": TRAIN_OPERATIONS, "security": TRAIN_OPERATIONS, "safety": TRAIN_OPERATIONS,
    "crowding": TRAIN_OPERATIONS,
    # Coach condition: cleanliness, linen, electrical, repairs
    "cleanliness": TRAIN_MAINTENANCE, "bed roll": TRAIN_MAINTENANCE, "bed": TRAIN_MAINTENANCE,
    "electrical equipment": TRAIN_MAINTENANCE, "maintenance": TRAIN_MAINTENANCE,
    "poor condition": TRAIN_MAINTENANCE,
    # Catering, vending, drinking water
    "catering & vending service": FOOD_WATER, "food": FOOD_WATER, "food quality": FOOD_WATER,
    "water availability": FOOD_WATER,
    # Booking, fares, refunds
    "ticket booking": BOOKING_REFUND, "refund": BOOKING_REFUND, "ticket booking charge": BOOKING_REFUND,
    "difficulty in booking tickets": BOOKING_REFUND, "fare charges": BOOKING_REFUND,
    "ticket/ seat availability": BOOKING_REFUND,
    # TTE / staff conduct
    "staff behaviour": TICKET_TTE, "corruption / bribery": TICKET_TTE,
    # Everything vague, off-topic or non-routable
    "service": GENERAL_SUPPORT, "facility": GENERAL_SUPPORT, "facilities": GENERAL_SUPPORT,
    "miscellaneous": GENERAL_SUPPORT, "others": GENERAL_SUPPORT, "political": GENERAL_SUPPORT,
    "loss/found": GENERAL_SUPPORT, "medical assistance": GENERAL_SUPPORT,
    "request/suggestion": GENERAL_SUPPORT, "criticism": GENERAL_SUPPORT, "employee": GENERAL_SUPPORT,
    "logistics": GENERAL_SUPPORT, "service feedback": GENERAL_SUPPORT, "service quality": GENERAL_SUPPORT,
    "service issue": GENERAL_SUPPORT, "child labor and begging on train": GENERAL_SUPPORT,
    "petrol theft during vehicle parceling": GENERAL_SUPPORT,
    "opposition to the silverline project and ecological impact": GENERAL_SUPPORT,
}

# The dataset has no station-specific Type. Rows whose raw Type is a physical
# condition/amenity category AND whose text clearly talks about a station
# location are WEAKLY labelled STATION_MAINTENANCE (rule-derived, documented in
# the training report). Without this the class would have zero examples.
STATION_CANDIDATE_TYPES = {"cleanliness", "maintenance", "facility", "facilities", "poor condition"}
STATION_TEXT = re.compile(
    r"\b(platform|waiting\s*(?:hall|room)|escalator|lift|foot\s*over\s*bridge|fob|"
    r"railway\s+station|station\s+(?:toilet|washroom|cleanliness|dirty|facilit\w+))\b", re.I)


def map_row(raw_type: str, raw_text: str) -> str:
    t = (raw_type or "").strip().lower()
    if t not in TYPE_TO_DEPARTMENT:
        raise KeyError(f"Unmapped Type value: {raw_type!r}")
    if t in STATION_CANDIDATE_TYPES and STATION_TEXT.search(raw_text or ""):
        return STATION_MAINTENANCE
    return TYPE_TO_DEPARTMENT[t]
