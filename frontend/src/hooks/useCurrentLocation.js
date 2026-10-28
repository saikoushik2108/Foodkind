import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Default fallback coordinates (Bengaluru tech & food rescue corridor)
const DEFAULT_BENGALURU = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru Center' };

/**
 * Accesses volunteer / agent current device GPS location with graceful fallback
 * to organization registered location or city center.
 */
export function useCurrentLocation() {
  const auth = useContext(AuthContext);
  const organization = auth?.organization;

  const orgCoords = organization?.location?.coordinates;
  const initialOrg =
    Array.isArray(orgCoords) && orgCoords.length === 2
      ? { lat: orgCoords[1], lng: orgCoords[0], label: `${organization.name} (Base)` }
      : DEFAULT_BENGALURU;

  const [coords, setCoords] = useState(initialOrg);
  const [source, setSource] = useState(
    Array.isArray(orgCoords) && orgCoords.length === 2 ? 'organization' : 'default'
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser. Using base headquarters.');
      return;
    }

    setIsDetecting(true);
    setStatusMessage('Acquiring your current GPS location…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setCoords({ lat, lng, label: 'Your Current GPS Location' });
        setSource('gps');
        setIsDetecting(false);
        setStatusMessage(`Located: ${lat}, ${lng} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setIsDetecting(false);
        let msg = 'Could not access GPS. Using organization base location.';
        if (err.code === 1) msg = 'Location permission was denied. Using organization base.';
        else if (err.code === 3) msg = 'Location request timed out. Using organization base.';
        setStatusMessage(msg);
        // Fall back to org coords
        if (Array.isArray(orgCoords) && orgCoords.length === 2) {
          setCoords({ lat: orgCoords[1], lng: orgCoords[0], label: `${organization.name} (Base)` });
          setSource('organization');
        } else {
          setCoords(DEFAULT_BENGALURU);
          setSource('default');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [orgCoords, organization]);

  // Attempt automatic detection on mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  return {
    coords,
    source,
    isDetecting,
    statusMessage,
    detectLocation,
    lat: coords?.lat,
    lng: coords?.lng,
    label: coords?.label,
  };
}
