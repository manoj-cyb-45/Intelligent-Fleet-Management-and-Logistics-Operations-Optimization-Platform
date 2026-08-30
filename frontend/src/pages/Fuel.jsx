import { useEffect, useState } from "react";
import api from "../services/api";

function Fuel() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFuelRecords();
  }, []);

  const loadFuelRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/fuel");

      setRecords(response.data);
    } catch (err) {
      console.error("Failed to load fuel records:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load fuel records.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not set";
    }

    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

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

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Fuel
        </h1>

        <p className="mt-2 text-slate-500">
          Track vehicle fuel consumption and costs.
        </p>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            {error}
          </p>

          <button
            onClick={loadFuelRecords}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Fuel
          </h1>

          <p className="mt-2 text-slate-500">
            Track vehicle fuel consumption and costs.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {records.length} record
            {records.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">
            No fuel records found.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
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
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {records.map((record) => (
                  <tr
                    key={record.fuel_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        #{record.fuel_id}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-slate-700">
                        {record.vehicle_id}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatDate(record.fuel_date)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-slate-700">
                        {record.fuel_type}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {record.quantity}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatCurrency(record.cost_per_unit)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                      {formatCurrency(record.total_cost)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {record.odometer_reading.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fuel;