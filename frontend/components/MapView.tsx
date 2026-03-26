'use client';

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

interface MapViewProps {
  data: any[];
  type: 'ocean' | 'fisheries' | 'edna' | 'species';
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
          <div style="min-width: 180px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">
              ${item.location || item.station_name || 'Station'}
            </h3>
            <div style="font-size: 13px;">
              <div><strong>Temperature:</strong> ${parseFloat(item.temperature || 0).toFixed(1)}°C</div>
              <div><strong>Salinity:</strong> ${parseFloat(item.salinity || 0).toFixed(1)} PSU</div>
              <div><strong>pH:</strong> ${parseFloat(item.ph || 0).toFixed(2)}</div>
              <div><strong>Oxygen:</strong> ${parseFloat(item.oxygen || 0).toFixed(1)} mg/L</div>
            </div>
          </div>
        `;
      case 'fisheries':
        return `
          <div style="min-width: 180px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">
              ${item.species || 'Unknown'}
            </h3>
            <div style="font-size: 13px;">
              <div><strong>Common Name:</strong> ${item.common_name || '-'}</div>
              <div><strong>Location:</strong> ${item.location || item.region || '-'}</div>
              <div><strong>Abundance:</strong> ${parseInt(item.abundance || 0).toLocaleString()}</div>
              <div><strong>Biomass:</strong> ${parseFloat(item.biomass || 0).toFixed(0)} kg</div>
            </div>
          </div>
        `;
      case 'edna':
        return `
          <div style="min-width: 180px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">
              ${item.species || 'Unknown'}
            </h3>
            <div style="font-size: 13px;">
              <div><strong>Location:</strong> ${item.location || '-'}</div>
              <div><strong>Concentration:</strong> ${parseFloat(item.concentration || 0).toFixed(2)} ng/L</div>
              <div><strong>Confidence:</strong> ${(parseFloat(item.confidence || 0) * 100).toFixed(0)}%</div>
            </div>
          </div>
        `;
      case 'species':
        return `
          <div style="min-width: 180px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">
              ${item.species || 'Unknown'}
            </h3>
            <div style="font-size: 13px;">
              <div><strong>Location:</strong> ${item.locality || item.location || '-'}</div>
              <div><strong>Records:</strong> ${item.count || 0}</div>
              <div><strong>Coordinates:</strong> ${parseFloat(item.latitude).toFixed(4)}°, ${parseFloat(item.longitude).toFixed(4)}°</div>
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
