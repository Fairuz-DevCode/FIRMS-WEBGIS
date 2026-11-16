# BAGIAN 1: Import library dan modul pendukung
import os
import csv
import datetime
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from sqlalchemy import text, select
from sqlalchemy.dialects.postgresql import insert
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.config.database import AsyncSessionLocal
from app.config.cache import cache
from app.features.hotspot.models import Hotspot

# Batas area geografis Indonesia: [min_lon, min_lat, max_lon, max_lat]
IDN_BBOX = "95,-11,141,6"

# Satelit resolusi tinggi 375m
DEFAULT_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"]

# BAGIAN 2: Fungsi utama sinkronisasi titik api NASA FIRMS
async def sync_nasa_firms_data(
    day_range: int = 5,
    area: str = IDN_BBOX
) -> Dict[str, Any]:
    """
    Sinkronisasi titik api NASA FIRMS ke database PostGIS.
    """
    map_key = os.getenv("MAP_KEY")
    if not map_key:
        print("[FIRMS Sync Error] MAP_KEY belum disetel di environment.")
        return {
            "status": "error",
            "message": "MAP_KEY belum disetel.",
            "synced_count": 0
        }

    records_to_insert = []

    # Ambil CSV dari server NASA FIRMS
    for src in DEFAULT_SOURCES:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key}/{src}/{area}/{day_range}"
        print(f"[FIRMS Sync] Mengambil data titik api ({src})...")

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                lines = [line.decode("utf-8") for line in response.readlines()]
        except urllib.error.URLError as e:
            print(f"[FIRMS Sync Error] Gagal mengambil data {src}: {e}")
            continue
        except Exception as e:
            print(f"[FIRMS Sync Error] Error tidak terduga pada {src}: {e}")
            continue

        if not lines or len(lines) <= 1:
            print(f"[FIRMS Sync Info] Tidak ada data kebakaran dari {src}.")
            continue

        reader = csv.DictReader(lines)
        for row in reader:
            try:
                latitude = float(row["latitude"])
                longitude = float(row["longitude"])

                # Filter wilayah luar batas daratan Indonesia
                is_singapore = (103.60 <= longitude <= 104.05 and 1.20 <= latitude <= 1.48)
                is_west_malaysia = (99.8 <= longitude <= 104.5 and 1.25 <= latitude <= 6.8 and not (
                    longitude <= 103.5 and latitude <= 2.5 and (latitude <= 0.6 * (longitude - 100.0) + 0.5)
                ))
                is_east_malaysia = (109.5 <= longitude <= 119.5 and (
                    (longitude < 114.0 and latitude > 2.05) or
                    (114.0 <= longitude < 115.5 and latitude > 1.2) or
                    (longitude >= 115.5 and latitude > 4.25)
                ))

                if is_singapore or is_west_malaysia or is_east_malaysia:
                    continue

                acq_date = datetime.datetime.strptime(row["acq_date"].strip(), "%Y-%m-%d").date()
                acq_time = row.get("acq_time", "").strip()
                brightness = float(row["bright_ti4"]) if "bright_ti4" in row and row["bright_ti4"] else (
                    float(row["brightness"]) if "brightness" in row and row["brightness"] else None
                )
                confidence = row.get("confidence", "").strip()
                frp = float(row["frp"]) if "frp" in row and row["frp"] else None
                geom_wkb = from_shape(Point(longitude, latitude), srid=4326)

                records_to_insert.append({
                    "latitude": latitude,
                    "longitude": longitude,
                    "brightness": brightness,
                    "acq_date": acq_date,
                    "acq_time": acq_time,
                    "confidence": confidence,
                    "frp": frp,
                    "geom": geom_wkb
                })
            except (KeyError, ValueError):
                continue

    if not records_to_insert:
        print("[FIRMS Sync Info] Tidak ada baris hotspot valid yang diparsing.")
        return {
            "status": "success",
            "message": "Tidak ada baris hotspot valid.",
            "synced_count": 0
        }

    # BAGIAN 3: Deduplikasi data agar tidak ada titik ganda
    async with AsyncSessionLocal() as session:
        try:
            min_date = min(r["acq_date"] for r in records_to_insert)
            existing_query = select(
                Hotspot.latitude,
                Hotspot.longitude,
                Hotspot.acq_date,
                Hotspot.acq_time
            ).where(Hotspot.acq_date >= min_date)

            existing_res = await session.execute(existing_query)
            existing_set = {
                (
                    round(float(row[0]), 5),
                    round(float(row[1]), 5),
                    row[2],
                    str(row[3]).strip() if row[3] is not None else ""
                )
                for row in existing_res.all()
            }

            filtered_records = []
            seen_in_batch = set()
            for r in records_to_insert:
                key = (
                    round(float(r["latitude"]), 5),
                    round(float(r["longitude"]), 5),
                    r["acq_date"],
                    str(r.get("acq_time", "")).strip()
                )
                if key not in existing_set and key not in seen_in_batch:
                    seen_in_batch.add(key)
                    filtered_records.append(r)

            if not filtered_records:
                print(f"[FIRMS Sync Info] Semua {len(records_to_insert)} data satelit sudah mutakhir. 0 data baru.")
                return {
                    "status": "success",
                    "message": "Semua data satelit sudah mutakhir.",
                    "synced_count": 0
                }

            # BAGIAN 4: Simpan massal (bulk insert)
            chunk_size = 1000
            inserted_count = 0
            for i in range(0, len(filtered_records), chunk_size):
                chunk = filtered_records[i:i + chunk_size]
                stmt = insert(Hotspot).values(chunk).on_conflict_do_nothing()
                res = await session.execute(stmt)
                inserted_count += res.rowcount if res.rowcount is not None and res.rowcount >= 0 else len(chunk)

            await session.commit()
            cache.clear()
            print(f"[FIRMS Sync Success] Berhasil menyimpan {inserted_count} titik api baru.")

            # BAGIAN 5: Tandai titik di lahan gambut dan sinkronisasi cuaca
            try:
                sql_peatland = text("""
                    UPDATE hotspots h
                    SET is_peatland = TRUE
                    FROM peatlands p
                    WHERE (h.is_peatland IS NULL OR h.is_peatland = FALSE)
                    AND h.geom && p.geom AND ST_Intersects(h.geom, p.geom);
                """)
                await session.execute(sql_peatland)
                await session.commit()
                print("[FIRMS Sync] Status lahan gambut berhasil diperbarui.")
            except Exception as e_enrich:
                print(f"[FIRMS Sync Warning] Gagal memperbarui status gambut: {e_enrich}")

            if filtered_records:
                try:
                    from app.features.sync.climate_sync import sync_all_climate_for_hotspots
                    new_coords = [(float(r["latitude"]), float(r["longitude"])) for r in filtered_records]
                    print(f"[FIRMS Sync] Sinkronisasi iklim untuk {len(new_coords)} titik baru...")
                    await sync_all_climate_for_hotspots(coordinates=new_coords)
                except Exception as e_climate:
                    print(f"[FIRMS Sync Warning] Gagal sinkronisasi iklim: {e_climate}")

            return {
                "status": "success",
                "message": f"Berhasil memproses {len(records_to_insert)} titik ({inserted_count} baru disimpan).",
                "synced_count": inserted_count
            }
        except Exception as e:
            await session.rollback()
            print(f"[FIRMS Sync Error] Transaksi database gagal: {e}")
            return {
                "status": "error",
                "message": f"Gagal menyimpan ke database: {str(e)}",
                "synced_count": 0
            }
