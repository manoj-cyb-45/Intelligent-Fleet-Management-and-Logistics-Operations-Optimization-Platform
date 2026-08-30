import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import Shipments from "./pages/Shipments";
import Maintenance from "./pages/Maintenance";
import Fuel from "./pages/Fuel";
import Alerts from "./pages/Alerts";


function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800">
        Fleet Dashboard
      </h1>

      <p className="mt-2 text-slate-500">
        Monitor your fleet and logistics operations.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Active Vehicles" value="1" />
        <DashboardCard title="Active Shipments" value="3" />
        <DashboardCard title="Drivers" value="5" />
        <DashboardCard title="Open Alerts" value="0" />
      </div>
    </div>
  );
}


function DashboardCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}


function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800">
        {title}
      </h1>

      <p className="mt-2 text-slate-500">
        This module will be connected to the FleetFlow API.
      </p>
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


function ProtectedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
                    {user?.user_id}
                  </p>

                  <p className="text-xs text-slate-500">
                    {user?.role}
                  </p>
                </div>


                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                  {user?.user_id?.charAt(0)?.toUpperCase() || "U"}
                </div>


                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Logout
                </button>

              </div>

            </div>

          </header>


          <main className="flex-1 p-8">

            <Routes>

              <Route
                path="/"
                element={<Dashboard />}
              />

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
  );
}


function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <ProtectedLayout />;
}


function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>

      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Login />
        }
      />

      <Route
        path="/*"
        element={<ProtectedRoutes />}
      />

    </Routes>
  );
}


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;