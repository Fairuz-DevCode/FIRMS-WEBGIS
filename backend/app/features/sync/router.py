# BAGIAN 1: Import library dan modul pendukung
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from app.features.sync.firms_sync import sync_nasa_firms_data
from app.features.sync.climate_sync import sync_all_climate_for_hotspots

# BAGIAN 2: Inisialisasi router pusat sinkronisasi data
router = APIRouter(prefix="/api/sync", tags=["Sync (Sinkronisasi Data)"])

# BAGIAN 3: Endpoint sinkronisasi menyeluruh All-in-One (Titik Api + Seluruh Cuaca)
@router.post("/all")
async def trigger_full_pipeline_sync(
    days: int = Query(5, ge=1, le=5, description="Rentang hari data NASA FIRMS (1-5)"),
    date: Optional[str] = Query(None, description="Tanggal YYYY-MM-DD opsional")
):
    """
    Sinkronisasi total seluruh pipeline:
    1. Mengambil titik api NASA FIRMS terbaru
    2. Menandai perpotongan lahan gambut
    3. Mengambil seluruh cuaca (curah hujan, suhu, kelembaban) dalam 1 batch Open-Meteo
    """
    try:
        firms_res = await sync_nasa_firms_data(day_range=days)
        climate_res = await sync_all_climate_for_hotspots(target_date=date)
        return {
            "status": "success",
            "message": "Seluruh pipeline sinkronisasi berhasil dijalankan.",
            "firms": firms_res,
            "climate": climate_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan sinkronisasi penuh: {str(e)}")

# BAGIAN 4: Endpoint sinkronisasi data titik api NASA FIRMS
@router.post("/firms")
@router.post("/hotspots")
async def trigger_firms_sync(
    days: int = Query(5, ge=1, le=5, description="Rentang hari data NASA FIRMS (1-5)")
):
    """
    Sinkronisasi titik api NASA FIRMS ke database PostGIS.
    """
    try:
        res = await sync_nasa_firms_data(day_range=days)
        if res.get("status") == "error":
            raise HTTPException(status_code=500, detail=res.get("message"))
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal sinkronisasi NASA FIRMS: {str(e)}")

# BAGIAN 5: Endpoint sinkronisasi cuaca dinamis gabungan (suhu, hujan, kelembapan)
@router.post("/climate")
async def trigger_climate_sync(
    date: Optional[str] = Query(None, description="Tanggal akuisisi hotspot YYYY-MM-DD"),
    precision: int = Query(2, ge=1, le=4, description="Presisi pembulatan koordinat deduplikasi"),
    past_days: Optional[int] = Query(None, description="Ambil n hari terakhir (misal: 5)")
):
    """
    Sinkronisasi seluruh parameter cuaca (suhu, curah hujan, kelembapan) sekaligus dalam 1 batch Open-Meteo.
    """
    try:
        return await sync_all_climate_for_hotspots(target_date=date, precision=precision, past_days=past_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal sinkronisasi iklim: {str(e)}")
