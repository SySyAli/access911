export interface Emergency {
  id: string;
  time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  location: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  description: string;
  status: 'active' | 'resolved';
  caller: string;
  units: string[];
}

export interface City {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  zoom: number;
}
