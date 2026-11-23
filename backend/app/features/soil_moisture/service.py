import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.cache import cache
from app.features.soil_moisture.queries import (
    SOIL_MOISTURE_GRID_WITH_DATE_QUERY,
    SOIL_MOISTURE_GRID_LATEST_QUERY,
    SOIL_MOISTURE_POINT_KNN_QUERY,
)

logger = logging.getLogger(__name__)


def _categorize_soil_moisture(val: float) -> str:
    """Klasifikasikan tingkat kelembaban tanah (m³/m³)."""
    if val < 0.2:
        return "Sangat Kering (Kritis)"
    return "Cukup Lembab" if val <= 0.35 else "Lembab / Jenuh Air"


def _format_grid_response(row) -> Optional[Dict[str, Any]]:
    """Format hasil baris database menjadi payload grid kelembaban tanah."""
    if not row or not row.grid:
        return None
    return {
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


def _format_point_response(row, lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Format hasil KNN terdekat kelembaban tanah."""
    if not row:
        return None
    val = float(row.moisture)
    return {
        "status": "success",
        "target_lat": lat,
        "target_lon": lon,
        "nearest_lat": float(row.lat),
        "nearest_lon": float(row.lon),
        "soil_moisture": val,
        "category": _categorize_soil_moisture(val),
        "timestamp": str(row.waktu),
        "unit": "m³/m³"
    }


class SoilMoistureService:
    @classmethod
    async def get_soil_moisture_grid_from_db(
        cls,
        db: AsyncSession,
        limit: int = 20000,
        date_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """Ambil grid kelembaban tanah dan statistik ringkasan dari PostGIS."""
        cache_key = f"soil_moisture_grid_{limit}_{date_str or 'latest'}"
        if cached := cache.get(cache_key):
            return cached

        try:
            if date_str:
                result = await db.execute(
                    SOIL_MOISTURE_GRID_WITH_DATE_QUERY.bindparams(limit=limit, target_date=date_str)
                )
            else:
                result = await db.execute(
                    SOIL_MOISTURE_GRID_LATEST_QUERY.bindparams(limit=limit)
                )

            if formatted := _format_grid_response(result.first()):
                cache.set(cache_key, formatted, 3600)
                return formatted

        except Exception as e:
            logger.error(f"Gagal mengambil grid kelembaban tanah: {e}", exc_info=True)

        return {"status": "error", "data": []}

    @classmethod
    async def get_soil_moisture_at_point_from_db(
        cls,
        db: AsyncSession,
        lat: float,
        lon: float
    ) -> Dict[str, Any]:
        """Ambil nilai kelembaban tanah terdekat dengan PostGIS KNN operator (<->)."""
        try:
            result = await db.execute(
                SOIL_MOISTURE_POINT_KNN_QUERY.bindparams(lat=lat, lon=lon)
            )
            if point_data := _format_point_response(result.first(), lat=lat, lon=lon):
                return point_data
        except Exception as e:
            logger.error(f"Gagal mengambil titik kelembaban tanah KNN: {e}", exc_info=True)

        return {"status": "error", "target_lat": lat, "target_lon": lon}
