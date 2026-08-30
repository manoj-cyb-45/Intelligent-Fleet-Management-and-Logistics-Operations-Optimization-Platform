import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import api from "./services/api";

import Login from "./pages/Login";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Shipments from "./pages/Shipments";
import Maintenance from "./pages/Maintenance";
import Fuel from "./pages/Fuel";
import Alerts from "./pages/Alerts";


function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        vehiclesResponse,
        driversResponse,
        shipmentsResponse,
        alertsResponse,
      ] = await Promise.all([
        api.get("/vehicles"),
        api.get("/drivers"),
        api.get("/shipments"),
        api.get("/alerts"),
      ]);

      setVehicles(vehiclesResponse.data);
      setDrivers(driversResponse.data);
      setShipments(shipmentsResponse.data);
      setAlerts(alertsResponse.data);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Unable to load dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const activeVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.current_status === "ASSIGNED" ||
      vehicle.current_status === "IN_TRANSIT"
  ).length;

  const activeShipments = shipments.filter(
    (shipment) =>
      shipment.status === "PENDING" ||
      shipment.status === "IN_TRANSIT"
  ).length;

  const openAlerts = alerts.filter(
    (alert) => alert.status !== "RESOLVED"
  ).length;

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Fleet Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Monitor your fleet and logistics operations.
        </p>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Fleet Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Monitor your fleet and logistics operations.
        </p>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            {error}
          </p>

          <button
            onClick={loadDashboardData}
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
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Fleet Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Monitor your fleet and logistics operations.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Active Vehicles"
          value={activeVehicles}
          subtitle={`${vehicles.length} total vehicles`}
        />

        <DashboardCard
          title="Active Shipments"
          value={activeShipments}
          subtitle={`${shipments.length} total shipments`}
        />

        <DashboardCard
          title="Drivers"
          value={drivers.length}
          subtitle="Registered drivers"
        />

        <DashboardCard
          title="Open Alerts"
          value={openAlerts}
          subtitle={`${alerts.length} total alerts`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Vehicle Status
          </h2>

          <div className="mt-5 space-y-4">
            <StatusRow
              label="Available"
              value={
                vehicles.filter(
                  (vehicle) =>
                    vehicle.current_status === "AVAILABLE"
                ).length
              }
            />

            <StatusRow
              label="Assigned"
              value={
                vehicles.filter(
                  (vehicle) =>
                    vehicle.current_status === "ASSIGNED"
                ).length
              }
            />

            <StatusRow
              label="In Transit"
              value={
                vehicles.filter(
                  (vehicle) =>
                    vehicle.current_status === "IN_TRANSIT"
                ).length
              }
            />

            <StatusRow
              label="Maintenance"
              value={
                vehicles.filter(
                  (vehicle) =>
                    vehicle.current_status === "MAINTENANCE"
                ).length
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Shipment Status
          </h2>

          <div className="mt-5 space-y-4">
            <StatusRow
              label="Pending"
              value={
                shipments.filter(
                  (shipment) =>
                    shipment.status === "PENDING"
                ).length
              }
            />

            <StatusRow
              label="In Transit"
              value={
                shipments.filter(
                  (shipment) =>
                    shipment.status === "IN_TRANSIT"
                ).length
              }
            />

            <StatusRow
              label="Delivered"
              value={
                shipments.filter(
                  (shipment) =>
                    shipment.status === "DELIVERED"
                ).length
              }
            />

            <StatusRow
              label="Cancelled"
              value={
                shipments.filter(
                  (shipment) =>
                    shipment.status === "CANCELLED"
                ).length
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Shipments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest shipment activity from the fleet.
            </p>
          </div>

          <NavLink
            to="/shipments"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </NavLink>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Shipment
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Route
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {shipments.slice(0, 5).map((shipment) => (
                <tr key={shipment.shipment_id}>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-800">
                      {shipment.shipment_id}
                    </p>

                    <p className="text-xs text-slate-500">
                      {shipment.tracking_number}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {shipment.origin} → {shipment.destination}
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {shipment.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{
                            width: `${shipment.delivery_progress}%`,
                          }}
                        />
                      </div>

                      <span className="text-xs font-medium text-slate-600">
                        {shipment.delivery_progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {shipments.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    No shipments available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function DashboardCard({ title, value, subtitle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-800">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}


function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}


const navigation = [
  { name: "Dashboard", path: "/" },
  { name: "Vehicles", path: "/vehicles" },
  { name: "Drivers", path: "/drivers" },
  { name: "Shipments", path: "/shipments" },
  { name: "Maintenance", path: "/maintenance" },
  { name: "Fuel", path: "/fuel" },
  { name: "Alerts", path: "/alerts" },
];


function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <div className="flex min-h-screen">
          <aside className="w-64 bg-slate-900 text-white">
            <div className="border-b border-slate-700 px-6 py-6">
              <h1 className="text-2xl font-bold">
                FleetFlow
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Fleet Management Platform
              </p>
            </div>

            <nav className="space-y-1 p-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white px-8 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    FleetFlow
                  </p>

                  <h2 className="text-xl font-semibold">
                    Operations Center
                  </h2>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {user.user_id}
                    </p>

                    <p className="text-xs text-slate-500">
                      {user.role}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                    {user.user_id?.charAt(0) || "U"}
                  </div>

                  <button
                    onClick={logout}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />

                <Route
                  path="/vehicles"
                  element={<Vehicles />}
                />

                <Route
                  path="/drivers"
                  element={<Drivers />}
                />

                <Route
                  path="/shipments"
                  element={<Shipments />}
                />

                <Route
                  path="/maintenance"
                  element={<Maintenance />}
                />

                <Route
                  path="/fuel"
                  element={<Fuel />}
                />

                <Route
                  path="/alerts"
                  element={<Alerts />}
                />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;