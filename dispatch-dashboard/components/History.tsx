'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

interface CallRecord {
  id: string;
  timestamp: string;
  callDuration: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: {
    address: string;
    coordinates: [number, number];
  };
  caller: {
    name: string;
    phone: string;
    relation: string;
  };
  description: string;
  responseTime: string;
  unitsDispatched: string[];
  outcome: string;
  status: string;
  dispatchedBy: string;
  recordingUrl: string;
  transcriptAvailable: boolean;
  tags: string[];
}

interface HistoryProps {
  theme: 'light' | 'dark';
}

const History: React.FC<HistoryProps> = ({ theme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  // Fetch call history data from DynamoDB
  useEffect(() => {
    const fetchCallHistory = async () => {
      try {
        setLoading(true);
        
        // Initialize DynamoDB client
        const client = new DynamoDBClient({
          region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
            sessionToken: process.env.NEXT_PUBLIC_AWS_SESSION_TOKEN,
          },
        });
        
        const docClient = DynamoDBDocumentClient.from(client);
        
        const command = new ScanCommand({
          TableName: 'elevenlabs-call-data',
        });

        const response = await docClient.send(command);
        const items = response.Items || [];

        // Helper function to extract string from potentially nested objects
        const extractString = (field: any, defaultValue: string = ''): string => {
          if (!field) return defaultValue;
          if (typeof field === 'string') return field;
          if (typeof field === 'object') {
            return field.value || field.data || JSON.stringify(field);
          }
          return String(field);
        };

        // Transform DynamoDB data to CallRecord format
        const calls: CallRecord[] = items
          .filter((item: any) => item.call_successful === 'success' || item.call_successful === 'yes')
          .map((item: any, index: number) => {
            let severity = 'medium';
            if (item.severity) {
              severity = extractString(item.severity, 'medium').toLowerCase();
            }

            return {
              id: `CALL-${String(index + 1).padStart(3, '0')}`,
              timestamp: item.timestamp || item.created_at || new Date().toISOString(),
              callDuration: item.call_duration || item.duration || 'N/A',
              type: extractString(item.emergency_t || item.emergency_type, 'Emergency Call'),
              severity: severity as 'critical' | 'high' | 'medium' | 'low',
              location: {
                address: extractString(item.location, 'Unknown Location'),
                coordinates: [
                  parseFloat(item.longitude) || 0,
                  parseFloat(item.latitude) || parseFloat(item.emergency_t_latitude) || 36.1627,
                ] as [number, number],
              },
              caller: {
                name: extractString(item.caller_name || item.agent_id, 'Unknown'),
                phone: extractString(item.caller_phone || item.phone_number, 'N/A'),
                relation: extractString(item.caller_relation, 'Caller'),
              },
              description: extractString(item.summary, 'No description available'),
              responseTime: item.response_time || 'N/A',
              unitsDispatched: item.units_dispatched || [],
              outcome: extractString(item.outcome || item.resolution, 'Completed'),
              status: item.call_successful === 'success' ? 'resolved' : 'active',
              dispatchedBy: extractString(item.dispatched_by || item.agent_id, 'System'),
              recordingUrl: item.recording_url || '',
              transcriptAvailable: !!item.transcript || !!item.conversation_transcript,
              tags: item.tags || [],
            };
          });

        // Sort by timestamp (most recent first)
        calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setCallHistory(calls);
        console.log(`📞 Loaded ${calls.length} calls into history`);
      } catch (error) {
        console.error('Error fetching call history from DynamoDB:', error);
        setCallHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCallHistory();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCallHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get unique types and dates for filters
  const callTypes = useMemo(() => {
    const types = new Set(callHistory.map(call => call.type));
    return ['all', ...Array.from(types)];
  }, [callHistory]);

  const dates = useMemo(() => {
    const dateSet = new Set(callHistory.map(call => {
      const date = new Date(call.timestamp);
      return date.toLocaleDateString();
    }));
    return ['all', ...Array.from(dateSet)];
  }, [callHistory]);

  // Filter and search logic
  const filteredCalls = useMemo(() => {
    return callHistory.filter(call => {
      const matchesSearch = searchQuery === '' || 
        call.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.caller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'all' || call.type === selectedType;
      const matchesSeverity = selectedSeverity === 'all' || call.severity === selectedSeverity;
      
      const callDate = new Date(call.timestamp).toLocaleDateString();
      const matchesDate = selectedDate === 'all' || callDate === selectedDate;

      return matchesSearch && matchesType && matchesSeverity && matchesDate;
    });
  }, [callHistory, searchQuery, selectedType, selectedSeverity, selectedDate]);

  // Pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCalls.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCalls, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedSeverity, selectedDate]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="absolute left-24 top-6 bottom-6 right-6 z-10">
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
            padding: '24px 32px' 
          }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>Call History</h2>
            </div>
            <p className="text-sm" style={{ color: '#888888' }}>
              {filteredCalls.length} {filteredCalls.length === 1 ? 'call' : 'calls'} found
            </p>
          </div>

          {/* Search and Filters */}
          <div style={{
            borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            padding: '24px 32px'
          }}>
              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search by call ID, type, location, caller, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg outline-none transition-all"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  boxShadow: theme === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px',
                  marginBottom: '16px'
                }}
              />

              {/* Filter Row */}
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="rounded-lg outline-none cursor-pointer transition-all"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    boxShadow: theme === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px'
                  }}
                >
                  {callTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="rounded-lg outline-none cursor-pointer transition-all"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    boxShadow: theme === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px'
                  }}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg outline-none cursor-pointer transition-all"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    boxShadow: theme === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px'
                  }}
                >
                  {dates.map(date => (
                    <option key={date} value={date}>
                      {date === 'all' ? 'All Dates' : date}
                    </option>
                  ))}
                </select>
              </div>
          </div>

          {/* Call List */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {loading ? (
              <div className="text-center py-20" style={{
                color: theme === 'dark' ? '#ffffff' : '#000000'
              }}>
                <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                  borderTopColor: 'transparent'
                }}></div>
                <p className="text-lg">Loading call history...</p>
              </div>
            ) : paginatedCalls.length === 0 ? (
              <div className="text-center py-20" style={{
                color: theme === 'dark' ? '#666666' : '#999999'
              }}>
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg">No calls found matching your criteria</p>
              </div>
            ) : (
              paginatedCalls.map(call => (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className="rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                    border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)',
                    boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
                    padding: '22px 28px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)';
                  }}
                >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg" style={{
                      color: theme === 'dark' ? '#ffffff' : '#000000'
                    }}>
                      {call.id}
                    </span>
                    <span className="rounded-full text-xs font-bold" style={{
                      background: getSeverityColor(call.severity) + '20',
                      color: getSeverityColor(call.severity),
                      border: `1px solid ${getSeverityColor(call.severity)}40`,
                      padding: '6px 14px'
                    }}>
                      {call.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm" style={{
                    color: theme === 'dark' ? '#888888' : '#666666'
                  }}>
                    {formatTimestamp(call.timestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold mb-1" style={{
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                  }}>
                    {call.type}
                  </p>
                  <p className="text-xs" style={{
                    color: theme === 'dark' ? '#666666' : '#999999'
                  }}>
                    Duration: {call.callDuration}
                  </p>
                </div>
              </div>

              <p className="mb-2" style={{
                color: theme === 'dark' ? '#cccccc' : '#333333'
              }}>
                {call.description}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" style={{ color: theme === 'dark' ? '#666666' : '#999999' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm" style={{
                  color: theme === 'dark' ? '#888888' : '#666666'
                }}>
                  {call.location.address}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {call.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="rounded text-xs"
                      style={{
                        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        color: theme === 'dark' ? '#cccccc' : '#666666',
                        padding: '6px 12px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {call.tags.length > 3 && (
                    <span className="text-xs" style={{
                      color: theme === 'dark' ? '#666666' : '#999999'
                    }}>
                      +{call.tags.length - 3} more
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded" style={{
                    background: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    padding: '6px 12px'
                  }}>
                    ✓ {call.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between" style={{
              borderTop: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)',
              padding: '20px 32px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  padding: '10px 20px'
                }}
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 h-10 rounded-lg transition-all font-semibold"
                      style={{
                        background: currentPage === pageNum 
                          ? (theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)')
                          : (theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)'),
                        border: currentPage === pageNum
                          ? (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.3)')
                          : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.1)'),
                        color: theme === 'dark' ? '#ffffff' : '#000000'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                  border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  padding: '10px 20px'
                }}
              >
                Next
              </button>
            </div>
          )}

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
      </div>

    {/* Detail Modal */}
    {selectedCall && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-8"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)'
        }}
        onClick={() => setSelectedCall(null)}
      >
        <div
          className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{
            background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            padding: '32px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
            {/* Modal Header */}
            <div className="flex items-start justify-between" style={{ marginBottom: '24px' }}>
              <div>
                <h2 className="text-2xl font-bold" style={{
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  marginBottom: '8px'
                }}>
                  {selectedCall.id}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full text-xs font-bold" style={{
                    background: getSeverityColor(selectedCall.severity) + '20',
                    color: getSeverityColor(selectedCall.severity),
                    border: `1px solid ${getSeverityColor(selectedCall.severity)}40`,
                    padding: '6px 14px'
                  }}>
                    {selectedCall.severity.toUpperCase()}
                  </span>
                  <span style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
                    {selectedCall.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="rounded-lg transition-all"
                style={{
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  padding: '8px'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px' 
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '16px' 
              }}>
                <div>
                  <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '4px' }}>
                    Timestamp
                  </p>
                  <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    {formatTimestamp(selectedCall.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '4px' }}>
                    Call Duration
                  </p>
                  <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    {selectedCall.callDuration}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '4px' }}>
                    Response Time
                  </p>
                  <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                    {selectedCall.responseTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '4px' }}>
                    Status
                  </p>
                  <p className="capitalize" style={{ color: '#22c55e' }}>
                    {selectedCall.status}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Description
                </p>
                <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {selectedCall.description}
                </p>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Location
                </p>
                <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {selectedCall.location.address}
                </p>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginTop: '4px' }}>
                  Coordinates: {selectedCall.location.coordinates.join(', ')}
                </p>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Caller Information
                </p>
                <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {selectedCall.caller.name} ({selectedCall.caller.relation})
                </p>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
                  {selectedCall.caller.phone}
                </p>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Units Dispatched
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedCall.unitsDispatched.map(unit => (
                    <span
                      key={unit}
                      className="rounded-lg font-mono text-sm"
                      style={{
                        background: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        padding: '8px 14px'
                      }}
                    >
                      {unit}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Outcome
                </p>
                <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {selectedCall.outcome}
                </p>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Dispatched By
                </p>
                <p style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  {selectedCall.dispatchedBy}
                </p>
              </div>

              <div>
                <p className="text-sm" style={{ color: theme === 'dark' ? '#666666' : '#999999', marginBottom: '8px' }}>
                  Tags
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedCall.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-lg text-sm"
                      style={{
                        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        color: theme === 'dark' ? '#cccccc' : '#666666',
                        padding: '8px 14px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                paddingTop: '24px',
                borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
              }}>
                <button
                  className="rounded-lg font-semibold transition-all"
                  style={{
                    background: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '12px 24px',
                    flex: 1
                  }}
                >
                  🎧 Play Recording
                </button>
                {selectedCall.transcriptAvailable && (
                  <button
                    className="rounded-lg font-semibold transition-all"
                    style={{
                      background: theme === 'dark' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.1)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '12px 24px',
                      flex: 1
                    }}
                  >
                    📄 View Transcript
                  </button>
                )}
              </div>
            </div>
        </div>
      </div>
    )}
    </>
  );
};

export default History;

