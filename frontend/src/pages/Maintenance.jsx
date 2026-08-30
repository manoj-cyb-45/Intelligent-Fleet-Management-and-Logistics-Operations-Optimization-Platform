import { useEffect, useState } from "react";
import api from "../services/api";

function Maintenance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMaintenance();
  }, []);

  const loadMaintenance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/maintenance");

      setRecords(response.data);
    } catch (err) {
      console.error("Failed to load maintenance:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load maintenance records.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
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
          Maintenance
        </h1>

        <p className="mt-2 text-slate-500">
          Manage vehicle maintenance records.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Loading maintenance records...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Maintenance
        </h1>

        <p className="mt-2 text-slate-500">
          Manage vehicle maintenance records.
        </p>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            {error}
          </p>

          <button
            onClick={loadMaintenance}
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
            Maintenance
          </h1>

          <p className="mt-2 text-slate-500">
            Manage vehicle maintenance records.
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
            No maintenance records found.
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
                    Maintenance Type
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Maintenance Date
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Date
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cost
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {records.map((record) => (
                  <tr
                    key={record.maintenance_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        #{record.maintenance_id}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-slate-700">
                        {record.vehicle_id}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-slate-700">
                        {record.maintenance_type.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="max-w-xs px-6 py-4 text-sm text-slate-600">
                      {record.description || "No description"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatDate(record.maintenance_date)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatDate(record.due_date)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                      {formatCurrency(record.cost)}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          record.status
                        )}`}
                      >
                        {record.status.replaceAll("_", " ")}
                      </span>
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

export default Maintenance;