from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.utils.weather_client import fetch_weather_data_batch
from app.features.rainfall.sync import sync_rainfall_records
from app.features.temperature.sync import sync_temperature_records
from app.features.soil_moisture.sync import sync_soil_moisture_records

async def get_indonesia_land_grid() -> List[Tuple[float, float]]:
    """
    Mengambil 968 titik grid teratur (resolusi 0.5° / ~50km)
    yang mencakup seluruh daratan Indonesia dari Sabang sampai Merauke.
    """
    async with AsyncSessionLocal() as session:
        query = text("""
            SELECT DISTINCT
                ROUND(latitude::numeric * 2) / 2 as lat,
                ROUND(longitude::numeric * 2) / 2 as lon
            FROM temperature
            WHERE is_indonesia = true
            ORDER BY lat DESC, lon ASC;
        """)
        res = await session.execute(query)
        return [(float(row.lat), float(row.lon)) for row in res.all()]

async def sync_all_climate_for_hotspots(
    target_date: Optional[str] = None,
    coordinates: Optional[List[Tuple[float, float]]] = None,
    include_land_grid: bool = True,
    precision: int = 2
) -> Dict[str, Any]:
    """
    Sinkronisasi efisien data iklim dinamis (Suhu, Curah Hujan, Kelembapan Tanah):
    1. Mengambil titik grid daratan seluruh Indonesia (~968 titik) agar peta raster terisi penuh.
    2. Menambahkan koordinat titik api aktif (hotspots) agar detail kebakaran selalu akurat.
    3. Panggil Open-Meteo batch API secara efisien (chunk 50 titik).
    4. Simpan ke masing-masing tabel (temperature, rainfall_data, soil_moisture_data)
       dengan timestamp identik dan is_indonesia = True.
    """
    coords_set = set()
    ordered_coords: List[Tuple[float, float]] = []

    # 1. Masukkan grid daratan seluruh Indonesia jika include_land_grid aktif
    if include_land_grid:
        land_grid = await get_indonesia_land_grid()
        for lat, lon in land_grid:
            key = (round(lat, 2), round(lon, 2))
            if key not in coords_set:
                coords_set.add(key)
                ordered_coords.append(key)
        print(f"[Dynamic Climate Sync] Memuat {len(land_grid)} titik grid dasar daratan seluruh Indonesia.")

    # 2. Masukkan koordinat titik hotspot aktif
    if coordinates:
        for lat, lon in coordinates:
            key = (round(float(lat), precision), round(float(lon), precision))
            if key not in coords_set:
                coords_set.add(key)
                ordered_coords.append(key)
    else:
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
            for row in res.all():
                key = (float(row.lat), float(row.lon))
                if key not in coords_set:
                    coords_set.add(key)
                    ordered_coords.append(key)

    if not ordered_coords:
        print("[Dynamic Climate Sync] Tidak ada koordinat yang perlu disinkronkan.")
        return {
            "status": "success",
            "message": "Tidak ada koordinat untuk disinkronkan.",
            "synced_locations": 0
        }

    print(f"[Dynamic Climate Sync] Memulai fetch Open-Meteo untuk {len(ordered_coords)} koordinat (grid daratan + hotspot)...")
    weather_results = await fetch_weather_data_batch(ordered_coords, chunk_size=50)

    # Filter hasil yang valid
    valid_records = [r for r in weather_results if r.get("latitude") is not None and r.get("longitude") is not None]

    sync_time = datetime.now()

    # Masukkan data ke masing-masing tabel fitur secara terpisah
    temp_count = await sync_temperature_records(valid_records, sync_time=sync_time)
    rain_count = await sync_rainfall_records(valid_records, sync_time=sync_time)
    soil_count = await sync_soil_moisture_records(valid_records, sync_time=sync_time)

    print(f"[Dynamic Climate Sync Selesai] {len(valid_records)} lokasi iklim berhasil disinkronkan ke 3 tabel.")

    return {
        "status": "success",
        "message": f"Berhasil sinkronisasi iklim dinamis grid Indonesia ({len(valid_records)} lokasi).",
        "synced_locations": len(valid_records),
        "temperature_inserted": temp_count,
        "rainfall_inserted": rain_count,
        "soil_moisture_inserted": soil_count,
        "timestamp": sync_time.isoformat()
    }
