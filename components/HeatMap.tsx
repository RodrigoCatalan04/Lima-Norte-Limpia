"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type Point = { lat: number; lng: number };

type HeatFactory = { heatLayer: (pts: [number, number, number][], opts: { radius: number; blur: number }) => import("leaflet").Layer };

function HeatLayer({ points }: { points: Point[] }) {
  const map = useMap();
  useEffect(() => {
    let layer: import("leaflet").Layer | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      if (cancelled) return;
      layer = (L as unknown as HeatFactory).heatLayer(
        points.map((p) => [p.lat, p.lng, 0.7]),
        { radius: 28, blur: 22 }
      );
      layer.addTo(map);
    })();
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

export default function HeatMap({ points }: { points: Point[] }) {
  return (
    <div className="map-box tall">
      <MapContainer center={[-11.97, -77.06]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <HeatLayer points={points} />
      </MapContainer>
    </div>
  );
}
