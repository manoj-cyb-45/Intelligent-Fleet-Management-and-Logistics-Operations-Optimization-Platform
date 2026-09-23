import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Vehicles() {
  const { user } = useAuth();

  // Use AuthContext first, with localStorage as a fallback.
  // This keeps the UI correct even if the auth state is still
  // being restored after login/refresh.
  let storedUser = null;

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    storedUser = null;
  }

  const role = String(
    user?.role || storedUser?.role || ""
  )
    .trim()
    .toUpperCase();

  const isDispatcher = role === "DISPATCHER";

  // =========================================================
  // STATE
  // =========================================================

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState(null);


  const emptyForm = {
    vehicle_id: "",
    registration_number: "",
    vehicle_type: "TRUCK",
    capacity: "",
    fuel_tank_capacity: "",
    fuel_type: "DIESEL",
    current_status: "AVAILABLE",
    current_location: "",
    fuel_level: "",
    mileage: "",
    driver_id: "",
  };

  const [vehicleForm, setVehicleForm] = useState(emptyForm);

  // =========================================================
  // LOAD VEHICLES + DRIVERS
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      const [vehicleResponse, driverResponse] =
        await Promise.all([
          api.get("/vehicles"),
          api.get("/drivers"),
        ]);

      setVehicles(
        Array.isArray(vehicleResponse.data)
          ? vehicleResponse.data
          : []
      );

      setDrivers(
        Array.isArray(driverResponse.data)
          ? driverResponse.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load vehicles and drivers:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load vehicles."
      );
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };

    initialLoad();
  }, []);

  // =========================================================
  // FIND DRIVER ASSIGNED TO VEHICLE
  //
  // IMPORTANT:
  // Vehicle API returns driver_id.
  // So use vehicle.driver_id FIRST.
  //
  // assigned_vehicle_id is kept as fallback so this
  // also works if driver API contains that field.
  // =========================================================

  const getAssignedDriver = (vehicle) => {
    if (!vehicle) {
      return null;
    }

    const driverId = vehicle.driver_id;

    if (driverId) {
      return (
        drivers.find(
          (driver) =>
            driver.driver_id === driverId ||
            driver.user_id === driverId
        ) || null
      );
    }

    return (
      drivers.find(
        (driver) =>
          driver.assigned_vehicle_id ===
          vehicle.vehicle_id
      ) || null
    );
  };


  // =========================================================
  // VEHICLE KPI DATA
  // =========================================================

  const vehicleKpis = {
    total: vehicles.length,

    available: vehicles.filter(
      (vehicle) =>
        String(vehicle.current_status).toUpperCase() ===
        "AVAILABLE"
    ).length,

    assigned: vehicles.filter(
      (vehicle) =>
        String(vehicle.current_status).toUpperCase() ===
        "ASSIGNED"
    ).length,

    inTransit: vehicles.filter(
      (vehicle) =>
        String(vehicle.current_status).toUpperCase() ===
        "IN_TRANSIT"
    ).length,
  };

  // =========================================================
  // CHECK WHETHER DRIVER IS ALREADY ASSIGNED
  // =========================================================

  const driverHasAnotherVehicle = (
    driver,
    currentVehicleId = null
  ) => {
    if (!driver) {
      return false;
    }

    const assignedVehicleId =
      driver.assigned_vehicle_id;

    if (
      !assignedVehicleId ||
      assignedVehicleId === currentVehicleId
    ) {
      return false;
    }

    return true;
  };

  // =========================================================
  // AVAILABLE DRIVERS
  // =========================================================

  const getAvailableDrivers = () => {
    return drivers.filter((driver) => {
      const isActive =
        driver.account_status === "ACTIVE";

      if (!isActive) {
        return false;
      }

      const assignedVehicleId =
        driver.assigned_vehicle_id;

      // Driver is completely free.
      if (!assignedVehicleId) {
        return true;
      }

      // Current driver of the vehicle being edited.
      if (
        selectedVehicle &&
        assignedVehicleId ===
          selectedVehicle.vehicle_id
      ) {
        return true;
      }

      return false;
    });
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setVehicleForm((previous) => ({
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
    if (isDispatcher) {
      return;
    }

    setVehicleForm({
      ...emptyForm,
    });

    setSelectedVehicle(null);

    setError("");
    setSuccessMessage("");

    setShowAddModal(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditModal = (vehicle) => {
    if (isDispatcher) {
      return;
    }

    const assignedDriver =
      getAssignedDriver(vehicle);

    setSelectedVehicle(vehicle);

    setVehicleForm({
      vehicle_id:
        vehicle.vehicle_id || "",

      registration_number:
        vehicle.registration_number || "",

      vehicle_type:
        vehicle.vehicle_type || "TRUCK",

      capacity:
        vehicle.capacity ?? "",

      fuel_tank_capacity:
        vehicle.fuel_tank_capacity ?? "",

      fuel_type:
        vehicle.fuel_type || "DIESEL",

      current_status:
        vehicle.current_status || "AVAILABLE",

      current_location:
        vehicle.current_location || "",

      fuel_level:
        vehicle.fuel_level ?? "",

      mileage:
        vehicle.mileage ?? "",

      driver_id:
        vehicle.driver_id ||
        assignedDriver?.driver_id ||
        "",
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

    setSelectedVehicle(null);
    setVehicleForm({
      ...emptyForm,
    });

    setError("");
  };

  // =========================================================
  // VALIDATE
  // =========================================================

  const validateForm = () => {
    if (!vehicleForm.vehicle_id.trim()) {
      setError("Vehicle ID is required.");
      return false;
    }

    if (
      !vehicleForm.registration_number.trim()
    ) {
      setError(
        "Registration number is required."
      );
      return false;
    }

    if (!vehicleForm.vehicle_type) {
      setError("Vehicle type is required.");
      return false;
    }

    if (
      vehicleForm.capacity === "" ||
      Number(vehicleForm.capacity) <= 0
    ) {
      setError(
        "Capacity must be greater than 0."
      );
      return false;
    }

    if (
      vehicleForm.fuel_tank_capacity === "" ||
      Number(vehicleForm.fuel_tank_capacity) <= 0
    ) {
      setError(
        "Fuel tank capacity must be greater than 0."
      );
      return false;
    }

    if (!vehicleForm.fuel_type) {
      setError("Fuel type is required.");
      return false;
    }

    if (!vehicleForm.current_status) {
      setError("Vehicle status is required.");
      return false;
    }

    if (
      !vehicleForm.current_location.trim()
    ) {
      setError(
        "Current location is required."
      );
      return false;
    }

    if (
      vehicleForm.fuel_level === "" ||
      Number(vehicleForm.fuel_level) < 0 ||
      Number(vehicleForm.fuel_level) > 100
    ) {
      setError(
        "Fuel level must be between 0 and 100."
      );
      return false;
    }

    if (
      vehicleForm.mileage === "" ||
      Number(vehicleForm.mileage) < 0
    ) {
      setError(
        "Mileage cannot be negative."
      );
      return false;
    }

    if (
      vehicleForm.current_status ===
        "ASSIGNED" ||
      vehicleForm.current_status ===
        "IN_TRANSIT"
    ) {
      if (!vehicleForm.driver_id) {
        setError(
          `A driver is required for ${vehicleForm.current_status} vehicles.`
        );
        return false;
      }
    }

    if (
      vehicleForm.current_status ===
        "MAINTENANCE" &&
      vehicleForm.driver_id
    ) {
      setError(
        "A vehicle under maintenance cannot have a driver assignment."
      );
      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE VEHICLE
  // =========================================================

  const handleAddVehicle = async (event) => {
    event.preventDefault();

    if (isDispatcher) {
      setError(
        "Dispatchers can view vehicles but cannot add vehicles."
      );
      return;
    }

    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        vehicle_id:
          vehicleForm.vehicle_id.trim(),

        registration_number:
          vehicleForm.registration_number.trim(),

        vehicle_type:
          vehicleForm.vehicle_type,

        capacity:
          Number(vehicleForm.capacity),

        fuel_tank_capacity:
          Number(vehicleForm.fuel_tank_capacity),

        fuel_type:
          vehicleForm.fuel_type,

        current_status:
          vehicleForm.current_status,

        current_location:
          vehicleForm.current_location.trim(),

        fuel_level:
          Number(vehicleForm.fuel_level),

        mileage:
          Number(vehicleForm.mileage),

        driver_id:
          vehicleForm.driver_id || null,
      };

      await api.post(
        "/vehicles",
        payload
      );

      setShowAddModal(false);

      setVehicleForm({
        ...emptyForm,
      });

      setSuccessMessage(
        "Vehicle added successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to add vehicle:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to add vehicle."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE VEHICLE
  // =========================================================

  const handleUpdateVehicle = async (
    event
  ) => {
    event.preventDefault();

    if (isDispatcher) {
      setError(
        "Dispatchers can view vehicles but cannot edit vehicles."
      );
      return;
    }

    if (!selectedVehicle) {
      return;
    }

    setError("");
    setSuccessMessage("");

    // -------------------------------------------------------
    // IN_TRANSIT LOCK
    // -------------------------------------------------------

    if (
      selectedVehicle.current_status ===
      "IN_TRANSIT"
    ) {
      if (
        vehicleForm.current_status !==
        "IN_TRANSIT"
      ) {
        setError(
          "An IN_TRANSIT vehicle cannot have its status changed."
        );
        return;
      }

      const originalDriverId =
        selectedVehicle.driver_id ||
        getAssignedDriver(
          selectedVehicle
        )?.driver_id ||
        "";

      if (
        vehicleForm.driver_id !==
        originalDriverId
      ) {
        setError(
          "The driver of an IN_TRANSIT vehicle cannot be changed."
        );
        return;
      }
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        vehicle_id:
          vehicleForm.vehicle_id.trim(),

        registration_number:
          vehicleForm.registration_number.trim(),

        vehicle_type:
          vehicleForm.vehicle_type,

        capacity:
          Number(vehicleForm.capacity),

        fuel_tank_capacity:
          Number(vehicleForm.fuel_tank_capacity),

        fuel_type:
          vehicleForm.fuel_type,

        current_status:
          vehicleForm.current_status,

        current_location:
          vehicleForm.current_location.trim(),

        fuel_level:
          Number(vehicleForm.fuel_level),

        mileage:
          Number(vehicleForm.mileage),

        driver_id:
          vehicleForm.driver_id || null,
      };

      await api.put(
        `/vehicles/${selectedVehicle.vehicle_id}`,
        payload
      );

      setShowEditModal(false);
      setSelectedVehicle(null);

      setVehicleForm({
        ...emptyForm,
      });

      setSuccessMessage(
        "Vehicle updated successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to update vehicle:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to update vehicle."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE VEHICLE
  // =========================================================

  const handleDeleteVehicle = async (
    vehicle
  ) => {
    if (isDispatcher) {
      setError(
        "Dispatchers can view vehicles but cannot delete vehicles."
      );
      return;
    }

    if (
      vehicle.current_status ===
      "IN_TRANSIT"
    ) {
      setError(
        "IN_TRANSIT vehicles cannot be deleted."
      );
      return;
    }

    const assignedDriver =
      getAssignedDriver(vehicle);

    if (assignedDriver) {
      setError(
        `Cannot delete ${vehicle.vehicle_id} because it is assigned to ${assignedDriver.name}. Unassign the driver first.`
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete vehicle ${vehicle.vehicle_id}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      setError("");
      setSuccessMessage("");

      await api.delete(
        `/vehicles/${vehicle.vehicle_id}`
      );

      setSuccessMessage(
        "Vehicle deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to delete vehicle:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to delete vehicle."
      );
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Vehicles
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Loading vehicles...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="vehicles-page">
      {/* HEADER */}

      <div className="module-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Vehicles
          </h1>

          <p className="mt-2 text-slate-500">
            Manage and monitor fleet vehicles.
          </p>
        </div>

        <div className="module-header-actions flex items-center gap-3">
          <div className="vehicle-count rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-medium text-blue-700">
              {vehicles.length} vehicle
              {vehicles.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {!isDispatcher && (
              <button
                onClick={openAddModal}
                className="primary-action rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                + Add Vehicle
              </button>
            )}
        </div>
      </div>

      {/* KPI CARDS */}

      <div className="ff-kpi-grid">
        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Total Vehicles
          </span>

          <strong className="ff-kpi-value">
            {vehicleKpis.total}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Available
          </span>

          <strong className="ff-kpi-value">
            {vehicleKpis.available}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Assigned
          </span>

          <strong className="ff-kpi-value">
            {vehicleKpis.assigned}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            In Transit
          </span>

          <strong className="ff-kpi-value">
            {vehicleKpis.inTransit}
          </strong>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>

            <button
              onClick={() =>
                setError("")
              }
              className="text-xs font-semibold text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-5 py-3">
          <p className="text-sm font-medium text-green-700">
            {successMessage}
          </p>
        </div>
      )}

      {/* EMPTY */}

      {vehicles.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">
            No vehicles found.
          </p>

          {!isDispatcher && (
              <button
                onClick={openAddModal}
                className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add First Vehicle
              </button>
            )}
        </div>
      ) : (
        <div className="vehicle-table-card mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Registration
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Capacity
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fuel
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {vehicles.map(
                  (vehicle) => {
                    const assignedDriver =
                      getAssignedDriver(
                        vehicle
                      );

                    const isInTransit =
                      vehicle.current_status ===
                      "IN_TRANSIT";

                    const hasAssignment =
                      Boolean(
                        vehicle.driver_id ||
                          assignedDriver
                      );

                    return (
                      <tr
                        key={
                          vehicle.vehicle_id
                        }
                        className="vehicle-row hover:bg-slate-50"
                      >
                        {/* VEHICLE */}

                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-800">
                            {
                              vehicle.vehicle_id
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {vehicle.current_location ||
                              "Location not specified"}
                          </p>
                        </td>

                        {/* REGISTRATION */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {
                            vehicle.registration_number
                          }
                        </td>

                        {/* TYPE */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {
                            vehicle.vehicle_type
                          }
                        </td>

                        {/* CAPACITY */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {
                            vehicle.capacity
                          }
                        </td>

                        {/* FUEL */}

                        <td className="px-5 py-5">
                          <p className="text-sm text-slate-600">
                            {
                              vehicle.fuel_type
                            }
                          </p>

                          {vehicle.fuel_level !==
                            null &&
                            vehicle.fuel_level !==
                              undefined && (
                              <p
                                className={`mt-1 text-xs font-semibold ${
                                  Number(vehicle.fuel_level) < 20
                                    ? "fuel-low"
                                    : "fuel-good"
                                }`}
                              >
                                Fuel: {vehicle.fuel_level}%
                              </p>
                            )}
                        </td>

                        {/* DRIVER */}

                        <td className="px-5 py-5">
                          {hasAssignment ? (
                            <div>
                              <p className="font-semibold text-blue-700">
                                {assignedDriver
                                  ?.name ||
                                  vehicle.driver_id}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                ID:{" "}
                                {vehicle.driver_id ||
                                  assignedDriver?.driver_id}
                              </p>

                              {isInTransit && (
                                <span className="assignment-locked-badge">
                                  🔒 Assignment locked
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`vehicle-status inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                vehicle.current_status ===
                                "AVAILABLE"
                                  ? "bg-green-100 text-green-700"
                                  : vehicle.current_status ===
                                      "ASSIGNED"
                                    ? "bg-blue-100 text-blue-700"
                                    : vehicle.current_status ===
                                        "IN_TRANSIT"
                                      ? "bg-purple-100 text-purple-700"
                                      : vehicle.current_status ===
                                          "MAINTENANCE"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {
                                vehicle.current_status
                              }
                            </span>

                            {isInTransit && (
                              <span className="text-xs font-medium text-purple-600">
                                🔒 Locked
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS */}

                       <td className="px-5 py-5">
                          {!isDispatcher && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  openEditModal(vehicle)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteVehicle(vehicle)
                                }
                                disabled={
                                  deleting ||
                                  isInTransit ||
                                  hasAssignment
                                }
                                title={
                                  isInTransit
                                    ? "IN_TRANSIT vehicles cannot be deleted"
                                    : hasAssignment
                                      ? "Unassign driver first"
                                      : "Delete vehicle"
                                }
                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}

      {(showAddModal ||
        showEditModal) && (
        <div className="vehicle-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="vehicle-modal max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {showAddModal
                    ? "Add Vehicle"
                    : "Edit Vehicle"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {showAddModal
                    ? "Register a new fleet vehicle."
                    : "Update vehicle information and assignment."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="text-3xl leading-none text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* IN TRANSIT WARNING */}

            {showEditModal &&
              selectedVehicle?.current_status ===
                "IN_TRANSIT" && (
                <div className="mt-5 rounded-lg border border-purple-700 bg-purple-950/40 px-4 py-4">
                  <p className="font-semibold text-purple-300">
                    🔒 Vehicle is IN_TRANSIT
                  </p>

                  <p className="mt-1 text-sm text-purple-200/80">
                    Driver assignment and
                    vehicle status cannot be
                    changed until the shipment
                    is completed.
                  </p>
                </div>
              )}

            <form
              onSubmit={
                showAddModal
                  ? handleAddVehicle
                  : handleUpdateVehicle
              }
              className="mt-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormInput
                  label="Vehicle ID *"
                  name="vehicle_id"
                  value={
                    vehicleForm.vehicle_id
                  }
                  onChange={handleChange}
                  placeholder="VH001"
                  required
                  disabled={
                    showEditModal
                  }
                />

                <FormInput
                  label="Registration Number *"
                  name="registration_number"
                  value={
                    vehicleForm.registration_number
                  }
                  onChange={handleChange}
                  placeholder="TN38AB1234"
                  required
                />

                <FormSelect
                  label="Vehicle Type *"
                  name="vehicle_type"
                  value={
                    vehicleForm.vehicle_type
                  }
                  onChange={handleChange}
                  options={[
                    "TRUCK",
                    "VAN",
                    "BUS",
                    "TANKER",
                    "CAR",
                  ]}
                />

                <FormInput
                  label="Capacity *"
                  type="number"
                  name="capacity"
                  value={
                    vehicleForm.capacity
                  }
                  onChange={handleChange}
                  placeholder="5000"
                  min="0"
                  required
                />

                <FormInput
                  label="Fuel Tank Capacity (L) *"
                  type="number"
                  name="fuel_tank_capacity"
                  value={
                    vehicleForm.fuel_tank_capacity
                  }
                  onChange={handleChange}
                  placeholder="120"
                  min="1"
                  step="0.1"
                  required
                />

                <FormSelect
                  label="Fuel Type *"
                  name="fuel_type"
                  value={
                    vehicleForm.fuel_type
                  }
                  onChange={handleChange}
                  options={[
                    "DIESEL",
                    "PETROL",
                    "CNG",
                    "ELECTRIC",
                    "HYBRID",
                  ]}
                />

                <FormSelect
                  label="Status *"
                  name="current_status"
                  value={
                    vehicleForm.current_status
                  }
                  onChange={handleChange}
                  options={[
                    "AVAILABLE",
                    "ASSIGNED",
                    "IN_TRANSIT",
                    "MAINTENANCE",
                    "RETIRED",
                  ]}
                  disabled={
                    showEditModal &&
                    selectedVehicle?.current_status ===
                      "IN_TRANSIT"
                  }
                />

                <FormInput
                  label="Current Location *"
                  name="current_location"
                  value={
                    vehicleForm.current_location
                  }
                  onChange={handleChange}
                  placeholder="Coimbatore"
                  required
                />

                <FormInput
                  label="Fuel Level (%) *"
                  type="number"
                  name="fuel_level"
                  value={
                    vehicleForm.fuel_level
                  }
                  onChange={handleChange}
                  placeholder="80"
                  min="0"
                  max="100"
                  required
                />

                <FormInput
                  label="Mileage *"
                  type="number"
                  name="mileage"
                  value={
                    vehicleForm.mileage
                  }
                  onChange={handleChange}
                  placeholder="25000"
                  min="0"
                  required
                />

                {/* DRIVER */}

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Driver
                    {(vehicleForm.current_status ===
                      "ASSIGNED" ||
                      vehicleForm.current_status ===
                        "IN_TRANSIT") &&
                      " *"}
                  </label>

                  <select
                    name="driver_id"
                    value={
                      vehicleForm.driver_id
                    }
                    onChange={handleChange}
                    disabled={
                      showEditModal &&
                      selectedVehicle?.current_status ===
                        "IN_TRANSIT"
                    }
                    className={`w-full rounded-lg border border-slate-700 px-4 py-3 text-white outline-none ${
                      showEditModal &&
                      selectedVehicle?.current_status ===
                        "IN_TRANSIT"
                        ? "cursor-not-allowed bg-slate-800 opacity-70"
                        : "bg-slate-950 focus:border-blue-500"
                    }`}
                  >
                    <option value="">
                      No driver / Unassign
                    </option>

                    {getAvailableDrivers().map(
                      (driver) => (
                        <option
                          key={
                            driver.driver_id ||
                            driver.user_id
                          }
                          value={
                            driver.driver_id ||
                            driver.user_id
                          }
                        >
                          {driver.name}
                          {" — "}
                          {driver.driver_id ||
                            driver.user_id}

                          {driver.assigned_vehicle_id ===
                            selectedVehicle?.vehicle_id &&
                            " — Current Driver"}
                        </option>
                      )
                    )}
                  </select>

                  {showEditModal &&
                    selectedVehicle?.current_status ===
                      "IN_TRANSIT" && (
                      <p className="mt-2 text-xs font-medium text-purple-300">
                        🔒 Driver assignment is locked while this vehicle is IN_TRANSIT.
                      </p>
                    )}

                  {(!showEditModal ||
                    selectedVehicle?.current_status !==
                      "IN_TRANSIT") &&
                    getAvailableDrivers()
                      .length === 0 && (
                      <p className="mt-2 text-xs text-yellow-400">
                        No available active
                        drivers.
                      </p>
                    )}
                </div>
              </div>

              {/* INFORMATION */}

              <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                {vehicleForm.current_status ===
                  "AVAILABLE" && (
                  <p className="text-xs text-slate-400">
                    Driver assignment is
                    optional for AVAILABLE
                    vehicles.
                  </p>
                )}

                {vehicleForm.current_status ===
                  "ASSIGNED" && (
                  <p className="text-xs text-slate-400">
                    An active driver is
                    required for an ASSIGNED
                    vehicle.
                  </p>
                )}

                {vehicleForm.current_status ===
                  "IN_TRANSIT" && (
                  <p className="text-xs text-slate-400">
                    An active driver is
                    required. Once
                    IN_TRANSIT, the driver and
                    status are locked.
                  </p>
                )}

                {vehicleForm.current_status ===
                  "MAINTENANCE" && (
                  <p className="text-xs text-slate-400">
                    Vehicles under maintenance
                    cannot be assigned to a
                    driver.
                  </p>
                )}
              </div>

              {/* BUTTONS */}

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
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
                  {saving
                    ? "Saving..."
                    : showAddModal
                      ? "Add Vehicle"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Vehicles;