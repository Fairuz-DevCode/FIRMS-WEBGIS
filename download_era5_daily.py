#!/usr/bin/env python3
"""
Script Otomatis Download Data Iklim Harian (ERA5 Single Levels Daily Statistics) dari Copernicus CDS
Mencakup:
- 2m_temperature (Suhu Udara Rata-rata)
- total_precipitation (Curah Hujan Rata-rata)
- volumetric_soil_water_layer_1 (Kelembapan Tanah Rata-rata)
Rentang: 2019 s/d 2026 (Per 4 Bulan per request / Caturwulan)
Wilayah: Indonesia [North: 6, West: 95, South: -11, East: 141]
"""

import os
import sys
import time
from pathlib import Path

DATASET = 'derived-era5-single-levels-daily-statistics'

def download_era5_chunk(client, year: int, months: list[int], output_dir: Path):
    start_m = months[0]
    end_m = months[-1]
    chunk_name = f"{year}_m{start_m:02d}_{end_m:02d}"
    output_file = output_dir / f"era5_daily_{chunk_name}.nc"

    if output_file.exists() and output_file.stat().st_size > 50000:
        print(f"⏭️  [SKIP] {output_file.name} sudah ada ({round(output_file.stat().st_size / (1024*1024), 2)} MB). Melewati download.")
        return output_file

    month_strs = [f"{m:02d}" for m in months]
    month_names_preview = f"Bulan {start_m:02d} s/d {end_m:02d}"
    print(f"\n📥 [REQUEST] Mengirim permintaan harian: {year} - {month_names_preview} ({', '.join(month_strs)})...")

    # Semua tanggal 01 s/d 31 (CDS akan otomatis menyesuaikan hari aktual per bulan)
    days = [f"{d:02d}" for d in range(1, 32)]

    request = {
        'product_type': 'reanalysis',
        'variable': [
            '2m_temperature',
            'total_precipitation',
            'volumetric_soil_water_layer_1',
        ],
        'year': str(year),
        'month': month_strs,
        'day': days,
        'daily_statistic': 'daily_mean',
        'time_zone': 'utc+00:00',
        'frequency': '6_hourly',
        'area': [6.0, 95.0, -11.0, 141.0],  # Bounding Box Indonesia
    }

    retries = 3
    for attempt in range(1, retries + 1):
        try:
            client.retrieve(DATASET, request, str(output_file))
            print(f"✅ [SELESAI] Sukses terunduh: {output_file.name} ({round(output_file.stat().st_size / (1024*1024), 2)} MB)")
            # Beri jeda 5 detik antar request agar antrean server tetap tertib
            time.sleep(5)
            return output_file
        except Exception as e:
            err_msg = str(e)
            print(f"⚠️ [Percobaan {attempt}/{retries}] Gagal: {err_msg}")
            if "Maximum number queued requests" in err_msg:
                print("⏳ Antrean server penuh. Menunggu 30 detik sebelum mencoba lagi...")
                time.sleep(30)
            else:
                time.sleep(10)

    print(f"❌ [GAGAL] Tidak dapat mengunduh {chunk_name} setelah {retries} percobaan.")
    if output_file.exists() and output_file.stat().st_size < 50000:
        output_file.unlink()
    return None

def get_chunks(year: int, max_month: int = 12):
    """Membagi bulan menjadi batch 4 bulan: [1..4], [5..8], [9..12]"""
    chunks = []
    for start in range(1, max_month + 1, 4):
        end = min(start + 3, max_month)
        chunks.append(list(range(start, end + 1)))
    return chunks

def main():
    try:
        import cdsapi
    except ImportError:
        print("⚠️ Library 'cdsapi' belum terpasang. Memasang cdsapi...")
        os.system(f"{sys.executable} -m pip install --upgrade cdsapi")
        import cdsapi

    c = cdsapi.Client()

    output_dir = Path("data/era5_daily")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("🚀 SCRIPT DOWNLOAD IKLIM HARIAN INDONESIA (ERA5 DAILY STATS)")
    print("   Dataset  : derived-era5-single-levels-daily-statistics")
    print("   Variabel : Suhu 2m, Curah Hujan, Kelembapan Tanah Layer 1")
    print("   Frekuensi: Daily Mean (Harian 01-31)")
    print("   Metode   : Batch 4 Bulan per request (Caturwulan)")
    print(f"   Folder   : {output_dir.resolve()}")
    print("=" * 65)

    start_year = 2019
    end_year = 2026

    for year in range(start_year, end_year + 1):
        max_month = 10 if year == 2026 else 12
        chunks = get_chunks(year, max_month)
        for chunk in chunks:
            download_era5_chunk(c, year, chunk, output_dir)

    print("\n🎉 SELURUH PROSES DOWNLOAD SELESAI!")
    print(f"Semua file harian tersimpan di: {output_dir}")

if __name__ == "__main__":
    main()
