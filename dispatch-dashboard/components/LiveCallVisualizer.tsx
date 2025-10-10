'use client';

import React, { useState, useEffect } from 'react';
import { Emergency } from '@/types/emergency';

interface LiveCallVisualizerProps {
  theme: 'light' | 'dark';
  onNewCall?: (call: Emergency) => void;
}

interface SystemMetrics {
  callsPerSecond: number;
  queueDepth: number;
  averageResponseTime: number;
  systemLoad: number;
  activeConnections: number;
}

const LiveCallVisualizer: React.FC<LiveCallVisualizerProps> = ({ theme, onNewCall }) => {
  const [recentCalls, setRecentCalls] = useState<Emergency[]>([]);
  const [simulatedCalls, setSimulatedCalls] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    callsPerSecond: 0,
    queueDepth: 0,
    averageResponseTime: 0,
    systemLoad: 0,
    activeConnections: 0,
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState('la_wildfire');

  // Available scenarios from your Lambda
  const scenarios = [
    { id: 'la_wildfire', name: 'Los Angeles Wildfire', description: 'Wildfire emergency simulation' },
    { id: 'hurricane_florida', name: 'Florida Hurricane', description: 'Hurricane response simulation' },
    { id: 'earthquake_sf', name: 'San Francisco Earthquake', description: 'Earthquake emergency simulation' },
    { id: 'nashville_tornado', name: 'Nashville Tornado Outbreak', description: 'Tornado outbreak simulation' },
  ];

  const startSimulation = async () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('https://v2y08vmfga.execute-api.us-east-1.amazonaws.com/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          num_calls: 50,
          scenario: selectedScenario
        })
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update system metrics based on Lambda response
      setSystemMetrics({
        callsPerSecond: Math.round((50 * 1000) / responseTime),
        queueDepth: 50,
        averageResponseTime: responseTime,
        systemLoad: (result.successful / 50) * 100,
        activeConnections: result.successful,
      });

      setSimulationProgress(100);
      
      // Store the simulated calls from the API response
      if (result.sample_calls && result.sample_calls.length > 0) {
        setSimulatedCalls(result.sample_calls);
      }
      
      console.log('Simulation result:', result);
      
    } catch (error) {
      console.error('Simulation failed:', error);
      alert(`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationProgress(0);
    setSystemMetrics({
      callsPerSecond: 0,
      queueDepth: 0,
      averageResponseTime: 0,
      systemLoad: 0,
      activeConnections: 0,
    });
  };

  // Fetch real calls from DynamoDB
  useEffect(() => {
    const fetchRealCalls = async () => {
      try {
        // Use the same DynamoDB client as your main dashboard
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');

        const client = new DynamoDBClient({
          region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
            sessionToken: process.env.NEXT_PUBLIC_AWS_SESSION_TOKEN,
          },
        });

        const docClient = DynamoDBDocumentClient.from(client);
        const tableName = 'elevenlabs-call-data';

        const command = new ScanCommand({
          TableName: tableName,
          Limit: 20, // Get last 20 calls
        });

        const response = await docClient.send(command);
        const items = response.Items || [];

        // Sort by timestamp (most recent first)
        const sortedItems = items
          .filter((item: any) => item.conversation_id && item.timestamp)
          .sort((a: any, b: any) => {
            const timeA = parseInt(a.timestamp) || 0;
            const timeB = parseInt(b.timestamp) || 0;
            return timeB - timeA;
          })
          .slice(0, 10);

        // Transform to Emergency format
        const calls = sortedItems.map((item: any) => {
          const extractString = (field: any, defaultValue: string = ''): string => {
            if (!field) return defaultValue;
            if (typeof field === 'string') return field;
            if (typeof field === 'object') return field.value || field.data || String(field);
            return String(field);
          };

          const capitalize = (str: string): string => {
            if (!str) return str;
            return str.split('. ').map(sentence => {
              return sentence.charAt(0).toUpperCase() + sentence.slice(1);
            }).join('. ');
          };

          const latitude = parseFloat(item.latitude) || 36.1627;
          const longitude = parseFloat(item.longitude) || -86.7816;
          const severity = extractString(item.severity, 'medium').toLowerCase();

          return {
            id: item.conversation_id?.substring(0, 12) || 'CALL-UNKNOWN',
            time: item.created_at || new Date(parseInt(item.timestamp) * 1000).toISOString(),
            severity: severity as 'critical' | 'high' | 'medium' | 'low',
            type: capitalize(extractString(item.emergency_type || item.emergency_t, 'Emergency Call')),
            location: {
              address: capitalize(extractString(item.location, 'Unknown Location')),
              coordinates: [longitude, latitude] as [number, number],
            },
            description: capitalize(extractString(item.summary, 'Call in progress')),
            status: 'active' as const,
            caller: capitalize(extractString(item.agent_id, 'Caller')),
            units: [],
          };
        });

        setRecentCalls(calls);

        // Calculate real stats
        const newStats = calls.reduce((acc, call) => ({
          total: acc.total + 1,
          critical: acc.critical + (call.severity === 'critical' ? 1 : 0),
          high: acc.high + (call.severity === 'high' ? 1 : 0),
          medium: acc.medium + (call.severity === 'medium' ? 1 : 0),
          low: acc.low + (call.severity === 'low' ? 1 : 0),
        }), { total: 0, critical: 0, high: 0, medium: 0, low: 0 });

        setStats(newStats);

        // Notify parent of new calls
        if (onNewCall && calls.length > 0) {
          calls.forEach(call => onNewCall(call));
        }

      } catch (error) {
        console.error('Error fetching real calls:', error);
      }
    };

    // Fetch immediately
    fetchRealCalls();

    // Poll every 2 seconds for real-time updates
    const interval = setInterval(fetchRealCalls, 2000);

    return () => clearInterval(interval);
  }, [onNewCall]);

  return (
    <div className="absolute left-28 top-6 bottom-6 w-[400px] z-10">
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
          padding: '20px' 
        }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                Emergency Simulation
              </h2>
              <p className="text-sm" style={{ color: '#888888' }}>
                AWS Lambda disaster scenario testing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSimulating ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-red-500">SIMULATING</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-bold text-green-500">READY</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Simulation Controls */}
          <div style={{ marginTop: '10px' }}>
            {/* Scenario Selector */}
            <div style={{ marginBottom: '10px' }}>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                disabled={isSimulating}
                className="w-full rounded-lg text-sm"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  opacity: isSimulating ? 0.5 : 1,
                  padding: '12px 16px',
                }}
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Button */}
            <div style={{ marginTop: '10px' }}>
              {!isSimulating ? (
                <button
                  onClick={startSimulation}
                  className="w-full px-8 py-5 rounded-lg font-bold text-sm transition-all duration-200"
                  style={{
                    background: 'rgba(4, 255, 0, 0.1)',
                    color: '#10b981',
                    border: '1px solid rgba(23, 255, 0, 0.2)',
                    padding: '12px 16px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(4, 255, 0, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(4, 255, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Start Simulation
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="w-full px-12 py-7 rounded-lg font-bold text-sm transition-all duration-200"
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: '1px solid #ef4444',
                    padding: '12px 16px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dc2626';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Stop Simulation
                </button>
              )}
            </div>
          
            {/* Progress Bar */}
            {isSimulating && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    Simulation Progress: {simulationProgress}%
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: '#888888' }}>
                    Generating calls
                  </span>
                </div>
                <div 
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${simulationProgress}%`,
                      background: 'linear-gradient(to right, #10b981, #059669)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Metrics */}
        <div style={{ padding: '20px', borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)' }}>
          <div className="text-xs font-bold mb-3" style={{ color: '#888888' }}>SYSTEM PERFORMANCE</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {systemMetrics.callsPerSecond}
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>Calls/Second</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {systemMetrics.queueDepth}
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>Queue Depth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {Math.round(systemMetrics.averageResponseTime)}ms
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {systemMetrics.systemLoad}%
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>System Load</div>
            </div>
          </div>
          
          {/* System Load Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: '#888888' }}>System Capacity</span>
              <span className="text-xs font-mono font-bold" style={{ color: '#888888' }}>
                {systemMetrics.activeConnections} active
              </span>
            </div>
            <div 
              className="w-full h-3 rounded-full overflow-hidden"
              style={{
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${(systemMetrics.activeConnections / 200) * 100}%`,
                  background: systemMetrics.systemLoad > 80 
                    ? 'linear-gradient(to right, #ef4444, #dc2626)' 
                    : systemMetrics.systemLoad > 60
                    ? 'linear-gradient(to right, #f59e0b, #d97706)'
                    : 'linear-gradient(to right, #10b981, #059669)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Generated Calls List */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {simulatedCalls.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg font-medium mb-2" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                {isSimulating ? 'Simulation Running...' : 'Ready to Simulate'}
              </p>
              <p className="text-sm" style={{ color: '#888888' }}>
                {isSimulating ? 'Generating emergency calls...' : 'Click "Start Simulation" to generate emergency calls'}
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-h-96 overflow-y-auto custom-scrollbar">
              {simulatedCalls.map((call, index) => (
                <div
                  key={call.call_id}
                  className="rounded-lg transition-all duration-300 animate-slideIn"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                    padding: '16px',
                    opacity: 1 - (index * 0.02),
                    transform: `scale(${1 - (index * 0.005)})`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full bg-blue-500"
                        style={{ animation: 'pulse 2s infinite' }}
                      />
                      <span className="text-xs font-bold uppercase" style={{ color: '#3b82f6' }}>
                        SIMULATED
                      </span>
                      <span className="text-xs px-1 py-0.5 rounded" style={{ 
                        background: '#3b82f6', 
                        color: '#ffffff',
                        fontSize: '10px'
                      }}>
                        TEST
                      </span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: '#888888' }}>
                      {call.call_id}
                    </span>
                  </div>
                  
                  <h4 className="font-bold mb-2 text-sm" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    {call.emergency_type?.replace('_', ' ').toUpperCase() || 'Emergency Call'}
                  </h4>
                  
                  <p className="text-xs mb-2 font-medium" style={{ color: '#10b981' }}>
                    📍 {call.location || 'Unknown Location'}
                  </p>
                  
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: theme === 'dark' ? '#cccccc' : '#666666' }}>
                    Simulated emergency call generated by AWS Lambda
                  </p>
                  
                  <p className="text-xs mt-2" style={{ color: '#3b82f6' }}>
                    ID: {call.call_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
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

// Helper functions
function getSeverityColor(severity: string): string {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return colors[severity as keyof typeof colors] || 'bg-gray-500';
}

function getSeverityTextColor(severity: string): string {
  const colors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  };
  return colors[severity as keyof typeof colors] || '#888888';
}

function formatTime(timeString: string): string {
  const date = new Date(timeString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default LiveCallVisualizer;