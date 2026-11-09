#!/usr/bin/env python3
"""
Script Import Data ERA5 Daily (NetCDF) ke PostgreSQL PostGIS
Tabel target:
- temperature (waktu, latitude, longitude, suhu_celsius, is_indonesia, geom)
- rainfall_data (waktu, latitude, longitude, curah_hujan_mm, is_indonesia, geom)
- soil_moisture_data (waktu, latitude, longitude, soil_moisture, is_indonesia, geom)
"""

import os
import glob
import time
import zipfile
import tempfile
import psycopg2
import xarray as xr
import pandas as pd
import numpy as np
from datetime import datetime

# Ambil konfigurasi database dari environment
DB_HOST = os.getenv("DB_HOST", "db")
DB_USER = os.getenv("DB_USER", "firms_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "firms_password")
DB_NAME = os.getenv("DB_NAME", "firms_db")
DB_PORT = os.getenv("DB_PORT", "5432")

ERA5_DIR = os.getenv("ERA5_DIR", "/app/data/era5_daily")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        port=DB_PORT
    )

def setup_indexes(drop=False):
    """
    Optimasi: Drop index sementara saat bulk import massal,
    kemudian buat ulang setelah semua file selesai di-import.
    """
    conn = get_connection()
    conn.autocommit = True
    cur = conn.cursor()

    indexes = [
        ("ix_temperature_waktu", "temperature", "waktu", "btree"),
        ("idx_temperature_geom", "temperature", "geom", "gist"),
        ("ix_rainfall_data_waktu", "rainfall_data", "waktu", "btree"),
        ("idx_rainfall_data_geom", "rainfall_data", "geom", "gist"),
        ("ix_soil_moisture_data_waktu", "soil_moisture_data", "waktu", "btree"),
        ("idx_soil_moisture_data_geom", "soil_moisture_data", "geom", "gist"),
    ]

    if drop:
        print("\n⚡ [OPTIMASI] Menghapus index sekunder sementara untuk mempercepat bulk insert...")
        for idx_name, _, _, _ in indexes:
            cur.execute(f"DROP INDEX IF EXISTS {idx_name};")
            print(f"   ✓ Index {idx_name} di-drop.")
    else:
        print("\n🔧 [OPTIMASI] Membangun kembali index sekunder & spatial index (GIST)...")
        for idx_name, tbl, col, itype in indexes:
            t0 = time.time()
            if itype == "gist":
                cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {tbl} USING gist ({col});")
            else:
                cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {tbl} USING btree ({col});")
            print(f"   ✓ Index {idx_name} selesai dibuat ({time.time() - t0:.2f}s)")

        # Analisis tabel untuk query optimizer
        print("📊 Menjalankan ANALYZE pada tabel iklim...")
        cur.execute("ANALYZE temperature;")
        cur.execute("ANALYZE rainfall_data;")
        cur.execute("ANALYZE soil_moisture_data;")
        print("   ✓ ANALYZE selesai.")

    cur.close()
    conn.close()

def get_already_imported_dates():
    """Mengambil tanggal-tanggal yang sudah ada di database agar idempotent (skip duplikat)"""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT date(waktu) FROM temperature;")
    dates = {row[0] for row in cur.fetchall()}
    cur.close()
    conn.close()
    return dates

def process_and_import_nc(nc_path: str, existing_dates: set):
    """Membaca file zip .nc, menyaring tanggal baru, dan mengimpor ke 3 tabel secara cepat."""
    t0 = time.time()
    filename = os.path.basename(nc_path)
    print(f"\n📂 Memproses file: {filename}...")

    conn = get_connection()
    cur = conn.cursor()

    with zipfile.ZipFile(nc_path) as z:
        with tempfile.TemporaryDirectory() as tmpdir:
            z.extractall(tmpdir)
            files = os.listdir(tmpdir)

            f_temp = next((f for f in files if "temp" in f), None)
            f_prec = next((f for f in files if "precip" in f), None)
            f_soil = next((f for f in files if "soil" in f), None)

            if not (f_temp and f_prec and f_soil):
                print(f"⚠️ File tidak lengkap di {filename}, dilewati.")
                cur.close()
                conn.close()
                return 0

            ds_t = xr.open_dataset(os.path.join(tmpdir, f_temp))
            ds_p = xr.open_dataset(os.path.join(tmpdir, f_prec))
            ds_s = xr.open_dataset(os.path.join(tmpdir, f_soil))

            all_times = ds_t['valid_time'].values.astype('datetime64[D]')
            
            # Cek filter tanggal yang belum di-import
            valid_indices = []
            for idx, np_dt in enumerate(all_times):
                dt_obj = pd.Timestamp(np_dt).date()
                if dt_obj not in existing_dates:
                    valid_indices.append(idx)

            if not valid_indices:
                print(f"⏭️  Semua ({len(all_times)}) tanggal di file ini sudah ada di database. Dilewati.")
                cur.close()
                conn.close()
                return 0

            # Filter data hanya untuk tanggal yang belum di-import
            times_to_import = ds_t['valid_time'].values[valid_indices].astype('datetime64[s]')
            lats = ds_t['latitude'].values
            lons = ds_t['longitude'].values

            # Konversi satuan:
            # t2m: Kelvin -> Celsius
            # tp: meter -> mm
            # swvl1: m^3/m^3 (tetap)
            t2m_vals = (ds_t['t2m'].values[valid_indices] - 273.15).round(2)
            tp_vals = (ds_p['tp'].values[valid_indices] * 1000.0).round(2)
            swvl1_vals = ds_s['swvl1'].values[valid_indices].round(4)

            nt = len(times_to_import)
            nlat = len(lats)
            nlon = len(lons)
            total_records = nt * nlat * nlon

            t_arr = np.repeat(times_to_import, nlat * nlon)
            lat_arr = np.tile(np.repeat(lats, nlon), nt)
            lon_arr = np.tile(lons, nt * nlat)

            df = pd.DataFrame({
                'waktu': t_arr,
                'lat': lat_arr,
                'lon': lon_arr,
                't2m': t2m_vals.ravel(),
                'tp': tp_vals.ravel(),
                'swvl1': swvl1_vals.ravel()
            })

            staging_csv = os.path.join(tmpdir, "staging.tsv")
            df.to_csv(staging_csv, sep='\t', index=False, header=False)

            # Buat temporary staging table dalam transaksi
            cur.execute("""
                CREATE TEMP TABLE tmp_era5_import (
                    waktu TIMESTAMP,
                    latitude DOUBLE PRECISION,
                    longitude DOUBLE PRECISION,
                    t2m DOUBLE PRECISION,
                    tp DOUBLE PRECISION,
                    swvl1 DOUBLE PRECISION
                ) ON COMMIT DROP;
            """)

            with open(staging_csv, 'r') as f:
                cur.copy_from(f, 'tmp_era5_import')

            # Insert ke temperature
            cur.execute("""
                INSERT INTO temperature (waktu, latitude, longitude, suhu_celsius, is_indonesia, geom)
                SELECT waktu, latitude, longitude, t2m, true, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                FROM tmp_era5_import;
            """)

            # Insert ke rainfall_data
            cur.execute("""
                INSERT INTO rainfall_data (waktu, latitude, longitude, curah_hujan_mm, is_indonesia, geom)
                SELECT waktu, latitude, longitude, tp, true, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                FROM tmp_era5_import;
            """)

            # Insert ke soil_moisture_data
            cur.execute("""
                INSERT INTO soil_moisture_data (waktu, latitude, longitude, soil_moisture, is_indonesia, geom)
                SELECT waktu, latitude, longitude, swvl1, true, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                FROM tmp_era5_import;
            """)

            conn.commit()

            # Catat tanggal yang baru ditambahkan ke existing_dates set
            for idx in valid_indices:
                existing_dates.add(pd.Timestamp(all_times[idx]).date())

            duration = time.time() - t0
            print(f"✅ Sukses import {filename}: {nt} hari ({total_records:,} baris x 3 tabel) dalam {duration:.2f}s")
            cur.close()
            conn.close()
            return total_records

def main():
    print("=" * 70)
    print("🚀 PROSES IMPORT ERA5 DAILY KE POSTGRESQL / POSTGIS (2019 - 2026)")
    print(f"   Direktori Data : {ERA5_DIR}")
    print(f"   Target Tabel   : temperature, rainfall_data, soil_moisture_data")
    print("=" * 70)

    nc_files = sorted(glob.glob(os.path.join(ERA5_DIR, "*.nc")))
    if not nc_files:
        print(f"❌ Tidak ada file .nc yang ditemukan di {ERA5_DIR}")
        return

    print(f"Ditemukan {len(nc_files)} file .nc.")

    # Cek tanggal yang sudah ada di database
    existing_dates = get_already_imported_dates()
    print(f"📅 Jumlah tanggal yang sudah ada di database: {len(existing_dates)}")

    # Drop index agar bulk insert berjalan sangat cepat
    setup_indexes(drop=True)

    total_inserted = 0
    start_time = time.time()

    try:
        for idx, file_path in enumerate(nc_files, 1):
            print(f"\n[{idx}/{len(nc_files)}]", end=" ")
            count = process_and_import_nc(file_path, existing_dates)
            total_inserted += count
    finally:
        # Buat kembali index meskipun ada error/interupsi
        setup_indexes(drop=False)

    total_time = time.time() - start_time
    print("\n" + "=" * 70)
    print(f"🎉 SELURUH PROSES IMPORT SELESAI!")
    print(f"   Total record di-import: {total_inserted:,} baris per tabel")
    print(f"   Total waktu proses    : {total_time:.2f} detik ({total_time/60:.2f} menit)")
    print("=" * 70)

if __name__ == "__main__":
    main()
