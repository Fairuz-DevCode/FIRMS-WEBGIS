# BAGIAN 1: Import library dan modul pendukung
from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_db
from app.features.rainfall.service import RainfallService

router = APIRouter(prefix="/api/rainfall", tags=["Rainfall (Curah Hujan)"])

# BAGIAN 2: Endpoint query grid curah hujan nasional
@router.get("")
@router.get("/")
async def get_rainfall_data(
    limit: int = Query(20000, ge=1, le=25000, description="Maksimum titik grid yang dikembalikan"),
    date: Optional[str] = Query(None, description="Tanggal YYYY-MM-DD (opsional, default: tanggal terbaru)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mengambil data grid curah hujan PostGIS untuk layer raster kanvas peta.
    """
    return await RainfallService.get_rainfall_grid_from_db(db=db, limit=limit, date_str=date)

# BAGIAN 3: Endpoint sampling nilai curah hujan di koordinat tertentu (KNN)
@router.get("/sample")
async def sample_rainfall(
    lat: float = Query(..., description="Koordinat latitude"),
    lon: float = Query(..., description="Koordinat longitude"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mengambil data curah hujan terdekat dari koordinat lat, lon via PostGIS KNN.
    """
    return await RainfallService.get_rainfall_at_point_from_db(db=db, lat=lat, lon=lon)
