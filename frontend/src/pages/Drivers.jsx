import { useEffect, useState } from "react";
import API from "../api/api";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    license_number: "",
    phone: "",
    status: "Available",
  });

  const loadDrivers = async () => {
    const res = await API.get("/drivers/");
    setDrivers(res.data);
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const save = async () => {
    if (editId) {
      await API.put(`/drivers/${editId}`, form);
    } else {
      await API.post("/drivers/", form);
    }

    setShow(false);
    setEditId(null);

    setForm({
      name: "",
      license_number: "",
      phone: "",
      status: "Available",
    });

    loadDrivers();
  };

  const edit = (d) => {
    setForm(d);
    setEditId(d.id);
    setShow(true);
  };

  const remove = async (id) => {
    await API.delete(`/drivers/${id}`);
    loadDrivers();
  };

  return (
    <div className="p-10 text-white bg-[#05070A] min-h-screen">

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-5xl font-bold">Driver Management</h1>

        <button
          onClick={() => setShow(true)}
          className="bg-blue-600 px-6 py-3 rounded-xl hover:bg-blue-500 flex gap-2"
        >
          <Plus />
          Add Driver
        </button>
      </div>

      <div className="rounded-2xl bg-[#13151C] overflow-hidden border border-zinc-800">
        <table className="w-full">
          <thead className="bg-[#1A1D24]">
            <tr>
              <th className="p-5">Name</th>
              <th>License</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t border-zinc-800">

                <td className="p-5">{d.name}</td>
                <td>{d.license_number}</td>
                <td>{d.phone}</td>

                <td>
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                    {d.status}
                  </span>
                </td>

                <td>
                  <div className="flex justify-center gap-3">

                    <button onClick={() => edit(d)}>
                      <Pencil className="text-blue-400"/>
                    </button>

                    <button onClick={() => remove(d.id)}>
                      <Trash2 className="text-red-400"/>
                    </button>

                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center">

          <div className="bg-[#13151C] p-8 rounded-2xl w-[420px]">

            <h2 className="text-3xl mb-6">
              {editId ? "Edit Driver" : "Add Driver"}
            </h2>

            <div className="space-y-4">

              <input
                placeholder="Name"
                value={form.name}
                onChange={(e)=>setForm({...form,name:e.target.value})}
                className="w-full p-3 rounded bg-zinc-900"
              />

              <input
                placeholder="License"
                value={form.license_number}
                onChange={(e)=>setForm({...form,license_number:e.target.value})}
                className="w-full p-3 rounded bg-zinc-900"
              />

              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e)=>setForm({...form,phone:e.target.value})}
                className="w-full p-3 rounded bg-zinc-900"
              />

            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={()=>setShow(false)}
                className="px-5 py-2 border border-zinc-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={save}
                className="px-5 py-2 bg-blue-600 rounded"
              >
                Save
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}