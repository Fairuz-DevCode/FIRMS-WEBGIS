# BAGIAN 1: Import library dan modul pendukung
from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_db
from app.features.temperature.service import TemperatureService

# BAGIAN 2: Inisialisasi router suhu udara
router = APIRouter(prefix="/api/temperature", tags=["Temperature (Suhu Udara)"])

# BAGIAN 3: Endpoint grid suhu udara
@router.get("")
@router.get("/")
async def get_temperature_data(
    limit: int = Query(20000, ge=1, le=25000, description="Batas jumlah grid"),
    date: Optional[str] = Query(None, description="Tanggal YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ambil grid suhu udara dan ringkasan statistik dari PostGIS.
    """
    return await TemperatureService.get_temperature_grid_from_db(db=db, limit=limit, date_str=date)

# BAGIAN 4: Endpoint query suhu pada titik tertentu
@router.get("/sample")
async def sample_temperature(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ambil suhu udara terdekat pada koordinat spesifik via PostGIS KNN.
    """
    return await TemperatureService.get_temperature_at_point_from_db(db=db, lat=lat, lon=lon)
