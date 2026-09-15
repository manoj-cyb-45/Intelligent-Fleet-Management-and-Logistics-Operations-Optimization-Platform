import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";


function MapRouteController({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(route) || route.length < 2) {
      return;
    }

    const validPoints = route.filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    );

    if (validPoints.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(
      validPoints.map((point) => [
        Number(point[0]),
        Number(point[1]),
      ])
    );

    map.fitBounds(bounds, {
      padding: [30, 30],
    });
  }, [map, route]);

  return null;
}


function ShipmentMap({
  shipment,
  optimizedRoute = [],
}) {
  const latitude = Number(shipment?.latitude);
  const longitude = Number(shipment?.longitude);

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const validRoute = Array.isArray(optimizedRoute)
    ? optimizedRoute.filter(
        (point) =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      )
    : [];

  const hasRoute = validRoute.length >= 2;

  const mapCenter = hasCoordinates
    ? [latitude, longitude]
    : hasRoute
    ? [
        Number(validRoute[0][0]),
        Number(validRoute[0][1]),
      ]
    : [20.5937, 78.9629];

  return (
    <div className="shipment-map-container">
      <MapContainer
        center={mapCenter}
        zoom={
          hasCoordinates
            ? 13
            : hasRoute
            ? 8
            : 5
        }
        scrollWheelZoom={true}
        className="shipment-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasRoute && (
          <>
            <MapRouteController
              route={validRoute}
            />

            <Polyline
              positions={validRoute.map(
                (point) => [
                  Number(point[0]),
                  Number(point[1]),
                ]
              )}
              pathOptions={{
                color: "#16a34a",
                weight: 5,
                opacity: 0.8,
              }}
            />
          </>
        )}

        {hasCoordinates && (
          <CircleMarker
            center={[
              latitude,
              longitude,
            ]}
            radius={10}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.8,
              weight: 3,
            }}
          >
            <Popup>
              <strong>
                {shipment?.shipment_id ||
                  "Shipment"}
              </strong>

              <br />

              Tracking:{" "}
              {shipment?.tracking_number ||
                "N/A"}

              <br />

              Location:{" "}
              {shipment?.current_location ||
                "Unknown"}

              <br />

              Latitude:{" "}
              {latitude.toFixed(6)}

              <br />

              Longitude:{" "}
              {longitude.toFixed(6)}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {!hasCoordinates && !hasRoute && (
        <div className="shipment-map-message">
          GPS coordinates are not available for
          this shipment.
        </div>
      )}
    </div>
  );
}


export default ShipmentMap;