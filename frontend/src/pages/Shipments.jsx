import { useEffect, useState } from "react";
import api from "../services/api";

function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadShipments = async () => {
      try {
        setError("");

        const response = await api.get("/shipments");

        setShipments(response.data);
      } catch (err) {
        console.error("Failed to load shipments:", err);

        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Unable to load shipments.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
  }, []);

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

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Shipments
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
            Shipments
          </h1>

          <p className="mt-2 text-slate-500">
            Track and manage fleet shipments.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {shipments.length} shipment
            {shipments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {shipments.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">
            No shipments found.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Shipment
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Route
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Progress
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.shipment_id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {shipment.shipment_id}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {shipment.tracking_number}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
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

                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          shipment.status
                        )}`}
                      >
                        {shipment.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="min-w-40 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${shipment.delivery_progress}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-slate-600">
                          {shipment.delivery_progress}%
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {shipment.current_location || "Not available"}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                      {shipment.vehicle_id}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {shipment.driver_id}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {new Date(
                        shipment.due_date
                      ).toLocaleDateString()}
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

export default Shipments;