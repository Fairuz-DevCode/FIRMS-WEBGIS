import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Shared utility component to ensure Leaflet handles container resizing properly.
 * Place inside any <MapContainer> that needs resize awareness.
 */
export default function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}
