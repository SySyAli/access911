'use client';

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Emergency } from '@/types/emergency';
import StreetView from './StreetView';

interface MapProps {
  center: [number, number];
  zoom: number;
  emergencies: Emergency[];
  selectedEmergency: Emergency | null;
  theme: 'light' | 'dark';
}

const Map: React.FC<MapProps> = ({ center, zoom, emergencies, selectedEmergency, theme }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [streetViewEmergency, setStreetViewEmergency] = useState<Emergency | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Set token
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibGFuZWJ1cmdldHQiLCJhIjoiY21naWhsb3B6MDlnazJrcHhoOXg2djM5ciJ9.DtCq6yKRwqVbo0IrZj7fbQ';
    mapboxgl.accessToken = token;
    
    console.log('Initializing map with token:', token.substring(0, 20) + '...');

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: zoom,
        pitch: 60, // Enable 3D perspective like acre-display
        bearing: 0,
        attributionControl: false,
      });

      mapInstance.on('load', () => {
        console.log('Map loaded successfully!');
        
        // Enable 3D terrain
        mapInstance.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        
        mapInstance.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
        
        // Add sky layer for better 3D effect
        mapInstance.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
        
        setMapLoaded(true);
      });

      mapInstance.on('error', (e) => {
        console.error('Map error:', e.error);
      });

      mapInstance.on('style.load', () => {
        console.log('Map style loaded');
      });

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Add attribution control to top-left
      mapInstance.addControl(new mapboxgl.AttributionControl({
        compact: true
      }), 'top-left');

      map.current = mapInstance;

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, theme]);

  // Update markers when emergencies change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    emergencies.forEach(emergency => {
      if (emergency.status === 'active') {
        // Create 3D pin marker element
        const el = document.createElement('div');
        el.className = 'pin-marker';
        
        // Set color based on severity
        const severityColors: Record<string, string> = {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#eab308',
          low: '#3b82f6',
        };
        const color = severityColors[emergency.severity] || '#6b7280';
        
        // Create elegant pin marker
        const pinContainer = document.createElement('div');
        pinContainer.style.position = 'relative';
        pinContainer.style.width = '40px';
        pinContainer.style.height = '52px';
        pinContainer.style.cursor = 'pointer';
        pinContainer.style.transition = 'transform 0.2s ease';
        pinContainer.style.pointerEvents = 'auto';
        
        pinContainer.innerHTML = `
          <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <defs>
              <linearGradient id="pinGradient-${emergency.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
              </linearGradient>
              <filter id="pinShadow-${emergency.id}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="4" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.5"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path d="M20 2C11.716 2 5 8.716 5 17c0 12 15 33 15 33s15-21 15-33c0-8.284-6.716-15-15-15z" 
              fill="url(#pinGradient-${emergency.id})" 
              stroke="white" 
              stroke-width="3"
              stroke-linejoin="round"
              filter="url(#pinShadow-${emergency.id})"/>
            <circle cx="20" cy="17" r="6" fill="white" opacity="0.9"/>
            <circle cx="20" cy="17" r="3.5" fill="${color}" opacity="1"/>
          </svg>
        `;
        
        el.appendChild(pinContainer);
        
        // Add hover effect
        el.addEventListener('mouseenter', () => {
          pinContainer.style.transform = 'scale(1.1)';
        });
        el.addEventListener('mouseleave', () => {
          pinContainer.style.transform = 'scale(1)';
        });
        
        // Add click handler to open Street View
        el.addEventListener('click', () => {
          setStreetViewEmergency(emergency);
        });

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat(emergency.location.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false })
              .setHTML(`
                <div style="padding: 12px; background: ${theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'}; backdrop-filter: blur(20px); border-radius: 8px; border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};">
                  <h3 style="font-weight: 700; margin-bottom: 8px; font-size: 16px; color: ${theme === 'dark' ? '#ffffff' : '#000000'};">${emergency.type}</h3>
                  <p style="font-size: 14px; margin-bottom: 6px; color: ${theme === 'dark' ? '#ffffff' : '#1a1a1a'};">${emergency.location.address}</p>
                  <p style="font-size: 13px; color: ${theme === 'dark' ? '#cccccc' : '#666666'};">${emergency.description}</p>
                </div>
              `)
          )
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  }, [emergencies, mapLoaded, theme]);

  // Fly to selected emergency
  useEffect(() => {
    if (!map.current || !selectedEmergency) return;

    map.current.flyTo({
      center: selectedEmergency.location.coordinates,
      zoom: 15,
      duration: 1500,
      essential: true,
    });

    // Find and open the popup for the selected marker
    const markerIndex = emergencies.findIndex(e => e.id === selectedEmergency.id);
    if (markerIndex !== -1 && markers.current[markerIndex]) {
      markers.current[markerIndex].togglePopup();
    }
  }, [selectedEmergency, emergencies]);

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {streetViewEmergency && (
        <StreetView
          coordinates={streetViewEmergency.location.coordinates}
          address={streetViewEmergency.location.address}
          onClose={() => setStreetViewEmergency(null)}
          theme={theme}
        />
      )}
    </>
  );
};

export default Map;
