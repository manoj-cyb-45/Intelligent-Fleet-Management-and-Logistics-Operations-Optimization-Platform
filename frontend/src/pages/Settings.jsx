export default function Settings() {
  return (
    <div className="p-10 text-white">

      <h1 className="text-5xl font-bold">Settings</h1>

      <p className="mt-3 text-zinc-400">
        FleetFlow system settings and preferences.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">

        <h2 className="mb-6 text-2xl font-semibold">Account Settings</h2>

        <div className="space-y-5">

          <div>
            <label className="text-zinc-400">Company Name</label>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-blue-500"
              defaultValue="FleetFlow Logistics"
            />
          </div>

          <div>
            <label className="text-zinc-400">Admin Email</label>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 outline-none focus:border-blue-500"
              defaultValue="admin@fleetflow.com"
            />
          </div>

          <button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">
            Save Changes
          </button>

        </div>

      </div>

    </div>
  );
}