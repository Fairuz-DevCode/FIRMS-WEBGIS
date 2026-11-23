from sqlalchemy import text

ENVIRONMENTAL_CONTEXT_QUERY = text("""
    WITH target_time AS (
        SELECT 
            COALESCE(
                (SELECT MAX(waktu) FROM temperature WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                (SELECT MAX(waktu) FROM temperature)
            ) as temp_time,
            COALESCE(
                (SELECT MAX(waktu) FROM soil_moisture_data WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                (SELECT MAX(waktu) FROM soil_moisture_data)
            ) as sm_time,
            COALESCE(
                (SELECT MAX(waktu) FROM rainfall_data WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                (SELECT MAX(waktu) FROM rainfall_data)
            ) as rain_time
    )
    SELECT 
        EXISTS(
            SELECT 1 FROM peatlands 
            WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
            LIMIT 1
        ) as is_peatland,
        (
            SELECT suhu_celsius 
            FROM temperature, target_time 
            WHERE suhu_celsius IS NOT NULL AND suhu_celsius > 5
              AND waktu = target_time.temp_time
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
            LIMIT 1
        ) as temperature,
        (
            SELECT soil_moisture 
            FROM soil_moisture_data, target_time 
            WHERE soil_moisture IS NOT NULL AND soil_moisture > 0.001
              AND waktu = target_time.sm_time
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
            LIMIT 1
        ) as soil_moisture,
        (
            SELECT curah_hujan_mm 
            FROM rainfall_data, target_time 
            WHERE curah_hujan_mm IS NOT NULL
              AND waktu = target_time.rain_time
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
            LIMIT 1
        ) as rainfall,
        (
            SELECT COUNT(id) FROM hotspots
            WHERE (:target_date IS NULL OR acq_date = :target_date)
              AND geom && ST_Expand(ST_SetSRID(ST_Point(:lng, :lat), 4326), 0.15)
              AND ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) > 0.0001
        ) as nearby_cluster_count,
        (
            SELECT COALESCE(ROUND((MIN(ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) * 111.32)::numeric), 2), 0)
            FROM hotspots
            WHERE (:target_date IS NULL OR acq_date = :target_date)
              AND geom && ST_Expand(ST_SetSRID(ST_Point(:lng, :lat), 4326), 0.15)
              AND ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) > 0.0001
        ) as nearest_neighbor_km;
""")
