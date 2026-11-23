import datetime
import hashlib
import json
import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func, cast, Integer, case, or_, and_, not_
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.hotspot.models import Hotspot
from app.features.hotspot.queries import ENVIRONMENTAL_CONTEXT_QUERY
from app.config.cache import cache

logger = logging.getLogger(__name__)

DEFAULT_CACHE_TTL = 43200
COLUMNS_HEADER = ["lat", "lng", "brightness", "frp", "confidence", "acq_date", "acq_time"]


def _clean_str(val: Optional[str]) -> Optional[str]:
    """Bersihkan string dari spasi dan nilai dummy 'null' / 'undefined'."""
    if val and (cleaned := val.strip()) not in ("", "null", "undefined"):
        return cleaned
    return None


def _parse_iso_date(date_str: str, field_name: str) -> datetime.date:
    """Parse string tanggal format YYYY-MM-DD."""
    if not date_str or not isinstance(date_str, str):
        raise ValueError(f"Parameter '{field_name}' tidak valid.")
    try:
        return datetime.datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Format tanggal salah untuk '{field_name}': '{date_str}'. Gunakan YYYY-MM-DD.")


def _make_cache_key(prefix: str, params: dict) -> str:
    """Buat MD5 cache key yang konsisten dari dictionary parameter."""
    serialized = json.dumps(params, sort_keys=True, default=str)
    return f"{prefix}_{hashlib.md5(serialized.encode()).hexdigest()}"


async def _build_date_condition(
    db: AsyncSession,
    start_date: Optional[str],
    end_date: Optional[str],
    date: Optional[str],
    days: Optional[int]
):
    """Buat kondisi filter tanggal atau fallback ke data terbaru di database."""
    start_clean = _clean_str(start_date)
    end_clean = _clean_str(end_date)
    date_clean = _clean_str(date)

    if start_clean and end_clean:
        s_dt = _parse_iso_date(start_clean, "startDate")
        e_dt = _parse_iso_date(end_clean, "endDate")
        if s_dt > e_dt:
            raise ValueError(f"startDate '{start_date}' tidak boleh setelah endDate '{end_date}'.")
        return Hotspot.acq_date.between(s_dt, e_dt)

    if date_clean:
        return Hotspot.acq_date == _parse_iso_date(date_clean, "date")

    if days is not None and int(days) > 0:
        start_dt = datetime.date.today() - datetime.timedelta(days=int(days))
        return Hotspot.acq_date >= start_dt

    # Fallback: ambil tanggal acq_date terakhir di database, atau hari ini
    latest_date = (await db.execute(select(func.max(Hotspot.acq_date)))).scalar()
    return Hotspot.acq_date == (latest_date or datetime.date.today())


def _build_confidence_condition(confidence: Optional[str]):
    """Buat kondisi filter tingkat keyakinan (High, Nominal, Low, atau numerik)."""
    conf_clean = _clean_str(confidence)
    if not conf_clean or conf_clean.lower() == "all":
        return None

    conf_val = conf_clean.lower()
    safe_numeric_conf = case(
        (Hotspot.confidence.op("~")(r"^\d+$"), cast(Hotspot.confidence, Integer)),
        else_=None
    )

    if conf_val in ("h", "high"):
        return or_(Hotspot.confidence.in_(["h", "H"]), safe_numeric_conf >= 80)
    if conf_val in ("n", "nominal", "m", "medium"):
        return or_(Hotspot.confidence.in_(["n", "N"]), and_(safe_numeric_conf >= 30, safe_numeric_conf < 80))
    if conf_val in ("l", "low"):
        return or_(Hotspot.confidence.in_(["l", "L"]), and_(safe_numeric_conf > 0, safe_numeric_conf < 30))

    return Hotspot.confidence.ilike(conf_clean)


def _build_sensor_condition(sensor: str):
    """Buat kondisi filter sensor satelit berdasarkan jam lintasan acq_time."""
    if sensor not in ("VIIRS_NOAA20_NRT", "VIIRS_SNPP_NRT"):
        return None

    safe_numeric_time = case(
        (Hotspot.acq_time.op("~")(r"^\d+$"), cast(Hotspot.acq_time, Integer)),
        else_=None
    )
    time_window = or_(
        safe_numeric_time.between(430, 545),
        safe_numeric_time.between(1715, 1830)
    )
    return time_window if sensor == "VIIRS_NOAA20_NRT" else not_(time_window)


def _categorize_temp(val: Optional[float]) -> Optional[str]:
    if val is None:
        return None
    if val > 32:
        return "Panas Ekstrem"
    return "Hangat" if val >= 26 else "Sejuk"


def _categorize_soil_moisture(val: Optional[float]) -> Optional[str]:
    if val is None:
        return None
    if val < 0.2:
        return "Sangat Kering (Kritis)"
    return "Cukup Lembab" if val <= 0.35 else "Lembab / Jenuh Air"


def _categorize_rainfall(val: Optional[float]) -> Optional[str]:
    if val is None:
        return None
    if val < 5:
        return "Kering / Sangat Ringan"
    return "Hujan Sedang" if val <= 20 else "Hujan Lebat"


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
    """Mengambil titik api dari database dalam format flat matrix dengan in-memory cache."""
    max_limit = min(max(int(limit or 50000), 1), 100000)

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
    cache_key = _make_cache_key("hotspots_matrix", cache_params)
    if cached := cache.get(cache_key):
        return cached

    try:
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

        # Filter tanggal
        if date_cond := await _build_date_condition(db, startDate, endDate, date, days):
            conditions.append(date_cond)

        # Filter confidence
        if conf_cond := _build_confidence_condition(confidence):
            conditions.append(conf_cond)

        # Filter nilai fisik
        if minBrightness is not None:
            conditions.append(Hotspot.brightness >= float(minBrightness))
        if minFrp is not None:
            conditions.append(Hotspot.frp >= float(minFrp))

        # Filter sensor
        if sensor_cond := _build_sensor_condition(sensor):
            conditions.append(sensor_cond)

        if conditions:
            query = query.where(*conditions)

        query = query.order_by(Hotspot.acq_date.desc(), Hotspot.id.desc()).limit(max_limit)
        result = await db.execute(query)
        rows = result.all()

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

        cache.set(cache_key, response_data, ttl_seconds=DEFAULT_CACHE_TTL)
        return response_data

    except ValueError as val_err:
        logger.warning(f"Validation error saat mengambil hotspots: {val_err}")
        return {
            "status": "error",
            "count": 0,
            "columns": COLUMNS_HEADER,
            "data": [],
            "message": str(val_err)
        }
    except Exception as e:
        logger.error(f"Query database hotspot gagal: {e}", exc_info=True)
        return {
            "status": "error",
            "count": 0,
            "columns": COLUMNS_HEADER,
            "data": [],
            "message": f"Query database gagal: {str(e)}"
        }


async def get_hotspot_stats_from_db(db: AsyncSession) -> Dict[str, Any]:
    """Mengambil agregat statistik titik api (total, min/max tanggal, rata-rata, timeline)."""
    try:
        summary_query = select(
            func.count(Hotspot.id).label("total_hotspots"),
            func.min(Hotspot.acq_date).label("min_date"),
            func.max(Hotspot.acq_date).label("max_date"),
            func.avg(Hotspot.brightness).label("avg_brightness"),
            func.avg(Hotspot.frp).label("avg_frp"),
            func.max(Hotspot.frp).label("max_frp")
        )
        row = (await db.execute(summary_query)).first()

        conf_query = select(
            Hotspot.confidence,
            func.count(Hotspot.id).label("count")
        ).group_by(Hotspot.confidence)
        conf_res = (await db.execute(conf_query)).all()

        timeline_query = select(
            Hotspot.acq_date,
            func.count(Hotspot.id).label("count")
        ).group_by(Hotspot.acq_date).order_by(Hotspot.acq_date.desc()).limit(14)
        timeline_res = (await db.execute(timeline_query)).all()

        summary_dict = {
            "total_hotspots": getattr(row, "total_hotspots", 0) or 0,
            "min_date": str(row.min_date) if row and row.min_date else None,
            "max_date": str(row.max_date) if row and row.max_date else None,
            "avg_brightness": round(float(row.avg_brightness or 0.0), 2) if row else 0.0,
            "avg_frp": round(float(row.avg_frp or 0.0), 2) if row else 0.0,
            "max_frp": round(float(row.max_frp or 0.0), 2) if row else 0.0,
        }

        confidence_breakdown = [
            {"confidence": r.confidence or "n/a", "count": r.count}
            for r in conf_res
        ]

        timeline = [
            {"date": str(r.acq_date), "count": r.count}
            for r in timeline_res
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
        logger.error(f"Gagal mengambil statistik hotspot: {e}", exc_info=True)
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
    """Query PostGIS KNN untuk konteks lingkungan (gambut, suhu, kelembapan, curah hujan, klaster)."""
    try:
        target_date = None
        target_date_str = _clean_str(date_str)
        if target_date_str:
            try:
                target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = None
                target_date_str = None

        result = await db.execute(
            ENVIRONMENTAL_CONTEXT_QUERY.bindparams(
                lat=lat, lng=lng, target_date=target_date, target_date_str=target_date_str
            )
        )
        row = result.first()

        if not row:
            return {"status": "not_found", "is_peatland": False}

        temp_val = round(float(row.temperature), 1) if row.temperature is not None else None
        sm_val = round(float(row.soil_moisture), 3) if row.soil_moisture is not None else None
        rain_val = round(float(row.rainfall), 1) if row.rainfall is not None else None

        return {
            "status": "success",
            "lat": lat,
            "lng": lng,
            "is_peatland": bool(row.is_peatland),
            "province": getattr(row, "province", None) or "Indonesia",
            "cluster": {
                "nearby_count": int(row.nearby_cluster_count or 0),
                "nearest_neighbor_km": float(row.nearest_neighbor_km or 0.0),
                "radius_km": 15
            },
            "temperature": {
                "value": temp_val,
                "unit": "°C",
                "category": _categorize_temp(temp_val)
            } if temp_val is not None else None,
            "soil_moisture": {
                "value": sm_val,
                "unit": "m³/m³",
                "category": _categorize_soil_moisture(sm_val)
            } if sm_val is not None else None,
            "rainfall": {
                "value": rain_val,
                "unit": "mm",
                "category": _categorize_rainfall(rain_val)
            } if rain_val is not None else None
        }

    except Exception as e:
        logger.error(f"KNN EnvironmentalContext gagal: {e}", exc_info=True)
        return {"status": "error", "error": str(e), "is_peatland": False}
