const WS_BASE_URL = "ws://127.0.0.1:8000";


export function createShipmentWebSocket(
  shipmentId,
  {
    onOpen,
    onMessage,
    onError,
    onClose,
  } = {}
) {
  if (!shipmentId) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  const token =
    localStorage.getItem(
      "fleetflow_token"
    );

  if (!token) {
    throw new Error(
      "Authentication token is missing."
    );
  }

  const url =
    `${WS_BASE_URL}/shipments/ws/` +
    `${encodeURIComponent(shipmentId)}` +
    `?token=${encodeURIComponent(token)}`;

  const websocket =
    new WebSocket(url);

  websocket.onopen = () => {
    if (onOpen) {
      onOpen();
    }
  };

  websocket.onmessage = (event) => {
    try {
      const message =
        JSON.parse(event.data);

      if (onMessage) {
        onMessage(message);
      }
    } catch (error) {
      console.error(
        "Invalid WebSocket message:",
        error
      );
    }
  };

  websocket.onerror = (event) => {
    if (onError) {
      onError(event);
    }
  };

  websocket.onclose = (event) => {
    if (onClose) {
      onClose(event);
    }
  };

  return websocket;
}


export function sendShipmentLocationUpdate(
  websocket,
  {
    latitude,
    longitude,
    currentLocation,
  }
) {
  if (
    !websocket ||
    websocket.readyState !== WebSocket.OPEN
  ) {
    throw new Error(
      "WebSocket connection is not open."
    );
  }

  const latitudeNumber =
    Number(latitude);

  const longitudeNumber =
    Number(longitude);

  if (
    !Number.isFinite(latitudeNumber) ||
    latitudeNumber < -90 ||
    latitudeNumber > 90
  ) {
    throw new Error(
      "Latitude must be between -90 and 90."
    );
  }

  if (
    !Number.isFinite(longitudeNumber) ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  websocket.send(
    JSON.stringify({
      type: "location_update",
      latitude: latitudeNumber,
      longitude: longitudeNumber,
      current_location:
        currentLocation || null,
    })
  );
}


export function closeShipmentWebSocket(
  websocket
) {
  if (!websocket) {
    return;
  }

  if (
    websocket.readyState ===
      WebSocket.OPEN ||
    websocket.readyState ===
      WebSocket.CONNECTING
  ) {
    websocket.close();
  }
}