import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";

const OSRM_ROUTE_URL =
  "https://router.project-osrm.org/route/v1/driving";

function MapRouteController({ route }) {
  const map = useMap();

  /*
   * Only refit the map when the actual route changes.
   *
   * Live GPS updates cause ShipmentMap to re-render. The route array can
   * therefore receive a new reference even though the road route itself
   * has not changed. Using the route contents as the effect key prevents
   * every GPS update from resetting the user's zoom/pan position.
   */
  const routeKey = Array.isArray(route)
    ? route
        .filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1]))
        )
        .map(
          (point) =>
            `${Number(point[0]).toFixed(6)},${Number(
              point[1]
            ).toFixed(6)}`
        )
        .join("|")
    : "";

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
  }, [map, routeKey]);

  return null;
}

function ShipmentMap({
  shipment,
  optimizedRoute = [],
}) {
  const [automaticRoute, setAutomaticRoute] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const latitude = Number(shipment?.latitude);
  const longitude = Number(shipment?.longitude);

  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const originLatitude = Number(
    shipment?.origin_latitude
  );

  const originLongitude = Number(
    shipment?.origin_longitude
  );

  const destinationLatitude = Number(
    shipment?.destination_latitude
  );

  const destinationLongitude = Number(
    shipment?.destination_longitude
  );

  const hasStoredOrigin =
    Number.isFinite(originLatitude) &&
    Number.isFinite(originLongitude) &&
    !(originLatitude === 0 && originLongitude === 0);

  const hasStoredDestination =
    Number.isFinite(destinationLatitude) &&
    Number.isFinite(destinationLongitude) &&
    !(destinationLatitude === 0 && destinationLongitude === 0);

  /*
   * Automatically load the complete road route:
   *
   * Origin → Destination
   *
   * This happens when the tracking modal opens, so the user
   * does not have to click "Optimize Route" just to see the
   * shipment route on the map.
   */
  useEffect(() => {
    let cancelled = false;

    const loadAutomaticRoute = async () => {
      if (
        !hasStoredOrigin ||
        !hasStoredDestination
      ) {
        setAutomaticRoute([]);
        return;
      }

      /*
       * If the parent already supplied an optimized route,
       * don't make another automatic OSRM request.
       */
      if (
        Array.isArray(optimizedRoute) &&
        optimizedRoute.length >= 2
      ) {
        return;
      }

      setRouteLoading(true);

      try {
        const url =
          `${OSRM_ROUTE_URL}/` +
          `${originLongitude},${originLatitude};` +
          `${destinationLongitude},${destinationLatitude}` +
          `?overview=full&geometries=geojson&steps=false`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `OSRM route request failed with HTTP ${response.status}`
          );
        }

        const data = await response.json();

        if (
          data.code !== "Ok" ||
          !Array.isArray(data.routes) ||
          data.routes.length === 0
        ) {
          throw new Error(
            "No road route was returned by OSRM."
          );
        }

        const coordinates =
          data.routes[0]?.geometry?.coordinates || [];

        /*
         * OSRM returns:
         *
         * [longitude, latitude]
         *
         * Leaflet expects:
         *
         * [latitude, longitude]
         */
        const route = coordinates
          .map((point) => {
            if (
              !Array.isArray(point) ||
              point.length < 2
            ) {
              return null;
            }

            const lng = Number(point[0]);
            const lat = Number(point[1]);

            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng)
            ) {
              return null;
            }

            return [lat, lng];
          })
          .filter(Boolean);

        if (!cancelled) {
          setAutomaticRoute(route);
        }
      } catch (error) {
        console.error(
          "Failed to load automatic shipment route:",
          error
        );

        if (!cancelled) {
          setAutomaticRoute([]);
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    };

    loadAutomaticRoute();

    return () => {
      cancelled = true;
    };
  }, [
    shipment?.shipment_id,
    hasStoredOrigin,
    hasStoredDestination,
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude,
    optimizedRoute,
  ]);

  const validOptimizedRoute =
    Array.isArray(optimizedRoute)
      ? optimizedRoute.filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1]))
        )
      : [];

  const validAutomaticRoute =
    Array.isArray(automaticRoute)
      ? automaticRoute.filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1]))
        )
      : [];

  /*
   * Priority:
   *
   * 1. Recalculated/optimized route
   * 2. Automatically generated origin → destination route
   */
  const validRoute =
    validOptimizedRoute.length >= 2
      ? validOptimizedRoute
      : validAutomaticRoute;

  const hasRoute = validRoute.length >= 2;

  /*
   * Use live GPS as the map center when available.
   * Otherwise use the route's first point.
   */
  const mapCenter = hasCoordinates
    ? [latitude, longitude]
    : hasRoute
    ? [
        Number(validRoute[0][0]),
        Number(validRoute[0][1]),
      ]
    : hasStoredOrigin
    ? [originLatitude, originLongitude]
    : [20.5937, 78.9629];

  /*
   * Use a wider initial zoom when displaying the complete
   * Bengaluru → Chennai route.
   */
  const mapZoom = hasCoordinates
    ? 13
    : hasRoute
    ? 7
    : hasStoredOrigin
    ? 12
    : 5;

  return (
    <div className="shipment-map-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
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
                opacity: 0.85,
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

        {hasStoredOrigin && (
          <CircleMarker
            center={[
              originLatitude,
              originLongitude,
            ]}
            radius={6}
            pathOptions={{
              color: "#16a34a",
              fillColor: "#16a34a",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>Shipment Origin</strong>

              <br />

              {shipment?.origin ||
                "Origin"}
            </Popup>
          </CircleMarker>
        )}

        {hasStoredDestination && (
          <CircleMarker
            center={[
              destinationLatitude,
              destinationLongitude,
            ]}
            radius={7}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#dc2626",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>
                Shipment Destination
              </strong>

              <br />

              {shipment?.destination ||
                "Destination"}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {!hasCoordinates &&
        !hasRoute &&
        !hasStoredOrigin && (
          <div className="shipment-map-message">
            GPS coordinates are not available for
            this shipment.
          </div>
        )}

      {routeLoading && (
        <div
          style={{
            position: "absolute",
            left: "12px",
            bottom: "12px",
            zIndex: 1000,
            padding: "6px 10px",
            borderRadius: "6px",
            background: "rgba(15, 23, 42, 0.9)",
            color: "#cbd5e1",
            fontSize: "12px",
          }}
        >
          Loading road route...
        </div>
      )}
    </div>
  );
}

export default ShipmentMap;