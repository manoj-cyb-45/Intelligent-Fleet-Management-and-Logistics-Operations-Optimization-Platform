import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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

  const [selectedShipment, setSelectedShipment] = useState(null);

  const [shipmentHistory, setShipmentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [shipmentForm, setShipmentForm] = useState(emptyForm);

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
  // STATUS CLASS
  // =========================================================

  const getStatusClass = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-100 text-amber-700";

      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-700";

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
      due_date: formatDateTimeForInput(shipment.due_date),
      vehicle_id: shipment.vehicle_id || "",
      driver_id: shipment.driver_id || "",
      status: shipment.status || "PENDING",
      current_location: shipment.current_location || "",
      expected_delivery_at: shipment.expected_delivery_at
        ? formatDateTimeForInput(shipment.expected_delivery_at)
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
        vehicle.vehicle_id === selectedShipment.vehicle_id
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
        driver.driver_id === selectedShipment.driver_id
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
        description: shipmentForm.description.trim() || null,
        origin: shipmentForm.origin.trim(),
        destination: shipmentForm.destination.trim(),
        due_date: shipmentForm.due_date,
        vehicle_id: shipmentForm.vehicle_id,
        driver_id: shipmentForm.driver_id,
      };

      await api.post("/shipments", payload);

      setShowAddModal(false);

      setShipmentForm(emptyForm);

      setSuccessMessage("Shipment created successfully.");

      await loadData();
    } catch (err) {
      console.error("Failed to create shipment:", err);

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
          shipmentForm.current_location.trim() || null,
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

      setSuccessMessage("Shipment updated successfully.");

      await loadData();
    } catch (err) {
      console.error("Failed to update shipment:", err);

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
        setError("Unable to load shipment history.");
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
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Shipments
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
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
    <div>
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Shipments
          </h1>

          <p className="mt-2 text-slate-500">
            Track and manage fleet shipments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-medium text-blue-700">
              {shipments.length} shipment
              {shipments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {!isDriver && (
            <button
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
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
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>

            <button
              onClick={() => setError("")}
              className="text-xs font-semibold text-red-600"
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
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-5 py-3">
          <p className="text-sm font-medium text-green-700">
            {successMessage}
          </p>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {shipments.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">
            No shipments found.
          </p>

          {!isDriver && (
            <button
              onClick={openAddModal}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add First Shipment
            </button>
          )}
        </div>
      ) : (
        /* ===================================================
           TABLE
           =================================================== */

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Shipment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Route
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Progress
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Date
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.shipment_id}
                    className="hover:bg-slate-50"
                  >
                    {/* SHIPMENT */}

                    <td className="px-5 py-5">
                      <p className="font-semibold text-slate-800">
                        {shipment.shipment_id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {shipment.tracking_number}
                      </p>
                    </td>

                    {/* ROUTE */}

                    <td className="px-5 py-5">
                      <div className="text-sm">
                        <p className="font-medium text-slate-700">
                          {shipment.origin}
                        </p>

                        <p className="my-1 text-xs text-slate-400">
                          ↓
                        </p>

                        <p className="font-medium text-slate-700">
                          {shipment.destination}
                        </p>
                      </div>
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          shipment.status
                        )}`}
                      >
                        {shipment.status.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    {/* PROGRESS */}

                    <td className="min-w-[180px] px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  shipment.delivery_progress
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-slate-600">
                          {shipment.delivery_progress}%
                        </span>
                      </div>
                    </td>

                    {/* LOCATION */}

                    <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                      {shipment.current_location ||
                        "Not available"}
                    </td>

                    {/* VEHICLE */}

                    <td className="whitespace-nowrap px-5 py-5">
                      <span className="font-medium text-slate-700">
                        {shipment.vehicle_id}
                      </span>
                    </td>

                    {/* DRIVER */}

                    <td className="whitespace-nowrap px-5 py-5">
                      <span className="font-medium text-slate-700">
                        {shipment.driver_id}
                      </span>
                    </td>

                    {/* DUE DATE */}

                    <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">
                      {formatDate(shipment.due_date)}
                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-5">
                      <div className="flex gap-2">
                        {shipment.status !== "DELIVERED" &&
                          shipment.status !== "CANCELLED" && (
                          <button
                            onClick={() =>
                              openEditModal(shipment)
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        )}

                        <button
                          onClick={() =>
                            openHistory(shipment)
                          }
                          className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
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
          ADD MODAL
          ===================================================== */}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">
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
                    value={shipmentForm.description}
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
                  value={shipmentForm.destination}
                  onChange={handleChange}
                  placeholder="Chennai"
                  required
                />

                <FormInput
                  label="Due Date *"
                  type="date"
                  name="due_date"
                  value={shipmentForm.due_date}
                  onChange={handleChange}
                  min={getTodayDate()}
                  required
                />  

                <FormSelect
                  label="Vehicle *"
                  name="vehicle_id"
                  value={shipmentForm.vehicle_id}
                  onChange={handleChange}
                  options={getAvailableVehicles().map(
                    (vehicle) => ({
                      value: vehicle.vehicle_id,
                      label: `${vehicle.vehicle_id} — ${vehicle.current_status}`,
                    })
                  )}
                  emptyLabel="Select a vehicle"
                />

                <FormSelect
                  label="Driver *"
                  name="driver_id"
                  value={shipmentForm.driver_id}
                  onChange={handleChange}
                  options={getAvailableDrivers().map(
                    (driver) => ({
                      value: driver.driver_id,
                      label: `${driver.name} — ${driver.driver_id}`,
                    })
                  )}
                  emptyLabel="Select a driver"
                />
              </div>

              {getAvailableVehicles().length === 0 && (
                <div className="mt-5 rounded-lg border border-yellow-700 bg-yellow-950/40 px-4 py-3">
                  <p className="text-sm text-yellow-300">
                    No AVAILABLE vehicles are currently
                    available for shipment assignment.
                  </p>
                </div>
              )}

              {getAvailableDrivers().length === 0 && (
                <div className="mt-3 rounded-lg border border-yellow-700 bg-yellow-950/40 px-4 py-3">
                  <p className="text-sm text-yellow-300">
                    No ACTIVE unassigned drivers are
                    currently available.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">
            <ModalHeader
              title="Edit Shipment"
              description="Update shipment status and delivery information."
              onClose={closeModal}
            />

            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoItem
                  label="Shipment"
                  value={selectedShipment?.shipment_id}
                />

                <InfoItem
                  label="Tracking"
                  value={selectedShipment?.tracking_number}
                />

                <InfoItem
                  label="Vehicle"
                  value={selectedShipment?.vehicle_id}
                />

                <InfoItem
                  label="Driver"
                  value={selectedShipment?.driver_id}
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
                      value: "IN_TRANSIT",
                      label: "IN TRANSIT",
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
                  value={shipmentForm.current_location}
                  onChange={handleChange}
                  placeholder="Current location"
                />

                {!isDriver && (
                  <FormInput
                    label="Expected Delivery"
                    type="date"
                    name="expected_delivery_at"
                    value={shipmentForm.expected_delivery_at}
                    onChange={handleChange}
                    min={getTodayDate()}
                  />
                )}
              </div>

              <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                {shipmentForm.status === "PENDING" && (
                  <p className="text-xs text-slate-400">
                    Shipment is waiting to begin.
                  </p>
                )}

                {shipmentForm.status === "IN_TRANSIT" && (
                  <p className="text-xs text-blue-300">
                    Shipment is currently in transit.
                    Starting time will be recorded
                    automatically by the backend.
                  </p>
                )}

                {shipmentForm.status === "DELIVERED" && (
                  <p className="text-xs text-green-300">
                    Delivered shipments are automatically
                    set to 100% progress.
                  </p>
                )}

                {shipmentForm.status === "CANCELLED" && (
                  <p className="text-xs text-red-300">
                    Cancelling this shipment will create a
                    HIGH severity alert.
                  </p>
                )}
              </div>

              {isDriver && (
                <div className="mt-5 rounded-lg border border-blue-700 bg-blue-950/40 px-4 py-3">
                  <p className="text-xs text-blue-300">
                    Drivers can update the status and current location of their assigned shipment. Progress is calculated automatically from status.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">
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
              <div className="mt-8 rounded-lg border border-slate-700 bg-slate-950 p-8 text-center">
                <p className="text-slate-400">
                  Loading history...
                </p>
              </div>
            ) : shipmentHistory.length === 0 ? (
              <div className="mt-8 rounded-lg border border-slate-700 bg-slate-950 p-8 text-center">
                <p className="text-slate-400">
                  No history found.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {shipmentHistory.map((item) => (
                  <div
                    key={item.history_id}
                    className="rounded-xl border border-slate-700 bg-slate-950 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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

                        <p className="mt-3 font-medium text-white">
                          {item.description ||
                            "Shipment event"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          Location:{" "}
                          {item.location ||
                            "Not specified"}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500">
                        {formatDateTime(item.event_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 flex justify-end">
              <button
                onClick={closeHistory}
                className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
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
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {description}
        </p>
      </div>

      <button
        onClick={onClose}
        className="text-3xl leading-none text-slate-400 hover:text-white"
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
    <div className="mt-7 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      <label className="mb-2 block text-sm font-medium text-slate-200">
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
        className={`w-full rounded-lg border border-slate-700 px-4 py-3 outline-none ${
          disabled
            ? "cursor-not-allowed bg-slate-800 text-slate-500"
            : "bg-slate-950 text-white focus:border-blue-500"
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
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-lg border border-slate-700 px-4 py-3 text-white outline-none ${
          disabled
            ? "cursor-not-allowed bg-slate-800 opacity-70"
            : "bg-slate-950 focus:border-blue-500"
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
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-200">
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