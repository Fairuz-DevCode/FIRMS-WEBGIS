import asyncio
import httpx
from typing import Dict, Any, List, Tuple, Optional

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

async def fetch_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Mengambil data iklim real-time (Suhu, Curah Hujan, Kelembapan Tanah)
    untuk 1 titik koordinat menggunakan Open-Meteo API.
    """
    results = await fetch_weather_data_batch([(lat, lon)], chunk_size=1)
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
    chunk_size: int = 50,
    delay_between_chunks: float = 0.3
) -> List[Dict[str, Any]]:
    """
    Mengambil data iklim real-time (Suhu, Curah Hujan, Kelembapan Tanah)
    untuk banyak titik koordinat secara efisien menggunakan fitur multi-coordinate batch Open-Meteo.
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
                "current": "temperature_2m,precipitation,soil_moisture_0_to_7cm"
            }

            success = False
            for attempt in range(3):
                try:
                    response = await client.get(OPEN_METEO_URL, params=params)
                    if response.status_code == 429:
                        wait_sec = 2.0 * (attempt + 1)
                        print(f"[Weather API Rate Limit 429] Menunggu {wait_sec}s sebelum retry chunk {i//chunk_size + 1}...")
                        await asyncio.sleep(wait_sec)
                        continue

                    response.raise_for_status()
                    data = response.json()

                    # Open-Meteo mengembalikan list jika multiple coordinates, atau dict jika cuma 1 titik
                    items = data if isinstance(data, list) else [data]

                    for orig_coord, item in zip(chunk, items):
                        orig_lat, orig_lon = orig_coord
                        current = item.get("current", {}) if isinstance(item, dict) else {}
                        results.append({
                            "latitude": orig_lat,
                            "longitude": orig_lon,
                            "temperature": current.get("temperature_2m"),
                            "rainfall": current.get("precipitation"),
                            "soil_moisture": current.get("soil_moisture_0_to_7cm")
                        })
                    success = True
                    break

                except Exception as e:
                    if attempt == 2:
                        print(f"[Weather API Batch Error] Gagal mengambil chunk {i//chunk_size + 1} ({len(chunk)} titik): {e}")
                    else:
                        await asyncio.sleep(1.0)

            if not success:
                # Fallback record kosong agar urutan/jumlah tidak hilang jika semua percobaan gagal
                for orig_lat, orig_lon in chunk:
                    results.append({
                        "latitude": orig_lat,
                        "longitude": orig_lon,
                        "temperature": None,
                        "rainfall": None,
                        "soil_moisture": None
                    })

            if delay_between_chunks > 0 and (i + chunk_size) < len(coordinates):
                await asyncio.sleep(delay_between_chunks)

    return results
