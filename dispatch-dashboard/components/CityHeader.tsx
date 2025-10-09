'use client';

import React from 'react';

interface CityHeaderProps {
  cityName: string;
}

const CityHeader: React.FC<CityHeaderProps> = ({ cityName }) => {
  return (
    <div className="absolute top-6 right-6 z-10">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl" style={{ padding: '24px 32px' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">
              Dispatch Center
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">{cityName}</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityHeader;
