import os
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from shapely.geometry import Point
import geopandas as gpd

from app.config.cache import cache
from app.features.peatland.queries import (
    PEATLAND_GEOJSON_QUERY,
    PEATLAND_HOTSPOTS_SPATIAL_JOIN_QUERY,
)

logger = logging.getLogger(__name__)


def _build_spatial_summary(total: int, in_peatland: int, high_risk: list, source: str) -> Dict[str, Any]:
    """Helper untuk standarisasi format response analisis spasial lahan gambut."""
    pct = round((in_peatland / total * 100.0), 2) if total > 0 else 0.0
    return {
        "total_hotspots": total,
        "hotspots_in_peatland": in_peatland,
        "percentage_in_peatland": pct,
        "high_risk_hotspots": high_risk[:50],
        "source": source
    }


def _extract_hotspot_geodataframe(hotspot_features: List[Dict[str, Any]]) -> gpd.GeoDataFrame:
    """Helper untuk menyusun GeoPandas GeoDataFrame dari list GeoJSON features."""
    records = []
    for feat in hotspot_features:
        props = feat.get("properties", {})
        coords = feat.get("geometry", {}).get("coordinates", [0, 0])
        records.append({
            "geometry": Point(coords[0], coords[1]),
            "id": props.get("id"),
            "latitude": props.get("latitude"),
            "longitude": props.get("longitude"),
            "brightness": props.get("brightness", 0.0),
            "frp": props.get("frp", 0.0),
            "confidence": props.get("confidence", "n/a"),
            "acq_date": props.get("acq_date")
        })
    return gpd.GeoDataFrame(records, crs="EPSG:4326")


async def get_peatland_geojson_from_db(db: AsyncSession) -> Dict[str, Any]:
    """Ambil FeatureCollection GeoJSON poligon lahan gambut dari PostGIS."""
    cache_key = "peatland_geojson_featurecollection"
    if cached := cache.get(cache_key):
        return cached

    try:
        result = await db.execute(PEATLAND_GEOJSON_QUERY)
        geojson = result.scalar()

        if geojson and isinstance(geojson, dict):
            cache.set(cache_key, geojson, 86400)
            return geojson

    except Exception as e:
        logger.error(f"Gagal mengambil GeoJSON lahan gambut: {e}", exc_info=True)

    return {"type": "FeatureCollection", "features": []}


async def analyze_peatland_hotspots_db(db: AsyncSession, days: int = 30) -> Optional[Dict[str, Any]]:
    """Spatial join PostGIS (ST_Intersects) antara titik hotspot dan kubah gambut."""
    try:
        result = await db.execute(
            PEATLAND_HOTSPOTS_SPATIAL_JOIN_QUERY.bindparams(days=days)
        )
        row = result.first()
        if row and (row.total_hotspots or 0) > 0:
            total = row.total_hotspots or 0
            in_peatland = row.hotspots_in_peatland or 0
            high_risk = row.high_risk if isinstance(row.high_risk, list) else []
            return _build_spatial_summary(
                total=total,
                in_peatland=in_peatland,
                high_risk=high_risk,
                source="postgis_spatial_index"
            )
    except Exception as e:
        logger.error(f"Gagal spatial join PostGIS peatland: {e}", exc_info=True)

    return None


def analyze_peatland_hotspots_gpd(
    hotspot_features: List[Dict[str, Any]],
    peatland_geojson_path: str
) -> Dict[str, Any]:
    """Fallback GeoPandas spatial join saat database PostGIS tidak tersedia."""
    if not hotspot_features:
        return _build_spatial_summary(0, 0, [], "geopandas_fallback")

    hotspots_gdf = _extract_hotspot_geodataframe(hotspot_features)
    in_peatland_count = 0
    high_risk: List[Dict[str, Any]] = []

    if os.path.exists(peatland_geojson_path):
        try:
            peatland_gdf = gpd.read_file(peatland_geojson_path)
            joined = gpd.sjoin(hotspots_gdf, peatland_gdf, how="inner", predicate="within")
            in_peatland_count = len(joined)

            high_risk_gdf = joined[joined["frp"] > 50]
            high_risk = high_risk_gdf[
                ["id", "latitude", "longitude", "brightness", "frp", "acq_date"]
            ].to_dict(orient="records")
        except Exception as e:
            logger.error(f"Gagal GeoPandas join peatland: {e}", exc_info=True)

    return _build_spatial_summary(
        total=len(hotspots_gdf),
        in_peatland=in_peatland_count,
        high_risk=high_risk,
        source="geopandas_fallback"
    )
