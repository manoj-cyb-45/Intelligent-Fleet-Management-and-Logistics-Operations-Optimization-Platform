import { useEffect, useState } from "react";
import API from "../api/api";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    vehicle_number: "",
    model: "",
    driver: "",
    status: "Available",
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await API.get("/vehicles/");
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addVehicle = async () => {
    if (!form.vehicle_number || !form.model || !form.driver) {
      alert("Fill all fields");
      return;
    }

    try {
      await API.post("/vehicles/", form);
      setForm({
        vehicle_number: "",
        model: "",
        driver: "",
        status: "Available",
      });
      setShowForm(false);
      loadVehicles();
    } catch (err) {
      alert(err.response?.data?.detail || "Error");
    }
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;

    await API.delete(`/vehicles/${id}`);
    loadVehicles();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-5xl font-bold">Vehicle Management</h1>
          <p className="text-zinc-400 mt-2">
            Manage your fleet vehicles
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold"
        >
          + Add Vehicle
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-900 p-6 rounded-2xl mb-8 grid grid-cols-2 gap-4 border border-zinc-800">
          <input
            className="bg-zinc-800 p-3 rounded-lg"
            placeholder="Vehicle Number"
            value={form.vehicle_number}
            onChange={(e) =>
              setForm({ ...form, vehicle_number: e.target.value })
            }
          />

          <input
            className="bg-zinc-800 p-3 rounded-lg"
            placeholder="Vehicle Model"
            value={form.model}
            onChange={(e) =>
              setForm({ ...form, model: e.target.value })
            }
          />

          <input
            className="bg-zinc-800 p-3 rounded-lg"
            placeholder="Driver Name"
            value={form.driver}
            onChange={(e) =>
              setForm({ ...form, driver: e.target.value })
            }
          />

          <select
            className="bg-zinc-800 p-3 rounded-lg"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
          >
            <option>Available</option>
            <option>On Trip</option>
            <option>Maintenance</option>
          </select>

          <button
            onClick={addVehicle}
            className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg col-span-2"
          >
            Save Vehicle
          </button>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th className="p-4 text-left">Vehicle</th>
              <th className="p-4 text-left">Model</th>
              <th className="p-4 text-left">Driver</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="text-center p-8 text-zinc-400"
                >
                  No vehicles found.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-zinc-800 hover:bg-zinc-800/40 transition"
                >
                  <td className="p-4 font-semibold">{v.vehicle_number}</td>
                  <td className="p-4">{v.model}</td>
                  <td className="p-4">{v.driver}</td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        v.status === "Available"
                          ? "bg-green-500/20 text-green-400"
                          : v.status === "Maintenance"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => deleteVehicle(v.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}