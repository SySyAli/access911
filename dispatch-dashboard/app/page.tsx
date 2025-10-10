'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import Sidebar from '@/components/Sidebar';
import EmergencyList from '@/components/EmergencyList';
import CitySelector from '@/components/CitySelector';
import History from '@/components/History';
import LiveCallVisualizer from '@/components/LiveCallVisualizer';
import { Emergency, City } from '@/types/emergency';
import emergenciesData from '@/data/emergencies.json';

// Dynamically import Map component to avoid SSR issues with mapbox-gl
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white text-lg font-semibold">Loading map...</div>
      </div>
    </div>
  ),
});

type ActiveTab = 'dashboard' | 'map' | 'history' | 'analytics';

export default function Home() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [city, setCity] = useState<City>({
    name: 'Nashville',
    coordinates: [-86.7816, 36.1627],
    zoom: 12,
  });

  useEffect(() => {
    // Initialize DynamoDB client (direct browser access)
    const client = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.NEXT_PUBLIC_AWS_SESSION_TOKEN,
      },
    });
    
    const docClient = DynamoDBDocumentClient.from(client);

    // Fetch emergency data directly from DynamoDB
    const fetchEmergencies = async () => {
      try {
        const tableName = 'elevenlabs-call-data';
        console.log(`🔍 Scanning DynamoDB table: ${tableName}`);
        
        const command = new ScanCommand({
          TableName: tableName,
        });

        const response = await docClient.send(command);
        const items = response.Items || [];

        console.log(`📊 Total items in DynamoDB: ${items.length}`);
        console.log('📋 First item sample:', items[0]);

        // Check what call_successful values exist (note: field is call_successful, not call_success!)
        const callSuccessValues = [...new Set(items.map((item: any) => item.call_successful))];
        console.log(`📝 Unique call_successful values in table:`, callSuccessValues);
        
        // Check severity values too
        const severityValues = [...new Set(items.map((item: any) => item.severity))];
        console.log(`📝 Unique severity values in table:`, severityValues);

        // Transform DynamoDB data to match Emergency interface
        const emergencies = items
          .filter((item: any) => {
            // Only include successful calls
            const isSuccess = item.call_successful === 'success' || item.call_successful === 'yes';
            // Optionally filter out test calls (uncomment next line to exclude tests)
            // const isNotTest = item.test !== true;
            return isSuccess;
          })
          .map((item: any, index: number) => {
            // Helper function to extract string from potentially nested objects
            const extractString = (field: any, defaultValue: string = ''): string => {
              if (!field) return defaultValue;
              if (typeof field === 'string') return field;
              if (typeof field === 'object') {
                // If it's an object, try to extract a value field
                return field.value || field.data || JSON.stringify(field);
              }
              return String(field);
            };

            // Helper function to capitalize strings properly
            const capitalize = (str: string): string => {
              if (!str) return '';
              return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            };

            // Extract coordinates
            const latitude = parseFloat(item.latitude) || parseFloat(item.emergency_t_latitude) || 36.1627;
            const longitude = parseFloat(item.longitude) || 0;
            
            // Safely handle severity - convert to string and lowercase
            let severity = 'medium';
            if (item.severity) {
              severity = extractString(item.severity, 'medium').toLowerCase();
            }
            
            // Generate a cleaner ID like "CALL-001", "CALL-002", etc.
            const cleanId = `CALL-${String(index + 1).padStart(3, '0')}`;
            
            return {
              id: cleanId,
              time: item.timestamp || item.created_at || item.conversation_timestamp || new Date().toISOString(),
              severity: severity as 'critical' | 'high' | 'medium' | 'low',
              type: capitalize(extractString(item.emergency_t || item.emergency_type, 'Emergency Call')),
              location: {
                address: capitalize(extractString(item.location, 'Unknown Location')),
                coordinates: [longitude, latitude] as [number, number],
              },
              description: capitalize(extractString(item.summary, 'No description available')),
              status: 'active' as const,
              caller: capitalize(extractString(item.agent_id, 'Caller')),
              units: [], // DynamoDB table doesn't have units, will be empty
            };
          });

        console.log(`✅ After filtering: ${emergencies.length} successful calls`);

        // Sort by recency (most recent first)
        emergencies.sort((a: any, b: any) => {
          const timeA = new Date(a.time).getTime();
          const timeB = new Date(b.time).getTime();
          return timeB - timeA; // Descending order (newest first)
        });

        // Take only the last 5 calls for the active calls list
        const activeEmergencies = emergencies.slice(0, 5);
        
        console.log(`✅ Loaded ${activeEmergencies.length} active calls from DynamoDB`);
        console.log('📦 Active emergencies:', activeEmergencies);
        setEmergencies(activeEmergencies as Emergency[]);
      } catch (error) {
        console.error('Error fetching from DynamoDB:', error);
        // Fallback to local data
        console.log('📂 Using local emergency data as fallback');
        setEmergencies(emergenciesData as Emergency[]);
      }
    };

    fetchEmergencies();

    // Set up polling to refresh data every 10 seconds
    const interval = setInterval(fetchEmergencies, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectEmergency = (emergency: Emergency) => {
    setSelectedEmergency(emergency);
  };

  const handleResolveEmergency = (id: string) => {
    setEmergencies((prev) =>
      prev.map((emergency) =>
        emergency.id === id
          ? { ...emergency, status: 'resolved' as const }
          : emergency
      )
    );
    
    // Clear selection if the resolved emergency was selected
    if (selectedEmergency?.id === id) {
      setSelectedEmergency(null);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ 
      background: theme === 'dark' ? '#000000' : '#f8fafc' 
    }}>
      {/* Sidebar */}
      <Sidebar 
        cityName={city.name}
        activeCount={emergencies.filter(e => e.status === 'active').length}
        theme={theme}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <>
          {/* Map Background - offset for sidebar */}
          <div className="absolute left-24 right-0 top-0 bottom-0">
            <Map
              center={city.coordinates}
              zoom={city.zoom}
              emergencies={emergencies}
              selectedEmergency={selectedEmergency}
              theme={theme}
            />
          </div>

          {/* City Selector */}
          <CitySelector currentCity={city} onCityChange={setCity} theme={theme} />

          {/* Emergency List */}
          <EmergencyList
            emergencies={emergencies}
            selectedId={selectedEmergency?.id || null}
            onSelect={handleSelectEmergency}
            onResolve={handleResolveEmergency}
            theme={theme}
          />
        </>
      )}

      {/* Map View */}
      {activeTab === 'map' && (
        <div className="absolute left-24 right-0 top-0 bottom-0">
          <Map
            center={city.coordinates}
            zoom={city.zoom}
            emergencies={emergencies}
            selectedEmergency={selectedEmergency}
            theme={theme}
          />
          <CitySelector currentCity={city} onCityChange={setCity} theme={theme} />
        </div>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="absolute left-24 right-0 top-0 bottom-0">
          <History theme={theme} />
        </div>
      )}

      {/* Analytics/Live Monitor View */}
      {activeTab === 'analytics' && (
        <>
          <div className="absolute left-24 right-0 top-0 bottom-0">
            <Map
              center={city.coordinates}
              zoom={city.zoom}
              emergencies={emergencies}
              selectedEmergency={selectedEmergency}
              theme={theme}
            />
            <CitySelector currentCity={city} onCityChange={setCity} theme={theme} />
          </div>
          
          {/* Live Call Visualizer Overlay */}
          <LiveCallVisualizer theme={theme} />
        </>
      )}

    </main>
  );
}