import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Drivers() {
  // =========================================================
  // CURRENT USER
  // =========================================================

  const { user } = useAuth();

  const isDispatcher =
    String(user?.role || "").trim().toUpperCase() ===
    "DISPATCHER";

  // =========================================================
  // STATE
  // =========================================================

  const emptyForm = {
    user_id: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    license_details: "",
    experience_years: "",
    working_hours: "",
    account_status: "ACTIVE",
    vehicle_id: "",
  };

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [showAssignModal, setShowAssignModal] =
    useState(false);

  const [selectedDriver, setSelectedDriver] =
    useState(null);

  const [driverForm, setDriverForm] =
    useState(emptyForm);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      const [
        driverResponse,
        vehicleResponse,
      ] = await Promise.all([
        api.get("/drivers"),
        api.get("/vehicles"),
      ]);

      setDrivers(
        Array.isArray(driverResponse.data)
          ? driverResponse.data
          : []
      );

      setVehicles(
        Array.isArray(vehicleResponse.data)
          ? vehicleResponse.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load drivers:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to load drivers."
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
  // FIND VEHICLE ASSIGNED TO DRIVER
  // =========================================================

  const getCurrentVehicle = (driver) => {
    if (!driver) {
      return null;
    }

    if (driver.assigned_vehicle_id) {
      const vehicle = vehicles.find(
        (item) =>
          item.vehicle_id ===
          driver.assigned_vehicle_id
      );

      if (vehicle) {
        return vehicle;
      }
    }

    const driverId =
      driver.driver_id ||
      driver.user_id;

    return (
      vehicles.find(
        (vehicle) =>
          vehicle.driver_id === driverId
      ) || null
    );
  };

  // =========================================================
  // CHECK IF VEHICLE IS ALREADY ASSIGNED
  // =========================================================

  const isVehicleAssigned = (
    vehicleId,
    currentDriverId = null
  ) => {
    if (!vehicleId) {
      return false;
    }

    return vehicles.some((vehicle) => {
      if (
        vehicle.vehicle_id !==
        vehicleId
      ) {
        return false;
      }

      const vehicleDriverId =
        vehicle.driver_id;

      if (!vehicleDriverId) {
        return false;
      }

      if (
        currentDriverId &&
        vehicleDriverId ===
          currentDriverId
      ) {
        return false;
      }

      return true;
    });
  };

  // =========================================================
  // AVAILABLE VEHICLES
  // =========================================================

  const getAvailableVehicles = () => {
    const currentDriverId =
      selectedDriver?.driver_id ||
      selectedDriver?.user_id ||
      null;

    return vehicles.filter((vehicle) => {
      const isCurrentVehicle =
        selectedDriver &&
        (
          vehicle.vehicle_id ===
            selectedDriver.assigned_vehicle_id ||
          vehicle.driver_id ===
            currentDriverId
        );

      if (isCurrentVehicle) {
        return true;
      }

      if (
        vehicle.current_status !==
        "AVAILABLE"
      ) {
        return false;
      }

      if (vehicle.driver_id) {
        return false;
      }

      return true;
    });
  };

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setDriverForm((previous) => ({
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

    setDriverForm({
      ...emptyForm,
    });

    setSelectedDriver(null);

    setError("");
    setSuccessMessage("");

    setShowAddModal(true);
    setShowEditModal(false);
    setShowAssignModal(false);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditModal = (driver) => {
    if (isDispatcher) {
      return;
    }

    const currentVehicle =
      getCurrentVehicle(driver);

    setSelectedDriver(driver);

    setDriverForm({
      user_id:
        driver.driver_id ||
        driver.user_id ||
        "",

      password: "",

      name:
        driver.name || "",

      email:
        driver.email || "",

      phone:
        driver.phone || "",

      license_details:
        driver.license_details || "",

      experience_years:
        driver.experience_years ??
        "",

      working_hours:
        driver.working_hours || "",

      account_status:
        driver.account_status ||
        "ACTIVE",

      vehicle_id:
        driver.assigned_vehicle_id ||
        currentVehicle?.vehicle_id ||
        "",
    });

    setError("");
    setSuccessMessage("");

    setShowEditModal(true);
    setShowAddModal(false);
    setShowAssignModal(false);
  };

  // =========================================================
  // OPEN ASSIGN MODAL
  // Dispatcher uses this instead of Edit
  // =========================================================

  const openAssignModal = (driver) => {
    const currentVehicle =
      getCurrentVehicle(driver);

    setSelectedDriver(driver);

    setDriverForm({
      ...emptyForm,
      vehicle_id:
        driver.assigned_vehicle_id ||
        currentVehicle?.vehicle_id ||
        "",
    });

    setError("");
    setSuccessMessage("");

    setShowAssignModal(true);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowAddModal(false);
    setShowEditModal(false);
    setShowAssignModal(false);

    setSelectedDriver(null);

    setDriverForm({
      ...emptyForm,
    });

    setError("");
  };

  // =========================================================
  // VALIDATE
  // =========================================================

  const validateForm = () => {
    if (!driverForm.user_id.trim()) {
      setError("Driver ID is required.");
      return false;
    }

    if (
      showAddModal &&
      driverForm.password.length < 8
    ) {
      setError(
        "Password must contain at least 8 characters."
      );
      return false;
    }

    if (!driverForm.name.trim()) {
      setError(
        "Driver name is required."
      );
      return false;
    }

    if (!driverForm.email.trim()) {
      setError("Email is required.");
      return false;
    }

    if (!driverForm.phone.trim()) {
      setError("Phone number is required.");
      return false;
    }

    if (
      driverForm.phone.trim().length < 10
    ) {
      setError(
        "Phone number must contain at least 10 characters."
      );
      return false;
    }

    if (
      driverForm.experience_years !==
        "" &&
      Number(
        driverForm.experience_years
      ) < 0
    ) {
      setError(
        "Experience cannot be negative."
      );
      return false;
    }

    return true;
  };

  // =========================================================
  // ADD DRIVER
  // =========================================================

  const handleAddDriver = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        user_id:
          driverForm.user_id.trim(),

        password:
          driverForm.password,

        name:
          driverForm.name.trim(),

        email:
          driverForm.email.trim(),

        phone:
          driverForm.phone.trim(),

        license_details:
          driverForm.license_details.trim() ||
          null,

        experience_years:
          driverForm.experience_years ===
          ""
            ? null
            : Number(
                driverForm.experience_years
              ),

        working_hours:
          driverForm.working_hours.trim() ||
          null,
      };

      await api.post(
        "/drivers",
        payload
      );

      setShowAddModal(false);

      setDriverForm({
        ...emptyForm,
      });

      setSuccessMessage(
        "Driver added successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to add driver:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to add driver."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE DRIVER
  // =========================================================

  const handleUpdateDriver = async (
    event
  ) => {
    event.preventDefault();

    if (isDispatcher) {
      setError("Dispatchers can assign vehicles but cannot edit driver details.");
      return;
    }

    if (!selectedDriver) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const currentVehicle =
      getCurrentVehicle(
        selectedDriver
      );

    const isInTransit =
      currentVehicle?.current_status ===
      "IN_TRANSIT";

    const oldVehicleId =
      selectedDriver.assigned_vehicle_id ||
      currentVehicle?.vehicle_id ||
      "";

    const newVehicleId =
      driverForm.vehicle_id || "";

    // =======================================================
    // IN TRANSIT LOCK
    // =======================================================

    if (isInTransit) {
      if (
        newVehicleId !== oldVehicleId
      ) {
        setError(
          "This driver's vehicle is IN_TRANSIT. The vehicle assignment cannot be changed until the shipment is completed."
        );
        return;
      }
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      // -----------------------------------------------------
      // UPDATE DRIVER DETAILS
      // -----------------------------------------------------

      const payload = {
        name:
          driverForm.name.trim(),

        email:
          driverForm.email.trim(),

        phone:
          driverForm.phone.trim(),

        license_details:
          driverForm.license_details.trim() ||
          null,

        experience_years:
          driverForm.experience_years ===
          ""
            ? null
            : Number(
                driverForm.experience_years
              ),

        working_hours:
          driverForm.working_hours.trim() ||
          null,

        account_status:
          driverForm.account_status,
      };

      if (
        driverForm.password.trim()
      ) {
        payload.password =
          driverForm.password;
      }

      await api.put(
        `/drivers/${selectedDriver.driver_id}`,
        payload
      );

      // -----------------------------------------------------
      // UNASSIGN
      // -----------------------------------------------------

      if (
        oldVehicleId &&
        !newVehicleId
      ) {
        await api.post(
          `/drivers/${selectedDriver.driver_id}/unassign`
        );
      }

      // -----------------------------------------------------
      // ASSIGN / CHANGE
      // -----------------------------------------------------

      else if (
        newVehicleId &&
        newVehicleId !== oldVehicleId
      ) {
        await api.post(
          `/drivers/${selectedDriver.driver_id}/assign`,
          {
            vehicle_id:
              newVehicleId,
          }
        );
      }

      setShowEditModal(false);

      setSelectedDriver(null);

      setDriverForm({
        ...emptyForm,
      });

      setSuccessMessage(
        "Driver updated successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to update driver:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to update driver."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DISPATCHER ASSIGN / CHANGE VEHICLE
  // =========================================================

  const handleAssignVehicle = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedDriver) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const currentVehicle =
      getCurrentVehicle(
        selectedDriver
      );

    const oldVehicleId =
      selectedDriver.assigned_vehicle_id ||
      currentVehicle?.vehicle_id ||
      "";

    const newVehicleId =
      driverForm.vehicle_id || "";

    const isInTransit =
      currentVehicle?.current_status ===
      "IN_TRANSIT";

    // =======================================================
    // IN TRANSIT LOCK
    // =======================================================

    if (isInTransit) {
      if (
        newVehicleId !== oldVehicleId
      ) {
        setError(
          "This driver's vehicle is IN_TRANSIT. The vehicle assignment cannot be changed until the shipment is completed."
        );
        return;
      }
    }

    // =======================================================
    // NOTHING CHANGED
    // =======================================================

    if (
      newVehicleId === oldVehicleId
    ) {
      setError(
        "No vehicle assignment change was made."
      );
      return;
    }

    try {
      setSaving(true);

      // -----------------------------------------------------
      // UNASSIGN
      // -----------------------------------------------------

      if (!newVehicleId) {
        if (!oldVehicleId) {
          setError(
            "This driver is not assigned to a vehicle."
          );
          return;
        }

        await api.post(
          `/drivers/${selectedDriver.driver_id}/unassign`
        );

        setSuccessMessage(
          "Driver unassigned successfully."
        );
      }

      // -----------------------------------------------------
      // ASSIGN / CHANGE
      // -----------------------------------------------------

      else {
        const alreadyAssigned =
          isVehicleAssigned(
            newVehicleId,
            selectedDriver.driver_id ||
              selectedDriver.user_id
          );

        if (alreadyAssigned) {
          setError(
            "This vehicle is already assigned to another driver."
          );
          return;
        }

        await api.post(
          `/drivers/${selectedDriver.driver_id}/assign`,
          {
            vehicle_id:
              newVehicleId,
          }
        );

        setSuccessMessage(
          oldVehicleId
            ? "Vehicle assignment changed successfully."
            : "Vehicle assigned successfully."
        );
      }

      setShowAssignModal(false);

      setSelectedDriver(null);

      setDriverForm({
        ...emptyForm,
      });

      await loadData();
    } catch (err) {
      console.error(
        "Failed to assign vehicle:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to update vehicle assignment."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UNASSIGN DRIVER
  // =========================================================

  const handleUnassign = async (
    driver
  ) => {
    const currentVehicle =
      getCurrentVehicle(driver);

    if (
      currentVehicle?.current_status ===
      "IN_TRANSIT"
    ) {
      setError(
        "This driver cannot be unassigned because the vehicle is IN_TRANSIT."
      );
      return;
    }

    if (
      !driver.assigned_vehicle_id &&
      !currentVehicle?.vehicle_id
    ) {
      setError(
        "This driver is not assigned to a vehicle."
      );
      return;
    }

    const vehicleId =
      driver.assigned_vehicle_id ||
      currentVehicle?.vehicle_id;

    const confirmed =
      window.confirm(
        `Unassign ${driver.name} from vehicle ${vehicleId}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await api.post(
        `/drivers/${driver.driver_id}/unassign`
      );

      setSuccessMessage(
        "Driver unassigned successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to unassign driver:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to unassign driver."
      );
    }
  };

  // =========================================================
  // DELETE DRIVER
  // =========================================================

  const handleDeleteDriver = async (
    driver
  ) => {
    if (isDispatcher) {
      setError("Dispatchers cannot delete drivers.");
      return;
    }

    const currentVehicle =
      getCurrentVehicle(driver);

    const assignedVehicleId =
      driver.assigned_vehicle_id ||
      currentVehicle?.vehicle_id ||
      null;

    if (assignedVehicleId) {
      setError(
        "Cannot delete a driver with an active vehicle assignment. Unassign the vehicle first."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete driver ${driver.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      setError("");
      setSuccessMessage("");

      await api.delete(
        `/drivers/${driver.driver_id}`
      );

      setSuccessMessage(
        "Driver deleted successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to delete driver:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to delete driver."
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
          Drivers
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Loading drivers...
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
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Drivers
          </h1>

          <p className="mt-2 text-slate-500">
            Manage drivers and their vehicle assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 px-4 py-2">
            <span className="text-sm font-medium text-blue-700">
              {drivers.length} driver
              {drivers.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {/* DISPATCHER CANNOT ADD DRIVER */}

          {!isDispatcher && (
            <button
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Add Driver
            </button>
          )}
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
              className="text-xs font-semibold text-red-600"
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

      {drivers.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">
            No drivers found.
          </p>

          {!isDispatcher && (
            <button
              onClick={openAddModal}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add First Driver
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Experience
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
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
                {drivers.map(
                  (driver) => {
                    const currentVehicle =
                      getCurrentVehicle(
                        driver
                      );

                    const assignedVehicleId =
                      driver.assigned_vehicle_id ||
                      currentVehicle?.vehicle_id ||
                      null;

                    const isInTransit =
                      currentVehicle?.current_status ===
                      "IN_TRANSIT";

                    return (
                      <tr
                        key={
                          driver.driver_id ||
                          driver.user_id
                        }
                        className="hover:bg-slate-50"
                      >
                        {/* DRIVER */}

                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-800">
                            {driver.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            ID:{" "}
                            {driver.driver_id ||
                              driver.user_id}
                          </p>
                        </td>

                        {/* EMAIL */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {driver.email}
                        </td>

                        {/* PHONE */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {driver.phone}
                        </td>

                        {/* EXPERIENCE */}

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {driver.experience_years !==
                          null
                            ? `${driver.experience_years} years`
                            : "Not specified"}
                        </td>

                        {/* VEHICLE */}

                        <td className="px-5 py-5">
                          {assignedVehicleId ? (
                            <div>
                              <p className="font-semibold text-blue-700">
                                {
                                  assignedVehicleId
                                }
                              </p>

                              {currentVehicle && (
                                <span
                                  className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                    currentVehicle.current_status ===
                                    "IN_TRANSIT"
                                      ? "bg-purple-100 text-purple-700"
                                      : currentVehicle.current_status ===
                                          "ASSIGNED"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {
                                    currentVehicle.current_status
                                  }
                                </span>
                              )}

                              {isInTransit && (
                                <p className="mt-1 text-xs font-medium text-purple-600">
                                  Assignment locked
                                </p>
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
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              driver.account_status ===
                              "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {
                              driver.account_status
                            }
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-5">
                          <div className="flex flex-wrap gap-2">

                            {/* ADMIN / MANAGER EDIT */}

                            {!isDispatcher && (
                              <button
                                onClick={() =>
                                  openEditModal(
                                    driver
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                            )}

                            {/* DISPATCHER ASSIGN / CHANGE */}

                            {isDispatcher &&
                              !isInTransit && (
                                <button
                                  onClick={() =>
                                    openAssignModal(
                                      driver
                                    )
                                  }
                                  className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                  {assignedVehicleId
                                    ? "Change Vehicle"
                                    : "Assign Vehicle"}
                                </button>
                              )}

                            {/* ADMIN / MANAGER ASSIGN / CHANGE */}

                            {!isDispatcher &&
                              !isInTransit && (
                                <button
                                  onClick={() =>
                                    openAssignModal(
                                      driver
                                    )
                                  }
                                  className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                  {assignedVehicleId
                                    ? "Change Vehicle"
                                    : "Assign Vehicle"}
                                </button>
                              )}

                            {/* UNASSIGN */}

                            {assignedVehicleId &&
                              !isInTransit && (
                                <button
                                  onClick={() =>
                                    handleUnassign(
                                      driver
                                    )
                                  }
                                  className="rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                                >
                                  Unassign
                                </button>
                              )}

                            {/* DELETE */}

                            {!isDispatcher && (
                              <button
                                onClick={() =>
                                  handleDeleteDriver(
                                    driver
                                  )
                                }
                                disabled={
                                  deleting ||
                                  Boolean(
                                    assignedVehicleId
                                  )
                                }
                                title={
                                  assignedVehicleId
                                    ? "Unassign vehicle first"
                                    : "Delete driver"
                                }
                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Delete
                              </button>
                            )}

                          </div>
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

      {/* =======================================================
          ADD / EDIT / ASSIGN MODAL
      ======================================================= */}

      {(showAddModal ||
        showEditModal ||
        showAssignModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">

            {/* HEADER */}

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">

                  {showAddModal
                    ? "Add Driver"
                    : showAssignModal
                      ? "Vehicle Assignment"
                      : "Edit Driver"}

                </h2>

                <p className="mt-1 text-sm text-slate-400">

                  {showAddModal
                    ? "Create a new driver account."
                    : showAssignModal
                      ? `Assign a vehicle to ${selectedDriver?.name || "driver"}.`
                      : "Update driver information and vehicle assignment."}

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

            {(showEditModal ||
              showAssignModal) &&
              selectedDriver &&
              getCurrentVehicle(
                selectedDriver
              )?.current_status ===
                "IN_TRANSIT" && (
                <div className="mt-5 rounded-lg border border-purple-700 bg-purple-950/40 px-4 py-4">
                  <p className="font-semibold text-purple-300">
                    Driver assignment is locked
                  </p>

                  <p className="mt-1 text-sm text-purple-200/80">
                    This driver's vehicle is
                    IN_TRANSIT. The vehicle
                    assignment cannot be changed
                    until the shipment is
                    completed.
                  </p>
                </div>
              )}

            {/* =================================================
                DISPATCHER ASSIGNMENT ONLY
                ================================================= */}

            {showAssignModal ? (
              <form
                onSubmit={
                  handleAssignVehicle
                }
                className="mt-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Vehicle Assignment
                  </label>

                  <select
                    name="vehicle_id"
                    value={
                      driverForm.vehicle_id
                    }
                    onChange={handleChange}
                    disabled={
                      getCurrentVehicle(
                        selectedDriver
                      )?.current_status ===
                      "IN_TRANSIT"
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:opacity-70"
                  >
                    <option value="">
                      No vehicle / Unassign
                    </option>

                    {getAvailableVehicles().map(
                      (vehicle) => (
                        <option
                          key={
                            vehicle.vehicle_id
                          }
                          value={
                            vehicle.vehicle_id
                          }
                        >
                          {
                            vehicle.vehicle_id
                          }
                          {" — "}
                          {
                            vehicle.current_status
                          }
                        </option>
                      )
                    )}
                  </select>

                  {getAvailableVehicles()
                    .length === 0 &&
                    getCurrentVehicle(
                      selectedDriver
                    )?.current_status !==
                      "IN_TRANSIT" && (
                      <p className="mt-2 text-xs text-yellow-400">
                        No AVAILABLE vehicles.
                      </p>
                    )}
                </div>

                <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                  <p className="text-xs text-slate-400">
                    Only ACTIVE drivers can be
                    assigned. Only AVAILABLE
                    vehicles can be newly
                    assigned. IN_TRANSIT
                    assignments are locked.
                  </p>
                </div>

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
                    disabled={
                      saving ||
                      getCurrentVehicle(
                        selectedDriver
                      )?.current_status ===
                        "IN_TRANSIT"
                    }
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Assignment"}
                  </button>
                </div>
              </form>
            ) : (
              /* =================================================
                 ADMIN / MANAGER ADD / EDIT FORM
                 ================================================= */

              <form
                onSubmit={
                  showAddModal
                    ? handleAddDriver
                    : handleUpdateDriver
                }
                className="mt-6"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <FormInput
                    label="Driver ID *"
                    name="user_id"
                    value={
                      driverForm.user_id
                    }
                    onChange={handleChange}
                    placeholder="DRV001"
                    required
                    disabled={
                      showEditModal
                    }
                  />

                  <FormInput
                    label="Name *"
                    name="name"
                    value={
                      driverForm.name
                    }
                    onChange={handleChange}
                    placeholder="Driver Name"
                    required
                  />

                  <FormInput
                    label="Email *"
                    type="email"
                    name="email"
                    value={
                      driverForm.email
                    }
                    onChange={handleChange}
                    placeholder="driver@example.com"
                    required
                  />

                  <FormInput
                    label="Phone *"
                    name="phone"
                    value={
                      driverForm.phone
                    }
                    onChange={handleChange}
                    placeholder="9876543210"
                    required
                  />

                  <FormInput
                    label={
                      showAddModal
                        ? "Password *"
                        : "New Password"
                    }
                    type="password"
                    name="password"
                    value={
                      driverForm.password
                    }
                    onChange={handleChange}
                    placeholder={
                      showAddModal
                        ? "Minimum 8 characters"
                        : "Leave blank to keep current password"
                    }
                    required={
                      showAddModal
                    }
                  />

                  <FormInput
                    label="License Details"
                    name="license_details"
                    value={
                      driverForm.license_details
                    }
                    onChange={handleChange}
                    placeholder="LMV / HMV"
                  />

                  <FormInput
                    label="Experience (Years)"
                    type="number"
                    name="experience_years"
                    value={
                      driverForm.experience_years
                    }
                    onChange={handleChange}
                    placeholder="5"
                    min="0"
                  />

                  <FormInput
                    label="Working Hours"
                    name="working_hours"
                    value={
                      driverForm.working_hours
                    }
                    onChange={handleChange}
                    placeholder="9 AM - 6 PM"
                  />

                  <FormSelect
                    label="Account Status"
                    name="account_status"
                    value={
                      driverForm.account_status
                    }
                    onChange={handleChange}
                    options={[
                      "ACTIVE",
                      "INACTIVE",
                    ]}
                  />

                  {/* VEHICLE ASSIGNMENT */}

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-200">
                      Vehicle Assignment
                    </label>

                    {(() => {
                      const currentVehicle =
                        getCurrentVehicle(
                          selectedDriver
                        );

                      const isInTransit =
                        showEditModal &&
                        currentVehicle?.current_status ===
                          "IN_TRANSIT";

                      return (
                        <>
                          <select
                            name="vehicle_id"
                            value={
                              driverForm.vehicle_id
                            }
                            onChange={
                              handleChange
                            }
                            disabled={
                              isInTransit
                            }
                            className={`w-full rounded-lg border border-slate-700 px-4 py-3 text-white outline-none ${
                              isInTransit
                                ? "cursor-not-allowed bg-slate-800 opacity-70"
                                : "bg-slate-950 focus:border-blue-500"
                            }`}
                          >
                            <option value="">
                              No vehicle /
                              Unassign
                            </option>

                            {getAvailableVehicles().map(
                              (vehicle) => (
                                <option
                                  key={
                                    vehicle.vehicle_id
                                  }
                                  value={
                                    vehicle.vehicle_id
                                  }
                                >
                                  {
                                    vehicle.vehicle_id
                                  }
                                  {" — "}
                                  {
                                    vehicle.current_status
                                  }

                                  {vehicle.driver_id &&
                                    vehicle.driver_id !==
                                      (selectedDriver?.driver_id ||
                                        selectedDriver?.user_id) &&
                                    " — Assigned"}
                                </option>
                              )
                            )}
                          </select>

                          {isInTransit && (
                            <p className="mt-2 text-xs font-medium text-purple-300">
                              Vehicle assignment
                              is locked because
                              the current vehicle
                              is IN_TRANSIT.
                            </p>
                          )}

                          {!isInTransit &&
                            getAvailableVehicles()
                              .length === 0 && (
                              <p className="mt-2 text-xs text-yellow-400">
                                No AVAILABLE
                                vehicles.
                              </p>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">
                  <p className="text-xs text-slate-400">
                    Only ACTIVE drivers can be
                    assigned to vehicles. Only
                    AVAILABLE vehicles can be
                    newly assigned. IN_TRANSIT
                    assignments are locked.
                  </p>
                </div>

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
                        ? "Add Driver"
                        : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

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

export default Drivers;