# BAGIAN 1: Import library dan modul pendukung
from typing import Dict, Any, Optional, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.cache import cache

# BAGIAN 2: Service data spasial kelembaban tanah
class SoilMoistureService:
    @classmethod
    async def get_soil_moisture_grid_from_db(cls, db: AsyncSession, limit: int = 20000, date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Ambil grid kelembaban tanah dan statistik ringkasan dari PostGIS.
        """
        cache_key = f"soil_moisture_grid_{limit}_{date_str or 'latest'}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            if date_str:
                query = text("""
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
                result = await db.execute(query.bindparams(limit=limit, target_date=date_str))
            else:
                query = text("""
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
                result = await db.execute(query.bindparams(limit=limit))
            row = result.first()
            if row and row.grid:
                res = {
                    "status": "success",
                    "total_records": row.total_count or 0,
                    "summary": {
                        "mean_soil_moisture": float(row.avg_val or 0.28),
                        "min_soil_moisture": float(row.min_val or 0.05),
                        "max_soil_moisture": float(row.max_val or 0.55),
                        "unit": "m³/m³"
                    },
                    "data": row.grid
                }
                cache.set(cache_key, res, 3600)
                return res
        except Exception as e:
            print(f"[SoilMoistureService Error] {e}")

        return {"status": "error", "data": []}

    # BAGIAN 3: Pengambilan nilai terdekat pada titik tertentu via PostGIS KNN
    @classmethod
    async def get_soil_moisture_at_point_from_db(cls, db: AsyncSession, lat: float, lon: float) -> Dict[str, Any]:
        """
        Ambil nilai kelembaban tanah terdekat dengan PostGIS KNN operator (<->).
        """
        try:
            query = text("""
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
            result = await db.execute(query.bindparams(lat=lat, lon=lon))
            row = result.first()
            if row:
                val = float(row.moisture)
                category = "Sangat Kering (Kritis)" if val < 0.2 else ("Cukup Lembab" if val <= 0.35 else "Lembab / Jenuh Air")
                return {
                    "status": "success",
                    "target_lat": lat,
                    "target_lon": lon,
                    "nearest_lat": float(row.lat),
                    "nearest_lon": float(row.lon),
                    "soil_moisture": val,
                    "category": category,
                    "timestamp": str(row.waktu),
                    "unit": "m³/m³"
                }
        except Exception as e:
            print(f"[SoilMoisture Point Error] {e}")

        return {"status": "error", "target_lat": lat, "target_lon": lon}
