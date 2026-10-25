# 🛰️ WebGIS Pemantauan Titik Api (NASA FIRMS) & Lahan Gambut Indonesia

Aplikasi WebGIS interaktif berbasis Monorepo untuk analisis spasial persebaran titik api (hotspot kebakaran hutan), tutupan lahan (*land cover*), kondisi iklim & hidrologi (ERA5), serta analisis risiko di area lahan gambut Indonesia.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur & Integrasi API](#-arsitektur--integrasi-api)
   - [A. NASA FIRMS API (Hotspot Kebakaran Hutan)](#a-nasa-firms-api-hotspot-kebakaran-hutan)
   - [B. Esri Sentinel-2 Land Cover 10m](#b-esri-sentinel-2-land-cover-10m)
   - [C. ESA WorldCover & Local GeoTIFF Parser](#c-esa-worldcover--local-geotiff-parser)
   - [D. ERA5 Climate & Hidrologi](#d-era5-climate--hidrologi)
3. [Struktur Monorepo](#-struktur-monorepo)
4. [Prasyarat Sistem](#-prasyarat-sistem)
5. [Langkah-Langkah Instalasi & Menjalankan (Docker)](#-langkah-langkah-instalasi--menjalankan-docker)
6. [Langkah-Langkah Manual (Local Development)](#-langkah-langkah-manual-local-development)
   - [Setup Database PostGIS](#1-setup-database-postgis)
   - [Setup Backend (FastAPI)](#2-setup-backend-fastapi)
   - [Setup Frontend (React + Vite)](#3-setup-frontend-react--vite)
7. [Daftar Endpoint API Backend](#-daftar-endpoint-api-backend)

---

## 🌟 Fitur Utama
- **Visualisasi Hotspot Real-Time**: Sinkronisasi otomatis data titik panas aktif dari sensor satelit VIIRS SNPP, NOAA-20, & MODIS.
- **Analisis Spasial Point-in-Polygon PostGIS**: Deteksi titik api yang berada tepat di dalam kawasan kubah lahan gambut Indonesia (`ST_Intersects`).
- **Peta Tutupan Lahan (Land Cover 10m)**: Integrasi layanan WMS/ImageServer *Esri Sentinel-2 10m LULC* secara *seamless* tanpa membebani penyimpanan database lokal.
- **Layer Iklim ERA5**: Pemetaan suhu udara permukaan (*t2m*), curah hujan (*tp*), dan kelembaban tanah (*swvl1*).
- **Client-Side GeoTIFF Raster Support**: Unggah dan olah data raster `.tif` lokal langsung di peramban menggunakan WebAssembly/Leaflet GeoRaster.

---

## 🔗 Arsitektur & Integrasi API

### A. NASA FIRMS API (Hotspot Kebakaran Hutan)
Sistem menggunakan API **NASA FIRMS (Fire Information for Resource Management System)** untuk memantau titik api NRT (*Near Real-Time*).

1. **Cara Mendapatkan MAP_KEY (Gratis)**:
   - Kunjungi: [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)
   - Masukkan email kamu, NASA akan mengirimkan 32 karakter kunci MAP_KEY ke email.
2. **Cara Kerja Sinkronisasi Backend**:
   - Backend memanggil endpoint area NASA FIRMS untuk bounding box Indonesia (`95,-11,141,6`):
     ```text
     https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}
     ```
   - Sensor satelit yang didukung: `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `MODIS_NRT`.
   - Data otomatis difilter agar hanya mencakup teritorial Indonesia, lalu disimpan ke PostGIS via batch *upsert* (`ON CONFLICT DO NOTHING`).
   - Scheduler internal (APScheduler) menjalankan sinkronisasi otomatis 2x sehari (00:00 & 12:00 WIB), atau bisa dipicu manual lewat endpoint API `/api/hotspots/sync`.

### B. Esri Sentinel-2 Land Cover 10m
Layanan tutupan lahan global resolusi tinggi (10 meter) dari Esri & Impact Observatory.

1. **Format Layanan**: ArcGIS ImageServer Tile / Web Map Service (WMS).
2. **Endpoint**:
   ```text
   https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/WMSServer
   ```
3. **Cara Kerja di Frontend**:
   - Frontend mengimplementasikan *custom Slippy TileLayer* (`EsriImageServerTileLayer`) menggunakan Leaflet.
   - Peta meminta tile per grid koordinat 256x256 pixel secara dinamis ke server Esri saat pengguna menggeser atau memperbesar peta.
   - **Kelebihan**: Tidak memerlukan download file raster puluhan Gigabyte ke server lokal dan tidak memberatkan database.
4. **Klasifikasi Tutupan Lahan**:
   - Air / Badan Air (Nilai 1)
   - Hutan / Pepohonan (Nilai 2)
   - Rawa / Gambut / Lahan Basah (Nilai 4)
   - Pertanian / Perkebunan (Nilai 5)
   - Pemukiman / Kawasan Terbangun (Nilai 7)
   - Tanah Terbuka / Gundul (Nilai 8)
   - Salju / Es (Nilai 9)
   - Awan (Nilai 10)
   - Semak Belukar / Padang Rumput (Nilai 11)

### C. ESA WorldCover & Local GeoTIFF Parser
- **ESA WorldCover 10m**: Alternatif tutupan lahan global dari *European Space Agency* via Terrascope WMS (`https://services.terrascope.be/wms/v2`).
- **GeoTIFF Parser Client-Side**: Pengguna dapat mengunggah file `.tif` tutupan lahan lokal (seperti file `47N_20250101-20251231.tif`) langsung ke peta tanpa perlu mengunggah ke database.

### D. ERA5 Climate & Hidrologi
Dataset iklim reanalisis ECMWF ERA5 mencakup:
- **Suhu Udara (2m Temperature - `t2m`)**: Disajikan dalam satuan derajat Celcius (°C).
- **Curah Hujan Total (`tp`)**: Volume presipitasi dalam milimeter (mm).
- **Kelembaban Tanah Lapisan 1 (`swvl1`)**: Volumetric soil water layer (m³/m³).

---

## 📁 Struktur Monorepo

```text
FIRMS-WEBGIS/
├── docker-compose.yml          # Konfigurasi orkestrasi seluruh kontainer
├── init.sql                    # Skrip inisialisasi PostGIS (tabel, ekstensi, indeks GiST)
├── .gitignore                  # Filter berkas besar (data/, node_modules, dll)
├── README.md                   # Dokumentasi panduan lengkap
│
├── backend/                    # Backend API (Python FastAPI + GeoAlchemy2)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── entrypoint.sh           # Runner backend + auto-seeder
│   ├── .env.example
│   └── app/
│       ├── main.py             # Entrypoint FastAPI & APScheduler
│       ├── seed.py             # Database seeder otomatis (Peatlands & ERA5)
│       ├── core/               # Konfigurasi DB & koneksi SQLAlchemy
│       └── features/           # Modul fitur (hotspot, peatland, temperature, rainfall, soil)
│
├── frontend/                   # Frontend SPA (React + TypeScript + Tailwind + Leaflet)
│   ├── Dockerfile
│   ├── nginx.conf              # Reverse proxy routing /api/ ke backend
│   ├── package.json
│   └── src/
│       ├── map/                # Komponen peta dasar & kontrol layer
│       ├── modules/            # Modul fitur (hotspot, peatland, land_cover)
│       └── shared/             # Utilitas spasial & tipe TypeScript
│
└── data/                       # (Lokal) Tempat menaruh dataset mentah/CSV/GeoJSON
    ├── hotspots_7years_clean.csv
    ├── era5_clean_7_tahun.csv
    └── raw data/
        └── Indonesia_Peat_Lands.geojson
```

---

## 💻 Prasyarat Sistem
- **Docker** (versi 24.0+) & **Docker Compose** (versi v2.20+)
- *Jika ingin menjalankan manual tanpa Docker*:
  - Python 3.10+ dengan pustaka GDAL/GEOS
  - Node.js 18+ & npm
  - PostgreSQL 15+ dengan ekstensi **PostGIS 3.3+**

---

## 🚀 Langkah-Langkah Instalasi & Menjalankan (Docker)

Metode ini adalah cara paling mudah dan direkomendasikan untuk anggota tim:

### 1. Clone Repository
```bash
git clone https://github.com/Fairuz-DevCode/FIRMS-WEBGIS.git
cd FIRMS-WEBGIS
```

### 2. Siapkan File Konfigurasi Environment Backend
Salin contoh file `.env.example` ke `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Buka file `backend/.env` dan masukkan API Key NASA FIRMS kamu pada baris:
```ini
MAP_KEY=masukkan_32_karakter_key_nasa_disini
```

### 3. Pastikan File Dataset Berada di Folder `data/`
Pastikan dataset berikut tersedia di dalam folder `data/` pada root proyek:
- `data/hotspots_7years_clean.csv`
- `data/era5_clean_7_tahun.csv`
- `data/raw data/Indonesia_Peat_Lands.geojson`

### 4. Jalankan Kontainer Docker
Cukup jalankan satu perintah:
```bash
docker compose up --build
```

Docker akan secara otomatis:
1. Menjalankan kontainer **PostgreSQL + PostGIS** (`firms_postgres_db`).
2. Menjalankan skrip `init.sql` untuk membuat tabel & memuat data CSV hotspots historis.
3. Menjalankan kontainer **FastAPI Backend** (`firms_backend`), mengeksekusi `seed.py` untuk mengimpor polygon gambut dan grid ERA5 ke PostGIS.
4. Melakukan kompilasi **React Frontend** dan menyajikannya lewat **Nginx** (`firms_frontend`).
5. Menjalankan **pgAdmin 4** untuk kemudahan inspeksi database lewat GUI.

### 5. Akses Layanan
- **WebGIS Interface**: Buka browser di [http://localhost:3000](http://localhost:3000)
- **API Documentation (Swagger UI)**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **pgAdmin 4**: [http://localhost:5050](http://localhost:5050)
  - *Email*: `admin@admin.com`
  - *Password*: `admin`
  - *Host PostGIS*: `db` (port `5432`)

---

## 🛠️ Langkah-Langkah Manual (Local Development)

Jika ingin menjalankan service secara terpisah tanpa Docker:

### 1. Setup Database PostGIS
Pastikan database PostgreSQL sudah aktif dan ekstensi PostGIS terpasang:
```sql
CREATE DATABASE firms_db;
\c firms_db
CREATE EXTENSION postgis;
```
Jalankan file `init.sql` ke database tersebut.

### 2. Setup Backend (FastAPI)
1. Buka folder backend dan aktifkan virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Pasang dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```
3. Sesuaikan koneksi database di `backend/.env`.
4. Jalankan seeder database:
   ```bash
   python -m app.seed
   ```
5. Jalankan backend server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
   ```

### 3. Setup Frontend (React + Vite)
1. Buka terminal baru dan masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Pasang package dependensi:
   ```bash
   npm install
   ```
3. Jalankan development server:
   ```bash
   npm run dev
   ```
4. Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 📡 Daftar Endpoint API Backend

| Kategori | Method | Endpoint | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Hotspot** | `GET` | `/api/hotspots` | Mengambil titik api GeoJSON (dengan filter tanggal, confidence, sensor) |
| **Hotspot** | `POST` | `/api/hotspots/sync` | Memanggil API NASA FIRMS untuk sinkronisasi titik api terbaru |
| **Hotspot** | `GET` | `/api/hotspots/{id}/environmental-factors` | Analisis intersection titik api dengan lahan gambut & data iklim ERA5 |
| **Peatland** | `GET` | `/api/peatland` | Mengambil data polygon gambut Indonesia (GeoJSON PostGIS) |
| **Peatland** | `GET` | `/api/peatland/analysis` | Analisis spasial persentase titik api yang jatuh di area gambut |
| **Temperature** | `GET` | `/api/temperature` | Data grid suhu udara permukaan (°C) |
| **Rainfall** | `GET` | `/api/rainfall` | Data grid curah hujan harian (mm) |
| **Soil Moisture** | `GET` | `/api/soil-moisture` | Data grid kelembaban tanah (*swvl1*) |

---

## 👥 Kontributor
- Tim Pengembang WebGIS Analisis Spasial FIRMS & Lahan Gambut Indonesia.
