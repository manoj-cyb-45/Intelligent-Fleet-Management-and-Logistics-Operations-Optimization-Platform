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
  const [shipments, setShipments] = useState([]);

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
        shipmentResponse,
      ] = await Promise.all([
        api.get("/drivers"),
        api.get("/vehicles"),
        api.get("/shipments"),
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

      setShipments(
        Array.isArray(shipmentResponse.data)
          ? shipmentResponse.data
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

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // FIND CURRENT SHIPMENT FOR DRIVER
  // =========================================================

  const getCurrentShipment = (driver) => {
    if (!driver) {
      return null;
    }

    const driverId =
      driver.driver_id ||
      driver.user_id;

    return (
      shipments.find(
        (shipment) =>
          (shipment.driver_id === driverId) &&
          ["CREATED", "ASSIGNED", "IN_TRANSIT", "DELAYED"].includes(
            String(shipment.status || "").toUpperCase()
          )
      ) || null
    );
  };

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
        <h1 className="driver-page-title">
          Drivers
        </h1>

        <div className="driver-loading-card">
          <p className="driver-loading-text">
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

      <div className="driver-page-header">
        <div>
          <h1 className="driver-page-title">
            Drivers
          </h1>

          <p className="driver-page-subtitle">
            Manage drivers and their vehicle assignments.
          </p>
        </div>

        <div className="driver-header-actions">
          <div className="driver-count-badge">
            <span className="driver-count-text">
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
              className="driver-primary-btn"
            >
              + Add Driver
            </button>
          )}
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="driver-message driver-error">
          <div className="driver-message-inner">
            <p className="driver-error-text">
              {error}
            </p>

            <button
              onClick={() =>
                setError("")
              }
              className="driver-dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="driver-message driver-success">
          <p className="driver-success-text">
            {successMessage}
          </p>
        </div>
      )}

      {/* EMPTY */}

      {drivers.length === 0 ? (
        <div className="driver-empty-state">
          <p className="driver-muted">
            No drivers found.
          </p>

          {!isDispatcher && (
            <button
              onClick={openAddModal}
              className="driver-primary-btn driver-empty-btn"
            >
              + Add First Driver
            </button>
          )}
        </div>
      ) : (
        <div className="driver-table-card">
          <div className="driver-table-scroll">
            <table className="driver-table">
              <thead className="driver-table-head">
                <tr>
                  <th className="driver-th">
                    Driver
                  </th>

                  <th className="driver-th">
                    Email
                  </th>

                  <th className="driver-th">
                    Phone
                  </th>

                  <th className="driver-th">
                    Experience
                  </th>

                  <th className="driver-th">
                    Vehicle
                  </th>

                  <th className="driver-th">
                    Status
                  </th>

                  <th className="driver-th">
                    Current Shipment
                  </th>

                  <th className="driver-th">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="driver-table-body">
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

                    const currentShipment =
                      getCurrentShipment(driver);

                    return (
                      <tr
                        key={
                          driver.driver_id ||
                          driver.user_id
                        }
                        className="driver-row"
                      >
                        {/* DRIVER */}

                        <td className="driver-td">
                          <p className="driver-name">
                            {driver.name}
                          </p>

                          <p className="driver-subtext">
                            ID:{" "}
                            {driver.driver_id ||
                              driver.user_id}
                          </p>
                        </td>

                        {/* EMAIL */}

                        <td className="driver-td driver-cell-text">
                          {driver.email}
                        </td>

                        {/* PHONE */}

                        <td className="driver-td driver-cell-text">
                          {driver.phone}
                        </td>

                        {/* EXPERIENCE */}

                        <td className="driver-td driver-cell-text">
                          {driver.experience_years !==
                          null
                            ? `${driver.experience_years} years`
                            : "Not specified"}
                        </td>

                        {/* VEHICLE */}

                        <td className="driver-td">
                          {assignedVehicleId ? (
                            <div>
                              <p className="driver-vehicle-id">
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
                                        : "driver-status-active"
                                  }`}
                                >
                                  {
                                    currentVehicle.current_status
                                  }
                                </span>
                              )}

                              {isInTransit && (
                                <p className="driver-assignment-locked">
                                  Assignment locked
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="driver-not-assigned">
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* STATUS */}

                        <td className="driver-td">
                          <span
                            className={`driver-status-pill ${
                              driver.account_status ===
                              "ACTIVE"
                                ? "driver-status-active"
                                : "driver-status-inactive"
                            }`}
                          >
                            {
                              driver.account_status
                            }
                          </span>
                        </td>

                        {/* CURRENT SHIPMENT */}

                        <td className="driver-td">
                          {currentShipment ? (
                            <div>
                              <p className="driver-vehicle-id">
                                {currentShipment.shipment_id}
                              </p>
                              <p className="driver-subtext">
                                {String(currentShipment.status || "").replaceAll("_", " ")}
                                {" · "}
                                {Number(currentShipment.delivery_progress || 0).toFixed(1)}%
                              </p>
                            </div>
                          ) : (
                            <span className="driver-not-assigned">
                              No active shipment
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td className="driver-td">
                          <div className="driver-actions">

                            {/* ADMIN / MANAGER EDIT */}

                            {!isDispatcher && (
                              <button
                                onClick={() =>
                                  openEditModal(
                                    driver
                                  )
                                }
                                className="driver-btn driver-edit-btn"
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
                                  className="driver-btn driver-assign-btn"
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
                                  className="driver-btn driver-assign-btn"
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
                                  className="driver-btn driver-unassign-btn"
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
                                className="driver-btn driver-delete-btn"
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
        <div className="driver-modal-overlay">
          <div className="driver-modal">

            {/* HEADER */}

            <div className="driver-modal-header">
              <div>
                <h2 className="driver-modal-title">

                  {showAddModal
                    ? "Add Driver"
                    : showAssignModal
                      ? "Vehicle Assignment"
                      : "Edit Driver"}

                </h2>

                <p className="driver-assignment-subtext">

                  {showAddModal
                    ? "Create a new driver account."
                    : showAssignModal
                      ? `Assign a vehicle to ${selectedDriver?.name || "driver"}.`
                      : "Update driver information and vehicle assignment."}

                </p>
              </div>

              <button
                onClick={closeModal}
                className="driver-modal-close"
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
                <div className="driver-lock-warning">
                  <p className="driver-lock-title">
                    Driver assignment is locked
                  </p>

                  <p className="driver-lock-text">
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
                className="driver-form-section"
              >
                <div>
                  <label className="driver-form-label">
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
                    className="driver-form-control"
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
                      <p className="mt-2 driver-warning-text">
                        No AVAILABLE vehicles.
                      </p>
                    )}
                </div>

                <div className="driver-form-note">
                  <p className="driver-note-text">
                    Only ACTIVE drivers can be
                    assigned. Only AVAILABLE
                    vehicles can be newly
                    assigned. IN_TRANSIT
                    assignments are locked.
                  </p>
                </div>

                <div className="driver-modal-actions">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="driver-modal-btn driver-cancel-btn"
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
                    className="driver-modal-btn driver-save-btn"
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
                className="driver-form-section"
              >
                <div className="driver-form-grid">

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

                  <div className="driver-form-full">
                    <label className="driver-form-label">
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
                            <p className="driver-inline-lock-text">
                              Vehicle assignment
                              is locked because
                              the current vehicle
                              is IN_TRANSIT.
                            </p>
                          )}

                          {!isInTransit &&
                            getAvailableVehicles()
                              .length === 0 && (
                              <p className="mt-2 driver-warning-text">
                                No AVAILABLE
                                vehicles.
                              </p>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="driver-form-note">
                  <p className="driver-note-text">
                    Only ACTIVE drivers can be
                    assigned to vehicles. Only
                    AVAILABLE vehicles can be
                    newly assigned. IN_TRANSIT
                    assignments are locked.
                  </p>
                </div>

                <div className="driver-modal-actions">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="driver-modal-btn driver-cancel-btn"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="driver-modal-btn driver-save-btn"
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
      <label className="driver-form-label">
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
            ? "cursor-not-allowed bg-slate-800 driver-muted"
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
      <label className="driver-form-label">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`driver-form-control ${disabled ? "driver-control-disabled" : ""}`}
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