'use client';

import React, { useEffect, useRef, useState } from 'react';

interface StreetViewProps {
  coordinates: [number, number];
  address: string;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const StreetView: React.FC<StreetViewProps> = ({ coordinates, address, onClose, theme }) => {
  const streetViewRef = useRef<HTMLDivElement>(null);
  const [lng, lat] = coordinates;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setLoading(false);
      console.error('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local file');
      return;
    }

    // Load Google Maps API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeStreetView();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          initializeStreetView();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Maps API loaded successfully');
        initializeStreetView();
      };
      script.onerror = () => {
        setError('Failed to load Google Maps');
        setLoading(false);
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);
    };

    const initializeStreetView = () => {
      if (!streetViewRef.current || !window.google) {
        setError('Google Maps not initialized');
        setLoading(false);
        return;
      }

      try {
        const position = { lat, lng };
        
        // Create street view service first to check availability
        const streetViewService = new google.maps.StreetViewService();
        
        streetViewService.getPanorama(
          { location: position, radius: 100 },
          (data, status) => {
            if (status === 'OK' && data && data.location) {
              // Street View available, initialize panorama
              const streetView = new google.maps.StreetViewPanorama(
                streetViewRef.current!,
                {
                  position: data.location.latLng,
                  pov: { 
                    heading: google.maps.geometry?.spherical ? 
                      google.maps.geometry.spherical.computeHeading(data.location.latLng!, position) : 0,
                    pitch: 0 
                  },
                  zoom: 1,
                  addressControl: false,
                  linksControl: true,
                  panControl: true,
                  enableCloseButton: false,
                  fullscreenControl: true,
                  motionTracking: false,
                  motionTrackingControl: false,
                }
              );
              setLoading(false);
              console.log('Street View initialized successfully');
            } else {
              setError('Street View not available at this location');
              setLoading(false);
              console.warn('Street View not available:', status);
            }
          }
        );
      } catch (err) {
        setError('Error initializing Street View');
        setLoading(false);
        console.error('Error initializing Street View:', err);
      }
    };

    loadGoogleMaps();
  }, [lat, lng]);

  return (
    <div className="absolute bottom-6 right-6 z-20" style={{ width: '480px', height: '360px' }}>
      <div 
        className="h-full flex flex-col rounded-lg overflow-hidden"
        style={{
          background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(30px)',
          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between"
          style={{ 
            padding: '16px 20px',
            borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)'
          }}
        >
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>Street View</h3>
            <p className="text-xs" style={{ color: '#888888' }}>{address}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }}
          >
            <svg className="w-4 h-4" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Street View Container */}
        <div ref={streetViewRef} className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm font-semibold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>Loading Street View...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold mb-2" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>{error}</p>
                <p className="text-xs" style={{ color: '#888888' }}>
                  {error.includes('not configured') ? 
                    'Please add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local file' :
                    'Try selecting a different location'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
  
  namespace google.maps {
    class StreetViewPanorama {
      constructor(container: HTMLElement, opts?: any);
    }
    
    class StreetViewService {
      getPanorama(request: any, callback: (data: any, status: string) => void): void;
    }
    
    namespace geometry {
      namespace spherical {
        function computeHeading(from: any, to: any): number;
      }
    }
    
    const StreetViewStatus: {
      OK: string;
    };
  }
}

export default StreetView;

