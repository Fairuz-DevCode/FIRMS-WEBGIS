import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.cache import cache
from app.features.temperature.queries import (
    TEMPERATURE_GRID_WITH_DATE_QUERY,
    TEMPERATURE_GRID_LATEST_QUERY,
    TEMPERATURE_POINT_KNN_QUERY,
)

logger = logging.getLogger(__name__)


def _categorize_temperature(val: float) -> str:
    """Klasifikasikan tingkat suhu udara (°C)."""
    if val > 32:
        return "Panas Ekstrem"
    return "Hangat" if val >= 26 else "Sejuk"


def _format_grid_response(row) -> Optional[Dict[str, Any]]:
    """Format hasil eksekusi database menjadi response payload grid suhu."""
    if not row or not row.grid:
        return None
    return {
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


def _format_point_response(row, lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Format hasil KNN terdekat suhu pada titik koordinat."""
    if not row:
        return None
    val = float(row.suhu)
    return {
        "status": "success",
        "target_lat": lat,
        "target_lon": lon,
        "nearest_lat": float(row.lat),
        "nearest_lon": float(row.lon),
        "temperature_celsius": val,
        "category": _categorize_temperature(val),
        "timestamp": str(row.waktu),
        "unit": "°C"
    }


class TemperatureService:
    @classmethod
    async def get_temperature_grid_from_db(
        cls,
        db: AsyncSession,
        limit: int = 20000,
        date_str: Optional[str] = None
    ) -> Dict[str, Any]:
        """Ambil grid suhu udara dan ringkasan statistik dari PostGIS."""
        cache_key = f"temperature_grid_{limit}_{date_str or 'latest'}"
        if cached := cache.get(cache_key):
            return cached

        try:
            if date_str:
                result = await db.execute(
                    TEMPERATURE_GRID_WITH_DATE_QUERY.bindparams(limit=limit, target_date=date_str)
                )
            else:
                result = await db.execute(
                    TEMPERATURE_GRID_LATEST_QUERY.bindparams(limit=limit)
                )

            if formatted := _format_grid_response(result.first()):
                cache.set(cache_key, formatted, 3600)
                return formatted

        except Exception as e:
            logger.error(f"Gagal mengambil grid suhu: {e}", exc_info=True)

        return {"status": "error", "data": []}

    @classmethod
    async def get_temperature_at_point_from_db(
        cls,
        db: AsyncSession,
        lat: float,
        lon: float
    ) -> Dict[str, Any]:
        """Ambil nilai suhu udara terdekat dengan PostGIS KNN operator (<->)."""
        try:
            result = await db.execute(
                TEMPERATURE_POINT_KNN_QUERY.bindparams(lat=lat, lon=lon)
            )
            if point_data := _format_point_response(result.first(), lat=lat, lon=lon):
                return point_data
        except Exception as e:
            logger.error(f"Gagal mengambil titik suhu KNN: {e}", exc_info=True)

        return {"status": "error", "target_lat": lat, "target_lon": lon}
