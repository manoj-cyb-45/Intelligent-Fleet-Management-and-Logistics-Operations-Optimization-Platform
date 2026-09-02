import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

import { useEffect } from "react";


function RouteViewport({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (
      !coordinates ||
      coordinates.length === 0
    ) {
      return;
    }

    map.fitBounds(coordinates, {
      padding: [40, 40],
    });
  }, [coordinates, map]);

  return null;
}


function ShipmentMap({
  shipment,
  routeData,
}) {
  const latitude = Number(
    shipment?.latitude
  );

  const longitude = Number(
    shipment?.longitude
  );

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const routeCoordinates =
    routeData?.coordinates || [];

  const hasRoute =
    routeCoordinates.length > 1;

  const mapCenter = hasCoordinates
    ? [latitude, longitude]
    : routeCoordinates.length > 0
      ? routeCoordinates[0]
      : [20.5937, 78.9629];

  return (
    <div className="shipment-map-container">
      <MapContainer
        center={mapCenter}
        zoom={
          hasRoute
            ? 7
            : hasCoordinates
              ? 13
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
            <RouteViewport
              coordinates={routeCoordinates}
            />

            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#2563eb",
                weight: 5,
                opacity: 0.85,
              }}
            />

            <CircleMarker
              center={
                routeData.startCoordinates
              }
              radius={9}
              pathOptions={{
                color: "#16a34a",
                fillColor: "#16a34a",
                fillOpacity: 0.9,
                weight: 3,
              }}
            >
              <Popup>
                <strong>
                  Starting Location
                </strong>

                <br />

                {shipment?.origin || "Origin"}

                <br />

                Latitude:{" "}
                {Number(
                  routeData.startCoordinates[0]
                ).toFixed(6)}

                <br />

                Longitude:{" "}
                {Number(
                  routeData.startCoordinates[1]
                ).toFixed(6)}
              </Popup>
            </CircleMarker>

            <CircleMarker
              center={
                routeData.destinationCoordinates
              }
              radius={9}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#dc2626",
                fillOpacity: 0.9,
                weight: 3,
              }}
            >
              <Popup>
                <strong>
                  Destination
                </strong>

                <br />

                {shipment?.destination ||
                  "Destination"}

                <br />

                Latitude:{" "}
                {Number(
                  routeData.destinationCoordinates[0]
                ).toFixed(6)}

                <br />

                Longitude:{" "}
                {Number(
                  routeData.destinationCoordinates[1]
                ).toFixed(6)}
              </Popup>
            </CircleMarker>
          </>
        )}

        {!hasRoute &&
          hasCoordinates && (
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

      {!hasCoordinates &&
        !hasRoute && (
          <div className="shipment-map-message">
            GPS coordinates are not available
            for this shipment.
          </div>
        )}
    </div>
  );
}


export default ShipmentMap;