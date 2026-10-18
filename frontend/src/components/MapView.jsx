/**
 * Map view built on Leaflet with OpenStreetMap tiles.
 *
 * Leaflet is imperative, so the map instance lives in a ref and markers are
 * reconciled on prop changes. Tiles come from OpenStreetMap with the required
 * attribution, and no API key is needed.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

/** Parse a GeoJSON point or {lat,lng} pair into [lat, lng]. */
function toLatLng(value) {
  if (!value) return null;
  if (Array.isArray(value?.coordinates)) {
    const [lng, lat] = value.coordinates;
    return [Number(lat), Number(lng)];
  }
  if (typeof value?.lat === 'number' && typeof value?.lng === 'number') {
    return [value.lat, value.lng];
  }
  return null;
}

export function MapView({
  points = [],
  center,
  zoom = 12,
  height = 320,
  connect = false,
  emptyMessage = 'No location available for this record.',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  const validPoints = points
    .map((point) => ({ ...point, latlng: toLatLng(point.position) }))
    .filter((point) => point.latlng && Number.isFinite(point.latlng[0]) && Number.isFinite(point.latlng[1]));

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !validPoints.length) return undefined;

    const initialCenter = toLatLng(center) || validPoints[0].latlng;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(initialCenter, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // Intentionally keyed on the point set identity only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validPoints.length]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const latlngs = [];

    validPoints.forEach((point) => {
      latlngs.push(point.latlng);
      const marker = L.circleMarker(point.latlng, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: point.color || '#16a34a',
        fillOpacity: 1,
      });
      marker.bindPopup(
        `<strong>${point.label || 'Location'}</strong>${point.description ? `<br/>${point.description}` : ''}`
      );
      marker.addTo(layer);
    });

    if (connect && latlngs.length > 1) {
      L.polyline(latlngs, { color: '#14532d', weight: 2, dashArray: '6 6' }).addTo(layer);
    }

    if (latlngs.length) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.25), { maxZoom: 15 });
    }
  }, [validPoints, connect]);

  if (!validPoints.length) {
    return (
      <div
        className="empty-state"
        style={{ minHeight: height, justifyContent: 'center' }}
      >
        <span className="empty-state-icon" aria-hidden="true">
          <MapPin size={22} />
        </span>
        <p className="small muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="map-shell">
      <div
        ref={containerRef}
        style={{ height }}
        role="application"
        aria-label={`Map showing ${validPoints.length} location${validPoints.length === 1 ? '' : 's'}`}
      />
      <ul className="sr-only">
        {validPoints.map((point, index) => (
          <li key={index}>
            {point.label}: {point.latlng[0].toFixed(4)}, {point.latlng[1].toFixed(4)}
            {point.description ? ` — ${point.description}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MapView;
