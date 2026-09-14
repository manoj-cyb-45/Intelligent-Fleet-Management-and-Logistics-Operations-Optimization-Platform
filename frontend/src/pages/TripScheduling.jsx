import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function TripScheduling() {
  const { user } = useAuth();
  const isDriver = user?.role === "DRIVER";

  // =========================================================
  // STATE
  // =========================================================

  const emptyScheduleForm = {
    origin: "",
    destination: "",
    scheduled_start_time: "",
    expected_delivery_at: "",
    vehicle_id: "",
    driver_id: "",
    description: "",
  };

  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showStartTripModal, setShowStartTripModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [startTripForm, setStartTripForm] = useState({ current_location: "", notes: "" });

  const [tripHistory, setTripHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Real-time Availability & Conflict State
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [conflictError, setConflictError] = useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      if (isDriver) {
        const schedRes = await api.get("/shipments/schedules");
        setSchedules(schedRes.data);
        setVehicles([]);
        setDrivers([]);
        return;
      }

      const [schedRes, vehRes, drvRes] = await Promise.all([
        api.get("/shipments/schedules"),
        api.get("/vehicles"),
        api.get("/drivers"),
      ]);

      setSchedules(schedRes.data);
      setVehicles(vehRes.data);
      setDrivers(drvRes.data);
    } catch (err) {
      console.error("Failed to load scheduling data:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load trip schedules.");
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    init();
  }, [isDriver]);

  // =========================================================
  // LIVE CONFLICT & AVAILABILITY CHECKER
  // =========================================================

  const checkLiveAvailability = async (startTime, endTime, vehicleId, driverId, excludeId = null) => {
    if (!startTime || !endTime) {
      setAvailabilityData(null);
      setConflictError("");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      setConflictError("Start time must be earlier than expected delivery time.");
      setAvailabilityData(null);
      return;
    }

    setConflictError("");
    setAvailabilityLoading(true);

    try {
      const payload = {
        scheduled_start_time: startDate.toISOString(),
        expected_delivery_at: endDate.toISOString(),
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        exclude_shipment_id: excludeId || null,
      };

      const res = await api.post("/shipments/check-availability", payload);
      setAvailabilityData(res.data);

      if (vehicleId && res.data.vehicle && !res.data.vehicle.available) {
        setConflictError(`Vehicle Conflict: ${res.data.vehicle.reason}`);
      } else if (driverId && res.data.driver && !res.data.driver.available) {
        setConflictError(`Driver Conflict: ${res.data.driver.reason}`);
      } else {
        setConflictError("");
      }
    } catch (err) {
      console.error("Availability check failed:", err);
      if (err.response?.data?.detail) {
        setConflictError(err.response.data.detail);
      }
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Form input change handler
  const handleScheduleFormChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...scheduleForm, [name]: value };
    setScheduleForm(updatedForm);
    setError("");

    if (
      name === "scheduled_start_time" ||
      name === "expected_delivery_at" ||
      name === "vehicle_id" ||
      name === "driver_id"
    ) {
      checkLiveAvailability(
        updatedForm.scheduled_start_time,
        updatedForm.expected_delivery_at,
        updatedForm.vehicle_id,
        updatedForm.driver_id,
        selectedTrip?.shipment_id
      );
    }
  };

  // =========================================================
  // SCHEDULE TRIP
  // =========================================================

  const openScheduleModal = () => {
    const defaultStart = new Date();
    defaultStart.setMinutes(defaultStart.getMinutes() + 30);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultEnd.getHours() + 4);

    const initial = {
      ...emptyScheduleForm,
      scheduled_start_time: formatDateTimeForInput(defaultStart),
      expected_delivery_at: formatDateTimeForInput(defaultEnd),
    };

    setScheduleForm(initial);
    setSelectedTrip(null);
    setAvailabilityData(null);
    setConflictError("");
    setError("");
    setSuccessMessage("");
    setShowScheduleModal(true);

    checkLiveAvailability(initial.scheduled_start_time, initial.expected_delivery_at, null, null);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!scheduleForm.origin.trim() || !scheduleForm.destination.trim()) {
      setError("Origin and destination are required.");
      return;
    }
    if (!scheduleForm.scheduled_start_time || !scheduleForm.expected_delivery_at) {
      setError("Scheduled start and expected delivery times are required.");
      return;
    }
    if (!scheduleForm.vehicle_id) {
      setError("Please select a vehicle.");
      return;
    }
    if (!scheduleForm.driver_id) {
      setError("Please select a driver.");
      return;
    }

    if (conflictError) {
      setError(conflictError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        origin: scheduleForm.origin.trim(),
        destination: scheduleForm.destination.trim(),
        scheduled_start_time: new Date(scheduleForm.scheduled_start_time).toISOString(),
        expected_delivery_at: new Date(scheduleForm.expected_delivery_at).toISOString(),
        vehicle_id: scheduleForm.vehicle_id,
        driver_id: scheduleForm.driver_id,
        description: scheduleForm.description.trim() || null,
      };

      await api.post("/shipments/schedule", payload);
      setShowScheduleModal(false);
      setScheduleForm(emptyScheduleForm);
      setSuccessMessage("Trip scheduled successfully!");
      await loadData();
    } catch (err) {
      console.error("Failed to schedule trip:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to schedule trip. Please check availability.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // RESCHEDULE TRIP
  // =========================================================

  const openRescheduleModal = (trip) => {
    setSelectedTrip(trip);
    const startVal = trip.scheduled_start_time || trip.created_at;
    const endVal = trip.expected_delivery_at || trip.due_date;

    const initial = {
      origin: trip.origin,
      destination: trip.destination,
      scheduled_start_time: formatDateTimeForInput(startVal),
      expected_delivery_at: formatDateTimeForInput(endVal),
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      description: trip.description || "",
    };

    setScheduleForm(initial);
    setAvailabilityData(null);
    setConflictError("");
    setError("");
    setSuccessMessage("");
    setShowRescheduleModal(true);

    checkLiveAvailability(initial.scheduled_start_time, initial.expected_delivery_at, trip.vehicle_id, trip.driver_id, trip.shipment_id);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    setError("");
    setSuccessMessage("");

    if (conflictError) {
      setError(conflictError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        scheduled_start_time: scheduleForm.scheduled_start_time
          ? new Date(scheduleForm.scheduled_start_time).toISOString()
          : null,
        expected_delivery_at: scheduleForm.expected_delivery_at
          ? new Date(scheduleForm.expected_delivery_at).toISOString()
          : null,
        vehicle_id: scheduleForm.vehicle_id,
        driver_id: scheduleForm.driver_id,
      };

      await api.put(`/shipments/${selectedTrip.shipment_id}/reschedule`, payload);
      setShowRescheduleModal(false);
      setSelectedTrip(null);
      setSuccessMessage("Trip rescheduled successfully!");
      await loadData();
    } catch (err) {
      console.error("Failed to reschedule trip:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to reschedule trip.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // START TRIP (DISPATCH)
  // =========================================================

  const openStartTripModal = (trip) => {
    setSelectedTrip(trip);
    setStartTripForm({
      current_location: trip.origin || "",
      notes: "Driver dispatched. Trip commenced.",
    });
    setError("");
    setShowStartTripModal(true);
  };

  const handleStartTripSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    setError("");
    setSuccessMessage("");

    try {
      setSaving(true);
      await api.post(`/shipments/${selectedTrip.shipment_id}/start-trip`, {
        current_location: startTripForm.current_location.trim() || null,
        notes: startTripForm.notes.trim() || null,
      });

      setShowStartTripModal(false);
      setSelectedTrip(null);
      setSuccessMessage(`Trip ${selectedTrip.shipment_id} started! Vehicle is now IN_TRANSIT.`);
      await loadData();
    } catch (err) {
      console.error("Failed to start trip:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to start trip.");
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // HISTORY
  // =========================================================

  const openHistoryModal = async (trip) => {
    setSelectedTrip(trip);
    setTripHistory([]);
    setHistoryLoading(true);
    setError("");
    setShowHistoryModal(true);

    try {
      const res = await api.get(`/shipments/${trip.shipment_id}/history`);
      setTripHistory(res.data);
    } catch (err) {
      console.error("Failed to load history:", err);
      setError("Unable to load trip event history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // FILTERING & METRICS
  // =========================================================

  const filteredSchedules = useMemo(() => {
    return schedules.filter((trip) => {
      // Status filter
      if (statusFilter !== "ALL" && trip.status !== statusFilter) {
        return false;
      }

      // Time filter
      if (timeFilter !== "ALL") {
        const tripDate = trip.scheduled_start_time ? new Date(trip.scheduled_start_time) : new Date(trip.created_at);
        const today = new Date();
        const isToday =
          tripDate.getDate() === today.getDate() &&
          tripDate.getMonth() === today.getMonth() &&
          tripDate.getFullYear() === today.getFullYear();

        if (timeFilter === "TODAY" && !isToday) return false;
        if (timeFilter === "UPCOMING" && tripDate < today && !isToday) return false;
        if (timeFilter === "PAST" && tripDate >= today) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = trip.shipment_id?.toLowerCase().includes(term);
        const matchesTrk = trip.tracking_number?.toLowerCase().includes(term);
        const matchesOrigin = trip.origin?.toLowerCase().includes(term);
        const matchesDest = trip.destination?.toLowerCase().includes(term);
        const matchesDriver = trip.driver_id?.toLowerCase().includes(term);
        const matchesVehicle = trip.vehicle_id?.toLowerCase().includes(term);

        if (!matchesId && !matchesTrk && !matchesOrigin && !matchesDest && !matchesDriver && !matchesVehicle) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, statusFilter, timeFilter, searchTerm]);

  // Metrics
  const totalScheduled = schedules.filter((s) => s.status === "SCHEDULED").length;
  const inTransitCount = schedules.filter((s) => s.status === "IN_TRANSIT").length;
  const departingToday = schedules.filter((s) => {
    if (s.status !== "SCHEDULED") return false;
    const d = s.scheduled_start_time ? new Date(s.scheduled_start_time) : null;
    if (!d) return false;
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const completedCount = schedules.filter((s) => s.status === "DELIVERED").length;

  // Proximity indicator helper
  const getProximityBadge = (trip) => {
    if (trip.status === "IN_TRANSIT") {
      return <span className="sched-badge in-transit">In Transit</span>;
    }
    if (trip.status === "DELIVERED") {
      return <span className="sched-badge delivered">Delivered</span>;
    }
    if (trip.status === "CANCELLED") {
      return <span className="sched-badge cancelled">Cancelled</span>;
    }

    if (!trip.scheduled_start_time) {
      return <span className="sched-badge pending">Pending Dispatch</span>;
    }

    const start = new Date(trip.scheduled_start_time);
    const now = new Date();
    const diffHours = (start - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return <span className="sched-badge overdue">Departure Ready (Due)</span>;
    }
    if (diffHours <= 2) {
      return <span className="sched-badge imminent">Departs within {Math.max(1, Math.round(diffHours * 60))}m</span>;
    }
    if (diffHours <= 24) {
      return <span className="sched-badge upcoming">Departs Today</span>;
    }
    return <span className="sched-badge scheduled">Scheduled</span>;
  };

  if (loading) {
    return (
      <div className="shipments-loading">
        <h1 className="shipments-page-title">Trip Scheduling</h1>
        <div className="shipments-loading-card">
          <p className="shipments-loading-text">Loading schedules and availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shipments-page">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="shipments-page-header">
        <div>
          <h1 className="shipments-page-title">Trip Scheduling</h1>
          <p className="shipments-page-subtitle">
            Schedule shipments with drivers and vehicles, verify real-time availability, and dispatch trips.
          </p>
        </div>

        <div className="shipments-header-actions">
          {!isDriver && (
            <button onClick={openScheduleModal} className="shipments-add-btn">
              + Schedule Trip
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          KPI STATS CARDS
          ===================================================== */}
      <div className="sched-kpi-grid">
        <div className="sched-kpi-card">
          <div className="sched-kpi-icon indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div>
            <span className="sched-kpi-label">Scheduled Trips</span>
            <strong className="sched-kpi-value">{totalScheduled}</strong>
          </div>
        </div>

        <div className="sched-kpi-card">
          <div className="sched-kpi-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <span className="sched-kpi-label">Departing Today</span>
            <strong className="sched-kpi-value">{departingToday}</strong>
          </div>
        </div>

        <div className="sched-kpi-card">
          <div className="sched-kpi-icon cyan">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>
          </div>
          <div>
            <span className="sched-kpi-label">In Transit</span>
            <strong className="sched-kpi-value">{inTransitCount}</strong>
          </div>
        </div>

        <div className="sched-kpi-card">
          <div className="sched-kpi-icon emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <span className="sched-kpi-label">Completed Deliveries</span>
            <strong className="sched-kpi-value">{completedCount}</strong>
          </div>
        </div>
      </div>

      {/* =====================================================
          MESSAGES
          ===================================================== */}
      {error && (
        <div className="shipment-message shipment-error">
          <div className="shipment-message-inner">
            <p className="shipment-error-text">{error}</p>
            <button onClick={() => setError("")} className="shipment-dismiss">Dismiss</button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="shipment-message shipment-success">
          <div className="shipment-message-inner">
            <p className="shipment-success-text">{successMessage}</p>
            <button onClick={() => setSuccessMessage("")} className="shipment-dismiss">Dismiss</button>
          </div>
        </div>
      )}

      {/* =====================================================
          CONTROLS / FILTERS BAR
          ===================================================== */}
      <div className="sched-filter-bar">
        <div className="sched-filter-tabs">
          {["ALL", "SCHEDULED", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`sched-filter-tab ${statusFilter === status ? "active" : ""}`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="sched-filter-actions">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="sched-time-select"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Departing Today</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="PAST">Past Departures</option>
          </select>

          <input
            type="text"
            placeholder="Search trip, driver, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sched-search-input"
          />
        </div>
      </div>

      {/* =====================================================
          SCHEDULES TABLE
          ===================================================== */}
      {filteredSchedules.length === 0 ? (
        <div className="shipment-empty-state">
          <p className="text-slate-400">No trips matching the selected criteria.</p>
          {!isDriver && (
            <button onClick={openScheduleModal} className="shipments-add-btn shipment-add-first mt-3">
              + Schedule a New Trip
            </button>
          )}
        </div>
      ) : (
        <div className="shipment-table-card">
          <div className="shipment-table-scroll">
            <table className="shipment-table">
              <thead className="shipment-table-head">
                <tr>
                  <th className="shipment-th">Trip / Tracking</th>
                  <th className="shipment-th">Route</th>
                  <th className="shipment-th">Vehicle</th>
                  <th className="shipment-th">Driver</th>
                  <th className="shipment-th">Scheduled Departure</th>
                  <th className="shipment-th">Estimated Arrival</th>
                  <th className="shipment-th">Timeline Status</th>
                  <th className="shipment-th">Actions</th>
                </tr>
              </thead>
              <tbody className="shipment-table-body">
                {filteredSchedules.map((trip) => {
                  const canStart = (trip.status === "SCHEDULED" || trip.status === "PENDING") && (!isDriver || trip.driver_id === user?.user_id);
                  const canReschedule = !isDriver && trip.status !== "DELIVERED" && trip.status !== "CANCELLED";

                  return (
                    <tr key={trip.shipment_id} className="shipment-row">
                      {/* TRIP / TRACKING */}
                      <td className="shipment-td">
                        <p className="shipment-id font-mono font-bold text-white">{trip.shipment_id}</p>
                        <p className="shipment-tracking text-xs text-slate-400">{trip.tracking_number}</p>
                        {trip.description && <p className="text-xs text-slate-400 truncate max-w-xs">{trip.description}</p>}
                      </td>

                      {/* ROUTE */}
                      <td className="shipment-td">
                        <div className="sched-route-display">
                          <span className="sched-route-city">{trip.origin}</span>
                          <span className="sched-route-arrow">➔</span>
                          <span className="sched-route-city font-semibold">{trip.destination}</span>
                        </div>
                      </td>

                      {/* VEHICLE */}
                      <td className="shipment-td">
                        <span className="sched-pill vehicle">
                          {trip.vehicle_id}
                        </span>
                      </td>

                      {/* DRIVER */}
                      <td className="shipment-td">
                        <span className="sched-pill driver">
                          {trip.driver_id}
                        </span>
                      </td>

                      {/* SCHEDULED DEPARTURE */}
                      <td className="shipment-td">
                        <p className="font-semibold text-slate-200">
                          {trip.scheduled_start_time ? formatDateTime(trip.scheduled_start_time) : "Not scheduled"}
                        </p>
                        {trip.started_at && (
                          <span className="text-xs text-emerald-400 block">
                            Departed: {formatDateTime(trip.started_at)}
                          </span>
                        )}
                      </td>

                      {/* ESTIMATED ARRIVAL */}
                      <td className="shipment-td text-slate-300">
                        {trip.expected_delivery_at ? formatDateTime(trip.expected_delivery_at) : formatDateTime(trip.due_date)}
                      </td>

                      {/* TIMELINE STATUS */}
                      <td className="shipment-td">
                        {getProximityBadge(trip)}
                      </td>

                      {/* ACTIONS */}
                      <td className="shipment-td">
                        <div className="sched-actions-group">
                          {canStart && (
                            <button
                              onClick={() => openStartTripModal(trip)}
                              className="sched-action-btn start-trip"
                              title="Dispatch and start this trip"
                            >
                              ▶ Start Trip
                            </button>
                          )}

                          {canReschedule && (
                            <button
                              onClick={() => openRescheduleModal(trip)}
                              className="sched-action-btn reschedule"
                              title="Reschedule trip times or reassign driver/vehicle"
                            >
                              Reschedule
                            </button>
                          )}

                          <button
                            onClick={() => openHistoryModal(trip)}
                            className="sched-action-btn history"
                            title="View trip audit history"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================
          SCHEDULE TRIP MODAL
          ===================================================== */}
      {showScheduleModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal sched-modal-wide">
            <ModalHeader
              title="Schedule Fleet Trip"
              description="Plan and schedule a shipment with driver, vehicle, and conflict verification."
              onClose={() => !saving && setShowScheduleModal(false)}
            />

            <form onSubmit={handleScheduleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Origin *"
                  name="origin"
                  value={scheduleForm.origin}
                  onChange={handleScheduleFormChange}
                  placeholder="e.g. Coimbatore Warehouse A"
                  required
                />

                <FormInput
                  label="Destination *"
                  name="destination"
                  value={scheduleForm.destination}
                  onChange={handleScheduleFormChange}
                  placeholder="e.g. Chennai Port Terminal"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Scheduled Departure Time *"
                  type="datetime-local"
                  name="scheduled_start_time"
                  value={scheduleForm.scheduled_start_time}
                  onChange={handleScheduleFormChange}
                  required
                />

                <FormInput
                  label="Estimated Arrival Time *"
                  type="datetime-local"
                  name="expected_delivery_at"
                  value={scheduleForm.expected_delivery_at}
                  onChange={handleScheduleFormChange}
                  min={scheduleForm.scheduled_start_time}
                  required
                />
              </div>

              {/* LIVE AVAILABILITY FEEDBACK BANNER */}
              {availabilityLoading && (
                <div className="sched-availability-box loading">
                  <span className="sched-spinner" />
                  Checking vehicle & driver availability in real time...
                </div>
              )}

              {conflictError && !availabilityLoading && (
                <div className="sched-availability-box conflict">
                  <strong>⚠️ Scheduling Conflict Detected</strong>
                  <p>{conflictError}</p>
                </div>
              )}

              {availabilityData && !conflictError && !availabilityLoading && (
                <div className="sched-availability-box ok">
                  ✓ Selected vehicle and driver are free and available for this time window!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Vehicle *"
                  name="vehicle_id"
                  value={scheduleForm.vehicle_id}
                  onChange={handleScheduleFormChange}
                  options={vehicles.map((v) => {
                    const isAvail = availabilityData?.available_vehicles?.includes(v.vehicle_id);
                    const tag = isAvail !== false ? "✓ Available" : "⚠️ Conflict";
                    return {
                      value: v.vehicle_id,
                      label: `${v.vehicle_id} (${v.vehicle_type}) — ${tag}`,
                    };
                  })}
                  emptyLabel="Select a vehicle"
                  required
                />

                <FormSelect
                  label="Driver *"
                  name="driver_id"
                  value={scheduleForm.driver_id}
                  onChange={handleScheduleFormChange}
                  options={drivers.map((d) => {
                    const isAvail = availabilityData?.available_drivers?.includes(d.driver_id);
                    const tag = isAvail !== false ? "✓ Available" : "⚠️ Conflict";
                    return {
                      value: d.driver_id,
                      label: `${d.name} (${d.driver_id}) — ${tag}`,
                    };
                  })}
                  emptyLabel="Select an active driver"
                  required
                />
              </div>

              <FormInput
                label="Cargo / Trip Description"
                name="description"
                value={scheduleForm.description}
                onChange={handleScheduleFormChange}
                placeholder="Details about goods, handling, or client reference..."
              />

              <ModalButtons
                onCancel={() => setShowScheduleModal(false)}
                saving={saving}
                submitText="Confirm & Schedule Trip"
                disabled={Boolean(conflictError)}
              />
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          RESCHEDULE TRIP MODAL
          ===================================================== */}
      {showRescheduleModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal sched-modal-wide">
            <ModalHeader
              title={`Reschedule Trip: ${selectedTrip?.shipment_id}`}
              description="Adjust departure, expected arrival, or reassign driver/vehicle."
              onClose={() => !saving && setShowRescheduleModal(false)}
            />

            <div className="sched-summary-strip">
              <div><span>Route:</span> {selectedTrip?.origin} ➔ {selectedTrip?.destination}</div>
              <div><span>Tracking:</span> {selectedTrip?.tracking_number}</div>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Scheduled Departure Time *"
                  type="datetime-local"
                  name="scheduled_start_time"
                  value={scheduleForm.scheduled_start_time}
                  onChange={handleScheduleFormChange}
                  required
                />

                <FormInput
                  label="Estimated Arrival Time *"
                  type="datetime-local"
                  name="expected_delivery_at"
                  value={scheduleForm.expected_delivery_at}
                  onChange={handleScheduleFormChange}
                  min={scheduleForm.scheduled_start_time}
                  required
                />
              </div>

              {conflictError && (
                <div className="sched-availability-box conflict">
                  <strong>⚠️ Scheduling Conflict Detected</strong>
                  <p>{conflictError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Vehicle *"
                  name="vehicle_id"
                  value={scheduleForm.vehicle_id}
                  onChange={handleScheduleFormChange}
                  options={vehicles.map((v) => {
                    const isAvail = availabilityData?.available_vehicles?.includes(v.vehicle_id) || v.vehicle_id === selectedTrip?.vehicle_id;
                    const tag = isAvail ? "✓ Available" : "⚠️ Conflict";
                    return {
                      value: v.vehicle_id,
                      label: `${v.vehicle_id} (${v.vehicle_type}) — ${tag}`,
                    };
                  })}
                />

                <FormSelect
                  label="Driver *"
                  name="driver_id"
                  value={scheduleForm.driver_id}
                  onChange={handleScheduleFormChange}
                  options={drivers.map((d) => {
                    const isAvail = availabilityData?.available_drivers?.includes(d.driver_id) || d.driver_id === selectedTrip?.driver_id;
                    const tag = isAvail ? "✓ Available" : "⚠️ Conflict";
                    return {
                      value: d.driver_id,
                      label: `${d.name} (${d.driver_id}) — ${tag}`,
                    };
                  })}
                />
              </div>

              <ModalButtons
                onCancel={() => setShowRescheduleModal(false)}
                saving={saving}
                submitText="Update Schedule"
                disabled={Boolean(conflictError)}
              />
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          START TRIP (DISPATCH) MODAL
          ===================================================== */}
      {showStartTripModal && (
        <div className="shipment-modal-overlay">
          <div className="shipment-modal">
            <ModalHeader
              title={`Start Trip: ${selectedTrip?.shipment_id}`}
              description="Dispatch this trip and mark vehicle as IN_TRANSIT."
              onClose={() => !saving && setShowStartTripModal(false)}
            />

            <div className="sched-dispatch-box">
              <p><strong>Route:</strong> {selectedTrip?.origin} ➔ {selectedTrip?.destination}</p>
              <p><strong>Vehicle:</strong> {selectedTrip?.vehicle_id}</p>
              <p><strong>Driver:</strong> {selectedTrip?.driver_id}</p>
              <p><strong>Scheduled Departure:</strong> {selectedTrip?.scheduled_start_time ? formatDateTime(selectedTrip.scheduled_start_time) : "Immediate"}</p>
            </div>

            <form onSubmit={handleStartTripSubmit} className="mt-4 space-y-4">
              <FormInput
                label="Current Departure Location"
                name="current_location"
                value={startTripForm.current_location}
                onChange={(e) => setStartTripForm({ ...startTripForm, current_location: e.target.value })}
                placeholder="e.g. Origin Loading Dock"
              />

              <FormInput
                label="Dispatch / Departure Notes"
                name="notes"
                value={startTripForm.notes}
                onChange={(e) => setStartTripForm({ ...startTripForm, notes: e.target.value })}
                placeholder="e.g. Pre-trip inspection complete, seal intact"
              />

              <div className="sched-start-confirm-notice">
                Starting this trip will record the departure time as now and update the fleet vehicle status to <strong>IN_TRANSIT</strong>.
              </div>

              <ModalButtons
                onCancel={() => setShowStartTripModal(false)}
                saving={saving}
                submitText="Confirm Departure (Start Trip)"
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
          <div className="shipment-modal">
            <ModalHeader
              title={`Trip History: ${selectedTrip?.shipment_id}`}
              description={`Audit history for tracking number ${selectedTrip?.tracking_number}`}
              onClose={() => setShowHistoryModal(false)}
            />

            <div className="mt-4">
              {historyLoading ? (
                <p className="text-sm text-slate-400">Loading audit history...</p>
              ) : tripHistory.length === 0 ? (
                <p className="text-sm text-slate-400">No events recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {tripHistory.map((item) => (
                    <div key={item.history_id} className="sched-history-card">
                      <div className="flex justify-between items-center">
                        <span className={`shipment-status ${item.status?.toLowerCase()}`}>{item.status}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(item.event_time)}</span>
                      </div>
                      <p className="text-sm text-slate-200 mt-1">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Location: {item.location || "N/A"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="shipments-add-btn"
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
// HELPER UI COMPONENTS
// =========================================================

function ModalHeader({ title, description, onClose }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-700/60 pb-3">
      <div>
        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded"
      >
        ×
      </button>
    </div>
  );
}

function FormInput({ label, type = "text", name, value, onChange, placeholder, required = false, min }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
        className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options = [], emptyLabel = "Select option", required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
      >
        <option value="">{emptyLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ModalButtons({ onCancel, saving, submitText, disabled = false }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60 mt-5">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving || disabled}
        className={`px-5 py-2 text-sm font-semibold text-white rounded-lg shadow transition-all ${
          disabled
            ? "bg-slate-600 cursor-not-allowed opacity-60"
            : "bg-indigo-600 hover:bg-indigo-500 active:scale-95"
        }`}
      >
        {saving ? "Saving..." : submitText}
      </button>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTimeForInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default TripScheduling;
