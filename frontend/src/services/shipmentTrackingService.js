const OSRM_BASE_URL = "https://router.project-osrm.org";

const CITY_COORDINATES = {
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],

  chennai: [13.0827, 80.2707],

  hyderabad: [17.3850, 78.4867],

  mumbai: [19.0760, 72.8777],

  pune: [18.5204, 73.8567],

  delhi: [28.6139, 77.2090],

  jaipur: [26.9124, 75.7873],

  tumakuru: [13.3392, 77.1130],
  tumkur: [13.3392, 77.1130],

  kochi: [9.9312, 76.2673],

  coimbatore: [11.0168, 76.9558],

  vijayawada: [16.5062, 80.6480],

  visakhapatnam: [17.6868, 83.2185],

  rajahmundry: [17.0005, 81.8040],

  mysuru: [12.2958, 76.6394],
  mysore: [12.2958, 76.6394],

  lonavala: [18.7546, 73.4062],
};


function normalizePlaceName(place) {
  if (!place) {
    return "";
  }

  return place
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ");
}


function getKnownCityCoordinates(place) {
  const normalized = normalizePlaceName(place);

  if (!normalized) {
    return null;
  }

  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  return null;
}


async function geocodePlace(place) {
  const knownCoordinates =
    getKnownCityCoordinates(place);

  if (knownCoordinates) {
    return knownCoordinates;
  }

  if (!place?.trim()) {
    throw new Error("Location is empty.");
  }

  const url =
    "https://nominatim.openstreetmap.org/search";

  const params = new URLSearchParams({
    q: `${place}, India`,
    format: "json",
    limit: "1",
  });

  const response = await fetch(
    `${url}?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to find the shipment location."
    );
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(
      `Location not found: ${place}`
    );
  }

  return [
    Number(results[0].lat),
    Number(results[0].lon),
  ];
}


function validateCoordinates(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  );
}


function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "—";
  }

  if (distanceMeters >= 1000) {
    return `${(
      distanceMeters / 1000
    ).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}


function formatDuration(durationSeconds) {
  if (!Number.isFinite(durationSeconds)) {
    return "—";
  }

  const totalMinutes = Math.round(
    durationSeconds / 60
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}


function calculateEta(durationSeconds) {
  if (!Number.isFinite(durationSeconds)) {
    return null;
  }

  return new Date(
    Date.now() +
      durationSeconds * 1000
  );
}


export async function getShipmentRoute(
  shipment
) {
  if (!shipment) {
    throw new Error(
      "Shipment information is missing."
    );
  }

  let startCoordinates = null;

  const hasCurrentCoordinates =
  shipment.latitude !== null &&
  shipment.latitude !== undefined &&
  shipment.latitude !== "" &&
  shipment.longitude !== null &&
  shipment.longitude !== undefined &&
  shipment.longitude !== "";

const currentCoordinates = hasCurrentCoordinates
  ? [
      Number(shipment.latitude),
      Number(shipment.longitude),
    ]
  : null;

if (
  validateCoordinates(currentCoordinates)
) {
  startCoordinates =
    currentCoordinates;
} else {
  startCoordinates =
    await geocodePlace(
      shipment.origin
    );
}

  const destinationCoordinates =
    await geocodePlace(
      shipment.destination
    );

  if (
    !validateCoordinates(
      startCoordinates
    )
  ) {
    throw new Error(
      "Starting location coordinates are invalid."
    );
  }

  if (
    !validateCoordinates(
      destinationCoordinates
    )
  ) {
    throw new Error(
      "Destination coordinates are invalid."
    );
  }

  const startLongitude =
    startCoordinates[1];

  const startLatitude =
    startCoordinates[0];

  const destinationLongitude =
    destinationCoordinates[1];

  const destinationLatitude =
    destinationCoordinates[0];

  const coordinates = [
    `${startLongitude},${startLatitude}`,
    `${destinationLongitude},${destinationLatitude}`,
  ].join(";");

  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });

  const response = await fetch(
    `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      "Route service is currently unavailable."
    );
  }

  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error(
      data.message ||
        "No driving route was found."
    );
  }

  if (
    !data.routes ||
    data.routes.length === 0
  ) {
    throw new Error(
      "No route was found for this shipment."
    );
  }

  const route = data.routes[0];

  const routeCoordinates =
    route.geometry.coordinates.map(
      ([longitude, latitude]) => [
        latitude,
        longitude,
      ]
    );

  return {
    coordinates: routeCoordinates,

    distanceMeters:
      route.distance,

    durationSeconds:
      route.duration,

    distanceText:
      formatDistance(route.distance),

    durationText:
      formatDuration(route.duration),

    eta:
      calculateEta(route.duration),

    startCoordinates,

    destinationCoordinates,
  };
}


export function formatEta(value) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}