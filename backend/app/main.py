import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.core.database import async_engine, Base
from app.core.router import router as core_router
from app.features.hotspot.sync import sync_nasa_firms_data
from app.features import (
    hotspot_router,
    peatland_router,
    land_cover_router,
    temperature_router,
    rainfall_router,
    soil_moisture_router
)
from app.features.analytics_router import router as analytics_router

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure PostGIS extension and database tables exist
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database connection & PostGIS tables initialized successfully.")
    except Exception as e:
        print(f"⚠️ Startup Warning: Database initialization deferred or waiting for container: {e}")
    
    # Start APScheduler for FIRMS & Dynamic Climate sync (twice a day: 04:00 subuh & 16:00 sore WIB / Asia/Jakarta)
    async def scheduled_sync_pipeline():
        print("⏰ [Scheduler] Memulai pipeline sinkronisasi otomatis (NASA FIRMS + Iklim Dinamis Open-Meteo)...")
        try:
            await sync_nasa_firms_data(day_range=5)
            from app.features.hotspot.climate_sync import sync_all_climate_for_hotspots
            await sync_all_climate_for_hotspots()
            print("✅ [Scheduler] Pipeline sinkronisasi otomatis selesai.")
        except Exception as e_sched:
            print(f"⚠️ [Scheduler Error] Pipeline sinkronisasi otomatis gagal: {e_sched}")

    try:
        scheduler.add_job(
            scheduled_sync_pipeline,
            CronTrigger(hour="4,16", minute="0", timezone="Asia/Jakarta"),
            id="nasa_firms_and_climate_sync_job",
            replace_existing=True
        )
        scheduler.start()
        print("⏰ [Scheduler] APScheduler started: FIRMS & Climate auto-sync scheduled daily at 04:00 & 16:00 WIB (Asia/Jakarta).")
    except Exception as e:
        print(f"⚠️ [Scheduler Warning] Failed to start APScheduler: {e}")

    # Auto-fetch FIRMS & Climate data on startup in background (non-blocking)
    async def initial_startup_sync():
        try:
            print("🚀 [Startup Sync] Memulai auto-fetch awal NASA FIRMS & Iklim Dinamis di background...")
            res = await sync_nasa_firms_data(day_range=5)
            print(f"✅ [Startup Sync Finished] FIRMS result: {res.get('message', 'Completed')}")
            from app.features.hotspot.climate_sync import sync_all_climate_for_hotspots
            await sync_all_climate_for_hotspots()
            print("✅ [Startup Sync Finished] Iklim dinamis untuk titik hotspot aktif berhasil disinkronkan.")
        except Exception as e_sync:
            print(f"⚠️ [Startup Sync Error] Initial auto-fetch failed: {e_sync}")

    asyncio.create_task(initial_startup_sync())

    yield

    # Shutdown scheduler & database engine
    try:
        scheduler.shutdown()
        print("🛑 [Scheduler] APScheduler shut down gracefully.")
    except Exception as e:
        print(f"⚠️ [Scheduler Warning] Exception during scheduler shutdown: {e}")

    await async_engine.dispose()

app = FastAPI(
    title="NASA FIRMS Hotspot & Climate WebGIS API",
    description="Python FastAPI backend for Hotspots, Peatlands, Land Cover, Temperature, Rainfall & Soil Moisture.",
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
app.include_router(core_router)
app.include_router(hotspot_router)
app.include_router(peatland_router)
app.include_router(land_cover_router)
app.include_router(temperature_router)
app.include_router(rainfall_router)
app.include_router(soil_moisture_router)
app.include_router(analytics_router)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
