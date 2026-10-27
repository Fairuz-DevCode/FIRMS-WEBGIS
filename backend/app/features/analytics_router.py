from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any, Optional
import datetime

from app.core.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary")
async def get_spatial_analytics_summary(
    date_str: Optional[str] = Query(None, alias="date"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns spatial analytics and multi-criteria fire risk analysis:
    - Overview KPIs (Total Hotspots, Gambut %, FRP max & rata-rata, High Confidence)
    - Peringkat Provinsi Terparah (Top 5 Provinces with Peatland & FRP details)
    - Distribusi Tingkat Risiko Karhutla (Multi-Criteria: Gambut, FRP, Confidence)
    - Tren Hotspot 5 Hari Terakhir
    """
    # 1. Determine target date (default to latest date available)
    if not date_str:
        latest_res = await db.execute(text("SELECT MAX(acq_date) FROM hotspots WHERE province IS NOT NULL"))
        latest_date = latest_res.scalar()
        if not latest_date:
            latest_date = datetime.date.today()
    else:
        try:
            latest_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            latest_date = datetime.date.today()

    # Pass date object directly for asyncpg DATE column binding
    date_param = latest_date

    # 2. Key Performance Indicators (KPIs)
    kpi_query = text("""
        SELECT 
            COUNT(id) AS total_hotspots,
            COUNT(id) FILTER (WHERE is_peatland = TRUE) AS peatland_hotspots,
            COUNT(id) FILTER (WHERE confidence IN ('h', 'high')) AS high_confidence,
            COALESCE(ROUND(AVG(frp)::numeric, 1), 0) AS avg_frp,
            COALESCE(ROUND(MAX(frp)::numeric, 1), 0) AS max_frp,
            COALESCE(ROUND(AVG(brightness)::numeric, 1), 0) AS avg_brightness
        FROM hotspots
        WHERE acq_date = :target_date AND province IS NOT NULL;
    """)
    kpi_res = await db.execute(kpi_query, {"target_date": date_param})
    kpi_row = kpi_res.mappings().first() or {}

    total_hotspots = kpi_row.get("total_hotspots", 0)
    peatland_hotspots = kpi_row.get("peatland_hotspots", 0)
    peatland_pct = round((peatland_hotspots / total_hotspots * 100), 1) if total_hotspots > 0 else 0

    # 3. Top 5 Provinces
    prov_query = text("""
        SELECT 
            province,
            COUNT(id) AS total,
            ROUND(AVG(frp)::numeric, 1) AS avg_frp,
            COUNT(id) FILTER (WHERE is_peatland = TRUE) AS peatland,
            COUNT(id) FILTER (WHERE confidence IN ('h', 'high')) AS high_conf
        FROM hotspots
        WHERE acq_date = :target_date AND province IS NOT NULL
        GROUP BY province
        ORDER BY total DESC
        LIMIT 5;
    """)
    prov_res = await db.execute(prov_query, {"target_date": date_param})
    top_provinces = [dict(row) for row in prov_res.mappings().all()]

    # 4. Fire Risk Index Distribution (Multi-Criteria Evaluation)
    risk_query = text("""
        SELECT 
            CASE 
                WHEN is_peatland = TRUE AND (confidence IN ('h', 'high') OR frp >= 10) THEN 'Sangat Kritis'
                WHEN is_peatland = TRUE OR confidence IN ('h', 'high') OR frp >= 5 THEN 'Tinggi'
                WHEN confidence IN ('n', 'nominal', 'm', 'med') THEN 'Sedang'
                ELSE 'Rendah'
            END AS risk_level,
            COUNT(id) AS count
        FROM hotspots
        WHERE acq_date = :target_date AND province IS NOT NULL
        GROUP BY 1
        ORDER BY count DESC;
    """)
    risk_res = await db.execute(risk_query, {"target_date": date_param})
    risk_distribution = {row["risk_level"]: row["count"] for row in risk_res.mappings().all()}

    # Ensure all risk keys exist
    ordered_risk = [
        {"level": "Sangat Kritis", "count": risk_distribution.get("Sangat Kritis", 0), "color": "#991b1b"},
        {"level": "Tinggi", "count": risk_distribution.get("Tinggi", 0), "color": "#ef4444"},
        {"level": "Sedang", "count": risk_distribution.get("Sedang", 0), "color": "#f59e0b"},
        {"level": "Rendah", "count": risk_distribution.get("Rendah", 0), "color": "#10b981"},
    ]

    # 5. 5-Day Historical Trend
    start_date = latest_date - datetime.timedelta(days=4)
    trend_query = text("""
        SELECT 
            acq_date::text AS date,
            COUNT(id) AS total,
            COUNT(id) FILTER (WHERE is_peatland = TRUE) AS peatland,
            COALESCE(ROUND(AVG(frp)::numeric, 1), 0) AS avg_frp
        FROM hotspots
        WHERE acq_date >= :start_date 
          AND acq_date <= :target_date
          AND province IS NOT NULL
        GROUP BY acq_date
        ORDER BY acq_date ASC;
    """)
    trend_res = await db.execute(trend_query, {"start_date": start_date, "target_date": date_param})
    trend_data = [dict(row) for row in trend_res.mappings().all()]

    return {
        "status": "success",
        "date": str(latest_date),
        "kpi": {
            "total_hotspots": total_hotspots,
            "peatland_hotspots": peatland_hotspots,
            "peatland_pct": peatland_pct,
            "high_confidence": kpi_row.get("high_confidence", 0),
            "avg_frp": float(kpi_row.get("avg_frp", 0)),
            "max_frp": float(kpi_row.get("max_frp", 0)),
            "avg_brightness": float(kpi_row.get("avg_brightness", 0))
        },
        "top_provinces": top_provinces,
        "risk_distribution": ordered_risk,
        "trend_5_days": trend_data
    }
