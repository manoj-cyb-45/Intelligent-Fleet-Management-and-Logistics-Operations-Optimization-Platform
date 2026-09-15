import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";


function ShipmentMap({ shipment }) {
  const latitude = Number(shipment?.latitude);
  const longitude = Number(shipment?.longitude);

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const mapCenter = hasCoordinates
    ? [latitude, longitude]
    : [20.5937, 78.9629];

  return (
    <div className="shipment-map-container">
      <MapContainer
        center={mapCenter}
        zoom={hasCoordinates ? 13 : 5}
        scrollWheelZoom={true}
        className="shipment-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasCoordinates && (
          <CircleMarker
            center={[latitude, longitude]}
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
                {shipment?.shipment_id || "Shipment"}
              </strong>

              <br />

              Tracking:{" "}
              {shipment?.tracking_number || "N/A"}

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

      {!hasCoordinates && (
        <div className="shipment-map-message">
          GPS coordinates are not available for this
          shipment.
        </div>
      )}
    </div>
  );
}


export default ShipmentMap;