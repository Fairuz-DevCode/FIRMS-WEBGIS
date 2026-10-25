# Software Requirements Specification (SRS)
## Interactive Spatial Map & WebGIS Analytics Application

**Project Name:** GeoPulse Spatial Analytics Platform  
**Course:** Spatial Information Systems (Mata Kuliah Spasial)  
**Document Version:** 1.0.0  
**Date:** September 18, 2026  

---

## 1. Introduction & Objectives

### 1.1 Purpose
The purpose of this document is to define the functional, non-functional, data, and architectural requirements for **GeoPulse Spatial Analytics Platform**, a modern WebGIS application designed to analyze, visualize, and interact with geospatial vector and raster datasets.

### 1.2 Scope
The application provides an interactive mapping dashboard enabling users to:
- Explore administrative regions with thematic choropleth data (population density, land usage, socio-economic metrics).
- View, filter, and inspect Categorized Points of Interest (POIs) such as health facilities, educational institutions, transit hubs, and disaster-prone zones.
- Visualize spatial density distributions using dynamic heatmap rendering.
- Execute real-time spatial proximity buffer analysis (1km, 3km, 5km radii) with automated feature intersection counting.
- Perform spatial geometric measurements (Euclidean/geodesic distance path measurement and polygon surface area calculation).
- Import custom GeoJSON datasets and export drawn spatial geometries.
- Analyze aggregated regional statistics via interactive dynamic charts (Chart.js).

---

## 2. System Architecture & Technology Stack

### 2.1 Architecture
The project follows a client-side modular spatial architecture:
- **Presentation Layer**: HTML5, Vanilla CSS Glassmorphism, CSS Custom Properties, Responsive Sidebar & Floating Toolbars.
- **Mapping Engine**: Leaflet.js (v1.9.4) for tile rendering, SVG marker rendering, and vector overlay management.
- **Spatial Processing Engine**: Turf.js (v6.5.0) for client-side geospatial calculations (buffer circles, point-in-polygon queries, distance/area calculations).
- **Data Visualization**: Chart.js (v4.4.1) for analytical charts synchronized with map view state.
- **Build System**: Vite (v5.x) ES module bundler.

---

## 3. Functional Requirements (FR)

### FR-1: Interactive Basemap Layer Management
- **FR-1.1**: The system MUST provide at least 4 distinct basemap tile providers:
  1. OpenStreetMap Standard (Vector/Raster hybrid street map)
  2. Esri WorldImagery (High-resolution satellite tiles)
  3. CartoDB Dark Matter (High-contrast dark theme vector tiles)
  4. OpenTopoMap (Topographic terrain elevation contour map)
- **FR-1.2**: Users MUST be able to seamlessly switch between basemaps using a floating tile selector widget.

### FR-2: Regional Choropleth Data Visualization
- **FR-2.1**: The system MUST render administrative region polygons with dynamic choropleth color classification based on spatial metrics (Population Density, Green Open Space %, Economic Index).
- **FR-2.2**: Hovering over any region polygon MUST highlight the geometry and display a floating tooltip showing region name, population, area, and key metrics.
- **FR-2.3**: Clicking a region MUST zoom the map view to the region boundaries and update sidebar chart analytics.

### FR-3: Categorized Points of Interest (POI) & Layer Filtering
- **FR-3.1**: The system MUST render POIs with distinct color-coded SVG markers categorized into:
  - Healthcare Facilities (Hospitals, Clinics)
  - Education (Universities, Schools)
  - Public Transportation (Stations, Terminals)
  - Disaster & Emergency Zones (Flood/Landslide Risk areas)
  - Commercial & Tech Hubs
- **FR-3.2**: Users MUST be able to toggle visibility of individual POI categories in real time.
- **FR-3.3**: Clicking any POI marker MUST open an interactive popup card with detailed attributes, coordinates, address, and status.

### FR-4: Spatial Density Heatmap Layer
- **FR-4.1**: The system MUST provide an optional Heatmap layer visualizing density distribution of urban events/incidents.
- **FR-4.2**: The heatmap layer opacity and radius MUST adjust dynamically according to zoom levels.

### FR-5: Spatial Proximity & Buffer Ring Analysis
- **FR-5.1**: Users MUST be able to activate a "Buffer Tool" and click any location on the map to generate concentric buffer circles (e.g. 1 km, 3 km, 5 km).
- **FR-5.2**: The system MUST compute point-in-polygon spatial intersections using Turf.js and report:
  - Total POIs within the buffer.
  - Category breakdown count inside the selected radius.
  - Affected population estimate within buffer area.

### FR-6: Spatial Measurement Tools
- **FR-6.1**: The system MUST provide a Distance Measurement tool allowing users to click consecutive points to measure total geodesic path length in meters or kilometers.
- **FR-6.2**: The system MUST provide an Area Measurement tool allowing users to draw polygons to compute enclosed ground surface area in square meters ($m^2$) or square kilometers ($km^2$).

### FR-7: Geocoding & Coordinate Location Search
- **FR-7.1**: The system MUST feature a search bar allowing users to search by location name, district, or coordinate pair (`Latitude, Longitude`).
- **FR-7.2**: Selecting a search result MUST fly the map view smoothly to the target location with an animated location pin.

### FR-8: Custom GeoJSON Data Import & Feature Drawing
- **FR-8.1**: Users MUST be able to drag-and-drop or upload custom `.geojson` or `.json` files. Imported layers MUST be rendered on the map and listed in the layer manager.
- **FR-8.2**: Users MUST be able to draw custom point markers, polyline paths, or polygon zones, and export them as a standard GeoJSON file.

### FR-9: Interactive Analytical Dashboard & Charts
- **FR-9.1**: The sidebar MUST render synchronized analytics widgets using Chart.js:
  - Bar Chart: District Population Density Ranking.
  - Doughnut Chart: POI Infrastructure Category Distribution.
  - Radar / Pie Chart: Regional Land Use Breakdown.
- **FR-9.2**: Filtering POIs or selecting regions MUST dynamically filter and update all analytical charts in real time.

### FR-10: Responsive Interface & Map Controls
- **FR-10.1**: The UI MUST render responsively across Desktop, Tablet, and Mobile viewport sizes.
- **FR-10.2**: Standard controls MUST include Zoom in/out buttons, Reset View button, Fullscreen toggle, Scale Bar (metric/imperial), and live Coordinate Tracker (`Lat: XX.XXXX, Lng: YY.YYYY`).

### FR-11: Dark & Light UI Theme Switcher
- **FR-11.1**: The application UI MUST support seamless switching between Dark Mode (sleek glassmorphism dark aesthetic) and Light Mode.

### FR-12: Built-in SRS Requirements Viewer
- **FR-12.1**: The application sidebar MUST include a "Requirements" tab that displays this SRS specification document directly inside the WebGIS app interface.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Responsiveness
- **NFR-1.1**: Initial map tile load time MUST be under 1.5 seconds on standard broadband connections.
- **NFR-1.2**: Client-side spatial queries (buffer analysis, point-in-polygon) MUST execute in under 100ms for datasets under 5,000 features.
- **NFR-1.3**: Map rendering MUST maintain 60 FPS smooth pan and zoom animations.

### NFR-2: Usability & User Experience (UX)
- **NFR-2.1**: Interface MUST feature glassmorphism panels, harmonious modern color palettes, high contrast typography, and intuitive icons.
- **NFR-2.2**: Tooltips and visual feedback MUST accompany all spatial tool interactions.

### NFR-3: Compatibility & Portability
- **NFR-3.1**: The web application MUST be compatible with modern evergreen web browsers: Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge.
- **NFR-3.2**: No client-side database backend is strictly required; all spatial processing operates browser-native via Web Workers / Web APIs.

### NFR-4: Accessibility (a11y) & Standards Compliance
- **NFR-4.1**: Interactive elements MUST feature descriptive `aria-label` attributes and focus outlines for keyboard navigation.
- **NFR-4.2**: Map features MUST conform to RFC 7946 GeoJSON specification standard.

---

## 5. Spatial Data Schemas

### 5.1 GeoJSON FeatureCollection Schema (Regions / Choropleth)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "REG-01",
      "properties": {
        "name": "Central District",
        "code": "CD-01",
        "population": 245000,
        "area_km2": 18.5,
        "density_per_km2": 13243,
        "green_space_pct": 24.5,
        "economic_index": 88.2,
        "land_use": { "residential": 45, "commercial": 30, "industrial": 5, "green": 20 }
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [ [ [106.82, -6.17], [106.85, -6.17], [106.85, -6.20], [106.82, -6.20], [106.82, -6.17] ] ]
      }
    }
  ]
}
```

### 5.2 GeoJSON FeatureCollection Schema (Points of Interest)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "POI-101",
      "properties": {
        "name": "General Hospital",
        "category": "healthcare",
        "capacity": 350,
        "status": "Active",
        "address": "Jl. Utama No. 12"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [106.8324, -6.1856]
      }
    }
  ]
}
```

---

## 6. Verification & Acceptance Criteria

1. **SRS Completeness**: `requirment.md` MUST be fully accessible and readable both in markdown format and within the application dashboard.
2. **Basemap Switching**: All 4 map tile basemaps MUST load tiles correctly without broken links or tile tearing.
3. **Layer Controls**: Toggling Choropleth, POIs, or Heatmap layers MUST instantly update map overlays.
4. **Spatial Analysis Verification**: Drawing a 3km buffer circle MUST calculate exact intersecting POI markers and display detailed category breakdown in modal popups and sidebar widgets.
5. **Chart Synchronization**: Modifying POI category filters MUST immediately recalculate chart data without page reload.
6. **Data Import/Export**: Uploading a `.geojson` file MUST render the user's features on the map, and drawing custom features MUST export a valid `.geojson` file.

---

*End of Software Requirements Specification Document.*
