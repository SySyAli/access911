'use client';

import React, { useState, useEffect } from 'react';

interface SimulationProps {
  theme: 'light' | 'dark';
}

interface SimulationStatus {
  isRunning: boolean;
  generatedCalls: number;
  totalCalls: number;
  message: string;
  error: string | null;
}

const scenarios = [
  { id: 'la_wildfire', name: 'LA Wildfire', icon: '🔥' },
  { id: 'nashville_tornado', name: 'Nashville Tornado', icon: '🌪️' },
  { id: 'earthquake_sf', name: 'SF Earthquake', icon: '🌊' },
  { id: 'hurricane_florida', name: 'Florida Hurricane', icon: '🌀' },
];

const Simulation: React.FC<SimulationProps> = ({ theme }) => {
  const [selectedScenario, setSelectedScenario] = useState('nashville_tornado');
  const [callVolume, setCallVolume] = useState(10);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<SimulationStatus>({
    isRunning: false,
    generatedCalls: 0,
    totalCalls: 0,
    message: 'Ready to simulate emergency scenarios',
    error: null,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const startSimulation = async () => {
    setStatus({
      isRunning: true,
      generatedCalls: 0,
      totalCalls: callVolume,
      message: 'Initializing simulation...',
      error: null,
    });

    try {
      // Replace with your actual Lambda URL
      const lambdaUrl = process.env.NEXT_PUBLIC_SIMULATION_LAMBDA_URL || 'YOUR_LAMBDA_URL_HERE';
      
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: selectedScenario,
          num_calls: callVolume,
          table_name: 'wildfire-simulation-calls',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setStatus({
        isRunning: false,
        generatedCalls: result.successful || callVolume,
        totalCalls: callVolume,
        message: `Successfully generated ${result.successful || callVolume} emergency calls`,
        error: null,
      });
    } catch (error) {
      console.error('Simulation error:', error);
      setStatus({
        isRunning: false,
        generatedCalls: 0,
        totalCalls: callVolume,
        message: 'Simulation failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const stopSimulation = () => {
    setStatus({
      ...status,
      isRunning: false,
      message: 'Simulation stopped',
    });
  };

  const resetSimulation = () => {
    setStatus({
      isRunning: false,
      generatedCalls: 0,
      totalCalls: 0,
      message: 'Ready to simulate emergency scenarios',
      error: null,
    });
  };

  const selectedScenarioData = scenarios.find(s => s.id === selectedScenario) || scenarios[0];
  const progress = status.totalCalls > 0 ? (status.generatedCalls / status.totalCalls) * 100 : 0;

  return (
    <div className="absolute left-32 top-6 bottom-6 right-6 z-10">
      <div className="h-full flex items-center justify-center">
        <div 
          className="w-full max-w-2xl rounded-xl"
          style={{
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(30px)',
            border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
            padding: '48px'
          }}
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
              Emergency Simulation
            </h2>
            <p className="text-sm" style={{ color: '#888888' }}>
              Generate realistic emergency scenarios for testing and training
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="mb-8">
            <label className="block text-sm font-bold mb-3" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
              Disaster Scenario
            </label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full rounded-lg text-left transition-all duration-200 flex items-center justify-between"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                  padding: '14px 18px',
                  color: theme === 'dark' ? '#ffffff' : '#000000'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)';
                }}
              >
                <span className="font-medium">{selectedScenarioData.name}</span>
                <svg className="w-5 h-5" style={{ color: '#888888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-50"
                  style={{
                    background: theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        setSelectedScenario(scenario.id);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left transition-all duration-200"
                      style={{
                        padding: '14px 18px',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                        background: selectedScenario === scenario.id 
                          ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                          : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedScenario !== scenario.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {scenario.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Call Volume Slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                Number of Calls
              </label>
              <span className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {callVolume}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={callVolume}
              onChange={(e) => setCallVolume(Number(e.target.value))}
              disabled={status.isRunning}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: theme === 'dark' 
                  ? `linear-gradient(to right, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) ${callVolume}%, rgba(255, 255, 255, 0.1) ${callVolume}%, rgba(255, 255, 255, 0.1) 100%)`
                  : `linear-gradient(to right, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) ${callVolume}%, rgba(0, 0, 0, 0.1) ${callVolume}%, rgba(0, 0, 0, 0.1) 100%)`,
              }}
            />
          </div>

          {/* Speed Control */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                Simulation Speed
              </label>
              <span className="text-xl font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {speed}x
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={status.isRunning}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: theme === 'dark' 
                  ? `linear-gradient(to right, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) ${speed * 10}%, rgba(255, 255, 255, 0.1) ${speed * 10}%, rgba(255, 255, 255, 0.1) 100%)`
                  : `linear-gradient(to right, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.3) ${speed * 10}%, rgba(0, 0, 0, 0.1) ${speed * 10}%, rgba(0, 0, 0, 0.1) 100%)`,
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 mb-8">
            {!status.isRunning ? (
              <button
                onClick={startSimulation}
                className="flex-1 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                  color: theme === 'dark' ? '#000000' : '#ffffff',
                  padding: '16px',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.9)' : '1px solid rgba(0, 0, 0, 0.9)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Simulation
              </button>
            ) : (
              <button
                onClick={stopSimulation}
                className="flex-1 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#ffffff',
                  padding: '16px',
                  border: '1px solid rgba(239, 68, 68, 0.9)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop Simulation
              </button>
            )}
            
            <button
              onClick={resetSimulation}
              disabled={status.isRunning}
              className="rounded-lg font-bold transition-all duration-200 flex items-center justify-center"
              style={{
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                color: theme === 'dark' ? '#ffffff' : '#000000',
                padding: '16px 24px',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                opacity: status.isRunning ? 0.5 : 1,
                cursor: status.isRunning ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!status.isRunning) {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Status Display */}
          <div 
            className="rounded-lg"
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              padding: '20px'
            }}
          >
            {/* Progress Bar */}
            {status.totalCalls > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    Progress
                  </span>
                  <span className="text-sm font-mono font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    {status.generatedCalls} / {status.totalCalls}
                  </span>
                </div>
                <div 
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: status.error 
                        ? 'linear-gradient(to right, #ef4444, #dc2626)' 
                        : 'linear-gradient(to right, #10b981, #059669)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="flex items-start gap-3">
              {status.isRunning ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mt-0.5" 
                  style={{ borderColor: theme === 'dark' ? '#ffffff' : '#000000' }}
                />
              ) : status.error ? (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : progress === 100 ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#888888' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {status.message}
                </p>
                {status.error && (
                  <p className="text-xs mt-1 text-red-400">
                    {status.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${theme === 'dark' ? '#ffffff' : '#000000'};
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type='range']::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${theme === 'dark' ? '#ffffff' : '#000000'};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s;
        }
        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
        input[type='range']:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Simulation;

