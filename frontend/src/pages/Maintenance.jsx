import { useEffect, useState } from "react";
import api from "../services/api";

function Maintenance() {
  // =========================================================
  // EMPTY FORM
  // =========================================================

  const emptyForm = {
    vehicle_id: "",
    maintenance_type: "PREVENTIVE",
    description: "",
    maintenance_date: "",
    due_date: "",
    cost: "0",
    status: "SCHEDULED",
  };

  // =========================================================
  // STATE
  // =========================================================

  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [maintenanceForm, setMaintenanceForm] =
    useState(emptyForm);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      const [
        maintenanceResponse,
        vehicleResponse,
      ] = await Promise.all([
        api.get("/maintenance"),
        api.get("/vehicles"),
      ]);

      setRecords(
        Array.isArray(maintenanceResponse.data)
          ? maintenanceResponse.data
          : []
      );

      setVehicles(
        Array.isArray(vehicleResponse.data)
          ? vehicleResponse.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load maintenance data:",
        err
      );

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          "Unable to load maintenance records."
        );
      }
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);

      await loadData();

      setLoading(false);
    };

    initialLoad();
  }, []);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setMaintenanceForm((previous) => {
      const updatedForm = {
        ...previous,
        [name]: value,
      };

      // If maintenance date changes and existing due
      // date is before it, clear the due date.
      if (
        name === "maintenance_date" &&
        updatedForm.due_date &&
        updatedForm.due_date < value
      ) {
        updatedForm.due_date = "";
      }

      return updatedForm;
    });

    setError("");
    setSuccessMessage("");
  };

  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const openAddModal = () => {
    setMaintenanceForm({
      ...emptyForm,

      // Scheduled maintenance starts from tomorrow.
      maintenance_date: getTomorrowDate(),

      due_date: "",
    });

    setSelectedRecord(null);
    setError("");
    setSuccessMessage("");
    setShowAddModal(true);
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================
const openEditModal = (record) => {
  if (record.status === "COMPLETED") {
    return;
  }

  setSelectedRecord(record);

    setMaintenanceForm({
      vehicle_id: record.vehicle_id || "",

      maintenance_type:
        record.maintenance_type ||
        "PREVENTIVE",

      description:
        record.description || "",

      maintenance_date:
        formatDateForInput(
          record.maintenance_date
        ),

      due_date:
        formatDateForInput(
          record.due_date
        ),

      cost: record.cost ?? 0,

      status:
        record.status ||
        "SCHEDULED",
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

    setSelectedRecord(null);

    setMaintenanceForm({
      ...emptyForm,
    });

    setError("");
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (!maintenanceForm.vehicle_id) {
      setError("Please select a vehicle.");
      return false;
    }

    if (!maintenanceForm.maintenance_type) {
      setError(
        "Please select maintenance type."
      );
      return false;
    }

    if (!maintenanceForm.maintenance_date) {
      setError(
        "Please select maintenance date."
      );
      return false;
    }

    // -----------------------------------------------------
    // SCHEDULED MAINTENANCE
    // -----------------------------------------------------

    if (
      maintenanceForm.status ===
      "SCHEDULED"
    ) {
      const tomorrow = getTomorrowDate();

      if (
        maintenanceForm.maintenance_date <
        tomorrow
      ) {
        setError(
          "Scheduled maintenance date must be a future date."
        );
        return false;
      }
    }

    // -----------------------------------------------------
    // DUE DATE
    // -----------------------------------------------------

    if (maintenanceForm.due_date) {
      if (
        maintenanceForm.due_date <
        maintenanceForm.maintenance_date
      ) {
        setError(
          "Due date cannot be before the maintenance date."
        );
        return false;
      }

      if (
        maintenanceForm.status ===
          "SCHEDULED" &&
        maintenanceForm.due_date <
          getTomorrowDate()
      ) {
        setError(
          "Maintenance due date must be a future date."
        );
        return false;
      }
    }

    // -----------------------------------------------------
    // COST
    // -----------------------------------------------------

    if (
      maintenanceForm.cost === "" ||
      Number(maintenanceForm.cost) < 0
    ) {
      setError(
        "Cost cannot be negative."
      );
      return false;
    }

    return true;
  };

  // =========================================================
  // BUILD PAYLOAD
  // =========================================================

  const buildPayload = () => {
    return {
      vehicle_id:
        maintenanceForm.vehicle_id,

      maintenance_type:
        maintenanceForm.maintenance_type,

      description:
        maintenanceForm.description ||
        null,

      // DATE ONLY
      maintenance_date:
        maintenanceForm.maintenance_date,

      // DATE ONLY
      due_date:
        maintenanceForm.due_date ||
        null,

      cost:
        Number(
          maintenanceForm.cost
        ),

      status:
        maintenanceForm.status,
    };
  };

  // =========================================================
  // ADD MAINTENANCE
  // =========================================================

  const handleAddMaintenance = async (
    event
  ) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload =
        buildPayload();

      console.log(
        "MAINTENANCE PAYLOAD:",
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      await api.post(
        "/maintenance",
        payload
      );

      setShowAddModal(false);

      setMaintenanceForm({
        ...emptyForm,
      });

      setSelectedRecord(null);

      setSuccessMessage(
        "Maintenance record added successfully."
      );

      await loadData();
    } catch (err) {
      console.error(
        "Failed to create maintenance:",
        err
      );

      console.log(
        "STATUS:",
        err.response?.status
      );

      console.log(
        "RESPONSE DATA:",
        err.response?.data
      );

      console.log(
        "RESPONSE DETAIL:",
        err.response?.data?.detail
      );

      if (
        err.response?.data?.detail
      ) {
        setError(
          err.response.data.detail
        );
      } else {
        setError(
          "Unable to create maintenance record."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE MAINTENANCE
  // =========================================================

  const handleUpdateMaintenance =
    async (event) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      if (!selectedRecord) {
        return;
      }

      setError("");
      setSuccessMessage("");

      if (!validateForm()) {
        return;
      }

      try {
        setSaving(true);

        const payload =
          buildPayload();

        console.log(
          "UPDATE MAINTENANCE PAYLOAD:",
          JSON.stringify(
            payload,
            null,
            2
          )
        );

        await api.put(
          `/maintenance/${selectedRecord.maintenance_id}`,
          payload
        );

        setShowEditModal(false);

        setSelectedRecord(null);

        setMaintenanceForm({
          ...emptyForm,
        });

        setSuccessMessage(
          "Maintenance record updated successfully."
        );

        await loadData();
      } catch (err) {
        console.error(
          "Failed to update maintenance:",
          err
        );

        if (
          err.response?.data?.detail
        ) {
          setError(
            err.response.data.detail
          );
        } else {
          setError(
            "Unable to update maintenance record."
          );
        }
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusClass = (
    maintenanceStatus
  ) => {
    switch (
      maintenanceStatus
    ) {
      case "SCHEDULED":
        return "bg-amber-100 text-amber-700";

      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";

      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="maintenance-page">
        <h1 className="maintenance-page-title">
          Maintenance
        </h1>

        <p className="maintenance-page-subtitle">
          Manage vehicle maintenance records.
        </p>

        <div className="maintenance-loading-card">
          <p className="maintenance-loading-text">
            Loading maintenance records...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="maintenance-page">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="maintenance-page-title">
            Maintenance
          </h1>

          <p className="maintenance-page-subtitle">
            Manage vehicle maintenance records.
          </p>
        </div>

        <div className="maintenance-header-actions">
          <div className="maintenance-count-badge">
            <span className="maintenance-count-text">
              {records.length} record
              {records.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="maintenance-primary-btn"
          >
            + Add Maintenance
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="maintenance-message maintenance-error">
          <div className="maintenance-message-inner">
            <p className="maintenance-error-text">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="maintenance-dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="maintenance-message maintenance-success">
          <p className="maintenance-success-text">
            {successMessage}
          </p>
        </div>
      )}

      {/* EMPTY */}

      {records.length === 0 ? (
        <div className="maintenance-empty-card">
          <p className="maintenance-empty-text">
            No maintenance records found.
          </p>

          <button
            type="button"
            onClick={openAddModal}
            className="maintenance-primary-btn maintenance-empty-btn"
          >
            + Add First Maintenance
          </button>
        </div>
      ) : (
        /* TABLE */

        <div className="maintenance-table-card">
          <div className="maintenance-table-scroll">
            <table className="maintenance-table">
              <thead className="maintenance-table-head">
                <tr>
                  <th className="maintenance-th">
                    Record
                  </th>

                  <th className="maintenance-th">
                    Vehicle
                  </th>

                  <th className="maintenance-th">
                    Maintenance Type
                  </th>

                  <th className="maintenance-th">
                    Description
                  </th>

                  <th className="maintenance-th">
                    Maintenance Date
                  </th>

                  <th className="maintenance-th">
                    Due Date
                  </th>

                  <th className="maintenance-th">
                    Cost
                  </th>

                  <th className="maintenance-th">
                    Status
                  </th>

                  <th className="maintenance-th">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="maintenance-table-body">
                {records.map(
                  (record) => (
                    <tr
                      key={
                        record.maintenance_id
                      }
                      className="maintenance-row"
                    >
                      <td className="maintenance-td">
                        <span className="maintenance-record-id">
                          #
                          {
                            record.maintenance_id
                          }
                        </span>
                      </td>

                      <td className="maintenance-td">
                        <span className="maintenance-primary-text">
                          {
                            record.vehicle_id
                          }
                        </span>
                      </td>

                      <td className="maintenance-td">
                        <span className="maintenance-primary-text">
                          {formatMaintenanceType(
                            record.maintenance_type
                          )}
                        </span>
                      </td>

                      <td className="maintenance-td">
                        {record.description ||
                          "No description"}
                      </td>

                      <td className="maintenance-td">
                        {formatDate(
                          record.maintenance_date
                        )}
                      </td>

                      <td className="maintenance-td">
                        {formatDate(
                          record.due_date
                        )}
                      </td>

                      <td className="maintenance-td">
                        {formatCurrency(
                          record.cost
                        )}
                      </td>

                      <td className="maintenance-td">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            record.status
                          )}`}
                        >
                          {formatStatus(
                            record.status
                          )}
                        </span>
                      </td>

                      <td className="maintenance-td">
                          {record.status !== "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(record)
                              }
                              className="maintenance-edit-btn"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="maintenance-locked-badge">
                              🔒 Locked
                            </span>
                          )}
                        </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD MODAL */}

      {showAddModal && (
        <MaintenanceModal
          title="Add Maintenance"
          description="Create a maintenance record for a vehicle."
          form={maintenanceForm}
          vehicles={vehicles}
          onChange={handleChange}
          onSubmit={
            handleAddMaintenance
          }
          onCancel={closeModal}
          saving={saving}
        />
      )}

      {/* EDIT MODAL */}

      {showEditModal && (
        <MaintenanceModal
          title="Edit Maintenance"
          description={`Update maintenance record #${selectedRecord?.maintenance_id}`}
          form={maintenanceForm}
          vehicles={vehicles}
          onChange={handleChange}
          onSubmit={
            handleUpdateMaintenance
          }
          onCancel={closeModal}
          saving={saving}
        />
      )}
    </div>
  );
}


// =========================================================
// MODAL
// =========================================================

function MaintenanceModal({
  title,
  description,
  form,
  vehicles,
  onChange,
  onSubmit,
  onCancel,
  saving,
}) {
  const isScheduled =
    form.status === "SCHEDULED";

  return (
    <div className="maintenance-modal-overlay">
      <div className="maintenance-modal">

        {/* HEADER */}

        <div className="flex items-start justify-between">
          <div>
            <h2 className="maintenance-modal-title">
              {title}
            </h2>

            <p className="maintenance-modal-subtitle">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="maintenance-modal-close"
          >
            ×
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="maintenance-form"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* VEHICLE */}

            <div>
              <label className="maintenance-form-label">
                Vehicle *
              </label>

              <select
                name="vehicle_id"
                value={
                  form.vehicle_id
                }
                onChange={onChange}
                required
                className="maintenance-form-control"
              >
                <option value="">
                  Select vehicle
                </option>

                {vehicles.map(
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
                        vehicle.registration_number
                      }
                    </option>
                  )
                )}
              </select>

              {vehicles.length === 0 && (
                <p className="maintenance-warning-text">
                  No vehicles found. Create a vehicle first.
                </p>
              )}
            </div>

            {/* MAINTENANCE TYPE */}

            <div>
              <label className="maintenance-form-label">
                Maintenance Type *
              </label>

              <select
                name="maintenance_type"
                value={
                  form.maintenance_type
                }
                onChange={onChange}
                required
                className="maintenance-form-control"
              >
                <option value="PREVENTIVE">
                  Preventive
                </option>

                <option value="CORRECTIVE">
                  Corrective
                </option>

                <option value="ROUTINE">
                  Routine
                </option>

                <option value="INSPECTION">
                  Inspection
                </option>

                <option value="REPAIR">
                  Repair
                </option>

                <option value="SERVICE">
                  Service
                </option>
              </select>
            </div>

            {/* MAINTENANCE DATE */}

            <DateInput
              label="Maintenance Date *"
              name="maintenance_date"
              value={
                form.maintenance_date
              }
              onChange={onChange}
              required
              min={
                isScheduled
                  ? getTomorrowDate()
                  : undefined
              }
            />

            {/* DUE DATE */}

            <DateInput
              label="Due Date"
              name="due_date"
              value={
                form.due_date
              }
              onChange={onChange}
              min={
                form.maintenance_date ||
                undefined
              }
            />

            {/* COST */}

            <FormInput
              label="Cost (₹)"
              type="number"
              name="cost"
              value={
                form.cost
              }
              onChange={onChange}
              min="0"
              step="0.01"
              placeholder="5000"
            />

            {/* STATUS */}

            <div>
              <label className="maintenance-form-label">
                Status *
              </label>

              <select
                name="status"
                value={
                  form.status
                }
                onChange={onChange}
                required
                className="maintenance-form-control"
              >
                <option value="SCHEDULED">
                  Scheduled
                </option>

                <option value="IN_PROGRESS">
                  In Progress
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </div>

            {/* DESCRIPTION */}

            <div className="md:col-span-2">
              <label className="maintenance-form-label">
                Description
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={onChange}
                rows="4"
                placeholder="Describe the maintenance work..."
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>
          </div>

          {/* BUTTONS */}

          <div className="maintenance-modal-actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="maintenance-cancel-btn"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                vehicles.length === 0
              }
              className="maintenance-save-btn"
            >
              {saving
                ? "Saving..."
                : title.startsWith(
                    "Edit"
                  )
                ? "Save Changes"
                : "Add Maintenance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// =========================================================
// DATE INPUT
// =========================================================

function DateInput({
  label,
  name,
  value,
  onChange,
  required = false,
  min,
}) {
  const preventTyping = (event) => {
    event.preventDefault();
  };

  const openCalendar = (event) => {
    if (
      typeof event.currentTarget.showPicker ===
      "function"
    ) {
      try {
        event.currentTarget.showPicker();
      } catch {
        // Browser may already have opened the picker.
      }
    }
  };

  return (
    <div>
      <label className="maintenance-form-label">
        {label}
      </label>

      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        onKeyDown={preventTyping}
        onPaste={preventTyping}
        onClick={openCalendar}
        className="maintenance-form-control"
      />
    </div>
  );
}


// =========================================================
// NORMAL INPUT
// =========================================================

function FormInput({
  label,
  type,
  name,
  value,
  onChange,
  required = false,
  min,
  step,
  placeholder,
}) {
  return (
    <div>
      <label className="maintenance-form-label">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
      />
    </div>
  );
}


// =========================================================
// DATE DISPLAY
// =========================================================

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  // Backend may return:
  // 2026-08-31
  // or old database value:
  // 2026-08-31T00:00:00
  //
  // We only need the date portion.

  const datePart =
    String(value).substring(0, 10);

  const parts =
    datePart.split("-");

  if (parts.length !== 3) {
    return "Not set";
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "Not set";
  }

  return `${day}/${month}/${year}`;
}


// =========================================================
// DATE INPUT FORMAT
// =========================================================

function formatDateForInput(value) {
  if (!value) {
    return "";
  }

  const datePart =
    String(value).substring(0, 10);

  const parts =
    datePart.split("-");

  if (parts.length !== 3) {
    return "";
  }

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (
    year.length !== 4 ||
    month.length !== 2 ||
    day.length !== 2
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}


// =========================================================
// TODAY
// =========================================================

function getTodayDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// =========================================================
// TOMORROW
// =========================================================

function getTomorrowDate() {
  const now = new Date();

  now.setDate(
    now.getDate() + 1
  );

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// =========================================================
// CURRENCY
// =========================================================

function formatCurrency(amount) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(amount) || 0
  );
}


// =========================================================
// STATUS DISPLAY
// =========================================================

function formatStatus(value) {
  if (!value) {
    return "Unknown";
  }

  return value.replaceAll(
    "_",
    " "
  );
}


// =========================================================
// MAINTENANCE TYPE DISPLAY
// =========================================================

function formatMaintenanceType(
  value
) {
  if (!value) {
    return "Unknown";
  }

  return value.replaceAll(
    "_",
    " "
  );
}


export default Maintenance;