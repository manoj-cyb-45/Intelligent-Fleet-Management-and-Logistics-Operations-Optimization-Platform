import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function DonutChartCard() {
  const trucks = [
    {
      id:1,
      name:"TN09DL15345",
      driver:"Kumar",
      status:"Available",
      position:[11.0168,76.9558]
    },
    {
      id:2,
      name:"TN38AB2345",
      driver:"Raj",
      status:"On Trip",
      position:[11.0300,76.9700]
    }
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-2xl font-bold">
          Live Fleet Map
        </h2>

        <p className="text-zinc-400 mt-1">
          Real-time vehicle locations
        </p>
      </div>

      <MapContainer
        center={[11.0168,76.9558]}
        zoom={12}
        className="h-[420px] w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {trucks.map((truck)=>(
          <Marker key={truck.id} position={truck.position}>
            <Popup>
              <strong>{truck.name}</strong>
              <br/>
              Driver: {truck.driver}
              <br/>
              Status: {truck.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}