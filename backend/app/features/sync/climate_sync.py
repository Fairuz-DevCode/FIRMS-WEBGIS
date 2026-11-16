# ==============================================================================
# MODUL SINKRONISASI IKLIM DINAMIS (OPEN-METEO CLIMATE SYNC)
# ==============================================================================
# Mengambil data cuaca harian (Suhu, Curah Hujan, Kelembapan Tanah) dari
# Open-Meteo API dalam satu batch request, lalu menyimpannya ke database PostGIS.
# ==============================================================================

import asyncio
import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.config.database import AsyncSessionLocal
from app.config.cache import cache
from app.features.rainfall.models import Rainfall
from app.features.temperature.models import Temperature
from app.features.soil_moisture.models import SoilMoisture

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


# BAGIAN 1: Client HTTP Open-Meteo (Single & Batch Fetch)
async def fetch_weather_data(lat: float, lon: float, target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Mengambil data iklim harian untuk 1 titik koordinat dari Open-Meteo API.
    """
    results = await fetch_weather_data_batch([(lat, lon)], target_date=target_date, chunk_size=1)
    if results:
        return results[0]
    return {
        "latitude": lat,
        "longitude": lon,
        "temperature": 0.0,
        "rainfall": 0.0,
        "soil_moisture": 0.0
    }


async def fetch_weather_data_batch(
    coordinates: List[Tuple[float, float]],
    target_date: Optional[str] = None,
    chunk_size: int = 50,
    delay_between_chunks: float = 0.3
) -> List[Dict[str, Any]]:
    """
    Mengambil data iklim harian untuk banyak koordinat sekaligus dalam 1 request batch Open-Meteo.
    Dilengkapi backoff retry otomatis jika terkena rate limit (HTTP 429).
    """
    if not coordinates:
        return []

    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=25.0) as client:
        for i in range(0, len(coordinates), chunk_size):
            chunk = coordinates[i:i + chunk_size]
            lats = ",".join(str(round(lat, 4)) for lat, _ in chunk)
            lons = ",".join(str(round(lon, 4)) for _, lon in chunk)

            params = {
                "latitude": lats,
                "longitude": lons,
                "daily": "precipitation_sum,temperature_2m_mean",
                "current": "soil_moisture_0_to_7cm,temperature_2m",
                "timezone": "Asia/Jakarta"
            }
            if target_date:
                params["start_date"] = target_date
                params["end_date"] = target_date
            else:
                params["forecast_days"] = 1

            success = False
            for attempt in range(3):
                try:
                    response = await client.get(OPEN_METEO_URL, params=params)
                    if response.status_code == 429:
                        wait_sec = 2.0 * (attempt + 1)
                        print(f"[Open-Meteo 429] Rate limit tercapai, tunggu {wait_sec}s...")
                        await asyncio.sleep(wait_sec)
                        continue

                    response.raise_for_status()
                    data = response.json()

                    items = data if isinstance(data, list) else [data]

                    for orig_coord, item in zip(chunk, items):
                        orig_lat, orig_lon = orig_coord
                        daily = item.get("daily", {}) if isinstance(item, dict) else {}
                        current = item.get("current", {}) if isinstance(item, dict) else {}

                        precip_list = daily.get("precipitation_sum", [])
                        temp_mean_list = daily.get("temperature_2m_mean", [])

                        rain_val = precip_list[0] if precip_list and precip_list[0] is not None else None
                        temp_val = temp_mean_list[0] if temp_mean_list and temp_mean_list[0] is not None else current.get("temperature_2m")
                        sm_val = current.get("soil_moisture_0_to_7cm")

                        results.append({
                            "latitude": orig_lat,
                            "longitude": orig_lon,
                            "temperature": temp_val,
                            "rainfall": rain_val,
                            "soil_moisture": sm_val
                        })
                    success = True
                    break

                except Exception as e:
                    if attempt == 2:
                        print(f"[Open-Meteo Error] Gagal ambil batch {i//chunk_size + 1}: {e}")
                    else:
                        await asyncio.sleep(1.0)

            if i + chunk_size < len(coordinates) and delay_between_chunks > 0:
                await asyncio.sleep(delay_between_chunks)

    return results


# BAGIAN 2: Query grid daratan Indonesia berbasis index tanggal
async def get_indonesia_land_grid() -> List[Tuple[float, float]]:
    """
    Mengambil titik grid daratan Indonesia dari database.
    """
    async with AsyncSessionLocal() as session:
        query = text("""
            SELECT DISTINCT
                ROUND(latitude::numeric * 2) / 2 as lat,
                ROUND(longitude::numeric * 2) / 2 as lon
            FROM temperature
            WHERE waktu = '2026-10-31' AND is_indonesia = true
            ORDER BY lat DESC, lon ASC;
        """)
        res = await session.execute(query)
        return [(float(row.lat), float(row.lon)) for row in res.all()]


# BAGIAN 3: Helper bulk insert data iklim ke database PostGIS
async def bulk_insert_climate_records(records: List[Dict[str, Any]], sync_time: datetime) -> Tuple[int, int, int]:
    """
    Simpan hasil fetch cuaca Open-Meteo secara batch ke tabel temperature, rainfall_data, dan soil_moisture_data.
    """
    temp_rows = []
    rain_rows = []
    sm_rows = []

    for r in records:
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        geom = from_shape(Point(lon, lat), srid=4326)

        # 1. Baris suhu udara
        temp_val = r.get("temperature")
        if temp_val is not None:
            temp_rows.append({
                "waktu": sync_time,
                "latitude": lat,
                "longitude": lon,
                "suhu_celsius": float(temp_val),
                "is_indonesia": True,
                "geom": geom
            })

        # 2. Baris curah hujan
        rain_val = r.get("rainfall")
        if rain_val is not None:
            rain_rows.append({
                "waktu": sync_time,
                "latitude": lat,
                "longitude": lon,
                "curah_hujan_mm": float(rain_val),
                "is_indonesia": True,
                "geom": geom
            })

        # 3. Baris kelembaban tanah
        sm_val = r.get("soil_moisture")
        if sm_val is not None and float(sm_val) > 0.001:
            sm_rows.append({
                "waktu": sync_time,
                "latitude": lat,
                "longitude": lon,
                "soil_moisture": float(sm_val),
                "is_indonesia": True,
                "geom": geom
            })

    chunk_size = 1000
    temp_cnt = rain_cnt = sm_cnt = 0

    async with AsyncSessionLocal() as session:
        for i in range(0, len(temp_rows), chunk_size):
            chunk = temp_rows[i:i + chunk_size]
            await session.execute(insert(Temperature).values(chunk))
            temp_cnt += len(chunk)

        for i in range(0, len(rain_rows), chunk_size):
            chunk = rain_rows[i:i + chunk_size]
            await session.execute(insert(Rainfall).values(chunk))
            rain_cnt += len(chunk)

        for i in range(0, len(sm_rows), chunk_size):
            chunk = sm_rows[i:i + chunk_size]
            await session.execute(insert(SoilMoisture).values(chunk))
            sm_cnt += len(chunk)

        await session.commit()

    cache.clear()
    return temp_cnt, rain_cnt, sm_cnt


# BAGIAN 4: Sinkronisasi cuaca dinamis lengkap untuk seluruh titik hotspot dan daratan
async def sync_all_climate_for_hotspots(
    target_date: Optional[str] = None,
    coordinates: Optional[List[Tuple[float, float]]] = None,
    include_land_grid: bool = True,
    precision: int = 2
) -> Dict[str, Any]:
    """
    Sinkronisasi cuaca Open-Meteo untuk grid daratan dan titik hotspot dalam 1 kali batch.
    """
    coords_set = set()
    ordered_coords: List[Tuple[float, float]] = []

    # 1. Grid daratan
    if include_land_grid:
        land_grid = await get_indonesia_land_grid()
        for lat, lon in land_grid:
            key = (round(lat, 2), round(lon, 2))
            if key not in coords_set:
                coords_set.add(key)
                ordered_coords.append(key)
        print(f"[Climate Sync] Memuat {len(land_grid)} titik grid daratan.")

    # 2. Titik hotspot
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
        print("[Climate Sync] Tidak ada koordinat untuk disinkronkan.")
        return {
            "status": "success",
            "message": "Tidak ada koordinat untuk disinkronkan.",
            "synced_locations": 0
        }

    # 3. Batch fetch cuaca dari Open-Meteo (1 request per chunk 50 koordinat untuk semua parameter)
    print(f"[Climate Sync] Mengambil cuaca Open-Meteo untuk {len(ordered_coords)} titik...")
    weather_results = await fetch_weather_data_batch(ordered_coords, target_date=target_date, chunk_size=50)

    valid_records = [r for r in weather_results if r.get("latitude") is not None and r.get("longitude") is not None]

    if target_date:
        try:
            sync_time = datetime.strptime(target_date, "%Y-%m-%d")
        except Exception:
            sync_time = datetime.now()
    else:
        sync_time = datetime.now()

    # 4. Simpan ke database masing-masing tabel
    temp_count, rain_count, soil_count = await bulk_insert_climate_records(valid_records, sync_time=sync_time)

    print(f"[Climate Sync Selesai] {len(valid_records)} lokasi berhasil disinkronkan.")

    return {
        "status": "success",
        "message": f"Berhasil sinkronisasi iklim ({len(valid_records)} lokasi).",
        "synced_locations": len(valid_records),
        "temperature_inserted": temp_count,
        "rainfall_inserted": rain_count,
        "soil_moisture_inserted": soil_count,
        "timestamp": sync_time.isoformat()
    }
