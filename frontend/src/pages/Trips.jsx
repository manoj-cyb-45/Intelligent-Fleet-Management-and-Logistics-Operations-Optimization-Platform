import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  shipment_id: "",
  planned_departure: "",
  planned_arrival: "",
};

function toInputDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getCurrentDateTimeInput() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function Trips() {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER", "DISPATCHER"].includes(
    String(user?.role || "").toUpperCase()
  );

  const [trips, setTrips] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const tripResponse = await api.get("/trips");
      setTrips(tripResponse.data);

      if (canManage) {
        const shipmentResponse = await api.get("/shipments");
        setShipments(
          shipmentResponse.data.filter(
            (shipment) =>
              !["DELIVERED", "CANCELLED"].includes(shipment.status)
          )
        );
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load trips.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [canManage]);

  const selectedShipment = shipments.find(
    (shipment) => shipment.shipment_id === form.shipment_id
  );

const submit = async (event) => {
  event.preventDefault();

  if (!form.shipment_id) {
    setError("Please select a shipment.");
    return;
  }

  if (!form.planned_departure) {
    setError("Departure time could not be determined.");
    return;
  }

  if (!form.planned_arrival) {
    setError(
      "This shipment does not have a valid delivery date."
    );
    return;
  }

  const departure = new Date(form.planned_departure);
  const arrival = new Date(form.planned_arrival);

  if (arrival <= departure) {
    setError(
      "Shipment delivery time must be after the departure time."
    );
    return;
  }

  setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/trips", {
        shipment_id: form.shipment_id,
        planned_departure: new Date(form.planned_departure).toISOString(),
        planned_arrival: new Date(form.planned_arrival).toISOString(),
      });

      setForm(emptyForm);
      setShowForm(false);
      setSuccess("Trip scheduled successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to schedule trip.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (trip, status) => {
    try {
      setError("");
      await api.put(`/trips/${trip.trip_id}`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update trip.");
    }
  };

  const cancelTrip = async (trip) => {
    try {
      setError("");
      await api.delete(`/trips/${trip.trip_id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to cancel trip.");
    }
  };

  const tripKpis = {
    total: trips.length,
    scheduled: trips.filter(
      (trip) => String(trip.status).toUpperCase() === "SCHEDULED"
    ).length,
    inProgress: trips.filter(
      (trip) => String(trip.status).toUpperCase() === "IN_PROGRESS"
    ).length,
    completed: trips.filter(
      (trip) => String(trip.status).toUpperCase() === "COMPLETED"
    ).length,
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">LOGISTICS OPERATIONS</span>
          <h1>Trip Scheduling</h1>
          <p>
            Schedule and monitor planned shipment trips with synchronized
            vehicle and driver assignments.
          </p>
        </div>

        {canManage && (
          <button
            className="primary-button"
            onClick={() => {
  const opening = !showForm;

  setShowForm(opening);
  setError("");
  setSuccess("");

  if (opening) {
    setForm({
      shipment_id: "",
      planned_departure: getCurrentDateTimeInput(),
      planned_arrival: "",
    });
  } else {
    setForm(emptyForm);
  }
}}
          >
            {showForm ? "Close" : "Schedule Trip"}
          </button>
        )}
      </div>

      <div className="ff-kpi-grid">
        <div className="ff-kpi-card">
          <span className="ff-kpi-label">Total Trips</span>
          <strong className="ff-kpi-value">{tripKpis.total}</strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">Scheduled</span>
          <strong className="ff-kpi-value">{tripKpis.scheduled}</strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">In Progress</span>
          <strong className="ff-kpi-value">{tripKpis.inProgress}</strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">Completed</span>
          <strong className="ff-kpi-value">{tripKpis.completed}</strong>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && canManage && (
        <section className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <span className="eyebrow">NEW TRIP</span>
              <h2>Schedule Shipment Trip</h2>
            </div>
          </div>

          <form onSubmit={submit} className="form-grid">
            <label>
              Shipment
              <select
  value={form.shipment_id}
  onChange={(e) => {
    const shipmentId = e.target.value;

    const shipment = shipments.find(
      (item) => item.shipment_id === shipmentId
    );

    setForm((current) => ({
      ...current,
      shipment_id: shipmentId,
      planned_arrival: shipment?.due_date
        ? toInputDateTime(shipment.due_date)
        : "",
    }));
  }}
  required
>
  <option value="">Select shipment</option>

  {shipments.map((shipment) => (
    <option
      key={shipment.shipment_id}
      value={shipment.shipment_id}
    >
      {shipment.shipment_id} — {shipment.origin} →{" "}
      {shipment.destination}
    </option>
  ))}
</select>
            </label>

            {selectedShipment && (
  <div className="form-info">
    <strong>Vehicle:</strong>{" "}
    {selectedShipment.vehicle_id}
    <br />

    <strong>Driver:</strong>{" "}
    {selectedShipment.driver_id}
    <br />

    <strong>Route:</strong>{" "}
    {selectedShipment.origin} →{" "}
    {selectedShipment.destination}
    <br />

    <strong>Departure:</strong>{" "}
    {form.planned_departure
      ? new Date(form.planned_departure).toLocaleString()
      : "Not set"}
    <br />

    <strong>Planned arrival:</strong>{" "}
    {form.planned_arrival
      ? new Date(form.planned_arrival).toLocaleString()
      : "Not available"}
  </div>
)}

            <div>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Scheduling..." : "Create Trip"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <span className="eyebrow">TRIP PLAN</span>
            <h2>Scheduled Trips</h2>
          </div>
          <span>{trips.length} trips</span>
        </div>

        {loading ? (
          <p>Loading trips...</p>
        ) : trips.length === 0 ? (
          <p>No trips scheduled yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Shipment</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.trip_id}>
                    <td>{trip.trip_id}</td>
                    <td>{trip.shipment_id}</td>
                    <td>{trip.vehicle_id}</td>
                    <td>{trip.driver_id}</td>
                    <td>{new Date(trip.planned_departure).toLocaleString()}</td>
                    <td>{new Date(trip.planned_arrival).toLocaleString()}</td>
                    <td>
                      <span
                        className={`trip-status-badge ${getTripStatusClass(
                          trip.status
                        )}`}
                      >
                        {String(trip.status || "UNKNOWN").replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        {trip.status === "SCHEDULED" && (
                          <button
                            className="secondary-button"
                            onClick={() =>
                              updateStatus(trip, "IN_PROGRESS")
                            }
                          >
                            Start
                          </button>
                        )}
                        {["SCHEDULED", "IN_PROGRESS"].includes(trip.status) && (
                          <button
                            className="danger-button"
                            onClick={() => cancelTrip(trip)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function getTripStatusClass(status) {
  switch (status) {
    case "SCHEDULED":
      return "scheduled";
    case "IN_PROGRESS":
      return "in-progress";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "DELAYED":
      return "delayed";
    default:
      return "unknown";
  }
}

export default Trips;
