import { useEffect, useState } from "react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Analytics() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [operational, setOperational] = useState(null);
  const [fleet, setFleet] = useState(null);
  const [fuel, setFuel] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [fuelConsumption, setFuelConsumption] = useState([]);
  const [driverPerformance, setDriverPerformance] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          operationalResponse,
          fleetResponse,
          fuelResponse,
          utilizationResponse,
          fuelConsumptionResponse,
          driverResponse,
          deliveryResponse,
        ] = await Promise.all([
          api.get("/analytics/operational"),
          api.get("/analytics/fleet-performance"),
          api.get("/analytics/fuel"),
          api.get("/analytics/fleet-utilization"),
          api.get("/analytics/fuel-consumption"),
          api.get("/analytics/driver-performance"),
          api.get("/analytics/delivery-performance"),
        ]);

        setOperational(operationalResponse.data);
        setFleet(fleetResponse.data);
        setFuel(fuelResponse.data);
        setUtilization(utilizationResponse.data);
        setFuelConsumption(fuelConsumptionResponse.data);
        setDriverPerformance(driverResponse.data);
        setDelivery(deliveryResponse.data);
      } catch (err) {
        console.error("Analytics loading error:", err);

        setError(
          err?.response?.data?.detail ||
            "Unable to load analytics data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Fleet Analytics
          </h1>

          <p style={styles.subtitle}>
            Operational performance, fleet utilization, fuel monitoring,
            driver performance and delivery insights.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={styles.cardGrid}>
        <MetricCard
          title="Total Trips"
          value={operational?.total_trips ?? 0}
          subtitle={`${operational?.completed_trips ?? 0} completed`}
        />

        <MetricCard
          title="Trip Completion"
          value={`${operational?.completion_rate ?? 0}%`}
          subtitle={`${operational?.in_progress_trips ?? 0} in progress`}
        />

        <MetricCard
          title="Total Vehicles"
          value={fleet?.total_vehicles ?? 0}
          subtitle={`${fleet?.available_vehicles ?? 0} available`}
        />

        <MetricCard
          title="Fleet Utilization"
          value={`${utilization?.utilization_rate ?? 0}%`}
          subtitle={`${utilization?.utilized_vehicles ?? 0} utilized`}
        />

        <MetricCard
          title="Fuel Consumed"
          value={`${fuel?.total_quantity ?? 0}`}
          subtitle="Total quantity"
        />

        <MetricCard
          title="Fuel Cost"
          value={`₹${fuel?.total_cost ?? 0}`}
          subtitle={`₹${fuel?.average_cost_per_unit ?? 0} per unit`}
        />

        <MetricCard
          title="Delivery Rate"
          value={`${delivery?.delivery_rate ?? 0}%`}
          subtitle={`${delivery?.delivered_shipments ?? 0} delivered`}
        />

        <MetricCard
          title="Maintenance Vehicles"
          value={fleet?.maintenance_vehicles ?? 0}
          subtitle="Currently under maintenance"
        />
      </div>

      {/* OPERATIONAL + FLEET */}
      <div style={styles.sectionGrid}>
        <SectionCard title="Operational Analytics">
          <DataRow
            label="Total Trips"
            value={operational?.total_trips}
          />

          <DataRow
            label="Scheduled"
            value={operational?.scheduled_trips}
          />

          <DataRow
            label="In Progress"
            value={operational?.in_progress_trips}
          />

          <DataRow
            label="Completed"
            value={operational?.completed_trips}
          />

          <DataRow
            label="Cancelled"
            value={operational?.cancelled_trips}
          />

          <DataRow
            label="Completion Rate"
            value={`${operational?.completion_rate ?? 0}%`}
          />
        </SectionCard>

        <SectionCard title="Fleet Performance">
          <DataRow
            label="Total Vehicles"
            value={fleet?.total_vehicles}
          />

          <DataRow
            label="Available"
            value={fleet?.available_vehicles}
          />

          <DataRow
            label="Active"
            value={fleet?.active_vehicles}
          />

          <DataRow
            label="Maintenance"
            value={fleet?.maintenance_vehicles}
          />

          <DataRow
            label="Average Mileage"
            value={fleet?.average_mileage}
          />

          <DataRow
            label="Average Fuel Level"
            value={`${fleet?.average_fuel_level ?? 0}%`}
          />
        </SectionCard>
      </div>

      {/* DELIVERY */}
      <SectionCard title="Delivery Performance">
        <div style={styles.deliveryGrid}>
          <DataRow
            label="Total Shipments"
            value={delivery?.total_shipments}
          />

          <DataRow
            label="Delivered"
            value={delivery?.delivered_shipments}
          />

          <DataRow
            label="In Transit"
            value={delivery?.in_transit_shipments}
          />

          <DataRow
            label="Pending"
            value={delivery?.pending_shipments}
          />

          <DataRow
            label="Cancelled"
            value={delivery?.cancelled_shipments}
          />

          <DataRow
            label="Delivery Rate"
            value={`${delivery?.delivery_rate ?? 0}%`}
          />
        </div>
      </SectionCard>

      {/* FUEL CONSUMPTION */}
      <SectionCard title="Fuel Consumption Report">
        {fuelConsumption.length === 0 ? (
          <EmptyState
            message="No fuel consumption records available."
          />
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Vehicle ID
                  </th>

                  <th style={styles.th}>
                    Fuel Records
                  </th>

                  <th style={styles.th}>
                    Quantity
                  </th>

                  <th style={styles.th}>
                    Total Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {fuelConsumption.map((item) => (
                  <tr key={item.vehicle_id}>
                    <td style={styles.td}>
                      {item.vehicle_id}
                    </td>

                    <td style={styles.td}>
                      {item.fuel_records}
                    </td>

                    <td style={styles.td}>
                      {item.total_quantity}
                    </td>

                    <td style={styles.td}>
                      ₹{item.total_cost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* DRIVER PERFORMANCE */}
      <SectionCard title="Driver Performance Report">
        {driverPerformance.length === 0 ? (
          <EmptyState
            message="No driver performance data available."
          />
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Driver ID
                  </th>

                  <th style={styles.th}>
                    Total Trips
                  </th>

                  <th style={styles.th}>
                    Completed
                  </th>

                  <th style={styles.th}>
                    Cancelled
                  </th>

                  <th style={styles.th}>
                    Completion Rate
                  </th>
                </tr>
              </thead>

              <tbody>
                {driverPerformance.map((driver) => (
                  <tr key={driver.driver_id}>
                    <td style={styles.td}>
                      {driver.driver_id}
                    </td>

                    <td style={styles.td}>
                      {driver.total_trips}
                    </td>

                    <td style={styles.td}>
                      {driver.completed_trips}
                    </td>

                    <td style={styles.td}>
                      {driver.cancelled_trips}
                    </td>

                    <td style={styles.td}>
                      {driver.completion_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}


/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({ title, value, subtitle }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTitle}>
        {title}
      </div>

      <div style={styles.metricValue}>
        {value}
      </div>

      <div style={styles.metricSubtitle}>
        {subtitle}
      </div>
    </div>
  );
}


/* ============================================================
   SECTION CARD
   ============================================================ */

function SectionCard({ title, children }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <section style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>
        {title}
      </h2>

      {children}
    </section>
  );
}


/* ============================================================
   DATA ROW
   ============================================================ */

function DataRow({ label, value }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>
        {label}
      </span>

      <strong style={styles.dataValue}>
        {value ?? 0}
      </strong>
    </div>
  );
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({ message }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <div style={styles.empty}>
      {message}
    </div>
  );
}


/* ============================================================
   THEME STYLES
   ============================================================ */

const getStyles = (theme) => {
  const dark = theme === "dark";

  return {
    page: {
      padding: "28px",
      minHeight: "100%",
      background: dark ? "#07101f" : "#f7f8fc",
      color: dark ? "#f8fafc" : "#111827",
      boxSizing: "border-box",
      overflowX: "hidden",
    },

    header: {
      marginBottom: "24px",
    },

    title: {
      margin: 0,
      fontSize: "30px",
      fontWeight: 700,
      color: dark ? "#f8fafc" : "#111827",
    },

    subtitle: {
      marginTop: "8px",
      color: dark ? "#94a3b8" : "#6b7280",
      fontSize: "14px",
      lineHeight: 1.5,
    },

    cardGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },

    metricCard: {
      background: dark ? "#101c30" : "#ffffff",
      border: dark
        ? "1px solid #243653"
        : "1px solid #e5e7eb",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: dark
        ? "0 2px 10px rgba(0,0,0,0.18)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      minWidth: 0,
    },

    metricTitle: {
      fontSize: "13px",
      color: dark ? "#9fb0c8" : "#6b7280",
      marginBottom: "10px",
    },

    metricValue: {
      fontSize: "28px",
      fontWeight: 700,
      color: dark ? "#ffffff" : "#111827",
    },

    metricSubtitle: {
      marginTop: "7px",
      fontSize: "12px",
      color: dark ? "#71839f" : "#9ca3af",
    },

    sectionGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(320px, 1fr))",
      gap: "20px",
      marginBottom: "20px",
    },

    sectionCard: {
      background: dark ? "#101c30" : "#ffffff",
      border: dark
        ? "1px solid #243653"
        : "1px solid #e5e7eb",
      borderRadius: "14px",
      padding: "22px",
      marginBottom: "20px",
      boxShadow: dark
        ? "0 2px 10px rgba(0,0,0,0.18)"
        : "0 2px 8px rgba(0,0,0,0.04)",
      boxSizing: "border-box",
      minWidth: 0,
    },

    sectionTitle: {
      margin: "0 0 18px",
      fontSize: "18px",
      fontWeight: 650,
      color: dark ? "#f8fafc" : "#111827",
    },

    dataRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "20px",
      padding: "11px 0",
      borderBottom: dark
        ? "1px solid #243653"
        : "1px solid #f0f1f3",
    },

    dataLabel: {
      color: dark ? "#9fb0c8" : "#6b7280",
      fontSize: "14px",
    },

    dataValue: {
      color: dark ? "#f8fafc" : "#111827",
      fontSize: "14px",
    },

    deliveryGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "8px 30px",
    },

    tableWrapper: {
      overflowX: "auto",
      width: "100%",
    },

    table: {
      width: "100%",
      borderCollapse: "collapse",
      color: dark ? "#f8fafc" : "#111827",
    },

    th: {
      textAlign: "left",
      padding: "12px",
      background: dark ? "#0b1628" : "#f9fafb",
      borderBottom: dark
        ? "1px solid #2a3c59"
        : "1px solid #e5e7eb",
      fontSize: "13px",
      color: dark ? "#b7c4d8" : "#4b5563",
      whiteSpace: "nowrap",
    },

    td: {
      padding: "13px 12px",
      borderBottom: dark
        ? "1px solid #243653"
        : "1px solid #f0f1f3",
      fontSize: "14px",
      color: dark ? "#e5edf7" : "#111827",
    },

    loading: {
      padding: "40px",
      textAlign: "center",
      color: dark ? "#a8b6ca" : "#6b7280",
    },

    error: {
      padding: "20px",
      background: dark ? "#3a1720" : "#fee2e2",
      color: dark ? "#fca5a5" : "#991b1b",
      border: dark
        ? "1px solid #652533"
        : "1px solid transparent",
      borderRadius: "10px",
    },

    empty: {
      padding: "25px",
      textAlign: "center",
      color: dark ? "#71839f" : "#9ca3af",
    },
  };
};