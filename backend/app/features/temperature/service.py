# BAGIAN 1: Import library dan modul pendukung
from typing import Dict, Any, Optional, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.cache import cache

# BAGIAN 2: Service utama data spasial suhu udara
class TemperatureService:
    @classmethod
    async def get_temperature_grid_from_db(cls, db: AsyncSession, limit: int = 20000, date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Ambil grid suhu udara dan ringkasan statistik dari PostGIS.
        """
        cache_key = f"temperature_grid_{limit}_{date_str or 'latest'}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            if date_str:
                query = text("""
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
                result = await db.execute(query.bindparams(limit=limit, target_date=date_str))
            else:
                query = text("""
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
                result = await db.execute(query.bindparams(limit=limit))
            row = result.first()
            if row and row.grid:
                res = {
                    "status": "success",
                    "total_records": row.total_count or 0,
                    "summary": {
                        "mean_celsius": float(row.avg_val or 25.0),
                        "min_celsius": float(row.min_val or 18.0),
                        "max_celsius": float(row.max_val or 34.0),
                        "unit": "°C"
                    },
                    "data": row.grid
                }
                cache.set(cache_key, res, 3600)
                return res
        except Exception as e:
            print(f"[TemperatureService Error] {e}")

        return {"status": "error", "data": []}

    # BAGIAN 3: Pengambilan nilai suhu terdekat pada titik tertentu via PostGIS KNN
    @classmethod
    async def get_temperature_at_point_from_db(cls, db: AsyncSession, lat: float, lon: float) -> Dict[str, Any]:
        """
        Ambil nilai suhu udara terdekat dengan PostGIS KNN operator (<->).
        """
        try:
            query = text("""
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
            result = await db.execute(query.bindparams(lat=lat, lon=lon))
            row = result.first()
            if row:
                val = float(row.suhu)
                category = "Panas Ekstrem" if val > 32 else ("Hangat" if val >= 26 else "Sejuk")
                return {
                    "status": "success",
                    "target_lat": lat,
                    "target_lon": lon,
                    "nearest_lat": float(row.lat),
                    "nearest_lon": float(row.lon),
                    "temperature_celsius": val,
                    "category": category,
                    "timestamp": str(row.waktu),
                    "unit": "°C"
                }
        except Exception as e:
            print(f"[Temperature Point Error] {e}")

        return {"status": "error", "target_lat": lat, "target_lon": lon}
