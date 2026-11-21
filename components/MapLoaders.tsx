"use client";

import dynamic from "next/dynamic";

// Leaflet usa `window`, por eso se carga solo en el navegador.
export const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false, loading: () => <p className="hint">Cargando mapa…</p> });
export const HeatMap = dynamic(() => import("./HeatMap"), { ssr: false, loading: () => <p className="hint">Cargando mapa…</p> });
