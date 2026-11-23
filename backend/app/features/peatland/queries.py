from sqlalchemy import text

PEATLAND_GEOJSON_QUERY = text("""
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.002))::jsonb,
                    'properties', jsonb_build_object(
                        'ogc_fid', ogc_fid,
                        'objectid', objectid,
                        'layer_revi', layer_revi,
                        'shape_area', shape_area
                    )
                )
            ),
            '[]'::jsonb
        )
    ) AS geojson
    FROM peatlands;
""")

PEATLAND_HOTSPOTS_SPATIAL_JOIN_QUERY = text("""
    WITH recent_hotspots AS (
        SELECT h.id, h.latitude, h.longitude, h.brightness, h.frp, h.acq_date::text, h.geom
        FROM hotspots h
        WHERE h.acq_date >= (SELECT COALESCE(MAX(acq_date), CURRENT_DATE) FROM hotspots) - (INTERVAL '1 day' * :days)
    ),
    joined AS (
        SELECT DISTINCT h.id, h.latitude, h.longitude, h.brightness, h.frp, h.acq_date
        FROM recent_hotspots h
        JOIN peatlands p ON ST_Intersects(h.geom, p.geom)
    )
    SELECT
        (SELECT COUNT(*) FROM recent_hotspots) AS total_hotspots,
        (SELECT COUNT(*) FROM joined) AS hotspots_in_peatland,
        COALESCE(
            (SELECT json_agg(j) FROM joined j WHERE j.frp > 50),
            '[]'::json
        ) AS high_risk;
""")
