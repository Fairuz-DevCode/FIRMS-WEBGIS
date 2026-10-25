import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { SensorType, HotspotMatrixRow, HOTSPOT_COL } from '../../types/hotspot';
import { BASEMAPS, BasemapType } from '../constants/basemap.constants';
import { ISLANDS, PROVINCES } from '../../shared/constants/regions.constants';
import { ResearchModule } from '../../shared/constants/researchModules.constants';
import { HotspotLayer } from '../../modules/hotspot';
import { PeatlandLayer } from '../../modules/peatland';
import {
  LandCoverLayer,
  LandCoverLegend,
  GeoTIFFUploaderModal,
  LandCoverProvider,
  LAND_COVER_PROVIDERS,
} from '../../modules/land_cover';
import { GeoRaster } from 'georaster';
import { LayerControlPopover } from './LayerControlPopover';
import { CalendarFilterPopover } from './CalendarFilterPopover';
import MapResizeHandler from '../../shared/components/MapResizeHandler';
import ClimateLayer from './ClimateLayer';
import ClimateLegend from './ClimateLegend';

import SipongiHeader from './SipongiHeader';
import SatelliteStatsWidget from './SatelliteStatsWidget';
import BottomRightControls from './BottomRightControls';
import { isPointInPeatlands, preparePeatlandPolygons, PreparedPolygon } from '../../shared/utils/spatial.utils';

// Indonesia bounds & default center
const INDONESIA_CENTER: [number, number] = [-0.7893, 113.9213];
const DEFAULT_ZOOM = 5;

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && center && zoom) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [map, center, zoom]);
  return null;
}

function MapPaneInitializer() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // 1. Land Cover Pane (z-index 350, pointer-events none agar klik menembus ke marker di atasnya)
    if (!map.getPane('landCoverPane')) {
      const pane = map.createPane('landCoverPane');
      pane.style.zIndex = '350';
      pane.style.pointerEvents = 'none';
    }
    // 2. Climate Layers (z-index 400)
    if (!map.getPane('climatePane')) {
      const pane = map.createPane('climatePane');
      pane.style.zIndex = '400';
    }
    // 3. Peatland Polygons (z-index 450)
    if (!map.getPane('peatlandPane')) {
      const pane = map.createPane('peatlandPane');
      pane.style.zIndex = '450';
    }
    // 4. Hotspots (z-index 600 - Highest priority layer)
    if (!map.getPane('hotspotPane')) {
      const pane = map.createPane('hotspotPane');
      pane.style.zIndex = '600';
    }
  }, [map]);
  return null;
}

export const MapView: React.FC = () => {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedModule, setSelectedModule] = useState<ResearchModule>('BATAS_WILAYAH');
  const [sensor, setSensor] = useState<SensorType>('VIIRS_SNPP_NRT');
  const [dayRange, setDayRange] = useState<number>(1);
  const [dateFilterMode, setDateFilterMode] = useState<'range' | 'single' | 'days'>('single');
  const [singleDate, setSingleDate] = useState<string>(todayIso);
  const [startDate, setStartDate] = useState<string>(todayIso);
  const [endDate, setEndDate] = useState<string>(todayIso);
  const [basemap, setBasemap] = useState<BasemapType>('satellite');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [hotspotMode, setHotspotMode] = useState<'markers' | 'heatmap'>('markers');
  const [showPeatland, setShowPeatland] = useState<boolean>(true);
  const [peatlandOnly, setPeatlandOnly] = useState<boolean>(false);

  // Bottom-right floating popovers state ('layers' | 'calendar' | null)
  const [activePopover, setActivePopover] = useState<'layers' | 'calendar' | null>(null);

  // Climate / Hydrological layer states (Default 50% opacity)
  const [showRainfall, setShowRainfall] = useState<boolean>(false);
  const [rainfallOpacity, setRainfallOpacity] = useState<number>(0.5);
  const [showSoilMoisture, setShowSoilMoisture] = useState<boolean>(false);
  const [soilMoistureOpacity, setSoilMoistureOpacity] = useState<number>(0.5);
  const [showTemperature, setShowTemperature] = useState<boolean>(false);
  const [temperatureOpacity, setTemperatureOpacity] = useState<number>(0.5);

  // Land Cover frontend processing states (Default 50% opacity)
  const [showLandCover, setShowLandCover] = useState<boolean>(false);
  const [landCoverProvider, setLandCoverProvider] = useState<LandCoverProvider>('esri_sentinel2');
  const [landCoverOpacity, setLandCoverOpacity] = useState<number>(0.5);
  const [localGeoRaster, setLocalGeoRaster] = useState<GeoRaster | null>(null);
  const [localGeoTIFFFileName, setLocalGeoTIFFFileName] = useState<string | null>(null);
  const [isGeoTIFFModalOpen, setIsGeoTIFFModalOpen] = useState<boolean>(false);

  // Region filtering states
  const [selectedIsland, setSelectedIsland] = useState<string>('ALL');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number }>({
    center: INDONESIA_CENTER,
    zoom: DEFAULT_ZOOM
  });

  const [hotspotData, setHotspotData] = useState<HotspotMatrixRow[]>([]);
  const [peatlandPolygons, setPeatlandPolygons] = useState<PreparedPolygon[]>([]);

  const activeBasemap = BASEMAPS[basemap];

  // Automatically detect and set latest available hotspot date from database on load
  useEffect(() => {
    let isMounted = true;
    const fetchLatestDate = async () => {
      try {
        const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/hotspots/stats`);
        if (res.ok) {
          const json = await res.json();
          const maxDate = json?.summary?.max_date;
          if (isMounted && maxDate) {
            setSingleDate(maxDate);
            setStartDate(maxDate);
            setEndDate(maxDate);
          }
        }
      } catch (e) {
        console.warn('[MapView] Failed to query latest hotspot date:', e);
      }
    };

    fetchLatestDate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Index Peatland features directly from Database API
  useEffect(() => {
    let isMounted = true;
    const fetchPeatland = async () => {
      try {
        const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/peatland`);
        if (res.ok) {
          const geojson = await res.json();
          if (isMounted) {
            const prepared = preparePeatlandPolygons(geojson);
            setPeatlandPolygons(prepared);
          }
        }
      } catch (e) {
        console.warn('[MapView] Spatial peatland indexing fetch warning:', e);
      }
    };

    fetchPeatland();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleIslandChange = (islandId: string) => {
    setSelectedIsland(islandId);
    setSelectedProvince('ALL');
    const targetIsland = ISLANDS.find(i => i.id === islandId);
    if (targetIsland) {
      setMapTarget({ center: targetIsland.center, zoom: targetIsland.zoom });
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvince(provinceId);
    if (provinceId !== 'ALL') {
      const prov = PROVINCES.find(p => p.id === provinceId);
      if (prov) {
        setSelectedIsland(prov.islandId);
        setMapTarget({ center: prov.center, zoom: prov.zoom });
      }
    } else if (selectedIsland !== 'ALL') {
      const island = ISLANDS.find(i => i.id === selectedIsland);
      if (island) {
        setMapTarget({ center: island.center, zoom: island.zoom });
      }
    } else {
      setMapTarget({ center: INDONESIA_CENTER, zoom: DEFAULT_ZOOM });
    }
  };

  // Fast Spatial Filtering directly on Flat Array Matrix
  const displayedHotspots = useMemo(() => {
    let list = hotspotData;

    // 1. Exclude Malaysia and Singapore points completely
    list = list.filter(row => {
      const lat = row[HOTSPOT_COL.LAT];
      const lng = row[HOTSPOT_COL.LNG];
      if (lat === null || lng === null) return false;

      // Singapore bounding box
      if (lng >= 103.60 && lng <= 104.05 && lat >= 1.20 && lat <= 1.48) return false;

      // Peninsular Malaysia
      if (lng >= 99.8 && lng <= 104.5 && lat >= 1.25 && lat <= 6.8) {
        // Exclude Peninsular Malaysia, allow Riau/Kepri island area
        if (!(lng <= 103.5 && lat <= 2.5 && lat <= 0.6 * (lng - 100.0) + 0.5)) {
          return false;
        }
      }

      // East Malaysia (Sarawak & Sabah on Borneo)
      if (lng >= 109.5 && lng <= 119.5) {
        if (lng < 114.0 && lat > 2.05) return false;
        if (lng >= 114.0 && lng < 115.5 && lat > 1.2) return false;
        if (lng >= 115.5 && lat > 4.25) return false;
      }

      return true;
    });

    // 2. Filter Peatland if enabled
    if (peatlandOnly && peatlandPolygons.length > 0) {
      list = list.filter(row => {
        const lat = row[HOTSPOT_COL.LAT];
        const lng = row[HOTSPOT_COL.LNG];
        if (lat === null || lng === null) return false;
        return isPointInPeatlands(lng, lat, peatlandPolygons);
      });
    }

    // 3. Region Filter (Default: Kalimantan, Sumatera, Papua only)
    if (selectedProvince !== 'ALL') {
      const prov = PROVINCES.find(p => p.id === selectedProvince);
      if (prov) {
        const [minLng, minLat, maxLng, maxLat] = prov.bbox;
        list = list.filter(row => {
          const lat = row[HOTSPOT_COL.LAT];
          const lng = row[HOTSPOT_COL.LNG];
          if (lat === null || lng === null) return false;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
      }
    } else if (selectedIsland !== 'ALL') {
      const island = ISLANDS.find(i => i.id === selectedIsland);
      if (island) {
        const [minLng, minLat, maxLng, maxLat] = island.bbox;
        list = list.filter(row => {
          const lat = row[HOTSPOT_COL.LAT];
          const lng = row[HOTSPOT_COL.LNG];
          if (lat === null || lng === null) return false;
          return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
        });
      }
    } else {
      // By default: Hanya tampilkan titik panas di Pulau Sumatera, Kalimantan, dan Papua
      const sumateraBbox = [95.0, -6.0, 109.0, 6.1];
      const kalimantanBbox = [108.5, -4.5, 119.2, 4.5];
      const papuaBbox = [130.5, -9.5, 141.0, 1.0];

      list = list.filter(row => {
        const lat = row[HOTSPOT_COL.LAT];
        const lng = row[HOTSPOT_COL.LNG];
        if (lat === null || lng === null) return false;

        const inSumatera = lng >= sumateraBbox[0] && lng <= sumateraBbox[2] && lat >= sumateraBbox[1] && lat <= sumateraBbox[3];
        const inKalimantan = lng >= kalimantanBbox[0] && lng <= kalimantanBbox[2] && lat >= kalimantanBbox[1] && lat <= kalimantanBbox[3];
        const inPapua = lng >= papuaBbox[0] && lng <= papuaBbox[2] && lat >= papuaBbox[1] && lat <= papuaBbox[3];

        return inSumatera || inKalimantan || inPapua;
      });
    }

    return list;
  }, [hotspotData, peatlandOnly, peatlandPolygons, selectedIsland, selectedProvince]);

  // Auto enable land cover when module is PENGGUNAAN_LAHAN
  useEffect(() => {
    if (selectedModule === 'PENGGUNAAN_LAHAN') {
      setShowLandCover(true);
      setActivePopover('layers');
    }
  }, [selectedModule]);

  const handleBasemapToggle = () => {
    const sequence: BasemapType[] = ['satellite', 'light_gray'];
    const nextIdx = (sequence.indexOf(basemap) + 1) % sequence.length;
    setBasemap(sequence[nextIdx]);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-900">
      {/* 1. TOP HEADER BAR WITH RESEARCH TITLE & YEAR 2026 */}
      <SipongiHeader selectedModule={selectedModule} onModuleChange={setSelectedModule} />

      {/* MAP */}
      <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="relative h-full min-w-0 flex-1">

          {/* Popovers: floating comfortably ABOVE the bottom widgets without collision */}
          <div className="absolute bottom-[105px] left-6 z-[1200] flex flex-col gap-3 pointer-events-auto">
            <LayerControlPopover
              isOpen={activePopover === 'layers'}
              onClose={() => setActivePopover(null)}
              showHotspots={showHotspots}
              onToggleHotspots={setShowHotspots}
              showPeatland={showPeatland}
              onTogglePeatland={setShowPeatland}
              peatlandOnly={peatlandOnly}
              onTogglePeatlandOnly={setPeatlandOnly}
              showLandCover={showLandCover}
              onToggleLandCover={setShowLandCover}
              showRainfall={showRainfall}
              onToggleRainfall={setShowRainfall}
              showSoilMoisture={showSoilMoisture}
              onToggleSoilMoisture={setShowSoilMoisture}
              showTemperature={showTemperature}
              onToggleTemperature={setShowTemperature}
              landCoverProvider={landCoverProvider}
              onLandCoverProviderChange={setLandCoverProvider}
              landCoverOpacity={landCoverOpacity}
              onLandCoverOpacityChange={setLandCoverOpacity}
              onOpenGeoTIFFModal={() => setIsGeoTIFFModalOpen(true)}
              localGeoTIFFFileName={localGeoTIFFFileName}
              filteredCount={displayedHotspots.length}
            />

            <CalendarFilterPopover
              isOpen={activePopover === 'calendar'}
              onClose={() => setActivePopover(null)}
              sensor={sensor}
              onSensorChange={setSensor}
              hotspotMode={hotspotMode}
              onHotspotModeChange={setHotspotMode}
              dayRange={dayRange}
              onDayRangeChange={setDayRange}
              dateFilterMode={dateFilterMode}
              onDateFilterModeChange={setDateFilterMode}
              singleDate={singleDate}
              onSingleDateChange={setSingleDate}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              selectedIsland={selectedIsland}
              onIslandChange={handleIslandChange}
              selectedProvince={selectedProvince}
              onProvinceChange={handleProvinceChange}
            />
          </div>

          {/* Floating Climate, Land Cover & Satellite Stats Legends (Pojok Kanan Atas) */}
          <div className="absolute top-20 right-6 z-[1000] flex flex-col gap-2.5 pointer-events-auto max-w-[280px]">
            {/* Informasi NASA FIRMS diletakkan paling atas */}
            <SatelliteStatsWidget hotspots={displayedHotspots} currentSensor={sensor} />

            {showLandCover && (
              <LandCoverLegend
                opacity={landCoverOpacity}
                onOpacityChange={setLandCoverOpacity}
                activeProviderName={LAND_COVER_PROVIDERS[landCoverProvider].name}
              />
            )}
            {showRainfall && (
              <ClimateLegend
                type="rainfall"
                opacity={rainfallOpacity}
                onOpacityChange={setRainfallOpacity}
              />
            )}
            {showSoilMoisture && (
              <ClimateLegend
                type="soil_moisture"
                opacity={soilMoistureOpacity}
                onOpacityChange={setSoilMoistureOpacity}
              />
            )}
            {showTemperature && (
              <ClimateLegend
                type="temperature"
                opacity={temperatureOpacity}
                onOpacityChange={setTemperatureOpacity}
              />
            )}
          </div>

          {/* Bottom-Right Floating Controls (Layers & Calendar Popover Buttons) */}
          <BottomRightControls
            basemap={basemap}
            onBasemapToggle={handleBasemapToggle}
            activePopover={activePopover}
            onTogglePopover={(p) => setActivePopover(activePopover === p ? null : p)}
          />

          {/* MapContainer with preferCanvas={true} for high performance vector rendering */}
          <MapContainer
            center={INDONESIA_CENTER}
            zoom={DEFAULT_ZOOM}
            zoomControl={false}
            preferCanvas={true}
            className="!h-full !w-full !bg-slate-200"
          >
            <MapPaneInitializer />
            <MapResizeHandler />
            <MapViewController center={mapTarget.center} zoom={mapTarget.zoom} />

            <TileLayer
              key={activeBasemap.id}
              url={activeBasemap.url}
              attribution={activeBasemap.attribution}
            />

            {activeBasemap.overlayUrl && (
              <TileLayer
                key={`${activeBasemap.id}-overlay`}
                url={activeBasemap.overlayUrl}
                pane="overlayPane"
              />
            )}

            <PeatlandLayer visible={showPeatland} />

            <ClimateLayer type="rainfall" visible={showRainfall} opacity={rainfallOpacity} />
            <ClimateLayer type="soil_moisture" visible={showSoilMoisture} opacity={soilMoistureOpacity} />
            <ClimateLayer type="temperature" visible={showTemperature} opacity={temperatureOpacity} />

            <LandCoverLayer
              visible={showLandCover}
              provider={landCoverProvider}
              opacity={landCoverOpacity}
              localGeoRaster={localGeoRaster}
            />

            {showHotspots && (
              <HotspotLayer
                sensor={sensor}
                days={dateFilterMode === 'days' ? dayRange : undefined}
                date={dateFilterMode === 'single' ? singleDate : undefined}
                startDate={dateFilterMode === 'range' ? startDate : undefined}
                endDate={dateFilterMode === 'range' ? endDate : undefined}
                mode={hotspotMode}
                features={displayedHotspots}
                onHotspotData={setHotspotData}
                peatlandPolygons={peatlandPolygons}
                activeContext={{
                  showPeatland,
                  showLandCover,
                  showRainfall,
                  showSoilMoisture,
                  showTemperature
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Modal for processing local .tif GeoTIFF client-side */}
      <GeoTIFFUploaderModal
        isOpen={isGeoTIFFModalOpen}
        onClose={() => setIsGeoTIFFModalOpen(false)}
        onGeoRasterLoaded={(georaster, fileName) => {
          setLocalGeoRaster(georaster);
          setLocalGeoTIFFFileName(fileName);
          setLandCoverProvider('local_geotiff');
          setShowLandCover(true);
          setIsGeoTIFFModalOpen(false);
        }}
      />
    </div>
  );
};

export default MapView;
