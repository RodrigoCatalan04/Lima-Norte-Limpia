"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Pos = { lat: number; lng: number };

function ClickHandler({ onPick }: { onPick: (p: Pos) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ pos }: { pos: Pos | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 17, { duration: 0.6 });
  }, [map, pos]);
  return null;
}

export default function MapPicker() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [flyTarget, setFlyTarget] = useState<Pos | null>(null);
  const [geoMsg, setGeoMsg] = useState("");

  useEffect(() => {
    // HU10 escenario 2: al abrir el formulario, centra el mapa en la ubicación actual si el usuario lo permite.
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(here);
        setFlyTarget(here);
      },
      () => undefined
    );
  }, []);

  function locateMe() {
    if (!navigator.geolocation) return setGeoMsg("Tu navegador no permite geolocalización. Marca el punto en el mapa.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(here);
        setFlyTarget(here);
        setGeoMsg("");
      },
      () => setGeoMsg("No se pudo obtener tu ubicación. Marca el punto en el mapa.")
    );
  }

  return (
    <div>
      <button type="button" className="btn secondary" onClick={locateMe}>
        Usar mi ubicación actual
      </button>
      {geoMsg && <p className="hint">{geoMsg}</p>}
      <div className="map-box">
        <MapContainer center={[-11.96, -77.06]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={setPos} />
          <FlyTo pos={flyTarget} />
          {pos && <CircleMarker center={[pos.lat, pos.lng]} radius={10} pathOptions={{ color: "#b91c1c", fillOpacity: 0.7 }} />}
        </MapContainer>
      </div>
      <p className="hint">{pos ? `Ubicación marcada: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Haz clic en el mapa para marcar el punto crítico."}</p>
      <input type="hidden" name="lat" value={pos?.lat ?? ""} required />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} required />
    </div>
  );
}
