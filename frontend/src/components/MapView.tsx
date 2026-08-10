import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EarthquakeRecord } from '@shared';
import { COLOMBIA_BOUNDS, COLOMBIA_CENTER, formatDate, formatMagnitude } from '@shared';

interface MapViewProps {
  events: EarthquakeRecord[];
  userLocation?: { latitude: number; longitude: number } | null;
  height?: string;
  showRadii?: boolean;
  radiusKm?: number;
  onSelect?: (event: EarthquakeRecord) => void;
  selectedId?: string | null;
}

function magnitudeColor(mag: number): string {
  if (mag >= 6) return '#ef4444';
  if (mag >= 5) return '#f59e0b';
  if (mag >= 4) return '#38bdf8';
  return '#64748b';
}

function magnitudeRadius(mag: number): number {
  return Math.max(6, Math.min(18, 4 + mag * 2));
}

/** Mapa Leaflet + OpenStreetMap con epicentros, radios y marcador de usuario. */
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
      zoom: 6,
      maxBounds: COLOMBIA_BOUNDS,
      maxBoundsViscosity: 0.6,
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
      const size = magnitudeRadius(ev.magnitude);
      const marker = L.circleMarker([ev.latitude, ev.longitude], {
        radius: size,
        color: selectedId === ev.id ? '#ffffff' : magnitudeColor(ev.magnitude),
        weight: selectedId === ev.id ? 3 : 2,
        fillColor: magnitudeColor(ev.magnitude),
        fillOpacity: 0.75,
      });
      const popup = L.popup({ maxWidth: 280 }).setContent(
        `<strong>M${formatMagnitude(ev.magnitude)}</strong> — ${ev.place}<br/>
         ${formatDate(ev.eventTime)}<br/>
         Profundidad: ${Math.round(ev.depth)} km · Fuente: ${ev.source.toUpperCase()}`,
      );
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
          color: '#22c55e',
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
        { padding: [24, 24], maxZoom: 8 },
      );
    }
  }, [events, userLocation, ready, showRadii, radiusKm, onSelect, selectedId]);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl" aria-label="Mapa de eventos sísmicos" />;
}
