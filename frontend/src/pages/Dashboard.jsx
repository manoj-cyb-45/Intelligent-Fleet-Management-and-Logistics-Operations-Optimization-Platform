import { useEffect, useState } from "react";
import API from "../api/api";

import StatCard from "../components/StatCard";
import LineChartCard from "../components/LineChartCard";
import DonutChartCard from "../components/DonutChartCard";

import {
  Truck,
  Users,
  Wrench,
  TriangleAlert,
  Activity,
  ShieldCheck,
} from "lucide-react";

export default function Dashboard() {
  const [driverCount, setDriverCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(loadDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const driversRes = await API.get("/drivers/");
      const vehiclesRes = await API.get("/vehicles/");

      const vehicles = vehiclesRes.data;

      setDriverCount(driversRes.data.length);
      setVehicleCount(vehicles.length);

      setMaintenanceCount(
        vehicles.filter((v) => v.status === "Maintenance").length
      );

      setAlertCount(
        vehicles.filter((v) => v.status !== "Available").length
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 p-8">

      {/* HERO */}

      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-8 shadow-[0_0_40px_rgba(37,99,235,.25)]">

        <div className="absolute right-0 top-0 h-full w-72 bg-blue-600/10 blur-3xl"/>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="uppercase tracking-[5px] text-blue-400 text-sm font-semibold">
              AI Fleet Operations
            </p>

            <h1 className="mt-3 text-6xl font-black tracking-tight">
              Fleet Command Center
            </h1>

            <p className="mt-4 text-lg text-zinc-400">
              Real-time vehicle monitoring • Driver analytics • Live command system
            </p>

          </div>

          <div className="mt-8 flex gap-4 lg:mt-0">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 min-w-[150px]">

              <div className="flex items-center gap-2 text-blue-400">
                <Activity size={18}/>
                <span className="text-sm">System</span>
              </div>

              <p className="mt-2 text-2xl font-bold text-green-400">
                ONLINE
              </p>

            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 min-w-[150px]">

              <div className="flex items-center gap-2 text-cyan-400">
                <ShieldCheck size={18}/>
                <span className="text-sm">Security</span>
              </div>

              <p className="mt-2 text-2xl font-bold">
                SECURED
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Vehicles"
          value={vehicleCount}
          icon={Truck}
          color="text-blue-500"
        />

        <StatCard
          title="Drivers"
          value={driverCount}
          icon={Users}
          color="text-green-500"
        />

        <StatCard
          title="Maintenance"
          value={maintenanceCount}
          icon={Wrench}
          color="text-yellow-500"
        />

        <StatCard
          title="Alerts"
          value={alertCount}
          icon={TriangleAlert}
          color="text-red-500"
        />

      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        <div className="xl:col-span-2">
          <LineChartCard/>
        </div>

        <DonutChartCard/>

      </div>

      {/* LIVE ACTIVITY */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-lg">

          <h2 className="mb-5 text-2xl font-bold text-blue-400">
            Live Activity
          </h2>

          <div className="space-y-4">

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span>🚚 Vehicle Added</span>
              <span className="text-zinc-500">Now</span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span>👤 Driver Updated</span>
              <span className="text-zinc-500">Live</span>
            </div>

            <div className="flex items-center justify-between">
              <span>🛡 Fleet Monitoring Active</span>
              <span className="text-green-400">Running</span>
            </div>

          </div>

        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-lg">

          <h2 className="mb-5 text-2xl font-bold text-cyan-400">
            Quick Overview
          </h2>

          <div className="space-y-5">

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Fleet Capacity</span>
              <span className="font-bold">{vehicleCount} Vehicles</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Available Drivers</span>
              <span className="font-bold">{driverCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Maintenance Queue</span>
              <span className="font-bold text-yellow-400">
                {maintenanceCount}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Critical Alerts</span>
              <span className="font-bold text-red-400">
                {alertCount}
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}