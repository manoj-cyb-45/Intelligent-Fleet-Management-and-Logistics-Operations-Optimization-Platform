import { Search, Bell } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-[#0F1117] px-10 py-5">

      <div>
        <h2 className="text-3xl font-bold">Fleet Command Center</h2>

        <p className="text-sm text-zinc-400">
          {time.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="flex items-center gap-6">

        <div className="text-right">
          <p className="text-xl font-semibold">
            {time.toLocaleTimeString("en-IN")}
          </p>
        </div>

        <Search className="cursor-pointer text-zinc-300 hover:text-blue-400" />

        <Bell className="cursor-pointer text-zinc-300 hover:text-blue-400" />

        <div className="h-12 w-12 rounded-full bg-blue-500"></div>

      </div>

    </header>
  );
}