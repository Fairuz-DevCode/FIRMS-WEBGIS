# ️ Modul Climate (Iklim)

Dokumentasi untuk modul iklim yang mencakup parameter cuaca dan lingkungan:
- **Curah Hujan (Rainfall)**: Akumulasi harian dari ERA5 dan Open-Meteo (`precipitation_sum`).
- **Suhu Udara (Temperature)**: Rata-rata harian (`temperature_2m_mean`).
- **Kelembapan Tanah (Soil Moisture)**: Nilai kelembapan tanah lapisan atas 0–7 cm (`soil_moisture_0_to_7cm`).

---

##  Rencana Pembahasan
1. Arsitektur Data Historis (ERA5) vs Data Dinamis (Open-Meteo).
2. Mekanisme Grid Daratan Indonesia (~850-1350 titik) & Batch Query.
3. Struktur Database PostGIS (`rainfall_data`, `temperature`, `soil_moisture_data`).
4. Pipeline Interpolasi Spasial 2D (Smooth Cosine Kernel) di Frontend (`ClimateLayer.tsx`).
5. Masking Batas Wilayah Kepulauan Indonesia.
