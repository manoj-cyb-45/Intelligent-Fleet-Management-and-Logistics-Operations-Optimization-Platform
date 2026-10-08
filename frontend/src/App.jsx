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
import Notifications from "./pages/Notifications";
import Trips from "./pages/Trips";
import Analytics from "./pages/Analytics";

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
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    truck: (
      <>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),

    drivers: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
      </>
    ),

    shipment: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),

    maintenance: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-3-3z" />
      </>
    ),

    fuel: (
      <>
        <path d="M7 3h7v18H7z" />
        <path d="M9 6h3M17 7l2 2v7a2 2 0 0 0 2 2" />
      </>
    ),

    alerts: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),

    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,

    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),

    check: <path d="m5 12 4 4L19 6" />,

    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.8-3.7 3-5.5 6.5-5.5s5.7 1.8 6.5 5.5" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.5h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.5v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),

    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4M18 12H8" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {paths[name] || paths.dashboard}
    </svg>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

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

      const [
        vehiclesResponse,
        driversResponse,
        shipmentsResponse,
        alertsResponse,
      ] = await Promise.all(requests);

      setVehicles(vehiclesResponse.data);
      setDrivers(driversResponse.data);
      setShipments(shipmentsResponse.data);
      setAlerts(alertsResponse.data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "ASSIGNED" ||
      vehicle.current_status === "IN_TRANSIT"
  ).length;

  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "AVAILABLE"
  ).length;

  const assignedVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "ASSIGNED"
  ).length;

  const inTransitVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "IN_TRANSIT"
  ).length;

  const maintenanceVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "MAINTENANCE"
  ).length;

  const activeShipments = shipments.filter(
    (shipment) =>
      shipment.status === "PENDING" ||
      shipment.status === "IN_TRANSIT"
  ).length;

  const pendingShipments = shipments.filter(
    (shipment) =>
      shipment.status === "PENDING"
  ).length;

  const inTransitShipments = shipments.filter(
    (shipment) =>
      shipment.status === "IN_TRANSIT"
  ).length;

  const deliveredShipments = shipments.filter(
    (shipment) =>
      shipment.status === "DELIVERED"
  ).length;

  const cancelledShipments = shipments.filter(
    (shipment) =>
      shipment.status === "CANCELLED"
  ).length;

  const openAlerts = alerts.filter(
    (alert) =>
      alert.status?.toUpperCase() !== "RESOLVED"
  ).length;


  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-heading">
          <h1>Fleet Dashboard</h1>
          <p>
            Monitor your fleet and logistics operations.
          </p>
        </div>

        <div className="error-card">
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
          </div>

          <button onClick={loadDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }


  if (user?.role === "DRIVER") {
    return (
      <div className="dashboard-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              DRIVER OPERATIONS
            </span>

            <h1>Driver Dashboard</h1>

            <p>
              View your shipment activity and delivery progress.
            </p>
          </div>
        </div>

        <div className="kpi-grid driver-kpis">
          <DashboardCard
            title="Active Shipments"
            value={activeShipments}
            subtitle={`${shipments.length} total shipments`}
            variant="blue"
            icon="shipment"
          />

          <DashboardCard
            title="In Transit"
            value={inTransitShipments}
            subtitle="Currently moving"
            variant="teal"
            icon="truck"
          />

          <DashboardCard
            title="Delivered"
            value={deliveredShipments}
            subtitle="Completed shipments"
            variant="green"
            icon="check"
          />
        </div>

        <ShipmentTable
          shipments={shipments}
          driver
        />
      </div>
    );
  }


  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            FLEET MANAGEMENT
          </span>

          <h1>Fleet Dashboard</h1>

          <p>
            Monitor your fleet and logistics operations.
          </p>
        </div>

        <div className="live-indicator">
          <span />
          Live overview
        </div>
      </div>


      <div className="kpi-grid">
        <DashboardCard
          title="Active Vehicles"
          value={activeVehicles}
          subtitle={`${vehicles.length} total vehicles`}
          variant="blue"
          icon="truck"
        />

        <DashboardCard
          title="Active Shipments"
          value={activeShipments}
          subtitle={`${shipments.length} total shipments`}
          variant="purple"
          icon="shipment"
        />

        <DashboardCard
          title="Drivers"
          value={drivers.length}
          subtitle="Registered drivers"
          variant="green"
          icon="drivers"
        />

        <DashboardCard
          title="Open Alerts"
          value={openAlerts}
          subtitle={`${alerts.length} total alerts`}
          variant="orange"
          icon="alerts"
        />
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


// ============================================================
// STATUS PANEL
// ============================================================

function StatusPanel({
  title,
  icon,
  variant,
  rows,
}) {
  const total = rows.reduce(
    (sum, row) => sum + row[1],
    0
  );

  return (
    <section className={`status-panel ${variant}`}>
      <div className="panel-title">
        <span className="panel-icon">
          <Icon
            name={icon}
            size={20}
          />
        </span>

        <h2>{title}</h2>
      </div>

      <div className="status-content">
        <div className="status-list">
          {rows.map(
            ([label, value, dot]) => (
              <StatusRow
                key={label}
                label={label}
                value={value}
                dot={dot}
              />
            )
          )}
        </div>

        <div className="status-orb">
          <div className="orb-ring">
            <Icon
              name={icon}
              size={42}
            />
          </div>

          <span>{total}</span>
        </div>
      </div>
    </section>
  );
}


// ============================================================
// SHIPMENT TABLE
// ============================================================

function ShipmentTable({
  shipments,
  driver = false,
}) {
  return (
    <section className="shipments-panel">
      <div className="shipments-header">
        <div>
          <span className="eyebrow">
            RECENT ACTIVITY
          </span>

          <h2>
            {driver
              ? "Shipments"
              : "Recent Shipments"}
          </h2>

          <p>
            {driver
              ? "Your available shipment information."
              : "Latest shipment activity from the fleet."}
          </p>
        </div>

        <NavLink
          to="/shipments"
          className="view-all"
        >
          View all
          <Icon
            name="arrow"
            size={18}
          />
        </NavLink>
      </div>


      <div className="shipment-table-wrap">
        <table className="shipment-table">
          <thead>
            <tr>
              <th>Shipment</th>
              <th>Route</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>

          <tbody>
            {shipments
              .slice(0, 5)
              .map((shipment) => {
                const progress = Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      shipment.delivery_progress || 0
                    )
                  )
                );

                const progressLabel = Number.isFinite(progress)
                  ? `${Number.isInteger(progress) ? progress : progress.toFixed(1)}%`
                  : "0%";

                const status =
                  shipment.status?.replace(
                    "_",
                    " "
                  ) || "UNKNOWN";

                const statusClass =
                  shipment.status === "DELIVERED"
                    ? "delivered"
                    : shipment.status === "CANCELLED"
                    ? "cancelled"
                    : shipment.status === "IN_TRANSIT"
                    ? "in-transit"
                    : "pending";

                return (
                  <tr
                    key={
                      shipment.shipment_id
                    }
                  >
                    <td>
                      <div className="shipment-id">
                        <span className="shipment-icon">
                          <Icon
                            name="shipment"
                            size={17}
                          />
                        </span>

                        <div>
                          <strong>
                            {shipment.shipment_id}
                          </strong>

                          <small>
                            {shipment.tracking_number}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="route-text">
                        {shipment.origin}
                        {" "}
                        <b>→</b>
                        {" "}
                        {shipment.destination}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-pill ${statusClass}`}
                      >
                        {status}
                      </span>
                    </td>

                    <td>
                      <div className="progress-cell">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <span>
                          {progressLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

            {shipments.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="empty-row"
                >
                  No shipments available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ============================================================
// DASHBOARD CARD
// ============================================================

function DashboardCard({
  title,
  value,
  subtitle,
  variant = "blue",
  icon = "dashboard",
}) {
  return (
    <article
      className={`dashboard-card ${variant}`}
    >
      <div className="card-copy">
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{subtitle}</span>
      </div>

      <div className="card-icon">
        <Icon
          name={icon}
          size={25}
        />
      </div>

      <div className="card-glow" />
    </article>
  );
}


// ============================================================
// STATUS ROW
// ============================================================

function StatusRow({
  label,
  value,
  dot = "blue",
}) {
  return (
    <div className="status-row">
      <span>
        <i
          className={`status-dot ${dot}`}
        />
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
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
    name: "Analytics",
    icon: "dashboard",
    path: "/analytics",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
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
    name: "Notifications",
    icon: "alerts",
    path: "/notifications",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
      "DRIVER",
    ],
  },

  {
    name: "Trips",
    icon: "shipment",
    path: "/trips",
    roles: [
      "ADMIN",
      "MANAGER",
      "DISPATCHER",
      "DRIVER",
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

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("fleetflow-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fleetflow-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // Ignore storage failures; sidebar state remains usable for this session.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!mobileNavOpen && !profileOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen, profileOpen]);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", mobileNavOpen);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [mobileNavOpen]);


  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event) => {
      if (!event.target.closest(".profile-menu-wrap")) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileOpen]);

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
      <div className={`fleet-app ${mobileNavOpen ? "mobile-nav-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />

        <aside className="app-sidebar">
          <div className="brand-block">
            <div className="brand-name">
              <span>Fleet</span>Flow
            </div>

            <p>
              Fleet Management Platform
            </p>
          </div>

          <nav className="app-nav">
            {navigation
              .filter((item) =>
                item.roles.includes(
                  user.role
                )
              )
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={
                    item.path === "/"
                  }
                  onClick={() => setMobileNavOpen(false)}
                  className={({
                    isActive,
                  }) =>
                    `nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                  title={sidebarCollapsed ? item.name : undefined}
                  aria-label={item.name}
                >
                  <span className="nav-icon">
                    <Icon
                      name={item.icon}
                      size={19}
                    />
                  </span>

                  <span>
                    {item.name}
                  </span>
                </NavLink>
              ))}
          </nav>


        </aside>


        <div className="app-main">

          <header className="app-header">

            <div className="header-left">
              <button
                type="button"
                className="sidebar-toggle-button"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Icon
                  name={sidebarCollapsed ? "chevronRight" : "chevronLeft"}
                  size={19}
                />
              </button>

              <button
                type="button"
                className="mobile-menu-button"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileNavOpen}
              >
                <Icon name="menu" size={20} />
              </button>
              <div className="header-brand-mark">
                FF
              </div>

              <div>
                <span>FleetFlow</span>
                <strong>
                  Operations Center
                </strong>
              </div>
            </div>


            <div className="user-area">

              <div className="profile-menu-wrap">
                <button
                  type="button"
                  className={`profile-trigger ${profileOpen ? "is-open" : ""}`}
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="profile-avatar">
                    {user.user_id?.charAt(0)?.toUpperCase() || "U"}
                  </span>

                  <span className="profile-trigger-copy">
                    <strong>{user.user_id}</strong>
                    <small>{user.role}</small>
                  </span>

                  <Icon
                    name={profileOpen ? "chevronRight" : "chevronDown"}
                    size={15}
                  />
                </button>

                {profileOpen && (
                  <div className="profile-menu" role="menu">
                    <div className="profile-menu-header">
                      <span className="profile-menu-avatar">
                        {user.user_id?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                      <div>
                        <strong>{user.user_id}</strong>
                        <span>FleetFlow account</span>
                      </div>
                    </div>

                    <div className="profile-account-grid">
                      <div>
                        <span>Role</span>
                        <strong>{user.role}</strong>
                      </div>
                      <div>
                        <span>Workspace</span>
                        <strong>Operations Center</strong>
                      </div>
                      <div>
                        <span>Account</span>
                        <strong className="profile-status">
                          <i /> Active
                        </strong>
                      </div>
                      <div>
                        <span>Access</span>
                        <strong>Authorized</strong>
                      </div>
                    </div>

                    <div className="profile-menu-divider" />

                    <div className="profile-menu-section-label">Preferences</div>
                    <button
                      type="button"
                      className="profile-menu-item profile-theme-item"
                      onClick={toggleTheme}
                      role="menuitem"
                    >
                      <span className="profile-menu-item-icon">
                        {theme === "dark" ? "☀" : "☾"}
                      </span>
                      <span>
                        <strong>Appearance</strong>
                        <small>{theme === "dark" ? "Dark mode" : "Light mode"}</small>
                      </span>
                      <span className="profile-theme-pill">
                        {theme === "dark" ? "Dark" : "Light"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="profile-menu-item profile-logout-item"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      role="menuitem"
                    >
                      <span className="profile-menu-item-icon">
                        <Icon name="logout" size={17} />
                      </span>
                      <span>
                        <strong>Sign out</strong>
                        <small>End this FleetFlow session</small>
                      </span>
                    </button>
                  </div>
                )}
              </div>

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
                  ANALYTICS
                 ================================================= */}

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "ADMIN",
                      "MANAGER",
                      "DISPATCHER",
                    ]}
                  >
                    <Analytics />
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
                  NOTIFICATIONS
                 ================================================= */}

              <Route
                path="/notifications"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "ADMIN",
                      "MANAGER",
                      "DISPATCHER",
                      "DRIVER",
                    ]}
                  >
                    <Notifications />
                  </ProtectedRoute>
                }
              />


              {/* =================================================
                  TRIPS
                 ================================================= */}

              <Route
                path="/trips"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "ADMIN",
                      "MANAGER",
                      "DISPATCHER",
                      "DRIVER",
                    ]}
                  >
                    <Trips />
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