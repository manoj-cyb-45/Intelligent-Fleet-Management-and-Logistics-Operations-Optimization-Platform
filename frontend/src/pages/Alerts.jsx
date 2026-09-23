import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Alerts() {
  const navigate = useNavigate();

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

  useEffect(() => {
    const interval = setInterval(() => {
      loadAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);


  // =========================================================
  // RESOLVE ALERT
  // =========================================================

  const resolveAlert = async (
    alertId,
    alertType,
    alertMessage
  ) => {

    // LOW_FUEL alerts are resolved through the fuel-record
    // workflow. Do not mark the alert resolved before the
    // vehicle is actually refueled.
    if (
      alertType?.toUpperCase() === "LOW_FUEL"
    ) {
      const vehicleMatch =
        (alertMessage || "").match(
          /Vehicle\s+([A-Za-z0-9_-]+)/i
        );

      const vehicleId =
        vehicleMatch?.[1];

      if (!vehicleId) {
        setError(
          "Unable to determine the vehicle for this low-fuel alert."
        );
        return;
      }

      navigate("/fuel", {
        state: {
          openAddFuelModal: true,
          vehicleId,
          alertId,
        },
      });

      return;
    }

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
  // ALERT KPI DATA
  // =========================================================

  const alertKpis = {
    total: alerts.length,

    open: openAlerts,

    critical: alerts.filter(
      (alert) =>
        alert.severity?.toUpperCase() ===
        "CRITICAL"
    ).length,

    resolved: resolvedAlerts,
  };


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <div className="alerts-page">

        <h1 className="alerts-page-title">
          Alerts
        </h1>

        <p className="alerts-page-subtitle">
          Monitor and manage fleet alerts.
        </p>

        <div className="alerts-loading-card">

          <p className="alerts-loading-text">
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
    <div className="alerts-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="alerts-header">

        <div>

          <h1 className="alerts-page-title">
            Alerts
          </h1>

          <p className="alerts-page-subtitle">
            Monitor and manage fleet alerts.
          </p>

        </div>


        {/* SUMMARY */}

        <div className="alerts-summary">

          <div className="alerts-summary-card alerts-open-card">

            <p className="alerts-summary-label">
              Open
            </p>

            <p className="alerts-summary-value alerts-open-value">
              {openAlerts}
            </p>

          </div>


          <div className="alerts-summary-card alerts-resolved-card">

            <p className="alerts-summary-label">
              Resolved
            </p>

            <p className="alerts-summary-value alerts-resolved-value">
              {resolvedAlerts}
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          KPI CARDS
          ===================================================== */}

      <div className="ff-kpi-grid">
        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Total Alerts
          </span>

          <strong className="ff-kpi-value">
            {alertKpis.total}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Open
          </span>

          <strong className="ff-kpi-value">
            {alertKpis.open}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Critical
          </span>

          <strong className="ff-kpi-value">
            {alertKpis.critical}
          </strong>
        </div>

        <div className="ff-kpi-card">
          <span className="ff-kpi-label">
            Resolved
          </span>

          <strong className="ff-kpi-value">
            {alertKpis.resolved}
          </strong>
        </div>
      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (

        <div className="alerts-message alerts-error">

          <div className="alerts-message-inner">

            <p className="alerts-error-text">
              {error}
            </p>

            <button
              onClick={() =>
                setError("")
              }
              className="alerts-dismiss alerts-dismiss-red"
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

        <div className="alerts-message alerts-success">

          <div className="alerts-message-inner">

            <p className="alerts-success-text">
              {successMessage}
            </p>

            <button
              onClick={() =>
                setSuccessMessage("")
              }
              className="alerts-dismiss alerts-dismiss-green"
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

        <div className="alerts-empty-card">

          <div className="alerts-empty-icon">

            <span className="alerts-empty-check">✓</span>

          </div>

          <p className="alerts-empty-title">
            No alerts found
          </p>

          <p className="alerts-empty-text">
            Your fleet currently has no recorded alerts.
          </p>

        </div>

      ) : (

        /* ===================================================
           TABLE
           =================================================== */

        <div className="alerts-table-card">

          <div className="alerts-table-scroll">

            <table className="alerts-table">

              <thead className="alerts-table-head">

                <tr>

                  <th className="alerts-th">
                    Alert
                  </th>

                  <th className="alerts-th">
                    Shipment
                  </th>

                  <th className="alerts-th">
                    Type
                  </th>

                  <th className="alerts-th">
                    Message
                  </th>

                  <th className="alerts-th">
                    Severity
                  </th>

                  <th className="alerts-th">
                    Created
                  </th>

                  <th className="alerts-th">
                    Status
                  </th>

                  <th className="alerts-th">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="alerts-table-body">

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
                        className="alerts-row"
                      >

                        {/* ALERT ID */}

                        <td className="alerts-td">

                          <span className="alerts-id">
                            #
                            {
                              alert.alert_id
                            }
                          </span>

                        </td>


                        {/* SHIPMENT */}

                        <td className="alerts-td">

                          <span className="alerts-primary-text">

                            {
                              alert.shipment_id ||
                              "N/A"
                            }

                          </span>

                        </td>


                        {/* TYPE */}

                        <td className="alerts-td">

                          <span className="alerts-primary-text">

                            {
                              formatAlertType(
                                alert.alert_type
                              )
                            }

                          </span>

                        </td>


                        {/* MESSAGE */}

                        <td className="alerts-td alerts-message-cell">

                          <p className="alerts-message-text">
                            {
                              alert.message
                            }
                          </p>

                        </td>


                        {/* SEVERITY */}

                        <td className="alerts-td">

                          <span
                            className={`alerts-severity alerts-severity-${String(
                              alert.severity || "unknown"
                            ).toLowerCase()}`}
                          >

                            {
                              alert.severity
                            }

                          </span>

                        </td>


                        {/* CREATED */}

                        <td className="alerts-td alerts-date-cell">

                          {
                            formatDateTime(
                              alert.created_at
                            )
                          }

                        </td>


                        {/* STATUS */}

                        <td className="alerts-td">

                          <span
                            className={`alerts-status alerts-status-${String(
                              alert.status || "unknown"
                            ).toLowerCase()}`}
                          >

                            {
                              formatStatus(
                                alert.status
                              )
                            }

                          </span>

                        </td>


                        {/* ACTION */}

                        <td className="alerts-td">

                          {resolved ? (

                            <div>

                              <span className="inline-flex rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                                Resolved
                              </span>

                              {alert.resolved_at && (

                                <p className="alerts-resolved-date">
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
                                  alert.alert_id,
                                  alert.alert_type,
                                  alert.message
                                )
                              }
                              disabled={
                                resolvingId ===
                                alert.alert_id
                              }
                              className="alerts-resolve-btn"
                            >

                              {resolvingId ===
                              alert.alert_id
                                ? "Opening..."
                                : alert.alert_type?.toUpperCase() ===
                                  "LOW_FUEL"
                                  ? "Refuel & Resolve"
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