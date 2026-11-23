import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.cache import cache
from app.features.rainfall.queries import (
    RAINFALL_GRID_WITH_DATE_QUERY,
    RAINFALL_GRID_LATEST_QUERY,
    RAINFALL_POINT_KNN_QUERY,
)

logger = logging.getLogger(__name__)


def _categorize_rainfall(val: float) -> str:
    """Klasifikasikan tingkat curah hujan (mm)."""
    if val < 5:
        return "Kering / Sangat Ringan"
    return "Hujan Sedang" if val <= 20 else "Hujan Lebat"


def _format_grid_response(row) -> Optional[Dict[str, Any]]:
    """Format hasil eksekusi database menjadi response payload terstandar."""
    if not row or not row.grid:
        return None
    return {
        "status": "success",
        "total_records": row.total_count or 0,
        "summary": {
            "mean_rainfall_mm": float(row.avg_val or 3.2),
            "min_rainfall_mm": float(row.min_val or 0.0),
            "max_rainfall_mm": float(row.max_val or 25.0),
            "unit": "mm"
        },
        "data": row.grid
    }


def _format_point_response(row, lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Format hasil KNN terdekat pada titik koordinat."""
    if not row:
        return None
    val = float(row.curah_hujan)
    return {
        "status": "success",
        "target_lat": lat,
        "target_lon": lon,
        "nearest_lat": float(row.lat),
        "nearest_lon": float(row.lon),
        "rainfall_mm": val,
        "category": _categorize_rainfall(val),
        "timestamp": str(row.waktu),
        "unit": "mm"
    }


class RainfallService:
    @classmethod
    async def get_rainfall_grid_from_db(
        cls,
        db: AsyncSession,
        limit: int = 20000,
        date_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """Ambil grid curah hujan dan ringkasan statistik dari PostGIS."""
        cache_key = f"rainfall_grid_{limit}_{date_str or 'latest'}"
        if cached := cache.get(cache_key):
            return cached

        try:
            if date_str:
                result = await db.execute(
                    RAINFALL_GRID_WITH_DATE_QUERY.bindparams(limit=limit, target_date=date_str)
                )
            else:
                result = await db.execute(
                    RAINFALL_GRID_LATEST_QUERY.bindparams(limit=limit)
                )

            if formatted := _format_grid_response(result.first()):
                cache.set(cache_key, formatted, 3600)
                return formatted

        except Exception as e:
            logger.error(f"Gagal mengambil grid curah hujan: {e}", exc_info=True)

        return {"status": "error", "data": []}

    @classmethod
    async def get_rainfall_at_point_from_db(
        cls,
        db: AsyncSession,
        lat: float,
        lon: float
    ) -> Dict[str, Any]:
        """Ambil nilai curah hujan terdekat dengan PostGIS KNN operator (<->)."""
        try:
            result = await db.execute(
                RAINFALL_POINT_KNN_QUERY.bindparams(lat=lat, lon=lon)
            )
            if point_data := _format_point_response(result.first(), lat=lat, lon=lon):
                return point_data
        except Exception as e:
            logger.error(f"Gagal mengambil titik curah hujan KNN: {e}", exc_info=True)

        return {"status": "error", "target_lat": lat, "target_lon": lon}
