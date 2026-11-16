# BAGIAN 1: Import library dan modul pendukung
from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_db
from app.features.soil_moisture.service import SoilMoistureService

# BAGIAN 2: Inisialisasi router kelembaban tanah
router = APIRouter(prefix="/api/soil-moisture", tags=["Soil Moisture (Kelembaban Tanah)"])

# BAGIAN 3: Endpoint data grid kelembaban tanah
@router.get("")
@router.get("/")
async def get_soil_moisture_data(
    limit: int = Query(20000, ge=1, le=25000, description="Batas jumlah grid"),
    date: Optional[str] = Query(None, description="Tanggal YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ambil grid kelembaban tanah dan ringkasan statistik dari PostGIS.
    """
    return await SoilMoistureService.get_soil_moisture_grid_from_db(db=db, limit=limit, date_str=date)

# BAGIAN 4: Endpoint query nilai terdekat pada titik koordinat
@router.get("/sample")
async def sample_soil_moisture(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ambil kelembaban tanah terdekat pada koordinat spesifik via PostGIS KNN.
    """
    return await SoilMoistureService.get_soil_moisture_at_point_from_db(db=db, lat=lat, lon=lon)
