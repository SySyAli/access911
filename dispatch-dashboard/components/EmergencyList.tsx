'use client';

import React from 'react';
import { Emergency } from '@/types/emergency';

interface EmergencyListProps {
  emergencies: Emergency[];
  selectedId: string | null;
  onSelect: (emergency: Emergency) => void;
  onResolve: (id: string) => void;
  theme: 'light' | 'dark';
}

const EmergencyList: React.FC<EmergencyListProps> = ({
  emergencies,
  selectedId,
  onSelect,
  onResolve,
  theme,
}) => {
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (timeString: string) => {
    const now = new Date();
    const time = new Date(timeString);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const severityConfig = {
    critical: {
      badge: 'bg-red-500',
      text: 'text-red-400',
    },
    high: {
      badge: 'bg-orange-500',
      text: 'text-orange-400',
    },
    medium: {
      badge: 'bg-yellow-500',
      text: 'text-yellow-400',
    },
    low: {
      badge: 'bg-blue-500',
      text: 'text-blue-400',
    },
  };

  return (
    <div className="absolute left-32 top-6 bottom-20 w-[480px] z-10">
      <div className="h-full flex flex-col" style={{
        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(30px)',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div className="border-b" style={{ 
          borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)', 
          padding: '14px 14px' 
        }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>Active Calls</h2>
          </div>
          <p className="text-sm" style={{ color: '#888888' }}>
            Real-time emergency monitoring
          </p>
        </div>

        {/* Emergency List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
          {emergencies
            .filter(e => e.status === 'active')
            .map((emergency) => {
              // Ensure severity is valid, default to 'medium' if not
              const validSeverity = emergency.severity && severityConfig[emergency.severity] 
                ? emergency.severity 
                : 'medium';
              const config = severityConfig[validSeverity];
              const isSelected = selectedId === emergency.id;

              return (
                <div
                  key={emergency.id}
                  onClick={() => onSelect(emergency)}
                  className={`relative rounded-lg cursor-pointer transition-all duration-200 ${config.text}`}
                  style={{
                    background: theme === 'dark'
                      ? (isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)')
                      : (isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'),
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
                    padding: '22px 28px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme === 'dark'
                      ? (isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)')
                      : (isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)');
                  }}
                >
                  {/* Severity Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.badge} ${validSeverity === 'critical' ? 'animate-pulse' : ''}`}></div>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {validSeverity}
                      </span>
                    </div>
                    <span className="text-xs font-mono" style={{ 
                      color: '#888888',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {emergency.id}
                    </span>
                  </div>

                  {/* Emergency Type */}
                  <h3 className="text-lg font-bold mb-4" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>{emergency.type}</h3>

                  {/* Time */}
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-4 h-4" style={{ color: '#888888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                      {formatTime(emergency.time)} <span style={{ color: '#888888' }}>({getRelativeTime(emergency.time)})</span>
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3 mb-4" style={{ padding: '2px 0' }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#888888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm leading-relaxed" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>{emergency.location.address}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm mb-4 leading-relaxed line-clamp-2" style={{ color: theme === 'dark' ? '#888888' : '#555555' }}>
                    {emergency.description}
                  </p>

                  {/* Units */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {emergency.units.map((unit) => (
                      <span
                        key={unit}
                        className="px-3 py-2 text-xs font-bold rounded-md"
                        style={{
                          color: theme === 'dark' ? '#ffffff' : '#000000',
                          background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)'
                        }}
                      >
                        {unit}
                      </span>
                    ))}
                  </div>

                  {/* Resolve Button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolve(emergency.id);
                      }}
                      className="text-sm font-bold text-green-400 rounded-lg transition-all duration-200"
                      style={{
                        background: 'rgba(4, 255, 0, 0.1)',
                        border: '1px solid rgba(23, 255, 0, 0.2)',
                        padding: '6px 12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(23, 255, 0, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(23, 255, 0, 0.1)';
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default EmergencyList;