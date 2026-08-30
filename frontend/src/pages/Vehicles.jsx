import { useEffect, useState } from "react";
import api from "../services/api";

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setError("");

        const response = await api.get("/vehicles");

        setVehicles(response.data);
      } catch (err) {
        console.error("Failed to load vehicles:", err);

        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Unable to load vehicles.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadVehicles();
  }, []);

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

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Vehicles
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
            Vehicles
          </h1>

          <p className="mt-2 text-slate-500">
            Manage and monitor fleet vehicles.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {vehicles.length} vehicle
            {vehicles.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">
            No vehicles found.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Registration
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Capacity
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fuel
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.vehicle_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        {vehicle.vehicle_id}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {vehicle.registration_number}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {vehicle.vehicle_type}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {vehicle.capacity}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {vehicle.fuel_type}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {vehicle.current_location}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          vehicle.current_status === "AVAILABLE"
                            ? "bg-green-100 text-green-700"
                            : vehicle.current_status === "ASSIGNED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {vehicle.current_status}
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

export default Vehicles;