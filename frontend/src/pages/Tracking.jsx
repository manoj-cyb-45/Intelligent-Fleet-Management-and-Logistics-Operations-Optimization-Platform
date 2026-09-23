import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "../styles/tracking.css";
import api from "../services/api";

const DEFAULT_CENTER = [12.9716, 77.5946];
const REFRESH_INTERVAL = 5000;

function Tracking() {
  const [vehicles, setVehicles] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [liveUpdates, setLiveUpdates] = useState(0);
  const [lastSync, setLastSync] = useState(null);

  const loadTrackingData = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      }

      const [vehiclesResponse, shipmentsResponse] = await Promise.all([
        api.get("/vehicles"),
        api.get("/shipments"),
      ]);

      const nextVehicles = Array.isArray(vehiclesResponse.data)
        ? vehiclesResponse.data
        : [];

      const nextShipments = Array.isArray(shipmentsResponse.data)
        ? shipmentsResponse.data
        : [];

      setVehicles(nextVehicles);
      setShipments(nextShipments);

      if (!initial) {
        setLiveUpdates((count) => count + 1);
      }
      setConnected(true);
      setError("");
      setLastSync(new Date());
    } catch (err) {
      console.error("Failed to load live tracking data:", err);
      setConnected(false);
      setError(
        err.response?.data?.detail ||
          "Unable to load live fleet tracking data."
      );
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTrackingData(true);

    const interval = window.setInterval(() => {
      loadTrackingData(false);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(interval);
  }, [loadTrackingData]);

  const activeVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) =>
        ["ASSIGNED", "IN_TRANSIT"].includes(vehicle.current_status)
      ),
    [vehicles]
  );

  const inTransitVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) => vehicle.current_status === "IN_TRANSIT"
      ),
    [vehicles]
  );

  const trackedVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.current_status !== "RETIRED" &&
          Number.isFinite(Number(vehicle.latitude)) &&
          Number.isFinite(Number(vehicle.longitude))
      ),
    [vehicles]
  );

  const activeShipments = useMemo(
    () =>
      shipments.filter((shipment) =>
        ["IN_TRANSIT", "DELAYED"].includes(shipment.status)
      ),
    [shipments]
  );

  const shipmentByVehicle = useMemo(() => {
    const map = new Map();

    activeShipments.forEach((shipment) => {
      if (shipment.vehicle_id) {
        map.set(shipment.vehicle_id, shipment);
      }
    });

    return map;
  }, [activeShipments]);

  const mapCenter = useMemo(() => {
    const first = trackedVehicles[0];

    if (first) {
      return [Number(first.latitude), Number(first.longitude)];
    }

    return DEFAULT_CENTER;
  }, [trackedVehicles]);

  return (
    <div className="tracking-page">
      <div className="tracking-page-header">
        <div>
          <span className="eyebrow">REAL-TIME OPERATIONS</span>
          <h1>Live Tracking</h1>
          <p>
            Monitor vehicle locations, movement, shipment progress and
            GPS activity from one map.
          </p>
        </div>

        <div className={`tracking-status ${connected ? "online" : "offline"}`}>
          <span className="tracking-status-dot" />
          <span>
            {connected ? "GPS DATA CONNECTED" : "GPS DATA OFFLINE"}
          </span>
        </div>
      </div>

      <div className="tracking-summary-grid">
        <SummaryCard
          label="ACTIVE VEHICLES"
          value={activeVehicles.length}
          subtext={`${vehicles.length} total vehicles`}
          tone="blue"
        />

        <SummaryCard
          label="IN TRANSIT"
          value={inTransitVehicles.length}
          subtext={`${activeShipments.length} active shipments`}
          tone="green"
        />

        <SummaryCard
          label="LIVE UPDATES"
          value={liveUpdates}
          subtext={
            lastSync
              ? `Last sync ${lastSync.toLocaleTimeString()}`
              : "Waiting for GPS data"
          }
          tone="cyan"
        />

        <SummaryCard
          label="GPS STATUS"
          value={connected ? "ONLINE" : "OFFLINE"}
          subtext={
            connected
              ? "FleetFlow simulator / GPS API"
              : "Waiting for backend data"
          }
          tone={connected ? "green" : "amber"}
          status
        />
      </div>

      <section className="tracking-map-panel">
        <div className="tracking-map-header">
          <div>
            <span className="eyebrow">FLEET MAP</span>
            <h2>Vehicle Locations</h2>
            <p>
              Vehicle coordinates are synchronized from FleetFlow's GPS
              simulator and tracking API.
            </p>
          </div>

          <div className="tracking-map-legend">
            <LegendItem className="available" label="Available" />
            <LegendItem className="moving" label="In Transit" />
            <LegendItem className="assigned" label="Assigned" />
            <LegendItem className="delayed" label="Delayed" />
            <LegendItem className="maintenance" label="Maintenance" />
          </div>
        </div>

        <div className="tracking-map-container">
          <MapContainer
            center={mapCenter}
            zoom={12}
            scrollWheelZoom={true}
            zoomControl={false}
            className="fleet-map"
          >
            <ZoomControl position="bottomright" />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {trackedVehicles.map((vehicle) => {
              const shipment = shipmentByVehicle.get(vehicle.vehicle_id);
              const statusClass = getVehicleMarkerClass(
                vehicle.current_status
              );

              return (
                <CircleMarker
                  key={vehicle.vehicle_id}
                  center={[
                    Number(vehicle.latitude),
                    Number(vehicle.longitude),
                  ]}
                  radius={8}
                  pathOptions={getMarkerStyle(statusClass)}
                >
                  <Popup>
                    <div className="tracking-popup">
                      <strong>{vehicle.vehicle_id}</strong>
                      <span>
                        {vehicle.registration_number || "No registration"}
                      </span>

                      <div className="tracking-popup-grid">
                        <div>
                          <small>Status</small>
                          <b>
                            {formatStatus(vehicle.current_status)}
                          </b>
                        </div>

                        <div>
                          <small>Driver</small>
                          <b>{vehicle.driver_id || "Unassigned"}</b>
                        </div>

                        <div>
                          <small>Location</small>
                          <b>
                            {vehicle.current_location || "GPS position"}
                          </b>
                        </div>

                        <div>
                          <small>Speed</small>
                          <b>
                            {vehicle.gps_speed != null
                              ? `${Number(vehicle.gps_speed).toFixed(1)}`
                              : "—"}
                          </b>
                        </div>
                      </div>

                      {shipment && (
                        <div className="tracking-popup-shipment">
                          <strong>{shipment.shipment_id}</strong>
                          <span>
                            {Number(
                              shipment.delivery_progress || 0
                            ).toFixed(1)}
                            % •{" "}
                            {shipment.current_location ||
                              shipment.destination}
                          </span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {(trackedVehicles.length === 0 || error) && (
            <div className="tracking-map-overlay">
              <div className="tracking-map-overlay-icon">GPS</div>
              <div>
                <strong>
                  {error
                    ? "Tracking data unavailable"
                    : loading
                    ? "Loading fleet positions..."
                    : "No GPS positions available"}
                </strong>
                <span>
                  {error
                    ? error
                    : "Start an IN_PROGRESS trip to begin automatic GPS movement."}
                </span>
                {error && (
                  <button
                    type="button"
                    className="tracking-map-retry"
                    onClick={() => loadTrackingData(true)}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="tracking-vehicles-panel">
        <div className="tracking-section-header">
          <div>
            <span className="eyebrow">FLEET STATUS</span>
            <h2>Tracked Vehicles</h2>
            <p>
              Current vehicle status, driver assignment and latest GPS
              position.
            </p>
          </div>

          <span className="tracking-device-count">
            {trackedVehicles.length}/{vehicles.length} GPS positions
          </span>
        </div>

        {vehicles.length === 0 ? (
          <div className="tracking-empty-state">
            <div className="tracking-empty-icon">GPS</div>
            <strong>No vehicles available</strong>
            <p>
              Vehicle data will appear here when the backend is
              connected.
            </p>
          </div>
        ) : (
          <div className="tracking-vehicle-list">
            {vehicles.map((vehicle) => {
              const shipment = shipmentByVehicle.get(vehicle.vehicle_id);

              return (
                <div
                  key={vehicle.vehicle_id}
                  className="tracking-vehicle-row"
                >
                  <div className="tracking-vehicle-main">
                    <span
                      className={`tracking-vehicle-dot ${getVehicleMarkerClass(
                        vehicle.current_status
                      )}`}
                    />
                    <div>
                      <strong>{vehicle.vehicle_id}</strong>
                      <span>
                        {vehicle.registration_number || "No registration"}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`tracking-vehicle-status ${getVehicleMarkerClass(
                      vehicle.current_status
                    )}`}
                  >
                    {formatStatus(vehicle.current_status)}
                  </span>

                  <div className="tracking-vehicle-detail">
                    <small>Driver</small>
                    <strong>{vehicle.driver_id || "Unassigned"}</strong>
                  </div>

                  <div className="tracking-vehicle-detail">
                    <small>Location</small>
                    <strong>
                      {vehicle.current_location || "No GPS position"}
                    </strong>
                  </div>

                  <div className="tracking-vehicle-detail">
                    <small>Shipment</small>
                    <strong>
                      {shipment?.shipment_id || "—"}
                    </strong>
                  </div>

                  <div className="tracking-vehicle-detail tracking-vehicle-gps">
                    <small>GPS</small>
                    <strong>
                      {vehicle.latitude != null &&
                      vehicle.longitude != null
                        ? `${Number(vehicle.latitude).toFixed(4)}, ${Number(
                            vehicle.longitude
                          ).toFixed(4)}`
                        : "No coordinates"}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  tone,
  status = false,
}) {
  return (
    <div className={`tracking-summary-card ${tone}`}>
      <span className="tracking-summary-label">{label}</span>
      <strong className={status ? "tracking-summary-status" : ""}>
        {value}
      </strong>
      <span className="tracking-summary-subtext">{subtext}</span>
    </div>
  );
}

function LegendItem({ className, label }) {
  return (
    <div className="map-legend-item">
      <span className={`map-legend-dot ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function formatStatus(status) {
  return String(status || "UNKNOWN")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getVehicleMarkerClass(status) {
  switch (status) {
    case "IN_TRANSIT":
      return "moving";
    case "ASSIGNED":
      return "assigned";
    case "DELAYED":
      return "delayed";
    case "MAINTENANCE":
      return "maintenance";
    case "RETIRED":
      return "retired";
    default:
      return "available";
  }
}

function getMarkerStyle(statusClass) {
  const styles = {
    moving: {
      color: "#10b981",
      fillColor: "#10b981",
      fillOpacity: 0.92,
      weight: 3,
    },
    assigned: {
      color: "#8b5cf6",
      fillColor: "#8b5cf6",
      fillOpacity: 0.92,
      weight: 3,
    },
    delayed: {
      color: "#f59e0b",
      fillColor: "#f59e0b",
      fillOpacity: 0.92,
      weight: 3,
    },
    maintenance: {
      color: "#ef4444",
      fillColor: "#ef4444",
      fillOpacity: 0.9,
      weight: 3,
    },
    retired: {
      color: "#64748b",
      fillColor: "#64748b",
      fillOpacity: 0.75,
      weight: 2,
    },
    available: {
      color: "#3b82f6",
      fillColor: "#3b82f6",
      fillOpacity: 0.9,
      weight: 3,
    },
  };

  return styles[statusClass] || styles.available;
}

export default Tracking;
