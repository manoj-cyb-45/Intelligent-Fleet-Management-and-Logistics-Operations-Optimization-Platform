import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import ShipmentMap from "../components/ShipmentMap";
import {
  closeShipmentWebSocket,
  createShipmentWebSocket,
} from "../services/shipmentWebSocketService";


function Shipments() {
  const { user } = useAuth();
  const isDriver = user?.role === "DRIVER";

  // =========================================================
  // STATE
  // =========================================================

  const emptyForm = {
    description: "",
    origin: "",
    destination: "",
    due_date: "",
    vehicle_id: "",
    driver_id: "",
    status: "PENDING",
    current_location: "",
    expected_delivery_at: "",
  };

  const [shipments, setShipments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedTrackingShipment, setSelectedTrackingShipment] =
    useState(null);

  const [shipmentHistory, setShipmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [shipmentForm, setShipmentForm] = useState(emptyForm);

  const [webSocketStatus, setWebSocketStatus] = useState("DISCONNECTED");
  const [webSocketError, setWebSocketError] = useState("");

  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [trafficLevel, setTrafficLevel] = useState("moderate");
  const [optimizeBy, setOptimizeBy] = useState("time");

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      // DRIVER can only access shipments
      if (isDriver) {
        const shipmentResponse = await api.get("/shipments");

        setShipments(shipmentResponse.data);
        setVehicles([]);
        setDrivers([]);

        return;
      }

      // ADMIN / MANAGER / DISPATCHER
      const [
        shipmentResponse,
        vehicleResponse,
        driverResponse,
      ] = await Promise.all([
        api.get("/shipments"),
        api.get("/vehicles"),
        api.get("/drivers"),
      ]);

      setShipments(shipmentResponse.data);
      setVehicles(vehicleResponse.data);
      setDrivers(driverResponse.data);
    } catch (err) {
      console.error("Failed to load shipment data:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load shipment data.");
      }
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);

      await loadData();

      setLoading(false);
    };

    initialLoad();
  }, [isDriver]);

  // =========================================================
  // REAL-TIME SHIPMENT TRACKING
  // =========================================================

  useEffect(() => {
    if (
      !showTrackingModal ||
      !selectedTrackingShipment?.shipment_id
    ) {
      setWebSocketStatus("DISCONNECTED");
      setWebSocketError("");

      return undefined;
    }

    let websocket = null;

    setWebSocketStatus("CONNECTING");
    setWebSocketError("");

    try {
      websocket = createShipmentWebSocket(
        selectedTrackingShipment.shipment_id,
        {
          onOpen: () => {
            setWebSocketStatus("CONNECTED");
            setWebSocketError("");
          },

          onMessage: (message) => {
            if (
              message.type === "tracking_connected" ||
              message.type === "location_updated"
            ) {
              setSelectedTrackingShipment((previous) => {
                if (!previous) {
                  return previous;
                }

                return {
                  ...previous,
                  latitude:
                    message.latitude ??
                    previous.latitude ??
                    null,

                  longitude:
                    message.longitude ??
                    previous.longitude ??
                    null,

                  current_location:
                    message.current_location ??
                    previous.current_location ??
                    null,

                  delivery_progress:
                    message.delivery_progress ??
                    previous.delivery_progress ??
                    0,

                  status:
                    message.status ??
                    previous.status,

                  updated_at:
                    message.updated_at ??
                    new Date().toISOString(),
                };
              });

              setShipments((previousShipments) =>
                previousShipments.map((shipment) => {
                  if (
                    shipment.shipment_id !==
                    selectedTrackingShipment.shipment_id
                  ) {
                    return shipment;
                  }

                  return {
                    ...shipment,

                    latitude:
                      message.latitude ??
                      shipment.latitude ??
                      null,

                    longitude:
                      message.longitude ??
                      shipment.longitude ??
                      null,

                    current_location:
                      message.current_location ??
                      shipment.current_location ??
                      null,

                    delivery_progress:
                      message.delivery_progress ??
                      shipment.delivery_progress ??
                      0,

                    status:
                      message.status ??
                      shipment.status,

                    updated_at:
                      message.updated_at ??
                      new Date().toISOString(),
                  };
                })
              );
            }

            if (message.type === "error") {
              setWebSocketError(
                message.message ||
                  "Unable to process tracking update."
              );
            }
          },

          onError: () => {
            setWebSocketStatus("ERROR");
            setWebSocketError(
              "Unable to connect to live shipment tracking."
            );
          },

          onClose: (event) => {
            setWebSocketStatus("DISCONNECTED");

            if (
              event?.code !== 1000 &&
              event?.code !== 1001
            ) {
              setWebSocketError(
                "Live tracking connection closed."
              );
            }
          },
        }
      );
    } catch (err) {
      console.error(
        "Failed to create shipment WebSocket:",
        err
      );

      setWebSocketStatus("ERROR");

      setWebSocketError(
        err.message ||
          "Unable to start live shipment tracking."
      );
    }

    return () => {
      closeShipmentWebSocket(websocket);
    };
  }, [
    showTrackingModal,
    selectedTrackingShipment?.shipment_id,
  ]);



  // =========================================================
// AUTOMATIC SHIPMENT LIST REFRESH
// =========================================================

useEffect(() => {
  const refreshShipmentList = async () => {
    try {
      const response = await api.get("/shipments");

      setShipments(response.data);

      setSelectedTrackingShipment((previous) => {
        if (!previous) {
          return previous;
        }

        const updatedShipment = response.data.find(
          (shipment) =>
            shipment.shipment_id ===
            previous.shipment_id
        );

        if (!updatedShipment) {
          return previous;
        }

        return {
          ...previous,
          ...updatedShipment,
        };
      });
    } catch (err) {
      console.error(
        "Failed to refresh shipment list:",
        err
      );
    }
  };

  const refreshInterval = setInterval(
    refreshShipmentList,
    3000
  );

  return () => {
    clearInterval(refreshInterval);
  };
}, []);
  // =========================================================
  // OPEN TRACKING
  // =========================================================

  const openTracking = (shipment) => {
    setSelectedTrackingShipment({
      ...shipment,
    });

    setOptimizedRoute([]);
    setRouteMetrics(null);
    setRouteError("");
    setTrafficLevel("moderate");
    setOptimizeBy("time");

    setWebSocketStatus("CONNECTING");
    setWebSocketError("");
    setShowTrackingModal(true);
  };

  // =========================================================
  // CLOSE TRACKING
  // =========================================================

  const closeTracking = () => {
    setShowTrackingModal(false);
    setSelectedTrackingShipment(null);
    setOptimizedRoute([]);
    setRouteMetrics(null);
    setRouteError("");
    setWebSocketStatus("DISCONNECTED");
    setWebSocketError("");
  };

  // =========================================================
  // ROUTE OPTIMIZATION
  // =========================================================

  const hasValidGpsCoordinates = () => {
    const latitude = Number(
      selectedTrackingShipment?.latitude
    );
    const longitude = Number(
      selectedTrackingShipment?.longitude
    );

    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      !(latitude === 0 && longitude === 0)
    );
  };

  const getStoredDestinationCoordinates = () => {
    const latitude = Number(
      selectedTrackingShipment?.destination_latitude
    );
    const longitude = Number(
      selectedTrackingShipment?.destination_longitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        "Stored destination coordinates are not available for this shipment."
      );
    }

    return {
      latitude,
      longitude,
    };
  };

  const getStoredOriginCoordinates = () => {
    const latitude = Number(
      selectedTrackingShipment?.origin_latitude
    );
    const longitude = Number(
      selectedTrackingShipment?.origin_longitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error(
        "Stored origin coordinates are not available for this shipment."
      );
    }

    return {
      latitude,
      longitude,
    };
  };

  const optimizeShipmentRoute = async () => {
    if (!selectedTrackingShipment) {
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRouteMetrics(null);

    try {
      const currentLatitude = Number(
        selectedTrackingShipment.latitude
      );
      const currentLongitude = Number(
        selectedTrackingShipment.longitude
      );

      let start;

      // Prefer the live GPS position when available.
      // Otherwise use the coordinates stored for the shipment origin.
      if (
        hasValidGpsCoordinates()
      ) {
        start = {
          latitude: currentLatitude,
          longitude: currentLongitude,
        };
      } else {
        start = getStoredOriginCoordinates();
      }

      // Destination coordinates were generated automatically when
      // the shipment was created and are now stored in PostgreSQL.
      const destination =
        getStoredDestinationCoordinates();

      const response = await api.post(
        "/route-optimizer/optimize",
        {
          start_lat: start.latitude,
          start_lng: start.longitude,
          end_lat: destination.latitude,
          end_lng: destination.longitude,
          optimize_by: optimizeBy,
          traffic_level: trafficLevel,
        }
      );

      setOptimizedRoute(response.data.route || []);
      setRouteMetrics(response.data);
    } catch (err) {
      console.error(
        "Failed to optimize shipment route:",
        err
      );

      setOptimizedRoute([]);
      setRouteMetrics(null);

      if (err.response?.data?.detail) {
        setRouteError(err.response.data.detail);
      } else {
        setRouteError(
          err.message ||
            "Unable to optimize shipment route."
        );
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const recalculateShipmentRoute = async () => {
    if (!selectedTrackingShipment) {
      return;
    }

    if (!hasValidGpsCoordinates()) {
      setRouteError(
        "Waiting for valid live GPS coordinates. Start or reconnect the GPS tracker and try again."
      );
      return;
    }

    const currentLatitude = Number(
      selectedTrackingShipment.latitude
    );
    const currentLongitude = Number(
      selectedTrackingShipment.longitude
    );

    setRouteLoading(true);
    setRouteError("");
    setRouteMetrics(null);

    try {
      // Recalculation uses the current live GPS position as the
      // start point and the stored destination coordinates.
      const destination =
        getStoredDestinationCoordinates();

      const response = await api.post(
        "/route-optimizer/recalculate",
        {
          start_lat: currentLatitude,
          start_lng: currentLongitude,
          end_lat: destination.latitude,
          end_lng: destination.longitude,
          optimize_by: optimizeBy,
          traffic_level: trafficLevel,
        }
      );

      setOptimizedRoute(response.data.route || []);
      setRouteMetrics(response.data);
    } catch (err) {
      console.error(
        "Failed to recalculate shipment route:",
        err
      );

      setOptimizedRoute([]);
      setRouteMetrics(null);

      if (err.response?.data?.detail) {
        setRouteError(err.response.data.detail);
      } else {
        setRouteError(
          err.message ||
            "Unable to recalculate shipment route."
        );
      }
    } finally {
      setRouteLoading(false);
    }
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700";

      case "CREATED":
        return "bg-slate-100 text-slate-700";

      case "ASSIGNED":
        return "bg-purple-100 text-purple-700";

      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-700";

      case "DELAYED":
        return "bg-orange-100 text-orange-700";

      case "DELIVERED":
        return "bg-green-100 text-green-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setShipmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  };

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddModal = () => {
    setShipmentForm({
      ...emptyForm,
      due_date: "",
    });

    setSelectedShipment(null);

    setError("");
    setSuccessMessage("");

    setShowAddModal(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditModal = (shipment) => {
    setSelectedShipment(shipment);

    setShipmentForm({
      description: shipment.description || "",
      origin: shipment.origin || "",
      destination: shipment.destination || "",
      due_date: formatDateTimeForInput(
        shipment.due_date
      ),
      vehicle_id: shipment.vehicle_id || "",
      driver_id: shipment.driver_id || "",
      status: shipment.status || "PENDING",
      current_location:
        shipment.current_location || "",
      expected_delivery_at:
        shipment.expected_delivery_at
          ? formatDateTimeForInput(
              shipment.expected_delivery_at
            )
          : "",
    });

    setError("");
    setSuccessMessage("");

    setShowEditModal(true);
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowAddModal(false);
    setShowEditModal(false);

    setSelectedShipment(null);

    setShipmentForm(emptyForm);

    setError("");
  };

  // =========================================================
  // AVAILABLE VEHICLES
  // =========================================================

  const getAvailableVehicles = () => {
    return vehicles.filter((vehicle) => {
      if (vehicle.current_status === "AVAILABLE") {
        return true;
      }

      if (
        showEditModal &&
        selectedShipment &&
        vehicle.vehicle_id ===
          selectedShipment.vehicle_id
      ) {
        return true;
      }

      return false;
    });
  };

  // =========================================================
  // AVAILABLE DRIVERS
  // =========================================================

  const getAvailableDrivers = () => {
    return drivers.filter((driver) => {
      if (driver.account_status !== "ACTIVE") {
        return false;
      }

      if (!driver.assigned_vehicle_id) {
        return true;
      }

      if (
        showEditModal &&
        selectedShipment &&
        driver.driver_id ===
          selectedShipment.driver_id
      ) {
        return true;
      }

      return false;
    });
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (!shipmentForm.origin.trim()) {
      setError("Origin is required.");
      return false;
    }

    if (!shipmentForm.destination.trim()) {
      setError("Destination is required.");
      return false;
    }

    if (!shipmentForm.due_date) {
      setError("Due date is required.");
      return false;
    }

    if (!shipmentForm.vehicle_id) {
      setError("Please select a vehicle.");
      return false;
    }

    if (!shipmentForm.driver_id) {
      setError("Please select a driver.");
      return false;
    }

    return true;
  };

  // =========================================================
  // ADD SHIPMENT
  // =========================================================

  const handleAddShipment = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        description:
          shipmentForm.description.trim() || null,
        origin: shipmentForm.origin.trim(),
        destination:
          shipmentForm.destination.trim(),
        due_date: shipmentForm.due_date,
        vehicle_id: shipmentForm.vehicle_id,
        driver_id: shipmentForm.driver_id,
      };

      await api.post("/shipments", payload);

      setShowAddModal(false);

      setShipmentForm(emptyForm);

      setSuccessMessage(
        "Shipment created successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to create shipment:",
        err
      );

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to create shipment.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE SHIPMENT
  // =========================================================

  const handleUpdateShipment = async (event) => {
    event.preventDefault();

    if (!selectedShipment) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      setSaving(true);

      const payload = {
        status: shipmentForm.status,
        current_location:
          shipmentForm.current_location.trim() ||
          null,
      };

      if (!isDriver) {
        payload.expected_delivery_at =
          shipmentForm.expected_delivery_at
            ? new Date(
                shipmentForm.expected_delivery_at
              ).toISOString()
            : null;
      }

      await api.put(
        `/shipments/${selectedShipment.shipment_id}`,
        payload
      );

      setShowEditModal(false);

      setSelectedShipment(null);

      setShipmentForm(emptyForm);

      setSuccessMessage(
        "Shipment updated successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to update shipment:",
        err
      );

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to update shipment.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // VIEW HISTORY
  // =========================================================

  const openHistory = async (shipment) => {
    setSelectedShipment(shipment);

    setShipmentHistory([]);

    setHistoryLoading(true);

    setError("");

    setShowHistoryModal(true);

    try {
      const response = await api.get(
        `/shipments/${shipment.shipment_id}/history`
      );

      setShipmentHistory(response.data);
    } catch (err) {
      console.error(
        "Failed to load shipment history:",
        err
      );

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          "Unable to load shipment history."
        );
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // CLOSE HISTORY
  // =========================================================

  const closeHistory = () => {
    setShowHistoryModal(false);

    setSelectedShipment(null);

    setShipmentHistory([]);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="shipments-loading">
        <h1 className="shipments-page-title">
          Shipments
        </h1>

        <div className="shipments-loading-card">
          <p className="shipments-loading-text">
            Loading shipments...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="shipments-page">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="shipments-page-header">
        <div>
          <h1 className="shipments-page-title">
            Shipments
          </h1>

          <p className="shipments-page-subtitle">
            Track and manage fleet shipments.
          </p>
        </div>

        <div className="shipments-header-actions">
          <div className="shipments-count-badge">
            <span className="shipments-count-text">
              {shipments.length} shipment
              {shipments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {!isDriver && (
            <button
              onClick={openAddModal}
              className="shipments-add-btn"
            >
              + Add Shipment
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="shipment-message shipment-error">
          <div className="shipment-message-inner">
            <p className="shipment-error-text">
              {error}
            </p>

            <button
              onClick={() => setError("")}
              className="shipment-dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          SUCCESS
          ===================================================== */}

      {successMessage && (
        <div className="shipment-message shipment-success">
          <p className="shipment-success-text">
            {successMessage}
          </p>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {shipments.length === 0 ? (
        <div className="shipment-empty-state">
          <p className="text-slate-500">
            No shipments found.
          </p>

          {!isDriver && (
            <button
              onClick={openAddModal}
              className="shipments-add-btn shipment-add-first"
            >
              + Add First Shipment
            </button>
          )}
        </div>
      ) : (
        /* ===================================================
           TABLE
           =================================================== */

        <div className="shipment-table-card">
          <div className="shipment-table-scroll">
            <table className="shipment-table">
              <thead className="shipment-table-head">
                <tr>
                  <th className="shipment-th">
                    Shipment
                  </th>

                  <th className="shipment-th">
                    Route
                  </th>

                  <th className="shipment-th">
                    Status
                  </th>

                  <th className="shipment-th">
                    Progress
                  </th>

                  <th className="shipment-th">
                    Location
                  </th>

                  <th className="shipment-th">
                    Vehicle
                  </th>

                  <th className="shipment-th">
                    Driver
                  </th>

                  <th className="shipment-th">
                    Due Date
                  </th>

                  <th className="shipment-th">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="shipment-table-body">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.shipment_id}
                    className="shipment-row"
                  >
                    {/* SHIPMENT */}

                    <td className="shipment-td">
                      <p className="shipment-id">
                        {shipment.shipment_id}
                      </p>

                      <p className="shipment-tracking">
                        {shipment.tracking_number}
                      </p>
                    </td>

                    {/* ROUTE */}

                    <td className="shipment-td">
                      <div className="shipment-route">
                        <p className="shipment-route-point">
                          {shipment.origin}
                        </p>

                        <p className="shipment-route-arrow">
                          ↓
                        </p>

                        <p className="shipment-route-point">
                          {shipment.destination}
                        </p>
                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="shipment-td">
                      <span
                        className={`shipment-status ${shipment.status.toLowerCase()}`}
                      >
                        {shipment.status.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    {/* PROGRESS */}

                    <td className="shipment-td shipment-progress-cell">
                      <div className="shipment-progress-wrap">
                        <div className="shipment-progress">
                          <div
                            className="shipment-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    shipment.delivery_progress ||
                                      0
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="shipment-progress-text">
                          {Number(shipment.delivery_progress || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* LOCATION */}

                    <td className="shipment-td shipment-muted-cell">
                      {shipment.current_location ||
                        "Not available"}
                    </td>

                    {/* VEHICLE */}

                    <td className="shipment-td">
                      <span className="shipment-entity">
                        {shipment.vehicle_id}
                      </span>
                    </td>

                    {/* DRIVER */}

                    <td className="shipment-td">
                      <span className="shipment-entity">
                        {shipment.driver_id}
                      </span>
                    </td>

                    {/* DUE DATE */}

                    <td className="shipment-td shipment-muted-cell">
                      {formatDate(
                        shipment.due_date
                      )}
                    </td>

                    {/* ACTIONS */}

                    <td className="shipment-td">
                      <div className="shipment-actions">
                        <button
                          onClick={() =>
                            openTracking(shipment)
                          }
                          className="shipment-btn shipment-btn-track"
                        >
                          Track
                        </button>

                        {shipment.status !==
                          "DELIVERED" &&
                          shipment.status !==
                            "CANCELLED" && (
                            <button
                              onClick={() =>
                                openEditModal(
                                  shipment
                                )
                              }
                              className="shipment-btn shipment-btn-edit"
                            >
                              Edit
                            </button>
                          )}

                        <button
                          onClick={() =>
                            openHistory(shipment)
                          }
                          className="shipment-btn shipment-btn-history"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================
          LIVE TRACKING MODAL
          ===================================================== */}

      {showTrackingModal &&
        selectedTrackingShipment && (
          <div className="shipment-modal-overlay">
            <div
              className="shipment-modal"
              style={{
                maxWidth: "1100px",
                width: "95%",
              }}
            >
              <ModalHeader
                title={`Live Tracking — ${selectedTrackingShipment.shipment_id}`}
                description={
                  selectedTrackingShipment.tracking_number ||
                  "Real-time shipment tracking"
                }
                onClose={closeTracking}
              />

              {/* CONNECTION STATUS */}

              <div
                className="mt-5 rounded-lg border px-4 py-3"
                style={{
                  borderColor:
                    webSocketStatus === "CONNECTED"
                      ? "#16a34a"
                      : webSocketStatus ===
                        "ERROR"
                      ? "#dc2626"
                      : "#64748b",
                  background:
                    webSocketStatus === "CONNECTED"
                      ? "rgba(22, 163, 74, 0.08)"
                      : webSocketStatus ===
                        "ERROR"
                      ? "rgba(220, 38, 38, 0.08)"
                      : "rgba(100, 116, 139, 0.08)",
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Live GPS Connection
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {webSocketStatus ===
                        "CONNECTED" &&
                        "Real-time location updates are active."}

                      {webSocketStatus ===
                        "CONNECTING" &&
                        "Connecting to shipment tracking..."}

                      {webSocketStatus ===
                        "DISCONNECTED" &&
                        "Tracking connection is disconnected."}

                      {webSocketStatus ===
                        "ERROR" &&
                        "Unable to establish live tracking."}
                    </p>
                  </div>

                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      color:
                        webSocketStatus ===
                        "CONNECTED"
                          ? "#16a34a"
                          : webSocketStatus ===
                            "ERROR"
                          ? "#dc2626"
                          : "#d97706",
                      background:
                        webSocketStatus ===
                        "CONNECTED"
                          ? "rgba(22, 163, 74, 0.12)"
                          : webSocketStatus ===
                            "ERROR"
                          ? "rgba(220, 38, 38, 0.12)"
                          : "rgba(217, 119, 6, 0.12)",
                    }}
                  >
                    {webSocketStatus}
                  </span>
                </div>
              </div>

              {/* WEBSOCKET ERROR */}

              {webSocketError && (
                <div className="mt-3 rounded-lg border border-red-700 bg-red-950/30 px-4 py-3">
                  <p className="text-xs text-red-300">
                    {webSocketError}
                  </p>
                </div>
              )}

              {/* SHIPMENT INFO */}

              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoItem
                  label="Shipment"
                  value={
                    selectedTrackingShipment.shipment_id
                  }
                />

                <InfoItem
                  label="Status"
                  value={
                    selectedTrackingShipment.status
                  }
                />

                <InfoItem
                  label="Progress"
                  value={`${Number(selectedTrackingShipment.delivery_progress || 0).toFixed(1)}%`}
                />

                <InfoItem
                  label="Location"
                  value={
                    selectedTrackingShipment.current_location ||
                    "Waiting for GPS"
                  }
                />
              </div>

              {/* GPS COORDINATES */}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <InfoItem
                  label="Latitude"
                  value={
                    hasValidGpsCoordinates()
                      ? Number(
                          selectedTrackingShipment.latitude
                        ).toFixed(6)
                      : "Waiting for GPS"
                  }
                />

                <InfoItem
                  label="Longitude"
                  value={
                    hasValidGpsCoordinates()
                      ? Number(
                          selectedTrackingShipment.longitude
                        ).toFixed(6)
                      : "Waiting for GPS"
                  }
                />
              </div>

              {/* MAP */}

              <div className="mt-5">
                <ShipmentMap
                  shipment={
                    selectedTrackingShipment
                  }
                  optimizedRoute={optimizedRoute}
                />
              </div>

              {/* ROUTE OPTIMIZATION */}

              <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Route Optimization
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Generate or recalculate the road route using
                      live GPS data and the coordinates stored with
                      the shipment.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="shipment-form-label">
                        Optimize By
                      </label>

                      <select
                        value={optimizeBy}
                        onChange={(event) =>
                          setOptimizeBy(event.target.value)
                        }
                        className="shipment-form-control"
                        disabled={routeLoading}
                      >
                        <option value="time">
                          Fastest Route
                        </option>

                        <option value="distance">
                          Shortest Route
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="shipment-form-label">
                        Traffic Level
                      </label>

                      <select
                        value={trafficLevel}
                        onChange={(event) =>
                          setTrafficLevel(event.target.value)
                        }
                        className="shipment-form-control"
                        disabled={routeLoading}
                      >
                        <option value="low">
                          Low
                        </option>

                        <option value="moderate">
                          Moderate
                        </option>

                        <option value="high">
                          High
                        </option>

                        <option value="severe">
                          Severe
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={optimizeShipmentRoute}
                      disabled={routeLoading}
                      className="shipment-btn shipment-btn-track"
                    >
                      {routeLoading
                        ? "Calculating..."
                        : "Optimize Route"}
                    </button>

                    <button
                      type="button"
                      onClick={recalculateShipmentRoute}
                      disabled={
                        routeLoading ||
                        !hasValidGpsCoordinates()
                      }
                      className="shipment-btn shipment-btn-edit"
                    >
                      {hasValidGpsCoordinates()
                        ? "Recalculate From GPS"
                        : "Waiting for GPS..."}
                    </button>
                  </div>

                  {routeError && (
                    <div className="rounded-lg border border-red-700 bg-red-950/30 px-4 py-3">
                      <p className="text-xs text-red-300">
                        {routeError}
                      </p>
                    </div>
                  )}

                  {routeMetrics && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <InfoItem
                        label="Route Distance"
                        value={`${routeMetrics.distance_km} km`}
                      />

                      <InfoItem
                        label="OSRM ETA"
                        value={`${routeMetrics.duration_min} min`}
                      />

                      <InfoItem
                        label="Traffic ETA"
                        value={`${routeMetrics.traffic_adjusted_duration_min} min`}
                      />

                      <InfoItem
                        label="Traffic"
                        value={routeMetrics.traffic_level}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* CLOSE */}

              <div className="shipment-history-close-wrap">
                <button
                  type="button"
                  onClick={closeTracking}
                  className="shipment-btn shipment-btn-close"
                >
                  Close Tracking
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          ADD MODAL
          ===================================================== */}

      {showAddModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal">
            <ModalHeader
              title="Add Shipment"
              description="Create a new fleet shipment."
              onClose={closeModal}
            />

            <form
              onSubmit={handleAddShipment}
              className="mt-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormInput
                    label="Description"
                    name="description"
                    value={
                      shipmentForm.description
                    }
                    onChange={handleChange}
                    placeholder="Shipment description"
                  />
                </div>

                <FormInput
                  label="Origin *"
                  name="origin"
                  value={shipmentForm.origin}
                  onChange={handleChange}
                  placeholder="Coimbatore"
                  required
                />

                <FormInput
                  label="Destination *"
                  name="destination"
                  value={
                    shipmentForm.destination
                  }
                  onChange={handleChange}
                  placeholder="Chennai"
                  required
                />

                <FormInput
                  label="Due Date *"
                  type="date"
                  name="due_date"
                  value={
                    shipmentForm.due_date
                  }
                  onChange={handleChange}
                  min={getTodayDate()}
                  required
                />

                <FormSelect
                  label="Vehicle *"
                  name="vehicle_id"
                  value={
                    shipmentForm.vehicle_id
                  }
                  onChange={handleChange}
                  options={getAvailableVehicles().map(
                    (vehicle) => ({
                      value:
                        vehicle.vehicle_id,
                      label: `${vehicle.vehicle_id} — ${vehicle.current_status}`,
                    })
                  )}
                  emptyLabel="Select a vehicle"
                />

                <FormSelect
                  label="Driver *"
                  name="driver_id"
                  value={
                    shipmentForm.driver_id
                  }
                  onChange={handleChange}
                  options={getAvailableDrivers().map(
                    (driver) => ({
                      value:
                        driver.driver_id,
                      label: `${driver.name} — ${driver.driver_id}`,
                    })
                  )}
                  emptyLabel="Select a driver"
                />
              </div>

              {getAvailableVehicles().length ===
                0 && (
                <div className="mt-5 rounded-lg border border-yellow-700 bg-yellow-950/40 px-4 py-3">
                  <p className="text-sm text-yellow-300">
                    No AVAILABLE vehicles are
                    currently available for
                    shipment assignment.
                  </p>
                </div>
              )}

              {getAvailableDrivers().length ===
                0 && (
                <div className="mt-3 rounded-lg border border-yellow-700 bg-yellow-950/40 px-4 py-3">
                  <p className="text-sm text-yellow-300">
                    No ACTIVE unassigned drivers
                    are currently available.
                  </p>
                </div>
              )}

              <ModalButtons
                onCancel={closeModal}
                saving={saving}
                submitText="Create Shipment"
              />
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          EDIT MODAL
          ===================================================== */}

      {showEditModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal">
            <ModalHeader
              title="Edit Shipment"
              description="Update shipment status and delivery information."
              onClose={closeModal}
            />

            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoItem
                  label="Shipment"
                  value={
                    selectedShipment?.shipment_id
                  }
                />

                <InfoItem
                  label="Tracking"
                  value={
                    selectedShipment?.tracking_number
                  }
                />

                <InfoItem
                  label="Vehicle"
                  value={
                    selectedShipment?.vehicle_id
                  }
                />

                <InfoItem
                  label="Driver"
                  value={
                    selectedShipment?.driver_id
                  }
                />
              </div>
            </div>

            <form
              onSubmit={handleUpdateShipment}
              className="mt-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormSelect
                  label="Status *"
                  name="status"
                  value={shipmentForm.status}
                  onChange={handleChange}
                  options={[
                    {
                      value: "PENDING",
                      label: "PENDING",
                    },
                    {
                      value: "CREATED",
                      label: "CREATED",
                    },
                    {
                      value: "ASSIGNED",
                      label: "ASSIGNED",
                    },
                    {
                      value: "IN_TRANSIT",
                      label: "IN TRANSIT",
                    },
                    {
                      value: "DELAYED",
                      label: "DELAYED",
                    },
                    {
                      value: "DELIVERED",
                      label: "DELIVERED",
                    },
                    {
                      value: "CANCELLED",
                      label: "CANCELLED",
                    },
                  ]}
                />

                <FormInput
                  label="Current Location"
                  name="current_location"
                  value={
                    shipmentForm.current_location
                  }
                  onChange={handleChange}
                  placeholder="Current location"
                />

                {!isDriver && (
                  <FormInput
                    label="Expected Delivery"
                    type="date"
                    name="expected_delivery_at"
                    value={
                      shipmentForm.expected_delivery_at
                    }
                    onChange={handleChange}
                    min={getTodayDate()}
                  />
                )}
              </div>

              <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                {shipmentForm.status ===
                  "PENDING" && (
                  <p className="text-xs text-slate-400">
                    Shipment is waiting to begin.
                  </p>
                )}

                {shipmentForm.status ===
                  "CREATED" && (
                  <p className="text-xs text-slate-400">
                    Shipment has been created and
                    is waiting for assignment.
                  </p>
                )}

                {shipmentForm.status ===
                  "ASSIGNED" && (
                  <p className="text-xs text-purple-300">
                    Shipment has been assigned to
                    a driver and vehicle.
                  </p>
                )}

                {shipmentForm.status ===
                  "IN_TRANSIT" && (
                  <p className="text-xs text-blue-300">
                    Shipment is currently in
                    transit. Starting time will be
                    recorded automatically by the
                    backend.
                  </p>
                )}

                {shipmentForm.status ===
                  "DELAYED" && (
                  <p className="text-xs text-orange-300">
                    Shipment is currently delayed.
                  </p>
                )}

                {shipmentForm.status ===
                  "DELIVERED" && (
                  <p className="text-xs text-green-300">
                    Delivered shipments are
                    automatically set to 100%
                    progress.
                  </p>
                )}

                {shipmentForm.status ===
                  "CANCELLED" && (
                  <p className="text-xs text-red-300">
                    Cancelling this shipment will
                    create a HIGH severity alert.
                  </p>
                )}
              </div>

              {isDriver && (
                <div className="mt-5 rounded-lg border border-blue-700 bg-blue-950/40 px-4 py-3">
                  <p className="text-xs text-blue-300">
                    Drivers can update the status
                    and current location of their
                    assigned shipment. Progress is
                    calculated automatically from
                    status.
                  </p>
                </div>
              )}

              <ModalButtons
                onCancel={closeModal}
                saving={saving}
                submitText="Save Changes"
              />
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          HISTORY MODAL
          ===================================================== */}

      {showHistoryModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal shipment-history-modal">
            <ModalHeader
              title="Shipment History"
              description={
                selectedShipment
                  ? `${selectedShipment.shipment_id} — ${selectedShipment.tracking_number}`
                  : ""
              }
              onClose={closeHistory}
            />

            {historyLoading ? (
              <div className="shipment-history-empty">
                <p className="text-slate-400">
                  Loading history...
                </p>
              </div>
            ) : shipmentHistory.length === 0 ? (
              <div className="shipment-history-empty">
                <p className="text-slate-400">
                  No history found.
                </p>
              </div>
            ) : (
              <div className="shipment-history-list">
                {shipmentHistory.map((item) => (
                  <div
                    key={item.history_id}
                    className="shipment-history-card"
                  >
                    <div className="shipment-history-row">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {item.status.replace(
                            "_",
                            " "
                          )}
                        </span>

                        <p className="shipment-history-title">
                          {item.description ||
                            "Shipment event"}
                        </p>

                        <p className="shipment-history-location">
                          Location:{" "}
                          {item.location ||
                            "Not specified"}
                        </p>
                      </div>

                      <p className="shipment-history-time">
                        {formatDateTime(
                          item.event_time
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="shipment-history-close-wrap">
              <button
                onClick={closeHistory}
                className="shipment-btn shipment-btn-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// =========================================================
// MODAL HEADER
// =========================================================

function ModalHeader({
  title,
  description,
  onClose,
}) {
  return (
    <div className="shipment-modal-header">
      <div>
        <h2 className="shipment-modal-title">
          {title}
        </h2>

        <p className="shipment-modal-description">
          {description}
        </p>
      </div>

      <button
        onClick={onClose}
        className="shipment-modal-close"
      >
        ×
      </button>
    </div>
  );
}


// =========================================================
// MODAL BUTTONS
// =========================================================

function ModalButtons({
  onCancel,
  saving,
  submitText,
}) {
  return (
    <div className="shipment-modal-actions">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="shipment-modal-btn shipment-cancel-btn"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="shipment-modal-btn shipment-save-btn"
      >
        {saving ? "Saving..." : submitText}
      </button>
    </div>
  );
}


// =========================================================
// FORM INPUT
// =========================================================

function FormInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  required = false,
  min,
  max,
  disabled = false,
}) {
  return (
    <div>
      <label className="shipment-form-label">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        disabled={disabled}
        className={`shipment-form-control ${
          disabled
            ? "shipment-form-disabled"
            : ""
        }`}
      />
    </div>
  );
}


// =========================================================
// FORM SELECT
// =========================================================

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  emptyLabel,
  disabled = false,
}) {
  return (
    <div>
      <label className="shipment-form-label">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`shipment-form-control ${
          disabled
            ? "shipment-form-disabled"
            : ""
        }`}
      >
        {emptyLabel && (
          <option value="">
            {emptyLabel}
          </option>
        )}

        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            );
          }

          return (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}


// =========================================================
// INFO ITEM
// =========================================================

function InfoItem({
  label,
  value,
}) {
  return (
    <div>
      <p className="shipment-info-label">
        {label}
      </p>

      <p className="shipment-info-value">
        {value || "—"}
      </p>
    </div>
  );
}


// =========================================================
// DATE FORMAT
// =========================================================

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}


// =========================================================
// DATE + TIME FORMAT
// =========================================================

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}


// =========================================================
// DATETIME-LOCAL FORMAT
// =========================================================

function formatDateTimeForInput(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hours = String(
    date.getHours()
  ).padStart(2, "0");

  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


export default Shipments;