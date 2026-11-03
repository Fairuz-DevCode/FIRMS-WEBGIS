from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.rainfall.service import RainfallService
from app.features.rainfall.sync import sync_rainfall_data, sync_rainfall_from_hotspots

router = APIRouter(prefix="/api/rainfall", tags=["Rainfall (Curah Hujan)"])

@router.get("")
@router.get("/")
async def get_rainfall_data(
    limit: int = Query(20000, ge=1, le=25000, description="Max grid sample points to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ERA5 / Dynamic Rainfall dataset grid points directly from PostGIS database.
    """
    return await RainfallService.get_rainfall_grid_from_db(db=db, limit=limit)

@router.get("/sample")
async def sample_rainfall(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get nearest rainfall record at specific lat, lon coordinates.
    """
    return await RainfallService.get_rainfall_at_point_from_db(db=db, lat=lat, lon=lon)

@router.post("/sync")
async def trigger_rainfall_sync(
    lat: Optional[float] = Query(None, description="Latitude coordinate (opsional, jika kosong sync dari titik hotspot)"),
    lon: Optional[float] = Query(None, description="Longitude coordinate (opsional)"),
    date: Optional[str] = Query(None, description="Tanggal akuisisi hotspot YYYY-MM-DD (opsional, default: tanggal terbaru)")
):
    """
    Sinkronisasi curah hujan ke Open-Meteo API.
    Jika lat & lon diberikan -> sinkronisasi untuk 1 titik.
    Jika lat & lon kosong -> otomatis sinkronisasi untuk seluruh titik hotspot dinamis.
    """
    if lat is not None and lon is not None:
        await sync_rainfall_data(lat, lon)
        return {"status": "success", "message": f"Sinkronisasi curah hujan berhasil untuk titik ({lat}, {lon})"}
    
    res = await sync_rainfall_from_hotspots(target_date=date)
    return res
