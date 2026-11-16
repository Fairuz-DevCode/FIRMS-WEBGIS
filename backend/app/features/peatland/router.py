# BAGIAN 1: Import library dan modul pendukung
import os
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_db
from app.features.hotspot.service import get_hotspots_from_db
from app.features.peatland.service import (
    get_peatland_geojson_from_db,
    analyze_peatland_hotspots_db,
    analyze_peatland_hotspots_gpd
)

# BAGIAN 2: Inisialisasi router lahan gambut
router = APIRouter(prefix="/api/peatland", tags=["Peatland"])

# BAGIAN 3: Endpoint GeoJSON batas lahan gambut
@router.get("")
@router.get("/")
async def get_peatland_geojson(db: AsyncSession = Depends(get_db)):
    """
    Ambil dataset GeoJSON batas lahan gambut Indonesia dari PostGIS.
    """
    return await get_peatland_geojson_from_db(db)

# BAGIAN 4: Endpoint analisis perpotongan spasial hotspot pada lahan gambut
@router.post("/hotspot-intersection")
async def analyze_peatland_intersection(
    days: int = Query(30, description="Rentang hari akuisisi"),
    db: AsyncSession = Depends(get_db)
):
    """
    Analisis Point-in-Polygon hotspot di dalam kubah gambut via PostGIS atau GeoPandas fallback.
    """
    db_analysis = await analyze_peatland_hotspots_db(db, days)
    if db_analysis:
        return {
            "status": "success",
            "analysis": db_analysis
        }

    res = await get_hotspots_from_db(db=db, days=days, limit=10000)
    features = res.get("data", {}).get("features", [])

    peatland_path = "/app/data/Indonesia_Peat_Lands.geojson"
    if not os.path.exists(peatland_path):
        peatland_path = os.path.join(os.getcwd(), "data/Indonesia_Peat_Lands.geojson")

    analysis = analyze_peatland_hotspots_gpd(features, peatland_path)
    return {
        "status": "success",
        "analysis": analysis
    }
