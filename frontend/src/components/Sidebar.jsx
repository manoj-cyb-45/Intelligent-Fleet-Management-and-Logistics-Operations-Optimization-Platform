import {
  LayoutDashboard,
  Truck,
  Users,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menu = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Vehicles", icon: Truck, path: "/vehicles" },
  { name: "Drivers", icon: Users, path: "/drivers" },
  { name: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0F16] border-r border-zinc-800">

      <h1 className="px-8 py-8 text-4xl font-bold text-blue-500">
        FleetFlow
      </h1>

      <nav className="space-y-3 px-3">

        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-4 rounded-2xl px-5 py-4 text-lg transition-all duration-300
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-blue-400"
                }`
              }
            >
              <Icon size={24} />
              {item.name}
            </NavLink>
          );
        })}

      </nav>
    </aside>
  );
}