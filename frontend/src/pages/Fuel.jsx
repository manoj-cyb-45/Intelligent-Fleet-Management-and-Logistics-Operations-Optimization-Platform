import { useEffect, useState } from "react";
import api from "../services/api";

function Fuel() {
  // =========================================================
  // EMPTY FORM
  // =========================================================

  const emptyForm = {
    vehicle_id: "",
    fuel_date: "",
    fuel_type: "DIESEL",
    quantity: "",
    cost_per_unit: "",
    total_cost: "",
    odometer_reading: "",
    fuel_level: "",
  };

  // =========================================================
  // STATE
  // =========================================================

  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [fuelForm, setFuelForm] =
    useState(emptyForm);

  // =========================================================
  // LOAD FUEL + VEHICLES
  // =========================================================

  const loadData = async () => {
    try {
      setError("");

      const [
        fuelResponse,
        vehicleResponse,
      ] = await Promise.all([
        api.get("/fuel"),
        api.get("/vehicles"),
      ]);

      setRecords(
        fuelResponse.data
      );

      setVehicles(
        vehicleResponse.data
      );

    } catch (err) {
      console.error(
        "Failed to load fuel data:",
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
          "Unable to load fuel records."
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
    const {
      name,
      value,
    } = event.target;

    // -------------------------------------------------------
    // VEHICLE CHANGE
    // -------------------------------------------------------

    if (name === "vehicle_id") {
      const selectedVehicle =
        vehicles.find(
          (vehicle) =>
            vehicle.vehicle_id === value
        );

      setFuelForm(
        (previous) => ({
          ...previous,

          vehicle_id: value,

          // Automatically show the vehicle's
          // current fuel level when selected.
          fuel_level:
            selectedVehicle?.fuel_level ??
            "",
        })
      );

      setError("");
      setSuccessMessage("");

      return;
    }

    // -------------------------------------------------------
    // NORMAL FIELD CHANGE
    // -------------------------------------------------------

    setFuelForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
    setSuccessMessage("");
  };

  // =========================================================
  // AUTO CALCULATE TOTAL COST
  // =========================================================

  const calculateTotalCost = (
    quantity,
    costPerUnit
  ) => {
    const q = Number(quantity);
    const c = Number(costPerUnit);

    if (
      !Number.isNaN(q) &&
      !Number.isNaN(c) &&
      q > 0 &&
      c >= 0
    ) {
      return (
        q * c
      ).toFixed(2);
    }

    return "";
  };

  // =========================================================
  // QUANTITY / COST CHANGE
  // =========================================================

  const handleQuantityOrCostChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFuelForm(
      (previous) => {
        const updated = {
          ...previous,
          [name]: value,
        };

        if (
          name === "quantity" ||
          name === "cost_per_unit"
        ) {
          updated.total_cost =
            calculateTotalCost(
              name === "quantity"
                ? value
                : previous.quantity,

              name === "cost_per_unit"
                ? value
                : previous.cost_per_unit
            );
        }

        return updated;
      }
    );

    setError("");
    setSuccessMessage("");
  };

  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const openAddModal = () => {
    setFuelForm({
      ...emptyForm,
      fuel_date:
        getCurrentDateTime(),
    });

    setSelectedRecord(null);

    setError("");
    setSuccessMessage("");

    setShowAddModal(true);
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (
    record
  ) => {
    setSelectedRecord(
      record
    );

    // Find the current vehicle
    const selectedVehicle =
      vehicles.find(
        (vehicle) =>
          vehicle.vehicle_id ===
          record.vehicle_id
      );

    setFuelForm({
      vehicle_id:
        record.vehicle_id || "",

      fuel_date:
        formatDateTimeForInput(
          record.fuel_date
        ),

      fuel_type:
        record.fuel_type ||
        "DIESEL",

      quantity:
        record.quantity ?? "",

      cost_per_unit:
        record.cost_per_unit ?? "",

      total_cost:
        record.total_cost ?? "",

      odometer_reading:
        record.odometer_reading ?? "",

      fuel_level:
        record.fuel_level ??
        selectedVehicle?.fuel_level ??
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

    setSelectedRecord(null);

    setFuelForm(
      emptyForm
    );

    setError("");
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {

    // -------------------------------------------------------
    // VEHICLE
    // -------------------------------------------------------

    if (!fuelForm.vehicle_id) {
      setError(
        "Please select a vehicle."
      );

      return false;
    }

    // -------------------------------------------------------
    // DATE
    // -------------------------------------------------------

    if (!fuelForm.fuel_date) {
      setError(
        "Fuel date is required."
      );

      return false;
    }

    // -------------------------------------------------------
    // FUEL TYPE
    // -------------------------------------------------------

    if (!fuelForm.fuel_type) {
      setError(
        "Please select a fuel type."
      );

      return false;
    }

    // -------------------------------------------------------
    // QUANTITY
    // -------------------------------------------------------

    if (
      Number(fuelForm.quantity) <= 0
    ) {
      setError(
        "Quantity must be greater than 0."
      );

      return false;
    }

    // -------------------------------------------------------
    // COST PER UNIT
    // -------------------------------------------------------

    if (
      Number(fuelForm.cost_per_unit) < 0
    ) {
      setError(
        "Cost per unit cannot be negative."
      );

      return false;
    }

    // -------------------------------------------------------
    // TOTAL COST
    // -------------------------------------------------------

    if (
      Number(fuelForm.total_cost) < 0
    ) {
      setError(
        "Total cost cannot be negative."
      );

      return false;
    }

    // -------------------------------------------------------
    // ODOMETER
    // -------------------------------------------------------

    if (
      Number(
        fuelForm.odometer_reading
      ) < 0
    ) {
      setError(
        "Odometer reading cannot be negative."
      );

      return false;
    }

    // -------------------------------------------------------
    // FUEL LEVEL
    // -------------------------------------------------------

    if (
      fuelForm.fuel_level === "" ||
      Number(fuelForm.fuel_level) < 0 ||
      Number(fuelForm.fuel_level) > 100
    ) {
      setError(
        "Fuel level must be between 0% and 100%."
      );

      return false;
    }

    return true;
  };

  // =========================================================
  // ADD FUEL RECORD
  // =========================================================

  const handleAddFuel = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        vehicle_id:
          fuelForm.vehicle_id,

        fuel_date:
          new Date(
            fuelForm.fuel_date
          ).toISOString(),

        fuel_type:
          fuelForm.fuel_type,

        quantity:
          Number(
            fuelForm.quantity
          ),

        cost_per_unit:
          Number(
            fuelForm.cost_per_unit
          ),

        total_cost:
          Number(
            fuelForm.total_cost
          ),

        odometer_reading:
          Number(
            fuelForm.odometer_reading
          ),

        fuel_level:
          Number(
            fuelForm.fuel_level
          ),
      };

      await api.post(
        "/fuel",
        payload
      );

      setShowAddModal(false);

      setFuelForm(
        emptyForm
      );

      setSuccessMessage(
        "Fuel record added successfully."
      );

      await loadData();

    } catch (err) {
      console.error(
        "Failed to create fuel record:",
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
          "Unable to create fuel record."
        );
      }

    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPDATE FUEL RECORD
  // =========================================================

  const handleUpdateFuel = async (
    event
  ) => {
    event.preventDefault();

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

      const payload = {
        vehicle_id:
          fuelForm.vehicle_id,

        fuel_date:
          new Date(
            fuelForm.fuel_date
          ).toISOString(),

        fuel_type:
          fuelForm.fuel_type,

        quantity:
          Number(
            fuelForm.quantity
          ),

        cost_per_unit:
          Number(
            fuelForm.cost_per_unit
          ),

        total_cost:
          Number(
            fuelForm.total_cost
          ),

        odometer_reading:
          Number(
            fuelForm.odometer_reading
          ),

        fuel_level:
          Number(
            fuelForm.fuel_level
          ),
      };

      await api.put(
        `/fuel/${selectedRecord.fuel_id}`,
        payload
      );

      setShowEditModal(false);

      setSelectedRecord(null);

      setFuelForm(
        emptyForm
      );

      setSuccessMessage(
        "Fuel record updated successfully."
      );

      await loadData();

    } catch (err) {
      console.error(
        "Failed to update fuel record:",
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
          "Unable to update fuel record."
        );
      }

    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div>

        <h1 className="text-3xl font-bold text-slate-800">
          Fuel
        </h1>

        <p className="mt-2 text-slate-500">
          Track vehicle fuel consumption and costs.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

          <p className="text-slate-500">
            Loading fuel records...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // MAIN PAGE
  // =========================================================

  return (
    <div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Fuel
          </h1>

          <p className="mt-2 text-slate-500">
            Track vehicle fuel consumption and costs.
          </p>

        </div>

        <div className="flex items-center gap-3">

          <div className="rounded-lg bg-blue-50 px-4 py-2">

            <span className="text-sm font-medium text-blue-700">

              {records.length} record
              {records.length !== 1
                ? "s"
                : ""}

            </span>

          </div>

          <button
            onClick={
              openAddModal
            }
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add Fuel Record
          </button>

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

      {/* =====================================================
          SUCCESS
          ===================================================== */}

      {successMessage && (

        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-5 py-3">

          <div className="flex items-center justify-between gap-4">

            <p className="text-sm font-medium text-green-700">
              {successMessage}
            </p>

            <button
              onClick={() =>
                setSuccessMessage("")
              }
              className="text-xs font-semibold text-green-600 hover:text-green-800"
            >
              Dismiss
            </button>

          </div>

        </div>

      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {records.length === 0 ? (

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">

            <span className="text-2xl">
              ⛽
            </span>

          </div>

          <p className="mt-4 font-semibold text-slate-700">
            No fuel records found.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Add your first fuel record to start tracking fuel usage.
          </p>

          <button
            onClick={
              openAddModal
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add First Fuel Record
          </button>

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

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Record
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fuel Date
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fuel Type
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quantity
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cost / Unit
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Cost
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Odometer
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fuel Level
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-200">

                {records.map(
                  (record) => {

                    const fuelLevel =
                      Number(
                        record.fuel_level
                      );

                    let fuelClass =
                      "bg-green-50 text-green-700";

                    if (
                      fuelLevel <= 20
                    ) {
                      fuelClass =
                        "bg-red-50 text-red-700";
                    } else if (
                      fuelLevel <= 40
                    ) {
                      fuelClass =
                        "bg-yellow-50 text-yellow-700";
                    }

                    return (

                      <tr
                        key={
                          record.fuel_id
                        }
                        className="hover:bg-slate-50"
                      >

                        {/* RECORD */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="font-semibold text-slate-800">
                            #{record.fuel_id}
                          </span>

                        </td>

                        {/* VEHICLE */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="font-medium text-slate-700">
                            {
                              record.vehicle_id
                            }
                          </span>

                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">

                          {
                            formatDate(
                              record.fuel_date
                            )
                          }

                        </td>

                        {/* FUEL TYPE */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">

                            {
                              record.fuel_type
                            }

                          </span>

                        </td>

                        {/* QUANTITY */}

                        <td className="whitespace-nowrap px-6 py-5 text-slate-600">

                          {
                            Number(
                              record.quantity
                            ).toLocaleString(
                              "en-IN"
                            )
                          }

                          {" "}L

                        </td>

                        {/* COST / UNIT */}

                        <td className="whitespace-nowrap px-6 py-5 text-slate-600">

                          {
                            formatCurrency(
                              record.cost_per_unit
                            )
                          }

                        </td>

                        {/* TOTAL COST */}

                        <td className="whitespace-nowrap px-6 py-5 font-semibold text-slate-700">

                          {
                            formatCurrency(
                              record.total_cost
                            )
                          }

                        </td>

                        {/* ODOMETER */}

                        <td className="whitespace-nowrap px-6 py-5 text-slate-600">

                          {
                            Number(
                              record.odometer_reading
                            ).toLocaleString(
                              "en-IN"
                            )
                          }

                          {" "}km

                        </td>

                        {/* FUEL LEVEL */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${fuelClass}`}
                          >

                            {Number.isNaN(
                              fuelLevel
                            )
                              ? "N/A"
                              : `${fuelLevel.toFixed(1)}%`}

                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <button
                            onClick={() =>
                              openEditModal(
                                record
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>

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

      {/* =====================================================
          ADD MODAL
          ===================================================== */}

      {showAddModal && (

        <FuelModal
          title="Add Fuel Record"
          description="Record fuel usage for a vehicle."
          form={fuelForm}
          onChange={
            handleChange
          }
          onQuantityOrCostChange={
            handleQuantityOrCostChange
          }
          vehicles={vehicles}
          onSubmit={
            handleAddFuel
          }
          onCancel={
            closeModal
          }
          saving={saving}
        />

      )}

      {/* =====================================================
          EDIT MODAL
          ===================================================== */}

      {showEditModal && (

        <FuelModal
          title="Edit Fuel Record"
          description={`Update fuel record #${selectedRecord?.fuel_id}`}
          form={fuelForm}
          onChange={
            handleChange
          }
          onQuantityOrCostChange={
            handleQuantityOrCostChange
          }
          vehicles={vehicles}
          onSubmit={
            handleUpdateFuel
          }
          onCancel={
            closeModal
          }
          saving={saving}
        />

      )}

    </div>
  );
}


// =========================================================
// FUEL MODAL
// =========================================================

function FuelModal({
  title,
  description,
  form,
  onChange,
  onQuantityOrCostChange,
  vehicles,
  onSubmit,
  onCancel,
  saving,
}) {
  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-slate-900 p-7 shadow-2xl">

        {/* =================================================
            HEADER
            ================================================= */}

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
            type="button"
            onClick={
              onCancel
            }
            className="text-3xl leading-none text-slate-400 hover:text-white"
          >
            ×
          </button>

        </div>

        {/* =================================================
            FORM
            ================================================= */}

        <form
          onSubmit={
            onSubmit
          }
          className="mt-7"
        >

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* =================================================
                VEHICLE
                ================================================= */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-200">
                Vehicle *
              </label>

              <select
                name="vehicle_id"
                value={
                  form.vehicle_id
                }
                onChange={
                  onChange
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >

                <option value="">
                  Select a vehicle
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

                      {" "}—{" "}

                      {
                        vehicle.registration_number
                      }

                    </option>

                  )
                )}

              </select>

              {vehicles.length ===
                0 && (

                <p className="mt-2 text-xs text-yellow-400">
                  No vehicles found. Create a vehicle first.
                </p>

              )}

            </div>

            {/* =================================================
                FUEL DATE
                ================================================= */}

            <FormInput
              label="Fuel Date *"
              type="datetime-local"
              name="fuel_date"
              value={
                form.fuel_date
              }
              onChange={
                onChange
              }
              required
            />

            {/* =================================================
                FUEL TYPE
                ================================================= */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-200">
                Fuel Type *
              </label>

              <select
                name="fuel_type"
                value={
                  form.fuel_type
                }
                onChange={
                  onChange
                }
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >

                <option value="DIESEL">
                  DIESEL
                </option>

                <option value="PETROL">
                  PETROL
                </option>

                <option value="CNG">
                  CNG
                </option>

                <option value="ELECTRIC">
                  ELECTRIC
                </option>

                <option value="HYBRID">
                  HYBRID
                </option>

              </select>

            </div>

            {/* =================================================
                QUANTITY
                ================================================= */}

            <FormInput
              label="Quantity (Litres) *"
              type="number"
              name="quantity"
              value={
                form.quantity
              }
              onChange={
                onQuantityOrCostChange
              }
              min="0.01"
              step="0.01"
              placeholder="50"
              required
            />

            {/* =================================================
                COST PER UNIT
                ================================================= */}

            <FormInput
              label="Cost per Unit (₹) *"
              type="number"
              name="cost_per_unit"
              value={
                form.cost_per_unit
              }
              onChange={
                onQuantityOrCostChange
              }
              min="0"
              step="0.01"
              placeholder="95"
              required
            />

            {/* =================================================
                TOTAL COST
                ================================================= */}

            <FormInput
              label="Total Cost (₹) *"
              type="number"
              name="total_cost"
              value={
                form.total_cost
              }
              onChange={
                onChange
              }
              min="0"
              step="0.01"
              placeholder="4750"
              required
            />

            {/* =================================================
                ODOMETER
                ================================================= */}

            <FormInput
              label="Odometer Reading (km) *"
              type="number"
              name="odometer_reading"
              value={
                form.odometer_reading
              }
              onChange={
                onChange
              }
              min="0"
              step="0.01"
              placeholder="25000"
              required
            />

            {/* =================================================
                FUEL LEVEL
                ================================================= */}

            <FormInput
              label="Current Fuel Level (%) *"
              type="number"
              name="fuel_level"
              value={
                form.fuel_level
              }
              onChange={
                onChange
              }
              min="0"
              max="100"
              step="0.1"
              placeholder="75"
              required
            />

          </div>

          {/* =================================================
              LOW FUEL INFORMATION
              ================================================= */}

          {form.fuel_level !== "" &&
            Number(form.fuel_level) <=
              20 && (

            <div className="mt-5 rounded-lg border border-red-800 bg-red-950/50 px-4 py-4">

              <div className="flex items-center gap-3">

                <span className="text-xl">
                  ⚠️
                </span>

                <div>

                  <p className="text-sm font-semibold text-red-300">
                    Low Fuel Warning
                  </p>

                  <p className="mt-1 text-xs text-red-400">
                    Fuel level is at or below 20%. A low-fuel alert will be created.
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =================================================
              NORMAL FUEL INFORMATION
              ================================================= */}

          {form.fuel_level !== "" &&
            Number(form.fuel_level) >
              20 && (

            <div className="mt-5 rounded-lg border border-green-800 bg-green-950/40 px-4 py-4">

              <div className="flex items-center gap-3">

                <span className="text-xl">
                  ✓
                </span>

                <div>

                  <p className="text-sm font-semibold text-green-300">
                    Fuel Level Normal
                  </p>

                  <p className="mt-1 text-xs text-green-400">
                    Current fuel level is above the low-fuel threshold.
                  </p>

                </div>

              </div>

            </div>

          )}

          {/* =================================================
              COST PREVIEW
              ================================================= */}

          {form.quantity &&
            form.cost_per_unit && (

            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 px-4 py-4">

              <div className="flex items-center justify-between">

                <span className="text-sm text-slate-400">
                  Calculated Total
                </span>

                <span className="text-lg font-bold text-white">

                  {
                    formatCurrency(
                      Number(
                        form.quantity
                      ) *
                        Number(
                          form.cost_per_unit
                        )
                    )
                  }

                </span>

              </div>

              <p className="mt-1 text-xs text-slate-500">
                You can edit the total cost before saving.
              </p>

            </div>

          )}

          {/* =================================================
              BUTTONS
              ================================================= */}

          <div className="mt-7 flex justify-end gap-3">

            <button
              type="button"
              onClick={
                onCancel
              }
              disabled={
                saving
              }
              className="rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                vehicles.length === 0
              }
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving
                ? "Saving..."
                : title.startsWith(
                    "Edit"
                  )
                  ? "Save Changes"
                  : "Add Fuel Record"}

            </button>

          </div>

        </form>

      </div>

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
  step,
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
        step={step}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
      />

    </div>
  );
}


// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(
  value
) {
  if (!value) {
    return "Not set";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not set";
  }

  return date.toLocaleString(
    "en-IN"
  );
}


// =========================================================
// DATETIME LOCAL
// =========================================================

function formatDateTimeForInput(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  const hours =
    String(
      date.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


// =========================================================
// CURRENT DATETIME
// =========================================================

function getCurrentDateTime() {
  const now =
    new Date();

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

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


// =========================================================
// CURRENCY
// =========================================================

function formatCurrency(
  amount
) {
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


export default Fuel;