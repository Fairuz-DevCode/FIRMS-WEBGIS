import csv
import datetime
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Union
from sqlalchemy import text, select
from sqlalchemy.dialects.postgresql import insert
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.utils.cache import cache
from app.features.hotspot.models import Hotspot

# Default bounding box for Indonesia region 
IDN_BBOX = "95,-11,141,6"

# Supported high-resolution VIIRS satellite sensors (375m)
DEFAULT_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"]

async def sync_nasa_firms_data(
    source: Optional[Union[str, List[str]]] = None,
    area: str = IDN_BBOX,
    day_range: int = 5
) -> Dict[str, Any]:
    """
    Synchronizes active fire data from one or multiple NASA FIRMS satellites into PostgreSQL/PostGIS.
    Filters out neighboring countries (Singapore, Malaysia), executes bulk in-memory deduplication,
    inserts only genuinely new records, enriches spatial attributes, and clears the in-memory cache.
    """
    map_key = settings.MAP_KEY
    if not map_key:
        print("[FIRMS Sync Error] MAP_KEY is not set in environment or config.")
        return {
            "status": "error",
            "message": "MAP_KEY environment variable is not configured.",
            "synced_count": 0
        }

    # Resolve target sources list
    if source is None or source == "ALL":
        target_sources = DEFAULT_SOURCES
    elif isinstance(source, list):
        target_sources = source
    else:
        target_sources = [source]

    records_to_insert = []

    for src in target_sources:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key}/{src}/{area}/{day_range}"
        print(f"[FIRMS Sync] Fetching active fire data from NASA FIRMS ({src})...")

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                lines = [line.decode("utf-8") for line in response.readlines()]
        except urllib.error.URLError as e:
            print(f"[FIRMS Sync Error] Failed to fetch data for {src}: {e}")
            continue
        except Exception as e:
            print(f"[FIRMS Sync Error] Unexpected fetch error for {src}: {e}")
            continue

        if not lines or len(lines) <= 1:
            print(f"[FIRMS Sync Info] No CSV rows returned for {src}.")
            continue

        reader = csv.DictReader(lines)
        for row in reader:
            try:
                latitude = float(row["latitude"])
                longitude = float(row["longitude"])

                # Exclude Singapore & Malaysia (Peninsular Malaysia, Sarawak, Sabah)
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
        print("[FIRMS Sync Info] No valid hotspot rows parsed from all sources.")
        return {
            "status": "success",
            "message": "No valid hotspot rows parsed from NASA FIRMS API.",
            "synced_count": 0
        }

    # Batch insert in chunks to handle duplicate constraints efficiently
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch existing records for incoming date range to prevent duplication (Bulk Hash Set)
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

            # 2. Filter incoming batch against existing set & internal duplicates across satellites
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
                print(f"ℹ️ [FIRMS Sync Info] All {len(records_to_insert)} records from satellites are already up to date. 0 new records inserted.")
                return {
                    "status": "success",
                    "message": "All fetched records already exist in database (no duplicates inserted).",
                    "synced_count": 0
                }

            # 3. Bulk insert only genuinely new records
            chunk_size = 1000
            inserted_count = 0
            for i in range(0, len(filtered_records), chunk_size):
                chunk = filtered_records[i:i + chunk_size]
                stmt = insert(Hotspot).values(chunk).on_conflict_do_nothing()
                res = await session.execute(stmt)
                inserted_count += res.rowcount if res.rowcount is not None and res.rowcount >= 0 else len(chunk)

            await session.commit()

            # Event-Driven Cache Invalidation: clear in-memory cache immediately upon committing new data
            cache.clear()
            print(f"✅ [FIRMS Sync Success] Successfully synced {inserted_count} new hotspot records from {len(target_sources)} satellites (skipped {len(records_to_insert) - len(filtered_records)} existing).")

            # Enrich province and peatland flags for newly synced records
            try:
                sql_province = text("""
                    UPDATE hotspots h
                    SET province = b.name
                    FROM indonesia_boundary b
                    WHERE h.province IS NULL AND ST_Intersects(h.geom, b.geom);
                """)
                await session.execute(sql_province)

                sql_peatland = text("""
                    UPDATE hotspots h
                    SET is_peatland = TRUE
                    FROM peatlands p
                    WHERE h.province IS NOT NULL AND h.is_peatland = FALSE AND h.geom && p.geom AND ST_Intersects(h.geom, p.geom);
                """)
                await session.execute(sql_peatland)
                await session.commit()
                print("✅ [FIRMS Sync] Spatial attributes (province & peatland) enriched.")
            except Exception as e_enrich:
                print(f"⚠️ [FIRMS Sync Warning] Spatial enrichment skipped/failed: {e_enrich}")

            return {
                "status": "success",
                "message": f"Successfully processed {len(records_to_insert)} records from {len(target_sources)} satellites ({inserted_count} new inserted).",
                "synced_count": inserted_count
            }
        except Exception as e:
            await session.rollback()
            print(f"[FIRMS Sync Error] Database transaction failed: {e}")
            return {
                "status": "error",
                "message": f"Database insertion failed: {str(e)}",
                "synced_count": 0
            }
