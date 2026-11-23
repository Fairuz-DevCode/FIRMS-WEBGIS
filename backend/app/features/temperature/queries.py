from sqlalchemy import text

TEMPERATURE_GRID_WITH_DATE_QUERY = text("""
    WITH target_time AS (
        SELECT COALESCE(
            (SELECT MAX(waktu) FROM temperature WHERE waktu >= CAST(:target_date AS timestamp) AND waktu < CAST(:target_date AS timestamp) + interval '1 day'),
            (SELECT MAX(waktu) FROM temperature)
        ) as matched_time
    ),
    latest AS (
        SELECT latitude, longitude, suhu_celsius
        FROM temperature, target_time
        WHERE waktu = target_time.matched_time
          AND is_indonesia = TRUE
          AND suhu_celsius IS NOT NULL AND suhu_celsius > 5
        LIMIT :limit
    )
    SELECT
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(suhu_celsius::numeric, 1))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(suhu_celsius)::numeric, 1) FROM latest) as avg_val,
        (SELECT round(min(suhu_celsius)::numeric, 1) FROM latest) as min_val,
        (SELECT round(max(suhu_celsius)::numeric, 1) FROM latest) as max_val
    FROM latest;
""")

TEMPERATURE_GRID_LATEST_QUERY = text("""
    WITH latest AS (
        SELECT latitude, longitude, suhu_celsius
        FROM temperature
        WHERE waktu = (SELECT MAX(waktu) FROM temperature)
          AND is_indonesia = TRUE
          AND suhu_celsius IS NOT NULL AND suhu_celsius > 5
        LIMIT :limit
    )
    SELECT
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(suhu_celsius::numeric, 1))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(suhu_celsius)::numeric, 1) FROM latest) as avg_val,
        (SELECT round(min(suhu_celsius)::numeric, 1) FROM latest) as min_val,
        (SELECT round(max(suhu_celsius)::numeric, 1) FROM latest) as max_val
    FROM latest;
""")

TEMPERATURE_POINT_KNN_QUERY = text("""
    SELECT 
        ROUND(latitude::numeric, 4) as lat,
        ROUND(longitude::numeric, 4) as lon,
        ROUND(suhu_celsius::numeric, 1) as suhu,
        waktu
    FROM temperature
    WHERE waktu = (SELECT MAX(waktu) FROM temperature)
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
    LIMIT 1;
""")
