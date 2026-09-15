import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "../styles/tracking.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

function Tracking() {
  return (
    <div className="tracking-page">

      {/* =====================================================
          PAGE HEADER
         ===================================================== */}

      <div className="tracking-page-header">
        <div>
          <span className="eyebrow">REAL-TIME OPERATIONS</span>

          <h1>Live Tracking</h1>

          <p>
            Monitor vehicle locations, routes, movement and delivery
            progress from one map.
          </p>
        </div>

        <div className="tracking-status">
          <span className="tracking-status-dot" />
          <span>GPS CONNECTING</span>
        </div>
      </div>

      {/* =====================================================
          TRACKING SUMMARY
         ===================================================== */}

      <div className="tracking-summary-grid">

        <div className="tracking-summary-card">
          <span className="tracking-summary-label">
            ACTIVE VEHICLES
          </span>

          <strong>0</strong>

          <span className="tracking-summary-subtext">
            Waiting for GPS connection
          </span>
        </div>

        <div className="tracking-summary-card">
          <span className="tracking-summary-label">
            IN TRANSIT
          </span>

          <strong>0</strong>

          <span className="tracking-summary-subtext">
            Vehicles currently moving
          </span>
        </div>

        <div className="tracking-summary-card">
          <span className="tracking-summary-label">
            LIVE UPDATES
          </span>

          <strong>0</strong>

          <span className="tracking-summary-subtext">
            WebSocket updates received
          </span>
        </div>

        <div className="tracking-summary-card">
          <span className="tracking-summary-label">
            GPS STATUS
          </span>

          <strong className="tracking-summary-status">
            OFFLINE
          </strong>

          <span className="tracking-summary-subtext">
            Traccar connection pending
          </span>
        </div>

      </div>

      {/* =====================================================
          MAP SECTION
         ===================================================== */}

      <section className="tracking-map-panel">

        <div className="tracking-map-header">

          <div>
            <span className="eyebrow">FLEET MAP</span>

            <h2>Vehicle Locations</h2>

            <p>
              Live vehicle positions will appear here once the GPS
              service is connected.
            </p>
          </div>

          <div className="tracking-map-legend">

            <div className="map-legend-item">
              <span className="map-legend-dot available" />
              <span>Available</span>
            </div>

            <div className="map-legend-item">
              <span className="map-legend-dot moving" />
              <span>Moving</span>
            </div>

            <div className="map-legend-item">
              <span className="map-legend-dot delayed" />
              <span>Delayed</span>
            </div>

          </div>

        </div>

        <div className="tracking-map-container">

          <MapContainer
            center={DEFAULT_CENTER}
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

            {/* Temporary center marker.
                This is NOT a vehicle marker.
                Real vehicle markers will be supplied by Traccar. */}

            <CircleMarker
              center={DEFAULT_CENTER}
              radius={7}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.9,
                weight: 3,
              }}
            >
              <Popup>
                <strong>FleetFlow Tracking Center</strong>
                <br />
                Waiting for live GPS devices.
              </Popup>
            </CircleMarker>

          </MapContainer>

          {/* =================================================
              MAP OVERLAY
             ================================================= */}

          <div className="tracking-map-overlay">

            <div className="tracking-map-overlay-icon">
              GPS
            </div>

            <div>
              <strong>Live GPS connection pending</strong>

              <span>
                Vehicle positions will appear automatically when
                Traccar is connected.
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          VEHICLE TRACKING LIST
         ===================================================== */}

      <section className="tracking-vehicles-panel">

        <div className="tracking-section-header">
          <div>
            <span className="eyebrow">TRACKING DEVICES</span>

            <h2>Tracked Vehicles</h2>

            <p>
              Connected GPS devices and their latest positions.
            </p>
          </div>

          <span className="tracking-device-count">
            0 devices
          </span>
        </div>

        <div className="tracking-empty-state">

          <div className="tracking-empty-icon">
            GPS
          </div>

          <strong>No live vehicles yet</strong>

          <p>
            Connect Traccar and assign GPS devices to vehicles to
            start receiving real-time location data.
          </p>

        </div>

      </section>

    </div>
  );
}

export default Tracking;