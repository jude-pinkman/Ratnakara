'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  data: any[];
  type: 'ocean' | 'fisheries' | 'edna';
}

export default function MapView({ data, type }: MapViewProps) {
  const center: [number, number] = [15, 80];

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
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
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
              <span style={{ fontWeight: 500 }}>{item.location || item.station_name || 'Station'}</span>
            </Tooltip>
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: getPopupContent(item, type) }} />
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
