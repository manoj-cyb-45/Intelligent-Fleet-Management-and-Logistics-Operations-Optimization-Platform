import { useEffect, useState } from "react";

import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import api from "./services/api";
import { useTheme } from "./context/ThemeContext";
import Login from "./pages/Login";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Shipments from "./pages/Shipments";
import Maintenance from "./pages/Maintenance";
import Fuel from "./pages/Fuel";
import Alerts from "./pages/Alerts";
import Tracking from "./pages/Tracking";

import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";


// ============================================================
// DASHBOARD
// ============================================================

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    truck: <><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    drivers: <><circle cx="12" cy="8" r="3"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6"/></>,
    shipment: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
    maintenance: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-3-3z"/></>,
    fuel: <><path d="M7 3h7v18H7z"/><path d="M9 6h3M17 7l2 2v7a2 2 0 0 0 2 2"/></>,
    alerts: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg {...common}>{paths[name] || paths.dashboard}</svg>;
}

function Dashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, [user?.role]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      if (user?.role === "DRIVER") {
        const shipmentsResponse = await api.get("/shipments");
        setShipments(shipmentsResponse.data);
        setVehicles([]);
        setDrivers([]);
        setAlerts([]);
        return;
      }

      const requests = [
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/shipments"),
        api.get("/alerts"),
      ];

      const [vehiclesResponse, driversResponse, shipmentsResponse, alertsResponse] = await Promise.all(requests);
      setVehicles(vehiclesResponse.data);
      setDrivers(driversResponse.data);
      setShipments(shipmentsResponse.data);
      setAlerts(alertsResponse.data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(err.response?.data?.detail || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const activeVehicles = vehicles.filter((vehicle) =>
    vehicle.current_status === "ASSIGNED" || vehicle.current_status === "IN_TRANSIT"
  ).length;
  const availableVehicles = vehicles.filter((vehicle) => vehicle.current_status === "AVAILABLE").length;
  const assignedVehicles = vehicles.filter((vehicle) => vehicle.current_status === "ASSIGNED").length;
  const inTransitVehicles = vehicles.filter((vehicle) => vehicle.current_status === "IN_TRANSIT").length;
  const maintenanceVehicles = vehicles.filter((vehicle) => vehicle.current_status === "MAINTENANCE").length;
  const activeShipments = shipments.filter((shipment) =>
    shipment.status === "PENDING" || shipment.status === "IN_TRANSIT"
  ).length;
  const pendingShipments = shipments.filter((shipment) => shipment.status === "PENDING").length;
  const inTransitShipments = shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length;
  const deliveredShipments = shipments.filter((shipment) => shipment.status === "DELIVERED").length;
  const cancelledShipments = shipments.filter((shipment) => shipment.status === "CANCELLED").length;
  const openAlerts = alerts.filter((alert) => alert.status?.toUpperCase() !== "RESOLVED").length;

  if (loading) {
    return <div className="dashboard-loading"><div className="loading-card"><div className="loading-spinner"/><p>Loading dashboard...</p></div></div>;
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-heading"><h1>Fleet Dashboard</h1><p>Monitor your fleet and logistics operations.</p></div>
        <div className="error-card"><div><strong>Dashboard unavailable</strong><p>{error}</p></div><button onClick={loadDashboardData}>Try Again</button></div>
      </div>
    );
  }

  if (user?.role === "DRIVER") {
    return (
      <div className="dashboard-page">
        <div className="page-heading"><div><span className="eyebrow">DRIVER OPERATIONS</span><h1>Driver Dashboard</h1><p>View your shipment activity and delivery progress.</p></div></div>
        <div className="kpi-grid driver-kpis">
          <DashboardCard title="Active Shipments" value={activeShipments} subtitle={`${shipments.length} total shipments`} variant="blue" icon="shipment" />
          <DashboardCard title="In Transit" value={inTransitShipments} subtitle="Currently moving" variant="teal" icon="truck" />
          <DashboardCard title="Delivered" value={deliveredShipments} subtitle="Completed shipments" variant="green" icon="check" />
        </div>
        <ShipmentTable shipments={shipments} driver />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div><span className="eyebrow">FLEET MANAGEMENT</span><h1>Fleet Dashboard</h1><p>Monitor your fleet and logistics operations.</p></div>
        <div className="live-indicator"><span/> Live overview</div>
      </div>

      <div className="kpi-grid">
        <DashboardCard title="Active Vehicles" value={activeVehicles} subtitle={`${vehicles.length} total vehicles`} variant="blue" icon="truck" />
        <DashboardCard title="Active Shipments" value={activeShipments} subtitle={`${shipments.length} total shipments`} variant="purple" icon="shipment" />
        <DashboardCard title="Drivers" value={drivers.length} subtitle="Registered drivers" variant="green" icon="drivers" />
        <DashboardCard title="Open Alerts" value={openAlerts} subtitle={`${alerts.length} total alerts`} variant="orange" icon="alerts" />
      </div>

      <div className="status-grid">
        <StatusPanel
          title="Vehicle Status"
          icon="truck"
          variant="blue"
          rows={[
            ["Available", availableVehicles, "blue"],
            ["Assigned", assignedVehicles, "purple"],
            ["In Transit", inTransitVehicles, "teal"],
            ["Maintenance", maintenanceVehicles, "orange"],
          ]}
        />
        <StatusPanel
          title="Shipment Status"
          icon="shipment"
          variant="purple"
          rows={[
            ["Pending", pendingShipments, "orange"],
            ["In Transit", inTransitShipments, "blue"],
            ["Delivered", deliveredShipments, "green"],
            ["Cancelled", cancelledShipments, "red"],
          ]}
        />
      </div>

      <ShipmentTable shipments={shipments} />
    </div>
  );
}

function StatusPanel({ title, icon, variant, rows }) {
  const total = rows.reduce((sum, row) => sum + row[1], 0);
  return (
    <section className={`status-panel ${variant}`}>
      <div className="panel-title"><span className="panel-icon"><Icon name={icon} size={20}/></span><h2>{title}</h2></div>
      <div className="status-content">
        <div className="status-list">
          {rows.map(([label, value, dot]) => <StatusRow key={label} label={label} value={value} dot={dot} />)}
        </div>
        <div className="status-orb"><div className="orb-ring"><Icon name={icon} size={42}/></div><span>{total}</span></div>
      </div>
    </section>
  );
}

function ShipmentTable({ shipments, driver = false }) {
  return (
    <section className="shipments-panel">
      <div className="shipments-header">
        <div><span className="eyebrow">RECENT ACTIVITY</span><h2>{driver ? "Shipments" : "Recent Shipments"}</h2><p>{driver ? "Your available shipment information." : "Latest shipment activity from the fleet."}</p></div>
        <NavLink to="/shipments" className="view-all">View all <Icon name="arrow" size={18}/></NavLink>
      </div>
      <div className="shipment-table-wrap">
        <table className="shipment-table">
          <thead><tr><th>Shipment</th><th>Route</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>
            {shipments.slice(0, 5).map((shipment) => {
              const progress = Number(shipment.delivery_progress || 0);
              const status = shipment.status?.replace("_", " ") || "UNKNOWN";
              const statusClass = shipment.status === "DELIVERED" ? "delivered" : shipment.status === "CANCELLED" ? "cancelled" : shipment.status === "IN_TRANSIT" ? "in-transit" : "pending";
              return (
                <tr key={shipment.shipment_id}>
                  <td><div className="shipment-id"><span className="shipment-icon"><Icon name="shipment" size={17}/></span><div><strong>{shipment.shipment_id}</strong><small>{shipment.tracking_number}</small></div></div></td>
                  <td><span className="route-text">{shipment.origin} <b>→</b> {shipment.destination}</span></td>
                  <td><span className={`status-pill ${statusClass}`}>{status}</span></td>
                  <td><div className="progress-cell"><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div><span>{progress}%</span></div></td>
                </tr>
              );
            })}
            {shipments.length === 0 && <tr><td colSpan="4" className="empty-row">No shipments available.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
// DASHBOARD CARD
// ============================================================

function DashboardCard({ title, value, subtitle, variant = "blue", icon = "dashboard" }) {
  return (
    <article className={`dashboard-card ${variant}`}>
      <div className="card-copy"><p>{title}</p><strong>{value}</strong><span>{subtitle}</span></div>
      <div className="card-icon"><Icon name={icon} size={25}/></div>
      <div className="card-glow" />
    </article>
  );
}

// ============================================================
// STATUS ROW
// ============================================================

function StatusRow({ label, value, dot = "blue" }) {
  return <div className="status-row"><span><i className={`status-dot ${dot}`} />{label}</span><strong>{value}</strong></div>;
}

// ============================================================
// NAVIGATION
// ============================================================

const navigation = [
  {
    name: "Dashboard",
    icon: "dashboard",
    path: "/",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
      "DRIVER",
    ],
  },

  {
    name: "Vehicles",
    icon: "truck",
    path: "/vehicles",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
    ],
  },

  {
    name: "Drivers",
    icon: "drivers",
    path: "/drivers",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
    ],
  },

  {
    name: "Shipments",
    icon: "shipment",
    path: "/shipments",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
      "DRIVER",
    ],
  },

  {
    name: "Maintenance",
    icon: "maintenance",
    path: "/maintenance",
    roles: [
      "ADMIN",
      "MANAGER",
    ],
  },

  {
    name: "Fuel",
    icon: "fuel",
    path: "/fuel",
    roles: [
      "ADMIN",
      "MANAGER",
    ],
  },

  {
    name: "Alerts",
    icon: "alerts",
    path: "/alerts",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
    ],
  },
  {
  name: "Live Tracking",
  icon: "truck",
  path: "/tracking",
  roles: [
    "ADMIN",
    "MANAGER",
    "DISPATCHER",
  ],
},
];


// ============================================================
// APP
// ============================================================

function App() {
  const {
  user,
  logout,
} = useAuth();

const {
  theme,
  toggleTheme,
} = useTheme();


  // ==========================================================
  // NOT LOGGED IN
  // ==========================================================

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    );
  }


  // ==========================================================
  // LOGGED-IN APPLICATION
  // ==========================================================

  return (
    <BrowserRouter>
      <div className="fleet-app">
        <aside className="app-sidebar">
          <div className="brand-block">
            <div className="brand-name"><span>Fleet</span>Flow</div>
            <p>Fleet Management Platform</p>
          </div>

          <nav className="app-nav">
            {navigation
              .filter((item) => item.roles.includes(user.role))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="nav-icon"><Icon name={item.icon} size={19}/></span>
                  <span>{item.name}</span>
                </NavLink>
              ))}
          </nav>

          <div className="sidebar-footer-card">
            <div className="footer-card-top"><span className="footer-truck"><Icon name="truck" size={22}/></span><span className="online-dot"/></div>
            <strong>FleetFlow</strong>
            <p>Keep your fleet moving</p>
            <div className="mini-chart"><span/><span/><span/><span/><span/><span/></div>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-header">
  <div className="header-left">
    <div className="header-brand-mark">FF</div>

    <div>
      <span>FleetFlow</span>
      <strong>Operations Center</strong>
    </div>
  </div>

  <div className="user-area">

    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-icon">
        {theme === "dark" ? "☀" : "☾"}
      </span>

      <span className="theme-toggle-text">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>

    <div className="user-copy">
      <strong>{user.user_id}</strong>
      <span>{user.role}</span>
    </div>

    <div className="avatar">
      {user.user_id?.charAt(0) || "U"}
    </div>

    <button
      className="logout-button"
      onClick={logout}
    >
      Logout
    </button>

  </div>
</header>

            <main className="app-content">

              <Routes>

                {/* =================================================
                    LOGIN
                   ================================================= */}

                <Route
                  path="/login"
                  element={
                    <Navigate
                      to="/"
                      replace
                    />
                  }
                />


                {/* =================================================
                    DASHBOARD
                   ================================================= */}

                <Route
                  path="/"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                        "DISPATCHER",
                        "DRIVER",
                      ]}
                    >
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    VEHICLES
                   ================================================= */}

                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                        "DISPATCHER",
                      ]}
                    >
                      <Vehicles />
                    </ProtectedRoute>
                  }
                />
                <Route
                      path="/tracking"
                      element={
                        <ProtectedRoute
                          allowedRoles={[
                            "ADMIN",
                            "MANAGER",
                            "DISPATCHER",
                          ]}
                        >
                          <Tracking />
                        </ProtectedRoute>
                      }
                    />

                {/* =================================================
                    DRIVERS
                   ================================================= */}

                <Route
                  path="/drivers"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                        "DISPATCHER",
                      ]}
                    >
                      <Drivers />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    SHIPMENTS
                   ================================================= */}

                <Route
                  path="/shipments"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                        "DISPATCHER",
                        "DRIVER",
                      ]}
                    >
                      <Shipments />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    MAINTENANCE
                   ================================================= */}

                <Route
                  path="/maintenance"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                      ]}
                    >
                      <Maintenance />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    FUEL
                   ================================================= */}

                <Route
                  path="/fuel"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                      ]}
                    >
                      <Fuel />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    ALERTS
                   ================================================= */}

                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        "ADMIN",
                        "MANAGER",
                        "DISPATCHER",
                      ]}
                    >
                      <Alerts />
                    </ProtectedRoute>
                  }
                />


                {/* =================================================
                    UNKNOWN ROUTE
                   ================================================= */}

                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/"
                      replace
                    />
                  }
                />

              </Routes>

            </main>
        </div>
      </div>
    </BrowserRouter>
  );
}


export default App;