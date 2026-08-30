import { useEffect, useState } from "react";
import api from "../services/api";

function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setError("");

        const response = await api.get("/drivers");

        setDrivers(response.data);
      } catch (err) {
        console.error("Failed to load drivers:", err);

        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Unable to load drivers.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDrivers();
  }, []);

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

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Drivers
        </h1>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Drivers
          </h1>

          <p className="mt-2 text-slate-500">
            Manage drivers and their vehicle assignments.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {drivers.length} driver
            {drivers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">
            No drivers found.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Experience
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Working Hours
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {drivers.map((driver) => (
                  <tr
                    key={driver.driver_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {driver.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {driver.driver_id}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {driver.email}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {driver.phone}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {driver.experience_years !== null
                        ? `${driver.experience_years} years`
                        : "Not specified"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {driver.working_hours || "Not specified"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      {driver.assigned_vehicle_id ? (
                        <span className="font-medium text-slate-700">
                          {driver.assigned_vehicle_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          driver.account_status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {driver.account_status}
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

export default Drivers;