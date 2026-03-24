'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

interface MapViewProps {
  data: any[];
  type: 'ocean' | 'fisheries' | 'edna';
  highlightPoint?: {
    latitude: number;
    longitude: number;
    label: string;
    description?: string;
  } | null;
}

// Component to fit map bounds to data
function FitBounds({ data }: { data: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (data && data.length > 0) {
      const validPoints = data.filter(
        (item) => item.latitude && item.longitude &&
        !isNaN(parseFloat(item.latitude)) && !isNaN(parseFloat(item.longitude))
      );

      if (validPoints.length > 0) {
        const lats = validPoints.map((item) => parseFloat(item.latitude));
        const lngs = validPoints.map((item) => parseFloat(item.longitude));

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Add some padding
        const latPadding = (maxLat - minLat) * 0.2 || 5;
        const lngPadding = (maxLng - minLng) * 0.2 || 5;

        map.fitBounds([
          [minLat - latPadding, minLng - lngPadding],
          [maxLat + latPadding, maxLng + lngPadding]
        ]);
      }
    }
  }, [data, map]);

  return null;
}

export default function MapView({ data, type, highlightPoint = null }: MapViewProps) {
  // Calculate center from data, or use default
  const getCenter = (): [number, number] => {
    if (data && data.length > 0) {
      const validPoints = data.filter(
        (item) => item.latitude && item.longitude &&
        !isNaN(parseFloat(item.latitude)) && !isNaN(parseFloat(item.longitude))
      );
      if (validPoints.length > 0) {
        const avgLat = validPoints.reduce((sum, item) => sum + parseFloat(item.latitude), 0) / validPoints.length;
        const avgLng = validPoints.reduce((sum, item) => sum + parseFloat(item.longitude), 0) / validPoints.length;
        return [avgLat, avgLng];
      }
    }
    return [20, -100]; // Default to Pacific
  };

  const center = getCenter();

  const getColor = (type: string) => {
    switch (type) {
      case 'ocean':
        return '#0ea5e9';
      case 'fisheries':
        return '#10b981';
      case 'edna':
        return '#8b5cf6';
      default:
        return '#0ea5e9';
    }
  };

  const getRadius = (item: any, type: string) => {
    switch (type) {
      case 'fisheries':
        const abundance = parseInt(item.abundance) || 100;
        return Math.max(6, Math.min(15, abundance / 50));
      case 'edna':
        const concentration = parseFloat(item.concentration) || 1;
        return Math.max(6, Math.min(15, concentration * 3));
      default:
        return 8;
    }
  };

  const getPopupContent = (item: any, type: string) => {
    switch (type) {
      case 'ocean':
        return `
          <div style="min-width: 180px; font-family: Inter, sans-serif;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
              ${item.location || item.station_name || 'Station'}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Temperature:</span>
                <span style="font-weight: 500;">${parseFloat(item.temperature || 0).toFixed(1)}°C</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Salinity:</span>
                <span style="font-weight: 500;">${parseFloat(item.salinity || 0).toFixed(1)} PSU</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">pH:</span>
                <span style="font-weight: 500;">${parseFloat(item.ph || 0).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Oxygen:</span>
                <span style="font-weight: 500;">${parseFloat(item.oxygen || 0).toFixed(1)} mg/L</span>
              </div>
            </div>
          </div>
        `;
      case 'fisheries':
        return `
          <div style="min-width: 180px; font-family: Inter, sans-serif;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
              ${item.location || 'Fishing Zone'}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Species:</span>
                <span style="font-weight: 500;">${item.species || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Abundance:</span>
                <span style="font-weight: 500;">${parseInt(item.abundance || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Biomass:</span>
                <span style="font-weight: 500;">${parseFloat(item.biomass || 0).toFixed(0)} kg</span>
              </div>
            </div>
          </div>
        `;
      case 'edna':
        return `
          <div style="min-width: 180px; font-family: Inter, sans-serif;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
              ${item.location || 'Sample Site'}
            </h3>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Species:</span>
                <span style="font-weight: 500;">${item.species || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Concentration:</span>
                <span style="font-weight: 500;">${parseFloat(item.concentration || 0).toFixed(2)} ng/L</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Confidence:</span>
                <span style="font-weight: 500;">${item.confidence || '-'}%</span>
              </div>
            </div>
          </div>
        `;
      default:
        return '';
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds data={data} />
        {data.map((item, index) => (
          <CircleMarker
            key={index}
            center={[parseFloat(item.latitude), parseFloat(item.longitude)]}
            radius={getRadius(item, type)}
            fillColor={getColor(type)}
            color="#fff"
            weight={2}
            opacity={1}
            fillOpacity={0.7}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              <span style={{ fontWeight: 500 }}>{item.species || item.location || item.station_name || 'Station'}</span>
            </Tooltip>
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: getPopupContent(item, type) }} />
            </Popup>
          </CircleMarker>
        ))}

        {highlightPoint ? (
          <CircleMarker
            center={[highlightPoint.latitude, highlightPoint.longitude]}
            radius={18}
            fillColor="#f59e0b"
            color="#78350f"
            weight={3}
            opacity={1}
            fillOpacity={0.45}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <span style={{ fontWeight: 600 }}>Top hotspot: {highlightPoint.label}</span>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif' }}>
                <h3 style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                  {highlightPoint.label}
                </h3>
                <p style={{ color: '#475569', fontSize: 13, marginBottom: 8 }}>
                  {highlightPoint.description || 'Highest population area for searched species'}
                </p>
                <p style={{ color: '#64748b', fontSize: 12 }}>
                  {highlightPoint.latitude.toFixed(4)}°, {highlightPoint.longitude.toFixed(4)}°
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}
