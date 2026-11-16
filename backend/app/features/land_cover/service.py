# BAGIAN 1: Import library dan modul pendukung
import os
import glob
from typing import Dict, Any, Optional, List
import numpy as np

try:
    import rasterio
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

# BAGIAN 2: Kamus klasifikasi tutupan lahan (land cover classes)
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

# BAGIAN 3: Service pengelolaan dan sampling raster GeoTIFF
class LandCoverService:
    @staticmethod
    def get_available_rasters() -> List[Dict[str, Any]]:
        """
        Daftar file raster GeoTIFF tutupan lahan pada direktori data.
        """
        search_paths = [
            "/app/data/raw data/*.tif",
            "/app/data/*.tif",
            os.path.join(os.getcwd(), "data/raw data/*.tif"),
            os.path.join(os.getcwd(), "data/*.tif"),
        ]
        files = []
        for path_pattern in search_paths:
            for filepath in glob.glob(path_pattern):
                filename = os.path.basename(filepath)
                if not any(f["filename"] == filename for f in files):
                    files.append({
                        "filename": filename,
                        "path": filepath,
                        "size_mb": round(os.path.getsize(filepath) / (1024 * 1024), 2)
                    })
        return files

    # BAGIAN 4: Sampling nilai piksel GeoTIFF pada koordinat geografis
    @staticmethod
    def sample_land_cover(lat: float, lon: float, geotiff_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Sampling nilai tutupan lahan pada koordinat (lat, lon) menggunakan Rasterio.
        """
        if not geotiff_path:
            rasters = LandCoverService.get_available_rasters()
            if rasters:
                geotiff_path = rasters[0]["path"]

        if HAS_RASTERIO and geotiff_path and os.path.exists(geotiff_path):
            try:
                with rasterio.open(geotiff_path) as src:
                    row, col = src.index(lon, lat)
                    window = rasterio.windows.Window(col, row, 1, 1)
                    val = src.read(1, window=window)[0, 0]
                    val_int = int(val)
                    return {
                        "lat": lat,
                        "lon": lon,
                        "pixel_val": val_int,
                        "land_cover": LAND_COVER_CLASSES.get(val_int, f"Class {val_int}"),
                        "raster_file": os.path.basename(geotiff_path),
                        "source": "rasterio"
                    }
            except Exception as e:
                print(f"[LandCoverService Error] Rasterio: {e}")

        return {
            "lat": lat,
            "lon": lon,
            "pixel_val": None,
            "land_cover": "Data raster GeoTIFF tidak tersedia untuk titik ini",
            "raster_file": None,
            "source": "none"
        }
