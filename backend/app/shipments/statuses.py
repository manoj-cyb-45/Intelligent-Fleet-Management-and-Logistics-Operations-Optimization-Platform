VALID_SHIPMENT_STATUSES = {
    "PENDING",
    "ASSIGNED",
    "IN_TRANSIT",
    "DELAYED",
    "DELIVERED",
    "CANCELLED",
}

STATUS_PROGRESS = {
    "PENDING": 0.0,
    "ASSIGNED": 15.0,
    "IN_TRANSIT": 60.0,
    "DELAYED": 35.0,
    "DELIVERED": 100.0,
    "CANCELLED": 0.0,
}

VALID_TRANSITIONS = {
    "PENDING": {"ASSIGNED", "CANCELLED"},
    "ASSIGNED": {"PENDING", "IN_TRANSIT", "DELAYED", "CANCELLED"},
    "IN_TRANSIT": {"DELAYED", "DELIVERED", "CANCELLED"},
    "DELAYED": {"ASSIGNED", "IN_TRANSIT", "PENDING", "CANCELLED"},
    "DELIVERED": set(),
    "CANCELLED": set(),
}


def normalize_status(status: str | None) -> str:
    return str(status or "").strip().upper()


def is_valid_status(status: str | None) -> bool:
    return normalize_status(status) in VALID_SHIPMENT_STATUSES


def calculate_delivery_progress(status: str | None) -> float:
    normalized = normalize_status(status)
    if normalized not in STATUS_PROGRESS:
        return 0.0
    return float(STATUS_PROGRESS[normalized])


def can_transition(current_status: str | None, next_status: str | None) -> bool:
    current = normalize_status(current_status)
    next = normalize_status(next_status)

    if current == next:
        return True

    if current not in VALID_SHIPMENT_STATUSES or next not in VALID_SHIPMENT_STATUSES:
        return False

    if current == "DELIVERED" or current == "CANCELLED":
        return False

    return next in VALID_TRANSITIONS.get(current, set())
