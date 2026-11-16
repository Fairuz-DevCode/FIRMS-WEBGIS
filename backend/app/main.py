import os
import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config.database import async_engine, Base
from app.config.health import router as health_router
from app.features.sync import sync_nasa_firms_data, sync_all_climate_for_hotspots
from app.features import (
    hotspot_router,
    peatland_router,
    land_cover_router,
    temperature_router,
    rainfall_router,
    soil_moisture_router,
    sync_router
)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pastikan ekstensi PostGIS dan tabel database tersedia
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.run_sync(Base.metadata.create_all)
        print("[Database] Koneksi database dan tabel PostGIS siap.")
    except Exception as e:
        print(f"[Startup Warning] Inisialisasi database ditunda: {e}")
    
    # Background Scheduler: Sinkronisasi otomatis jam 04:00 dan 16:00 WIB
    async def scheduled_sync_pipeline():
        print("[Scheduler] Memulai sinkronisasi otomatis NASA FIRMS dan cuaca...")
        try:
            await sync_nasa_firms_data(day_range=5)
            await sync_all_climate_for_hotspots()
            print("[Scheduler] Sinkronisasi otomatis selesai.")
        except Exception as e_sched:
            print(f"[Scheduler Error] Sinkronisasi otomatis gagal: {e_sched}")

    try:
        scheduler.add_job(
            scheduled_sync_pipeline,
            CronTrigger(hour="4,16", minute="0", timezone="Asia/Jakarta"),
            id="nasa_firms_and_climate_sync_job",
            replace_existing=True
        )
        scheduler.start()
        print("[Scheduler] APScheduler aktif: sinkronisasi otomatis jam 04:00 dan 16:00 WIB.")
    except Exception as e:
        print(f"[Scheduler Warning] Gagal memulai APScheduler: {e}")

    # Fetch awal di latar belakang saat server start
    async def initial_startup_sync():
        try:
            print("[Startup Sync] Memulai fetch awal NASA FIRMS dan cuaca...")
            res = await sync_nasa_firms_data(day_range=5)
            print(f"[Startup Sync] FIRMS: {res.get('message', 'Selesai')}")
            await sync_all_climate_for_hotspots()
            print("[Startup Sync] Sinkronisasi cuaca titik aktif selesai.")
        except Exception as e_sync:
            print(f"[Startup Sync Error] Fetch awal gagal: {e_sync}")

    asyncio.create_task(initial_startup_sync())

    yield

    # Shutdown scheduler & koneksi database
    try:
        scheduler.shutdown()
        print("[Scheduler] APScheduler shut down gracefully.")
    except Exception as e:
        print(f"[Scheduler Warning] Exception during scheduler shutdown: {e}")

    await async_engine.dispose()

app = FastAPI(
    title="NASA FIRMS Hotspot & Climate WebGIS API",
    description="Python FastAPI backend for Hotspots, Peatlands, Land Cover, Temperature, Rainfall, Soil Moisture & Data Sync.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router)
app.include_router(hotspot_router)
app.include_router(peatland_router)
app.include_router(land_cover_router)
app.include_router(temperature_router)
app.include_router(rainfall_router)
app.include_router(soil_moisture_router)
app.include_router(sync_router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
