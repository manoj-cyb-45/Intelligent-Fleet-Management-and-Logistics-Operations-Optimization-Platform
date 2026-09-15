# =========================================================
# SHIPMENT STATUS DEFINITIONS
# =========================================================

VALID_SHIPMENT_STATUSES = {
    "CREATED",
    "ASSIGNED",
    "IN_TRANSIT",
    "DELAYED",
    "DELIVERED",
    "CANCELLED",
}


# =========================================================
# DEFAULT PROGRESS BY STATUS
# =========================================================

STATUS_PROGRESS = {
    "CREATED": 0.0,
    "ASSIGNED": 10.0,
    "IN_TRANSIT": 50.0,
    "DELAYED": 50.0,
    "DELIVERED": 100.0,
    "CANCELLED": 0.0,
}


# =========================================================
# VALID STATUS TRANSITIONS
# =========================================================

VALID_STATUS_TRANSITIONS = {
    "CREATED": {
        "ASSIGNED",
        "CANCELLED",
    },

    "ASSIGNED": {
        "IN_TRANSIT",
        "CANCELLED",
    },

    "IN_TRANSIT": {
        "DELAYED",
        "DELIVERED",
        "CANCELLED",
    },

    "DELAYED": {
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
    },

    "DELIVERED": set(),

    "CANCELLED": set(),
}


# =========================================================
# STATUS DISPLAY LABELS
# =========================================================

STATUS_LABELS = {
    "CREATED": "Created",
    "ASSIGNED": "Assigned",
    "IN_TRANSIT": "In Transit",
    "DELAYED": "Delayed",
    "DELIVERED": "Delivered",
    "CANCELLED": "Cancelled",
}