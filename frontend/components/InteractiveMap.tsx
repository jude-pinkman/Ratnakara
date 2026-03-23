'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
  lat: number;
  lng: number;
  type: 'ocean' | 'fisheries' | 'edna' | 'mixed';
  data?: any;
  popup?: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  value: number;
  intensity: number;
}

interface InteractiveMapProps {
  markers?: MapMarker[];
  heatmapData?: HeatmapPoint[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showLegend?: boolean;
  parameter?: string;
}

// Fix Leaflet default icon issue in Next.js
const fixIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
};

// Custom marker icons by type
const createCustomIcon = (type: string, value?: number) => {
  const colors: Record<string, string> = {
    ocean: '#06b6d4',
    fisheries: '#10b981',
    edna: '#8b5cf6',
    mixed: '#f59e0b',
    hot: '#ef4444',
    warm: '#f97316',
    normal: '#22c55e',
    cold: '#3b82f6'
  };

  const color = colors[type] || colors.mixed;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

// Create cluster icon
const createClusterIcon = (count: number, type: string) => {
  const colors: Record<string, string> = {
    ocean: '#06b6d4',
    fisheries: '#10b981',
    edna: '#8b5cf6',
    mixed: '#f59e0b'
  };

  const color = colors[type] || colors.mixed;
  const size = Math.min(60, 30 + Math.log10(count) * 15);

  return L.divIcon({
    className: 'cluster-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color}dd;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${Math.min(16, 10 + Math.log10(count) * 3)}px;
        font-weight: bold;
        color: white;
      ">
        ${count > 999 ? Math.round(count/1000) + 'k' : count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

export default function InteractiveMap({
  markers = [],
  heatmapData = [],
  center = [15.0, 80.0], // Indian Ocean default
  zoom = 5,
  onMarkerClick,
  onMapClick,
  showLegend = true,
  parameter = 'temperature'
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    fixIcon();

    // Create map
    mapRef.current = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    // Add tile layer - using CartoDB Positron for clean look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Add ocean-style layer as alternative (can switch)
    const oceanLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    });

    // Layer control
    const baseLayers = {
      'Standard': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
      'Ocean': oceanLayer,
      'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
    };

    L.control.layers(baseLayers).addTo(mapRef.current);

    // Initialize layer groups
    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
    heatLayerRef.current = L.layerGroup().addTo(mapRef.current);

    // Add click handler
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Add Indian EEZ boundary (approximate)
    const eezBoundary = L.polygon([
      [23.5, 68], [22, 72], [20.5, 72], [18, 71],
      [15, 72], [11, 74], [8, 77], [6.5, 79.5],
      [7, 82], [9, 85], [13, 84], [16, 82],
      [20, 87], [21.5, 89], [22, 91], [20, 92],
      [15, 94], [10, 94], [6, 95], [4, 92],
      [6, 88], [5.5, 80], [7.5, 76.5], [10.5, 72],
      [16, 69], [20, 66], [23.5, 66], [23.5, 68]
    ], {
      color: '#0ea5e9',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.05,
      dashArray: '5, 10'
    }).addTo(mapRef.current);

    eezBoundary.bindTooltip('Indian Exclusive Economic Zone', { sticky: true });

    // Add scale
    L.control.scale({ position: 'bottomright' }).addTo(mapRef.current);

    setIsLoaded(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !isLoaded) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    markers.forEach((marker) => {
      const icon = marker.data?.count
        ? createClusterIcon(marker.data.count, marker.type)
        : createCustomIcon(marker.type);

      const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
        .addTo(markersLayerRef.current!);

      // Create popup content
      let popupContent = marker.popup || '';

      if (!popupContent && marker.data) {
        popupContent = `
          <div class="map-popup" style="min-width: 200px; font-family: system-ui, sans-serif;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e3a5f;">
              ${marker.type.charAt(0).toUpperCase() + marker.type.slice(1)} Data
            </div>
            <div style="font-size: 12px; color: #4b5563;">
              <div style="margin-bottom: 4px;">
                <strong>Location:</strong> ${marker.lat.toFixed(4)}°N, ${marker.lng.toFixed(4)}°E
              </div>
              ${marker.data.count ? `<div style="margin-bottom: 4px;"><strong>Observations:</strong> ${marker.data.count}</div>` : ''}
              ${marker.data.avgTemp !== undefined ? `<div style="margin-bottom: 4px;"><strong>Avg Temp:</strong> ${marker.data.avgTemp.toFixed(1)}°C</div>` : ''}
              ${marker.data.avgOxygen !== undefined ? `<div style="margin-bottom: 4px;"><strong>Avg O₂:</strong> ${marker.data.avgOxygen.toFixed(1)} mg/L</div>` : ''}
              ${marker.data.speciesCount !== undefined ? `<div style="margin-bottom: 4px;"><strong>Species:</strong> ${marker.data.speciesCount}</div>` : ''}
              ${marker.data.totalAbundance !== undefined ? `<div style="margin-bottom: 4px;"><strong>Abundance:</strong> ${marker.data.totalAbundance.toLocaleString()}</div>` : ''}
              ${marker.data.detectedSpecies !== undefined ? `<div style="margin-bottom: 4px;"><strong>eDNA Species:</strong> ${marker.data.detectedSpecies}</div>` : ''}
            </div>
            <button
              onclick="window.dispatchEvent(new CustomEvent('mapMarkerClick', { detail: { lat: ${marker.lat}, lng: ${marker.lng} } }))"
              style="
                margin-top: 8px;
                padding: 6px 12px;
                background: linear-gradient(to right, #0ea5e9, #06b6d4);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                width: 100%;
              "
            >
              Explore Details
            </button>
          </div>
        `;
      }

      if (popupContent) {
        leafletMarker.bindPopup(popupContent);
      }

      leafletMarker.on('click', () => {
        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });
    });

  }, [markers, isLoaded, onMarkerClick]);

  // Update heatmap when data changes
  useEffect(() => {
    if (!mapRef.current || !heatLayerRef.current || !isLoaded) return;

    // Clear existing heatmap
    heatLayerRef.current.clearLayers();

    if (heatmapData.length === 0) return;

    // Create colored circles for heatmap effect
    heatmapData.forEach((point) => {
      const color = getHeatColor(point.intensity);
      const radius = Math.max(15000, 30000 * point.intensity); // meters

      L.circle([point.lat, point.lng], {
        radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
        weight: 1
      }).addTo(heatLayerRef.current!)
        .bindTooltip(`${parameter}: ${point.value.toFixed(2)}`, { sticky: true });
    });

  }, [heatmapData, isLoaded, parameter]);

  // Color function for heatmap
  const getHeatColor = (intensity: number): string => {
    // Blue -> Green -> Yellow -> Red gradient
    if (intensity < 0.25) return `hsl(200, 100%, ${50 + intensity * 50}%)`;
    if (intensity < 0.5) return `hsl(${200 - (intensity - 0.25) * 200}, 100%, 50%)`;
    if (intensity < 0.75) return `hsl(${100 - (intensity - 0.5) * 200}, 100%, 50%)`;
    return `hsl(${- (intensity - 0.75) * 100}, 100%, 50%)`;
  };

  // Listen for custom events from popup buttons
  useEffect(() => {
    const handleMarkerClick = (e: CustomEvent) => {
      if (onMapClick) {
        onMapClick(e.detail.lat, e.detail.lng);
      }
    };

    window.addEventListener('mapMarkerClick', handleMarkerClick as EventListener);
    return () => {
      window.removeEventListener('mapMarkerClick', handleMarkerClick as EventListener);
    };
  }, [onMapClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

      {showLegend && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
          <div className="text-xs font-semibold text-gray-700 mb-2">Data Types</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-xs text-gray-600">Ocean Data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-600">Fisheries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-600">eDNA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-gray-600">Multi-source</span>
            </div>
          </div>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
