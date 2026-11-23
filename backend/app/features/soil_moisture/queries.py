from sqlalchemy import text

SOIL_MOISTURE_GRID_WITH_DATE_QUERY = text("""
    WITH target_time AS (
        SELECT COALESCE(
            (SELECT MAX(waktu) FROM soil_moisture_data WHERE waktu >= CAST(:target_date AS timestamp) AND waktu < CAST(:target_date AS timestamp) + interval '1 day'),
            (SELECT MAX(waktu) FROM soil_moisture_data)
        ) as matched_time
    ),
    latest AS (
        SELECT latitude, longitude, soil_moisture
        FROM soil_moisture_data, target_time
        WHERE waktu = target_time.matched_time
          AND is_indonesia = TRUE
          AND soil_moisture IS NOT NULL AND soil_moisture > 0.01
        LIMIT :limit
    )
    SELECT 
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(soil_moisture::numeric, 3))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(soil_moisture)::numeric, 3) FROM latest) as avg_val,
        (SELECT round(min(soil_moisture)::numeric, 3) FROM latest) as min_val,
        (SELECT round(max(soil_moisture)::numeric, 3) FROM latest) as max_val
    FROM latest;
""")

SOIL_MOISTURE_GRID_LATEST_QUERY = text("""
    WITH latest AS (
        SELECT latitude, longitude, soil_moisture
        FROM soil_moisture_data
        WHERE waktu = (SELECT MAX(waktu) FROM soil_moisture_data)
          AND is_indonesia = TRUE
          AND soil_moisture IS NOT NULL AND soil_moisture > 0.01
        LIMIT :limit
    )
    SELECT 
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(soil_moisture::numeric, 3))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(soil_moisture)::numeric, 3) FROM latest) as avg_val,
        (SELECT round(min(soil_moisture)::numeric, 3) FROM latest) as min_val,
        (SELECT round(max(soil_moisture)::numeric, 3) FROM latest) as max_val
    FROM latest;
""")

SOIL_MOISTURE_POINT_KNN_QUERY = text("""
    SELECT 
        ROUND(latitude::numeric, 4) as lat,
        ROUND(longitude::numeric, 4) as lon,
        ROUND(soil_moisture::numeric, 3) as moisture,
        waktu
    FROM soil_moisture_data
    WHERE waktu = (SELECT MAX(waktu) FROM soil_moisture_data)
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
    LIMIT 1;
""")
