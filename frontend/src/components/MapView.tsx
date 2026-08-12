import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EarthquakeRecord } from '@shared';
import {
  COLOMBIA_BOUNDS,
  COLOMBIA_CENTER,
  depthCategory,
  formatMagnitude,
  formatRelativeTime,
  severityFromEvent,
} from '@shared';

interface MapViewProps {
  events: EarthquakeRecord[];
  userLocation?: { latitude: number; longitude: number } | null;
  height?: string;
  showRadii?: boolean;
  radiusKm?: number;
  onSelect?: (event: EarthquakeRecord) => void;
  selectedId?: string | null;
}

/** Mapa Leaflet + OpenStreetMap con navegación libre, epicentros y marcador de usuario. */
export default function MapView({
  events,
  userLocation,
  height = '420px',
  showRadii = false,
  radiusKm = 100,
  onSelect,
  selectedId,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: COLOMBIA_CENTER,
      zoom: 5,
      worldCopyJump: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return;
    const layer = layerRef.current;
    layer.clearLayers();

    for (const ev of events) {
      const severity = severityFromEvent(ev);
      const size = Math.max(7, Math.min(20, 5 + ev.magnitude * 1.8));
      const marker = L.circleMarker([ev.latitude, ev.longitude], {
        radius: size,
        color: selectedId === ev.id ? '#ffffff' : '#0b1526',
        weight: selectedId === ev.id ? 3 : 1.5,
        fillColor: severity.level === 'very_strong' ? '#ef4444' : severity.level === 'strong' ? '#f97316' : severity.level === 'moderate' ? '#f59e0b' : '#34d399',
        fillOpacity: 0.85,
      });
      const popupHtml = `
        <div style="min-width:200px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:20px;font-weight:800">M${formatMagnitude(ev.magnitude)}</span>
            <span style="font-size:11px;color:#94a3b8">${severity.shortLabel}</span>
          </div>
          <div style="font-size:13px;line-height:1.4">${ev.place}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px">
            ${formatRelativeTime(ev.eventTime)} · ${depthCategory(ev.depth).shortLabel.toLowerCase()} · ${ev.source.toUpperCase()}
          </div>
        </div>`;
      const popup = L.popup({ maxWidth: 300 }).setContent(popupHtml);
      marker.bindPopup(popup);
      marker.on('click', () => onSelect?.(ev));
      marker.addTo(layer);

      if (showRadii && ev.distanceKm !== null && ev.distanceKm !== undefined) {
        L.circle([ev.latitude, ev.longitude], {
          radius: radiusKm * 1000,
          color: '#f59e0b',
          weight: 1,
          dashArray: '4 6',
          fillOpacity: 0.05,
        }).addTo(layer);
      }
    }

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.circleMarker([userLocation.latitude, userLocation.longitude], {
          interactive: false,
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.9,
        });
        userMarkerRef.current.bindTooltip('Tu ubicación');
        userMarkerRef.current.addTo(layer);
      } else {
        userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (events.length > 0) {
      mapRef.current.fitBounds(
        L.latLngBounds(events.map((e) => [e.latitude, e.longitude] as [number, number])),
        { padding: [32, 32], maxZoom: 10 },
      );
    }
  }, [events, userLocation, ready, showRadii, radiusKm, onSelect, selectedId]);

  const focusColombia = () => {
    mapRef.current?.setView(COLOMBIA_CENTER, 6, { animate: true });
  };

  const focusWorld = () => {
    if (events.length > 0) {
      mapRef.current?.fitBounds(
        L.latLngBounds(events.map((e) => [e.latitude, e.longitude] as [number, number])),
        { padding: [24, 24], maxZoom: 4 },
      );
    } else {
      mapRef.current?.setView(L.latLngBounds(COLOMBIA_BOUNDS).getCenter(), 2, { animate: true });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/5">
      <div ref={containerRef} style={{ height }} className="w-full" aria-label="Mapa de eventos sísmicos" />
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={focusColombia}
          className="rounded-lg border border-white/10 bg-seismic-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur hover:bg-seismic-700"
          title="Centrar en Colombia"
        >
          🇨🇴 Colombia
        </button>
        <button
          type="button"
          onClick={focusWorld}
          className="rounded-lg border border-white/10 bg-seismic-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur hover:bg-seismic-700"
          title="Ver todos los eventos en el mundo"
        >
          🌎 Mundo
        </button>
      </div>
    </div>
  );
}
