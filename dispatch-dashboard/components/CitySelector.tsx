'use client';

import React, { useState } from 'react';
import { City } from '@/types/emergency';

interface CitySelectorProps {
  currentCity: City;
  onCityChange: (city: City) => void;
  theme: 'light' | 'dark';
}

const CITIES: City[] = [
  {
    name: 'Nashville',
    coordinates: [-86.7816, 36.1627],
    zoom: 12,
  },
  {
    name: 'New York',
    coordinates: [-74.006, 40.7128],
    zoom: 12,
  },
  {
    name: 'Los Angeles',
    coordinates: [-118.2437, 34.0522],
    zoom: 12,
  },
  {
    name: 'Chicago',
    coordinates: [-87.6298, 41.8781],
    zoom: 12,
  },
  {
    name: 'Miami',
    coordinates: [-80.1918, 25.7617],
    zoom: 12,
  },
  {
    name: 'San Francisco',
    coordinates: [-122.4194, 37.7749],
    zoom: 12,
  },
];

const CitySelector: React.FC<CitySelectorProps> = ({ currentCity, onCityChange, theme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-6 right-20 z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg transition-all duration-200 group"
        style={{
          background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(30px)',
          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
          padding: '6px 10px'
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="text-left">
            <p className="text-xs uppercase tracking-wider font-semibold mb-1 flex items-center gap-2" style={{ color: '#888888' }}>
              Dispatch Center
              <svg className="w-3 h-3 transition-colors" style={{ color: '#888888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>{currentCity.name}</h1>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="absolute top-full right-0 mt-3 w-80 rounded-lg overflow-hidden z-20"
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(30px)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div className="p-4">
              {CITIES.map((city) => (
                <button
                  key={city.name}
                  onClick={() => {
                    onCityChange(city);
                    setIsOpen(false);
                  }}
                  className="w-full text-left rounded-lg transition-all duration-200 flex items-center justify-between"
                  style={{
                    background: currentCity.name === city.name 
                      ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)')
                      : 'transparent',
                    color: currentCity.name === city.name 
                      ? (theme === 'dark' ? '#000000' : '#ffffff')
                      : (theme === 'dark' ? '#ffffff' : '#000000'),
                    fontWeight: '600',
                    fontSize: '16px',
                    padding: '16px 20px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentCity.name !== city.name) {
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentCity.name !== city.name) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span>{city.name}</span>
                  {currentCity.name === city.name && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CitySelector;