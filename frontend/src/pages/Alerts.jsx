import { useEffect, useState } from "react";
import api from "../services/api";

function Alerts() {
  // =========================================================
  // STATE
  // =========================================================

  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [resolvingId, setResolvingId] =
    useState(null);


  // =========================================================
  // LOAD ALERTS
  // =========================================================

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/alerts");

      setAlerts(response.data);

    } catch (err) {
      console.error(
        "Failed to load alerts:",
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
          "Unable to load alerts."
        );
      }

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadAlerts();
  }, []);


  // =========================================================
  // RESOLVE ALERT
  // =========================================================

  const resolveAlert = async (
    alertId
  ) => {

    try {

      setResolvingId(
        alertId
      );

      setError("");

      setSuccessMessage("");


      const response =
        await api.put(
          `/alerts/${alertId}/resolve`
        );


      setAlerts(
        (currentAlerts) =>
          currentAlerts.map(
            (alert) =>
              alert.alert_id ===
              alertId
                ? response.data
                : alert
          )
      );


      setSuccessMessage(
        `Alert #${alertId} resolved successfully.`
      );

    } catch (err) {

      console.error(
        "Failed to resolve alert:",
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
          "Unable to resolve alert."
        );
      }

    } finally {

      setResolvingId(
        null
      );

    }
  };


  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDateTime = (
    date
  ) => {

    if (!date) {
      return "Not set";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "Not set";
    }

    return parsedDate.toLocaleString(
      "en-IN"
    );
  };


  // =========================================================
  // FORMAT ALERT TYPE
  // =========================================================

  const formatAlertType = (
    value
  ) => {

    if (!value) {
      return "Unknown";
    }

    return value
      .replaceAll("_", " ");
  };


  // =========================================================
  // FORMAT STATUS
  // =========================================================

  const formatStatus = (
    value
  ) => {

    if (!value) {
      return "Unknown";
    }

    return value
      .replaceAll("_", " ");
  };


  // =========================================================
  // SEVERITY STYLE
  // =========================================================

  const getSeverityClass = (
    severity
  ) => {

    const value =
      severity?.toUpperCase();

    if (
      value === "CRITICAL"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (
      value === "HIGH"
    ) {
      return "bg-orange-100 text-orange-700";
    }

    if (
      value === "MEDIUM"
    ) {
      return "bg-yellow-100 text-yellow-700";
    }

    if (
      value === "LOW"
    ) {
      return "bg-green-100 text-green-700";
    }

    return "bg-blue-100 text-blue-700";
  };


  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusClass = (
    status
  ) => {

    if (
      status?.toUpperCase() ===
      "RESOLVED"
    ) {
      return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
  };


  // =========================================================
  // OPEN ALERT COUNT
  // =========================================================

  const openAlerts =
    alerts.filter(
      (alert) =>
        alert.status?.toUpperCase() !==
        "RESOLVED"
    ).length;


  // =========================================================
  // RESOLVED ALERT COUNT
  // =========================================================

  const resolvedAlerts =
    alerts.filter(
      (alert) =>
        alert.status?.toUpperCase() ===
        "RESOLVED"
    ).length;


  // =========================================================
  // LOADING
  // =========================================================

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


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Alerts
          </h1>

          <p className="mt-2 text-slate-500">
            Monitor and manage fleet alerts.
          </p>

        </div>


        {/* SUMMARY */}

        <div className="flex gap-3">

          <div className="rounded-lg bg-red-50 px-4 py-2">

            <p className="text-xs font-medium text-red-500">
              Open
            </p>

            <p className="text-lg font-bold text-red-700">
              {openAlerts}
            </p>

          </div>


          <div className="rounded-lg bg-green-50 px-4 py-2">

            <p className="text-xs font-medium text-green-600">
              Resolved
            </p>

            <p className="text-lg font-bold text-green-700">
              {resolvedAlerts}
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">

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

        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">

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

      {alerts.length === 0 ? (

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">

            <span className="text-2xl">
              ✓
            </span>

          </div>

          <p className="mt-4 font-semibold text-slate-700">
            No alerts found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Your fleet currently has no recorded alerts.
          </p>

        </div>

      ) : (

        /* ===================================================
           TABLE
           =================================================== */

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="min-w-[1250px] w-full divide-y divide-slate-200">

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

                {alerts.map(
                  (alert) => {

                    const resolved =
                      alert.status?.toUpperCase() ===
                      "RESOLVED";


                    return (

                      <tr
                        key={
                          alert.alert_id
                        }
                        className="hover:bg-slate-50"
                      >

                        {/* ALERT ID */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="font-semibold text-slate-800">
                            #
                            {
                              alert.alert_id
                            }
                          </span>

                        </td>


                        {/* SHIPMENT */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="font-medium text-slate-700">

                            {
                              alert.shipment_id ||
                              "N/A"
                            }

                          </span>

                        </td>


                        {/* TYPE */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span className="font-medium text-slate-700">

                            {
                              formatAlertType(
                                alert.alert_type
                              )
                            }

                          </span>

                        </td>


                        {/* MESSAGE */}

                        <td className="min-w-[280px] max-w-[420px] px-6 py-5">

                          <p className="text-sm leading-6 text-slate-600">
                            {
                              alert.message
                            }
                          </p>

                        </td>


                        {/* SEVERITY */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(
                              alert.severity
                            )}`}
                          >

                            {
                              alert.severity
                            }

                          </span>

                        </td>


                        {/* CREATED */}

                        <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">

                          {
                            formatDateTime(
                              alert.created_at
                            )
                          }

                        </td>


                        {/* STATUS */}

                        <td className="whitespace-nowrap px-6 py-5">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              alert.status
                            )}`}
                          >

                            {
                              formatStatus(
                                alert.status
                              )
                            }

                          </span>

                        </td>


                        {/* ACTION */}

                        <td className="whitespace-nowrap px-6 py-5">

                          {resolved ? (

                            <div>

                              <span className="inline-flex rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                Resolved
                              </span>

                              {alert.resolved_at && (

                                <p className="mt-1 text-xs text-slate-400">
                                  {
                                    formatDateTime(
                                      alert.resolved_at
                                    )
                                  }
                                </p>

                              )}

                            </div>

                          ) : (

                            <button
                              onClick={() =>
                                resolveAlert(
                                  alert.alert_id
                                )
                              }
                              disabled={
                                resolvingId ===
                                alert.alert_id
                              }
                              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {resolvingId ===
                              alert.alert_id
                                ? "Resolving..."
                                : "Resolve"}

                            </button>

                          )}

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

    </div>
  );
}


export default Alerts;