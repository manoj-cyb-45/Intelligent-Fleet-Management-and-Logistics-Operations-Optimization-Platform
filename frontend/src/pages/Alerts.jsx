import { useEffect, useState } from "react";
import api from "../services/api";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/alerts");

      setAlerts(response.data);
    } catch (err) {
      console.error("Failed to load alerts:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load alerts.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      setResolvingId(alertId);
      setError("");

      const response = await api.put(
        `/alerts/${alertId}/resolve`
      );

      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.alert_id === alertId
            ? response.data
            : alert
        )
      );
    } catch (err) {
      console.error("Failed to resolve alert:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to resolve alert.");
      }
    } finally {
      setResolvingId(null);
    }
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "Not set";
    }

    return new Date(date).toLocaleString();
  };

  const getSeverityClass = (severity) => {
    const value = severity?.toUpperCase();

    if (value === "CRITICAL") {
      return "bg-red-100 text-red-700";
    }

    if (value === "HIGH") {
      return "bg-orange-100 text-orange-700";
    }

    if (value === "MEDIUM") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  const getStatusClass = (status) => {
    if (status?.toUpperCase() === "RESOLVED") {
      return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
  };

  const openAlerts = alerts.filter(
    (alert) => alert.status?.toUpperCase() !== "RESOLVED"
  ).length;

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Alerts
        </h1>

        <p className="mt-2 text-slate-500">
          Monitor and manage fleet alerts.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Loading alerts...
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
            Alerts
          </h1>

          <p className="mt-2 text-slate-500">
            Monitor and manage fleet alerts.
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-2">
          <span className="text-sm font-medium text-blue-700">
            {openAlerts} open alert
            {openAlerts !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-slate-700">
            No alerts found.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Your fleet currently has no recorded alerts.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Alert
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Shipment
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Message
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Severity
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {alerts.map((alert) => {
                  const resolved =
                    alert.status?.toUpperCase() === "RESOLVED";

                  return (
                    <tr
                      key={alert.alert_id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-semibold text-slate-800">
                          #{alert.alert_id}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-medium text-slate-700">
                          {alert.shipment_id || "N/A"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {alert.alert_type}
                      </td>

                      <td className="min-w-[240px] px-6 py-4 text-slate-600">
                        {alert.message}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        {formatDateTime(alert.created_at)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            alert.status
                          )}`}
                        >
                          {alert.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        {resolved ? (
                          <span className="text-sm text-slate-400">
                            Resolved
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              resolveAlert(alert.alert_id)
                            }
                            disabled={
                              resolvingId === alert.alert_id
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {resolvingId === alert.alert_id
                              ? "Resolving..."
                              : "Resolve"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;