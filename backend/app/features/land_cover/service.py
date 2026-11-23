import os
import glob
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

LAND_COVER_CLASSES = {
    1: "Tree Cover / Forest",
    2: "Shrubland",
    3: "Grassland",
    4: "Cropland / Agriculture",
    5: "Built-up / Urban",
    6: "Bare / Sparse Vegetation",
    7: "Snow and Ice",
    8: "Permanent Water Bodies",
    9: "Herbaceous Wetland / Peatland",
    10: "Mangroves",
    11: "Moss and Lichen"
}

DEFAULT_SEARCH_PATHS = [
    "/app/data/raw data/*.tif",
    "/app/data/*.tif",
    os.path.join(os.getcwd(), "data/raw data/*.tif"),
    os.path.join(os.getcwd(), "data/*.tif"),
]


def _read_pixel_from_geotiff(geotiff_path: str, lat: float, lon: float) -> Optional[int]:
    """Baca nilai 1 pixel dari raster GeoTIFF menggunakan Rasterio."""
    if not (HAS_RASTERIO and geotiff_path and os.path.exists(geotiff_path)):
        return None
    try:
        with rasterio.open(geotiff_path) as src:
            row, col = src.index(lon, lat)
            window = rasterio.windows.Window(col, row, 1, 1)
            val = src.read(1, window=window)[0, 0]
            return int(val)
    except Exception as e:
        logger.error(f"Gagal membaca pixel dari GeoTIFF ({geotiff_path}): {e}")
        return None


def _format_land_cover_result(
    lat: float,
    lon: float,
    pixel_val: Optional[int],
    geotiff_path: Optional[str]
) -> Dict[str, Any]:
    """Format payload response klasifikasi tutupan lahan."""
    if pixel_val is not None and geotiff_path:
        return {
            "lat": lat,
            "lon": lon,
            "pixel_val": pixel_val,
            "land_cover": LAND_COVER_CLASSES.get(pixel_val, f"Class {pixel_val}"),
            "raster_file": os.path.basename(geotiff_path),
            "source": "rasterio"
        }
    return {
        "lat": lat,
        "lon": lon,
        "pixel_val": None,
        "land_cover": "Data raster GeoTIFF tidak tersedia untuk titik ini",
        "raster_file": None,
        "source": "none"
    }


class LandCoverService:
    @staticmethod
    def get_available_rasters() -> List[Dict[str, Any]]:
        """Daftar file raster GeoTIFF tutupan lahan pada direktori data."""
        files = []
        for path_pattern in DEFAULT_SEARCH_PATHS:
            for filepath in glob.glob(path_pattern):
                filename = os.path.basename(filepath)
                if not any(f["filename"] == filename for f in files):
                    files.append({
                        "filename": filename,
                        "path": filepath,
                        "size_mb": round(os.path.getsize(filepath) / (1024 * 1024), 2)
                    })
        return files

    @staticmethod
    def sample_land_cover(
        lat: float,
        lon: float,
        geotiff_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sampling nilai tutupan lahan pada koordinat (lat, lon) menggunakan Rasterio."""
        selected_path = geotiff_path
        if not selected_path:
            rasters = LandCoverService.get_available_rasters()
            if rasters:
                selected_path = rasters[0]["path"]

        pixel_val = _read_pixel_from_geotiff(selected_path, lat, lon) if selected_path else None
        return _format_land_cover_result(lat, lon, pixel_val, selected_path)
