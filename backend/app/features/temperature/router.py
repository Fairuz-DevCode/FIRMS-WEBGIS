from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.temperature.service import TemperatureService
from app.features.temperature.sync import sync_temperature_data, sync_temperature_from_hotspots

router = APIRouter(prefix="/api/temperature", tags=["Temperature (Suhu Udara)"])

@router.get("")
@router.get("/")
async def get_temperature_data(
    limit: int = Query(20000, ge=1, le=25000, description="Max grid sample points to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ERA5 / Dynamic Air Temperature dataset grid points directly from PostGIS database.
    """
    return await TemperatureService.get_temperature_grid_from_db(db=db, limit=limit)

@router.get("/sample")
async def sample_temperature(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get nearest temperature record at specific lat, lon coordinates.
    """
    return await TemperatureService.get_temperature_at_point_from_db(db=db, lat=lat, lon=lon)

@router.post("/sync")
async def trigger_temp_sync(
    lat: Optional[float] = Query(None, description="Latitude coordinate (opsional, jika kosong sync dari titik hotspot)"),
    lon: Optional[float] = Query(None, description="Longitude coordinate (opsional)"),
    date: Optional[str] = Query(None, description="Tanggal akuisisi hotspot YYYY-MM-DD (opsional, default: tanggal terbaru)")
):
    """
    Sinkronisasi suhu udara ke Open-Meteo API.
    Jika lat & lon diberikan -> sinkronisasi untuk 1 titik.
    Jika lat & lon kosong -> otomatis sinkronisasi untuk seluruh titik hotspot dinamis.
    """
    if lat is not None and lon is not None:
        await sync_temperature_data(lat, lon)
        return {"status": "success", "message": f"Sinkronisasi suhu udara berhasil untuk titik ({lat}, {lon})"}

    res = await sync_temperature_from_hotspots(target_date=date)
    return res
