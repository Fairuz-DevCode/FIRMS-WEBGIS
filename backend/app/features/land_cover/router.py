# BAGIAN 1: Import library dan modul pendukung
from typing import Optional
from fastapi import APIRouter, Query
from app.features.land_cover.service import LandCoverService

# BAGIAN 2: Inisialisasi router tutupan lahan (land cover)
router = APIRouter(prefix="/api/land-cover", tags=["Land Cover"])

# BAGIAN 3: Endpoint sampling tutupan lahan pada koordinat tertentu
@router.get("/sample")
async def sample_land_cover(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    file: Optional[str] = Query(None, description="Nama file raster GeoTIFF opsional")
):
    """
    Sampling kelas tutupan lahan pada titik koordinat dari raster GeoTIFF.
    """
    return LandCoverService.sample_land_cover(lat=lat, lon=lon, geotiff_path=file)

# BAGIAN 4: Endpoint daftar file raster GeoTIFF yang tersedia
@router.get("/rasters")
async def list_rasters():
    """
    Daftar file raster GeoTIFF tutupan lahan yang tersedia di server.
    """
    return {
        "status": "success",
        "total": len(LandCoverService.get_available_rasters()),
        "rasters": LandCoverService.get_available_rasters()
    }
