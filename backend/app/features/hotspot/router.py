# BAGIAN 1: Import library dan modul pendukung
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.config.database import get_db
from app.features.hotspot.service import (
    get_hotspots_from_db,
    get_hotspot_stats_from_db,
    get_environmental_context_at_point
)

# Inisialisasi router fitur titik api
router = APIRouter(prefix="/api", tags=["Hotspots"])

class HotspotStatsResponse(BaseModel):
    status: str = "success"
    summary: Dict[str, Any] = {}
    confidenceBreakdown: Optional[List[Dict[str, Any]]] = []
    confidence_breakdown: Optional[List[Dict[str, Any]]] = []
    satellite_breakdown: Optional[List[Dict[str, Any]]] = []
    timeline: Optional[List[Dict[str, Any]]] = []
    recent_timeline: Optional[List[Dict[str, Any]]] = []

    model_config = {"extra": "allow"}

# BAGIAN 2: Endpoint daftar dan filter spasial titik api (Flat Matrix)
@router.get("/hotspots")
async def read_hotspots(
    sensor: Optional[str] = Query("ALL", description="Sensor satelit (ALL, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT)"),
    days: Optional[int] = Query(None, description="Rentang hari data (1-180)"),
    date: Optional[str] = Query(None, description="Filter tanggal spesifik akuisisi (YYYY-MM-DD)"),
    startDate: Optional[str] = Query(None, description="Tanggal awal rentang (YYYY-MM-DD)"),
    endDate: Optional[str] = Query(None, description="Tanggal akhir rentang (YYYY-MM-DD)"),
    confidence: Optional[str] = Query(None, description="Filter tingkat keyakinan (h, n, l)"),
    minBrightness: Optional[float] = Query(None, description="Suhu kecerahan minimum (Kelvin)"),
    minFrp: Optional[float] = Query(None, description="Minimum Fire Radiative Power (MW)"),
    limit: int = Query(50000, ge=1, le=100000, description="Maksimum jumlah titik api yang diambil"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mengambil data titik api NASA FIRMS dalam format flat array matrix.
    """
    return await get_hotspots_from_db(
        db=db,
        sensor=sensor or "ALL",
        days=days,
        date=date,
        startDate=startDate,
        endDate=endDate,
        confidence=confidence,
        minBrightness=minBrightness,
        minFrp=minFrp,
        limit=limit
    )

# BAGIAN 3: Endpoint statistik agregat titik api
@router.get("/hotspots/stats", response_model=HotspotStatsResponse)
async def read_hotspot_stats(db: AsyncSession = Depends(get_db)):
    """
    Mengambil ringkasan statistik dan tren titik api.
    """
    try:
        return await get_hotspot_stats_from_db(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghitung statistik titik api: {str(e)}")

# BAGIAN 4: Endpoint konteks lingkungan per titik (Spatial KNN)
@router.get("/hotspots/context")
async def get_hotspot_environmental_context(
    lat: float = Query(..., description="Latitude titik api"),
    lng: float = Query(..., description="Longitude titik api"),
    date: Optional[str] = Query(None, description="Tanggal akuisisi (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mengambil faktor lingkungan (gambut, suhu, kelembapan, hujan) dan klaster sekitar titik api.
    """
    return await get_environmental_context_at_point(db=db, lat=lat, lng=lng, date_str=date)
