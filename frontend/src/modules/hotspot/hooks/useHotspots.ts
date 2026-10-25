import { useState, useEffect } from 'react';
import { fetchHotspots } from '../api/hotspot';
import { SensorType, HotspotMatrixRow, HotspotMeta } from '../../../types/hotspot';

interface UseHotspotsResult {
  hotspots: HotspotMatrixRow[];
  columns: string[];
  loading: boolean;
  error: string | null;
  meta: HotspotMeta;
}

export function useHotspots(
  sensor: SensorType,
  days?: number,
  date?: string,
  startDate?: string,
  endDate?: string
): UseHotspotsResult {
  const [hotspots, setHotspots] = useState<HotspotMatrixRow[]>([]);
  const [columns, setColumns] = useState<string[]>([
    'lat', 'lng', 'brightness', 'frp', 'confidence', 'acq_date', 'acq_time'
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<HotspotMeta>({ count: 0, source: 'loading...' });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchHotspots({ sensor, days, date, startDate, endDate })
      .then(({ data, columns: cols, count, source }) => {
        if (!isMounted) return;
        setHotspots(data);
        setColumns(cols);
        setMeta({ count, source });
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error('[useHotspots] Error fetching hotspots from backend API:', err);
        if (isMounted) {
          setError(err.message || 'Gagal memuat data dari backend PostGIS');
          setHotspots([]);
          setMeta({ count: 0, source: 'error' });
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [sensor, days, date, startDate, endDate]);

  return { hotspots, columns, loading, error, meta };
}
