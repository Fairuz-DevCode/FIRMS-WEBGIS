from sqlalchemy import text

RAINFALL_GRID_WITH_DATE_QUERY = text("""
    WITH target_time AS (
        SELECT COALESCE(
            (SELECT MAX(waktu) FROM rainfall_data WHERE waktu >= CAST(:target_date AS timestamp) AND waktu < CAST(:target_date AS timestamp) + interval '1 day'),
            (SELECT MAX(waktu) FROM rainfall_data)
        ) as matched_time
    ),
    latest AS (
        SELECT latitude, longitude, curah_hujan_mm
        FROM rainfall_data, target_time
        WHERE waktu = target_time.matched_time
          AND is_indonesia = TRUE
          AND curah_hujan_mm IS NOT NULL
        LIMIT :limit
    )
    SELECT 
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(curah_hujan_mm::numeric, 1))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(curah_hujan_mm)::numeric, 1) FROM latest) as avg_val,
        (SELECT round(min(curah_hujan_mm)::numeric, 1) FROM latest) as min_val,
        (SELECT round(max(curah_hujan_mm)::numeric, 1) FROM latest) as max_val
    FROM latest;
""")

RAINFALL_GRID_LATEST_QUERY = text("""
    WITH latest AS (
        SELECT latitude, longitude, curah_hujan_mm
        FROM rainfall_data
        WHERE waktu = (SELECT MAX(waktu) FROM rainfall_data)
          AND is_indonesia = TRUE
          AND curah_hujan_mm IS NOT NULL
        LIMIT :limit
    )
    SELECT 
        json_agg(json_build_array(ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2), ROUND(curah_hujan_mm::numeric, 1))) as grid,
        (SELECT count(*) FROM latest) as total_count,
        (SELECT round(avg(curah_hujan_mm)::numeric, 1) FROM latest) as avg_val,
        (SELECT round(min(curah_hujan_mm)::numeric, 1) FROM latest) as min_val,
        (SELECT round(max(curah_hujan_mm)::numeric, 1) FROM latest) as max_val
    FROM latest;
""")

RAINFALL_POINT_KNN_QUERY = text("""
    SELECT 
        ROUND(latitude::numeric, 4) as lat,
        ROUND(longitude::numeric, 4) as lon,
        ROUND(curah_hujan_mm::numeric, 1) as curah_hujan,
        waktu
    FROM rainfall_data
    WHERE waktu = (SELECT MAX(waktu) FROM rainfall_data)
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
    LIMIT 1;
""")
