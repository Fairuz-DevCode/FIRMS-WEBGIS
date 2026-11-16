# ==============================================================================
# SERVICE DATA TITIK API (HOTSPOT SERVICE)
# ==============================================================================
# Menangani query titik api, format flat matrix, caching, dan konteks spasial KNN.
# ==============================================================================

import datetime
import hashlib
import json
from typing import Optional, Dict, Any, List
from sqlalchemy import select, func, cast, Integer, case, or_, and_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.hotspot.models import Hotspot
from app.config.cache import cache

DEFAULT_CACHE_TTL = 43200
COLUMNS_HEADER = ["lat", "lng", "brightness", "frp", "confidence", "acq_date", "acq_time"]


def _parse_iso_date(date_str: str, field_name: str) -> datetime.date:
    """
    Parse string tanggal format YYYY-MM-DD.
    """
    if not date_str or not isinstance(date_str, str):
        raise ValueError(f"Parameter '{field_name}' tidak valid.")
    try:
        return datetime.datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Format tanggal salah untuk '{field_name}': '{date_str}'. Gunakan YYYY-MM-DD.")


async def get_hotspots_from_db(
    db: AsyncSession,
    sensor: str = "ALL",
    days: Optional[int] = None,
    date: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    confidence: Optional[str] = None,
    minBrightness: Optional[float] = None,
    minFrp: Optional[float] = None,
    limit: int = 50000
) -> Dict[str, Any]:
    """
    Mengambil data titik api dari database dengan format Flat Matrix dan cache in-memory.
    """
    max_limit = min(max(int(limit or 50000), 1), 100000)

    # BAGIAN 1: Generate MD5 cache key dari parameter filter
    cache_params = {
        "sensor": sensor,
        "days": days,
        "date": date,
        "startDate": startDate,
        "endDate": endDate,
        "confidence": confidence,
        "minBrightness": minBrightness,
        "minFrp": minFrp,
        "limit": max_limit
    }
    serialized_params = json.dumps(cache_params, sort_keys=True, default=str)
    cache_hash = hashlib.md5(serialized_params.encode("utf-8")).hexdigest()
    cache_key = f"hotspots_matrix_{cache_hash}"

    cached = cache.get(cache_key)
    if cached:
        return cached

    try:
        # BAGIAN 2: Query seleksi kolom skalar (tanpa ORM overhead)
        query = select(
            Hotspot.latitude,
            Hotspot.longitude,
            Hotspot.brightness,
            Hotspot.frp,
            Hotspot.confidence,
            Hotspot.acq_date,
            Hotspot.acq_time
        )

        conditions = []

        # BAGIAN 3: Filter tanggal
        date_clean = date.strip() if date and date.strip() not in ["", "null", "undefined"] else None
        startDate_clean = startDate.strip() if startDate and startDate.strip() not in ["", "null", "undefined"] else None
        endDate_clean = endDate.strip() if endDate and endDate.strip() not in ["", "null", "undefined"] else None

        if startDate_clean and endDate_clean:
            s_dt = _parse_iso_date(startDate_clean, "startDate")
            e_dt = _parse_iso_date(endDate_clean, "endDate")
            if s_dt > e_dt:
                raise ValueError(f"startDate '{startDate}' tidak boleh setelah endDate '{endDate}'.")
            conditions.append(Hotspot.acq_date.between(s_dt, e_dt))
        elif date_clean:
            target_dt = _parse_iso_date(date_clean, "date")
            conditions.append(Hotspot.acq_date == target_dt)
        elif days is not None and int(days) > 0:
            today_dt = datetime.date.today()
            start_dt = today_dt - datetime.timedelta(days=int(days))
            conditions.append(Hotspot.acq_date >= start_dt)
        else:
            latest_date_query = select(func.max(Hotspot.acq_date))
            latest_date = (await db.execute(latest_date_query)).scalar()
            if latest_date:
                conditions.append(Hotspot.acq_date == latest_date)
            else:
                today_dt = datetime.date.today()
                conditions.append(Hotspot.acq_date == today_dt)

        # BAGIAN 4: Filter tingkat keyakinan (confidence)
        if confidence and confidence.strip().lower() not in ["all", ""]:
            conf_val = confidence.strip().lower()
            safe_numeric_conf = case(
                (Hotspot.confidence.op("~")(r"^\d+$"), cast(Hotspot.confidence, Integer)),
                else_=None
            )

            if conf_val in ["h", "high"]:
                conditions.append(
                    or_(
                        Hotspot.confidence.in_(["h", "H"]),
                        safe_numeric_conf >= 80
                    )
                )
            elif conf_val in ["n", "nominal", "m", "medium"]:
                conditions.append(
                    or_(
                        Hotspot.confidence.in_(["n", "N"]),
                        and_(safe_numeric_conf >= 30, safe_numeric_conf < 80)
                    )
                )
            elif conf_val in ["l", "low"]:
                conditions.append(
                    or_(
                        Hotspot.confidence.in_(["l", "L"]),
                        and_(safe_numeric_conf > 0, safe_numeric_conf < 30)
                    )
                )
            else:
                conditions.append(Hotspot.confidence.ilike(confidence.strip()))

        # BAGIAN 5: Filter nilai fisik (Brightness, FRP, Jam Lintas Satelit)
        if minBrightness is not None:
            conditions.append(Hotspot.brightness >= float(minBrightness))
        if minFrp is not None:
            conditions.append(Hotspot.frp >= float(minFrp))

        if sensor == "VIIRS_NOAA20_NRT":
            safe_numeric_time = case(
                (Hotspot.acq_time.op("~")(r"^\d+$"), cast(Hotspot.acq_time, Integer)),
                else_=None
            )
            conditions.append(
                or_(
                    safe_numeric_time.between(430, 545),
                    safe_numeric_time.between(1715, 1830)
                )
            )
        elif sensor == "VIIRS_SNPP_NRT":
            safe_numeric_time = case(
                (Hotspot.acq_time.op("~")(r"^\d+$"), cast(Hotspot.acq_time, Integer)),
                else_=None
            )
            conditions.append(
                not_(
                    or_(
                        safe_numeric_time.between(430, 545),
                        safe_numeric_time.between(1715, 1830)
                    )
                )
            )

        if conditions:
            query = query.where(*conditions)

        query = query.order_by(Hotspot.acq_date.desc(), Hotspot.id.desc()).limit(max_limit)

        result = await db.execute(query)
        rows = result.all()

        # BAGIAN 6: Susun matriks 2D datar [lat, lng, ...] untuk hemat bandwidth
        data_matrix: List[List[Any]] = [
            [
                float(row.latitude),
                float(row.longitude),
                float(row.brightness) if row.brightness is not None else None,
                float(row.frp) if row.frp is not None else None,
                str(row.confidence) if row.confidence is not None else "",
                row.acq_date.isoformat() if hasattr(row.acq_date, "isoformat") else str(row.acq_date),
                str(row.acq_time) if row.acq_time else ""
            ]
            for row in rows
        ]

        response_data = {
            "status": "success",
            "count": len(data_matrix),
            "columns": COLUMNS_HEADER,
            "data": data_matrix
        }

        # Simpan ke cache memori (TTL 12 jam)
        cache.set(cache_key, response_data, ttl_seconds=DEFAULT_CACHE_TTL)
        return response_data

    except ValueError as val_err:
        print(f"[HotspotService Validation Error] {val_err}")
        return {
            "status": "error",
            "count": 0,
            "columns": COLUMNS_HEADER,
            "data": [],
            "message": str(val_err)
        }
    except Exception as e:
        print(f"[HotspotService Error] Query gagal: {e}")
        return {
            "status": "error",
            "count": 0,
            "columns": COLUMNS_HEADER,
            "data": [],
            "message": f"Query database gagal: {str(e)}"
        }


async def get_hotspot_stats_from_db(db: AsyncSession) -> Dict[str, Any]:
    """
    Mengambil ringkasan statistik agregat titik api.
    """
    try:
        # BAGIAN 1: Query agregasi total, tanggal min/max, rata-rata brightness dan FRP
        summary_query = select(
            func.count(Hotspot.id).label("total_hotspots"),
            func.min(Hotspot.acq_date).label("min_date"),
            func.max(Hotspot.acq_date).label("max_date"),
            func.avg(Hotspot.brightness).label("avg_brightness"),
            func.avg(Hotspot.frp).label("avg_frp"),
            func.max(Hotspot.frp).label("max_frp")
        )
        summary_res = (await db.execute(summary_query)).first()

        # BAGIAN 2: Breakdown confidence level
        conf_query = select(
            Hotspot.confidence,
            func.count(Hotspot.id).label("count")
        ).group_by(Hotspot.confidence)
        conf_res = (await db.execute(conf_query)).all()

        # BAGIAN 3: Tren 14 hari terakhir
        timeline_query = select(
            Hotspot.acq_date,
            func.count(Hotspot.id).label("count")
        ).group_by(Hotspot.acq_date).order_by(Hotspot.acq_date.desc()).limit(14)
        timeline_res = (await db.execute(timeline_query)).all()

        summary_dict = {
            "total_hotspots": summary_res.total_hotspots or 0 if summary_res else 0,
            "min_date": str(summary_res.min_date) if summary_res and summary_res.min_date else None,
            "max_date": str(summary_res.max_date) if summary_res and summary_res.max_date else None,
            "avg_brightness": round(float(summary_res.avg_brightness or 0.0), 2) if summary_res else 0.0,
            "avg_frp": round(float(summary_res.avg_frp or 0.0), 2) if summary_res else 0.0,
            "max_frp": round(float(summary_res.max_frp or 0.0), 2) if summary_res else 0.0,
        }

        confidence_breakdown = [
            {"confidence": row.confidence or "n/a", "count": row.count}
            for row in conf_res
        ]

        timeline = [
            {"date": str(row.acq_date), "count": row.count}
            for row in timeline_res
        ]

        return {
            "status": "success",
            "summary": summary_dict,
            "confidenceBreakdown": confidence_breakdown,
            "confidence_breakdown": confidence_breakdown,
            "satellite_breakdown": [],
            "timeline": timeline,
            "recent_timeline": timeline
        }
    except Exception as e:
        print(f"[HotspotStats Error] {e}")
        return {
            "status": "error",
            "summary": {
                "total_hotspots": 0,
                "min_date": None,
                "max_date": None,
                "avg_brightness": 0.0,
                "avg_frp": 0.0,
                "max_frp": 0.0
            },
            "confidenceBreakdown": [],
            "confidence_breakdown": [],
            "satellite_breakdown": [],
            "timeline": [],
            "recent_timeline": [],
            "error": str(e)
        }


async def get_environmental_context_at_point(
    db: AsyncSession,
    lat: float,
    lng: float,
    date_str: Optional[str] = None
) -> Dict[str, Any]:
    """
    Query PostGIS KNN untuk konteks lingkungan (gambut, suhu, kelembapan, hujan, klaster).
    """
    try:
        from sqlalchemy import text

        target_date = None
        target_date_str = None
        if date_str:
            try:
                target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                target_date_str = date_str.strip()
            except ValueError:
                target_date = None
                target_date_str = None

        # BAGIAN 1: Subquery tanggal iklim terdekat dan KNN PostGIS
        query = text("""
            WITH target_time AS (
                SELECT 
                    COALESCE(
                        (SELECT MAX(waktu) FROM temperature WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                        (SELECT MAX(waktu) FROM temperature)
                    ) as temp_time,
                    COALESCE(
                        (SELECT MAX(waktu) FROM soil_moisture_data WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                        (SELECT MAX(waktu) FROM soil_moisture_data)
                    ) as sm_time,
                    COALESCE(
                        (SELECT MAX(waktu) FROM rainfall_data WHERE (:target_date_str IS NOT NULL AND waktu >= CAST(:target_date_str AS timestamp) AND waktu < CAST(:target_date_str AS timestamp) + interval '1 day')),
                        (SELECT MAX(waktu) FROM rainfall_data)
                    ) as rain_time
            )
            SELECT 
                EXISTS(
                    SELECT 1 FROM peatlands 
                    WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
                    LIMIT 1
                ) as is_peatland,
                (
                    SELECT suhu_celsius 
                    FROM temperature, target_time 
                    WHERE suhu_celsius IS NOT NULL AND suhu_celsius > 5
                      AND waktu = target_time.temp_time
                    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
                    LIMIT 1
                ) as temperature,
                (
                    SELECT soil_moisture 
                    FROM soil_moisture_data, target_time 
                    WHERE soil_moisture IS NOT NULL AND soil_moisture > 0.001
                      AND waktu = target_time.sm_time
                    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
                    LIMIT 1
                ) as soil_moisture,
                (
                    SELECT curah_hujan_mm 
                    FROM rainfall_data, target_time 
                    WHERE curah_hujan_mm IS NOT NULL
                      AND waktu = target_time.rain_time
                    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) 
                    LIMIT 1
                ) as rainfall,
                (
                    SELECT COUNT(id) FROM hotspots
                    WHERE (:target_date IS NULL OR acq_date = :target_date)
                      AND geom && ST_Expand(ST_SetSRID(ST_Point(:lng, :lat), 4326), 0.15)
                      AND ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) > 0.0001
                ) as nearby_cluster_count,
                (
                    SELECT COALESCE(ROUND((MIN(ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) * 111.32)::numeric), 2), 0)
                    FROM hotspots
                    WHERE (:target_date IS NULL OR acq_date = :target_date)
                      AND geom && ST_Expand(ST_SetSRID(ST_Point(:lng, :lat), 4326), 0.15)
                      AND ST_Distance(geom, ST_SetSRID(ST_Point(:lng, :lat), 4326)) > 0.0001
                ) as nearest_neighbor_km;
        """)
        result = await db.execute(query.bindparams(lat=lat, lng=lng, target_date=target_date, target_date_str=target_date_str))
        row = result.first()

        # BAGIAN 2: Format respons dan pengkategorian parameter
        if row:
            temp_val = round(float(row.temperature), 1) if row.temperature is not None else None
            sm_val = round(float(row.soil_moisture), 3) if row.soil_moisture is not None else None
            rain_val = round(float(row.rainfall), 1) if row.rainfall is not None else None
            cluster_count = int(row.nearby_cluster_count or 0)
            nearest_km = float(row.nearest_neighbor_km or 0.0)

            temp_desc = "Panas Ekstrem" if temp_val is not None and temp_val > 32 else ("Hangat" if temp_val is not None and temp_val >= 26 else "Sejuk")
            sm_desc = "Sangat Kering (Kritis)" if sm_val is not None and sm_val < 0.2 else ("Cukup Lembab" if sm_val is not None and sm_val <= 0.35 else "Lembab / Jenuh Air")
            rain_desc = "Kering / Sangat Ringan" if rain_val is not None and rain_val < 5 else ("Hujan Sedang" if rain_val is not None and rain_val <= 20 else "Hujan Lebat")

            return {
                "status": "success",
                "lat": lat,
                "lng": lng,
                "is_peatland": bool(row.is_peatland),
                "province": getattr(row, 'province', None) or "Indonesia",
                "cluster": {
                    "nearby_count": cluster_count,
                    "nearest_neighbor_km": nearest_km,
                    "radius_km": 15
                },
                "temperature": {
                    "value": temp_val,
                    "unit": "°C",
                    "category": temp_desc
                } if temp_val is not None else None,
                "soil_moisture": {
                    "value": sm_val,
                    "unit": "m³/m³",
                    "category": sm_desc
                } if sm_val is not None else None,
                "rainfall": {
                    "value": rain_val,
                    "unit": "mm",
                    "category": rain_desc
                } if rain_val is not None else None
            }
        return {"status": "not_found", "is_peatland": False}
    except Exception as e:
        print(f"[EnvironmentalContext Error] {e}")
        return {"status": "error", "error": str(e), "is_peatland": False}
