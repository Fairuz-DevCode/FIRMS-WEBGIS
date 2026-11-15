# NASA FIRMS Real-Time Hotspot API Guide (Phase 2 - TypeScript Edition)

This document provides complete instructions for configuring, running, and testing **Phase 2: Real-time NASA FIRMS Hotspot Overlay System** built with **Node.js/Express (TypeScript)** and **React + Leaflet (TypeScript)**.

---

## 1. How to Obtain a Free NASA FIRMS MAP_KEY

1. Visit the official NASA FIRMS MAP_KEY registration page:  
   👉 **[https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)**
2. Enter your valid email address and click **Submit**.
3. NASA will instantly send a confirmation email containing your unique **32-character MAP_KEY** (e.g., `a1b2c3d4e5f67890123456789abcdef0`).
4. Copy your key and add it to `backend/.env`:

```env
PORT=4000
NASA_FIRMS_MAP_KEY=a1b2c3d4e5f67890123456789abcdef0
```

> **Note on Simulated Fallback Data:**  
> If `NASA_FIRMS_MAP_KEY` is not set or set to `your_api_key_here`, the Express backend automatically generates a realistic simulated Indonesia active hotspot dataset (covering Riau, South Sumatra, West Kalimantan, Central Kalimantan peatland areas). This ensures the application runs and renders immediately out-of-the-box!

---

## 2. Project Architecture & Setup

### Project Directory Structure
```
project map/
├── backend/                  # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── types/
│   │   │   └── hotspot.ts    # GeoJSON & API Type Definitions
│   │   ├── services/
│   │   │   └── nasaService.ts# NASA FIRMS CSV Fetcher & Cache Service
│   │   ├── controllers/
│   │   │   └── hotspotController.ts # GET /api/hotspots handler
│   │   ├── routes/
│   │   │   └── hotspotRoutes.ts    # Express Route Definition
│   │   ├── app.ts            # Express App Middleware
│   │   └── server.ts         # Server Bootstrap (Port 4000)
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                 # React 18 + Leaflet + TypeScript Frontend
    ├── src/
    │   ├── types/
    │   │   └── gis.ts        # Frontend GIS Interfaces
    │   ├── components/
    │   │   ├── HotspotLayer.tsx   # Hotspot Map Layer Component
    │   │   ├── PeatlandLayer.tsx  # Phase 1 Peatland Layer Component
    │   │   ├── ControlPanel.tsx   # Interactive Drawer & Sensor Filters
    │   │   └── MapView.tsx        # Leaflet MapContainer Component
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── tsconfig.json
```

---

## 3. How to Run & Test the Application

### Step 1: Start the Backend Server
```bash
cd backend
npm run dev
```
*The Express TS server will start on `http://localhost:4000`.*

### Step 2: Start the Frontend React App
Open a new terminal tab:
```bash
cd frontend
npm run dev
```
*Vite will start the React TS application on `http://localhost:3000`.*

---

## 4. How to Test the API Endpoint

You can test the backend API endpoint directly via `curl`, Postman, or your browser:

### 1. Default Query (VIIRS_SNPP_NRT, 1 Day)
```bash
curl "http://localhost:4000/api/hotspots"
```

### 2. Custom Sensor & Time Window Query
```bash
curl "http://localhost:4000/api/hotspots?sensor=VIIRS_NOAA20_NRT&days=3"
curl "http://localhost:4000/api/hotspots?sensor=MODIS_NRT&days=5"
```

### Expected GeoJSON Response Format:
```json
{
  "status": "success",
  "sensor": "VIIRS_SNPP_NRT",
  "days": 1,
  "count": 42,
  "source": "nasa_firms_live",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [102.15, 0.82]
        },
        "properties": {
          "latitude": 0.82,
          "longitude": 102.15,
          "brightness": 368.5,
          "confidence": "high",
          "acq_date": "2026-09-18",
          "acq_time": "0530",
          "sensor": "VIIRS_SNPP_NRT",
          "satellite": "NPP",
          "frp": 84.2,
          "daynight": "D"
        }
      }
    ]
  }
}
```

---

## 5. Key Features Implemented

1. **TypeScript End-to-End**: Full type safety for GeoJSON structures, NASA API parameters, Express requests/responses, and React props.
2. **Dynamic Satellite Sensor Filter**: Switch between `VIIRS_SNPP_NRT` (375m), `VIIRS_NOAA20_NRT` (375m), `VIIRS_NOAA21_NRT` (375m), and `MODIS_NRT` (1km).
3. **Indonesia Bounding Box Filtering**: Bounding box fixed to `MinLon: 95.0, MinLat: -11.0, MaxLon: 141.0, MaxLat: 6.0`.
4. **15-Minute In-Memory Caching**: Implemented using `node-cache` (900 seconds TTL) to prevent NASA API rate limits.
5. **Interactive Hotspot Marker Styling**:
   - 🔴 **High Confidence / Bright (>355 K)**: Dark Red Marker
   - 🟠 **Nominal Confidence (330 K - 355 K)**: Orange Marker
   - 🟡 **Low Confidence (<330 K)**: Yellow Marker
6. **Detailed Popup Inspector**: Displays Acquisition Date & Time, Satellite/Sensor, Brightness Temperature (K), Confidence Level (%), Fire Radiative Power (FRP in MW), and Lat/Long coordinates.
7. **Phase 1 Peatland Integration**: Peatland Hydrological Units (Sumatra & Kalimantan) rendered alongside real-time fire points to assess peat fire risk!
