from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.core.database import AsyncSessionLocal
from app.core.utils.cache import cache
from app.core.utils.weather_client import fetch_weather_data, fetch_weather_data_batch
from app.features.soil_moisture.models import SoilMoisture

async def sync_soil_moisture_records(records: List[Dict[str, Any]], sync_time: Optional[datetime] = None) -> int:
    """
    Bulk insert data kelembapan tanah ke tabel soil_moisture_data.
    records: list of dict dengan key 'latitude', 'longitude', 'soil_moisture'
    """
    if not records:
        return 0

    timestamp = sync_time or datetime.now()
    rows = []
    for r in records:
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        soil_val = r.get("soil_moisture")

        rows.append({
            "waktu": timestamp,
            "latitude": lat,
            "longitude": lon,
            "soil_moisture": float(soil_val) if soil_val is not None else 0.0,
            "is_indonesia": True,
            "geom": from_shape(Point(lon, lat), srid=4326)
        })

    chunk_size = 1000
    inserted_count = 0
    async with AsyncSessionLocal() as session:
        for i in range(0, len(rows), chunk_size):
            chunk = rows[i:i + chunk_size]
            stmt = insert(SoilMoisture).values(chunk)
            await session.execute(stmt)
            inserted_count += len(chunk)
        await session.commit()

    cache.clear()
    print(f"[Soil Moisture Sync] Berhasil memasukkan {inserted_count} data kelembapan tanah ke database.")
    return inserted_count

async def sync_soil_moisture_data(lat: float, lon: float):
    """
    Sinkronisasi kelembapan tanah untuk 1 titik koordinat.
    """
    weather = await fetch_weather_data(lat, lon)
    return await sync_soil_moisture_records([{
        "latitude": lat,
        "longitude": lon,
        "soil_moisture": weather.get("soil_moisture", 0.0)
    }])

async def sync_soil_moisture_from_hotspots(target_date: Optional[str] = None, precision: int = 2) -> Dict[str, Any]:
    """
    Sinkronisasi dinamis kelembapan tanah dari titik-titik hotspot aktif (NASA FIRMS).
    """
    async with AsyncSessionLocal() as session:
        query = text("""
            SELECT 
                ROUND(latitude::numeric, :prec) as lat,
                ROUND(longitude::numeric, :prec) as lon
            FROM hotspots
            WHERE (:target_date IS NULL AND acq_date = (SELECT MAX(acq_date) FROM hotspots))
               OR (:target_date IS NOT NULL AND acq_date = CAST(:target_date AS DATE))
            GROUP BY ROUND(latitude::numeric, :prec), ROUND(longitude::numeric, :prec);
        """)
        res = await session.execute(query.bindparams(prec=precision, target_date=target_date))
        coords = [(float(row.lat), float(row.lon)) for row in res.all()]

    if not coords:
        return {"status": "success", "message": "Tidak ada koordinat hotspot yang ditemukan.", "synced_count": 0}

    print(f"[Soil Moisture Sync] Mengambil cuaca Open-Meteo untuk {len(coords)} titik hotspot...")
    weather_results = await fetch_weather_data_batch(coords, chunk_size=50)
    inserted = await sync_soil_moisture_records(weather_results)

    return {
        "status": "success",
        "message": f"Berhasil sinkronisasi kelembapan tanah untuk {inserted} lokasi hotspot.",
        "synced_count": inserted
    }
