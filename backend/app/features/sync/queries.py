from sqlalchemy import text

UPDATE_HOTSPOTS_PEATLAND_STATUS_QUERY = text("""
    UPDATE hotspots h
    SET is_peatland = TRUE
    FROM peatlands p
    WHERE (h.is_peatland IS NULL OR h.is_peatland = FALSE)
      AND h.geom && p.geom 
      AND ST_Intersects(h.geom, p.geom);
""")

INDONESIA_LAND_GRID_QUERY = text("""
    SELECT DISTINCT
        ROUND(latitude::numeric * 2) / 2 as lat,
        ROUND(longitude::numeric * 2) / 2 as lon
    FROM temperature
    WHERE waktu = '2026-10-31' AND is_indonesia = true
    ORDER BY lat DESC, lon ASC;
""")

DISTINCT_HOTSPOT_COORDINATES_QUERY = text("""
    SELECT 
        ROUND(latitude::numeric, :prec) as lat,
        ROUND(longitude::numeric, :prec) as lon
    FROM hotspots
    WHERE (:target_date IS NULL AND acq_date = (SELECT MAX(acq_date) FROM hotspots))
       OR (:target_date IS NOT NULL AND acq_date = CAST(:target_date AS DATE))
    GROUP BY ROUND(latitude::numeric, :prec), ROUND(longitude::numeric, :prec);
""")

DELETE_CLIMATE_DATE_RANGE_QUERY = text("""
    DELETE FROM {table}
    WHERE waktu >= CAST(:start_time AS timestamp)
      AND waktu <= CAST(:end_time AS timestamp)
      AND is_indonesia = TRUE;
""")
