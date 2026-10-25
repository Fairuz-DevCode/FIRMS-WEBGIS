# Implementation Plan - NASA FIRMS Extended Date Range & Basemap Fixes

Update the GeoPulse WebGIS backend and frontend control panel to support fetching active hotspot points starting from September 5, 2026 (14 days up to 30 days max), and update the basemap selector options.

## User Review Required

> [!NOTE]
> - Today's date is **September 18, 2026**.
> - Date range from **September 5, 2026** to **September 18, 2026** spans **14 days**.
> - Backend default time range will be initialized to 14 days (spanning 2026-09-05 to current date), and slider range in UI control panel will allow up to 30 days.

## Proposed Changes

### Backend Components

#### [MODIFY] [nasaService.ts](file:///home/allrole/Documents/Mata%20Kuliah/spasial/project%20map/backend/src/services/nasaService.ts)
- Update `getHotspotsFromNasa` limit clamp for `numDays` from `Math.min(..., 10)` to `Math.min(..., 30)`.
- Implement dynamic calculation for default days between `2026-09-05` and current date (`2026-09-18` -> 14 days).
- Update `generateFallbackHotspots` to generate dates spanning back from Sept 18, 2026 down to Sept 5, 2026 (or requested `days` count up to 30 days).

#### [MODIFY] [hotspotController.ts](file:///home/allrole/Documents/Mata%20Kuliah/spasial/project%20map/backend/src/controllers/hotspotController.ts)
- Set default `days` query parameter to 14 days (covering 2026-09-05 to 2026-09-18) if unspecified.

---

### Frontend Components

#### [MODIFY] [ControlPanel.tsx](file:///home/allrole/Documents/Mata%20Kuliah/spasial/project%20map/frontend/src/components/ControlPanel.tsx)
- Update Time Window range slider `max` attribute from `10` to `30`.
- Add Date Range Picker / preset indicator showing starting date `2026-09-05` to current date (`2026-09-18`).
- Ensure Basemap Dropdown includes:
  - `osm`: OpenStreetMap Standard (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
  - `esri_sat`: Esri World Imagery Satellite (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`)
  - `esri_gray`: Esri Light Gray Canvas
  - `carto_light`: CartoDB Positron Light
  - `carto_dark`: CartoDB Dark Matter
  - `opentopo`: OpenTopoMap Topographic

#### [MODIFY] [MapView.tsx](file:///home/allrole/Documents/Mata%20Kuliah/spasial/project%20map/frontend/src/components/MapView.tsx)
- Set default `days` state to `14` (Sept 5, 2026 – Sept 18, 2026).
- Expand `BasemapType` union and `BASEMAP_URLS` lookup object with verified tile URLs and attributions for OpenStreetMap Standard and Esri World Imagery Satellite alongside Carto & OpenTopo maps.

#### [MODIFY] [HotspotLayer.tsx](file:///home/allrole/Documents/Mata%20Kuliah/spasial/project%20map/frontend/src/components/HotspotLayer.tsx)
- Pass date and time window parameter options smoothly to backend API.

---

## Verification Plan

### Automated Tests & Compilation Verification
- Backend TypeScript compilation check:
  ```bash
  cd backend && npm run build
  ```
- Frontend TypeScript compilation & Vite build check:
  ```bash
  cd frontend && npm run build
  ```

### Manual Verification
- Test backend API via curl:
  ```bash
  curl "http://localhost:4000/api/hotspots?days=14"
  ```
- Verify GeoJSON features contain acquisition dates starting from `2026-09-05`.
- Test basemap layer switching between OpenStreetMap, Esri World Imagery Satellite, Esri Light Gray, CartoDB Light/Dark, and OpenTopo.
