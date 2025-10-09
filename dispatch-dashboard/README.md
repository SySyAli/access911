# Dispatch Dashboard - Emergency Call Center

A beautiful, real-time emergency dispatch monitoring system built with Next.js, TypeScript, and Mapbox GL.

## Features

- 🗺️ **Interactive Mapbox Integration** - Real-time 3D map view with dynamic markers
- 🚨 **Emergency Management** - Track and resolve emergency calls
- 🎨 **Modern UI** - Translucent panels, rounded corners, and smooth animations
- 📍 **Location Tracking** - Click on emergencies to see pinpoints on the map
- 🏙️ **Multi-City Support** - Switch between multiple cities with dropdown selector
- 📊 **Real-time Statistics** - View counts by severity level
- ⚡ **Severity-Based Styling** - Color-coded emergencies (Critical, High, Medium, Low)
- 🌐 **Google Street View** - Click any marker to see street-level view of the location

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Mapbox account and access token (free at [mapbox.com](https://account.mapbox.com/access-tokens/))
- A Google Maps API key with Street View enabled (get one at [Google Cloud Console](https://console.cloud.google.com/))

### Installation

1. Navigate to the project directory:
```bash
cd dispatch-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
dispatch-dashboard/
├── app/
│   ├── page.tsx           # Main dashboard page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── Map.tsx            # Mapbox map component
│   ├── EmergencyList.tsx  # Emergency list panel
│   └── CityHeader.tsx     # City display header
├── types/
│   └── emergency.ts       # TypeScript type definitions
├── data/
│   └── emergencies.json   # Sample emergency data
└── README.md
```

## Usage

### Viewing Emergencies

- Emergency calls are displayed in the left panel with severity indicators
- Color coding:
  - 🔴 **Critical** - Red (with pulse animation)
  - 🟠 **High** - Orange
  - 🟡 **Medium** - Yellow
  - 🔵 **Low** - Blue

### Interacting with the Map

- Click on any emergency in the list to fly to its location
- Markers appear on the map for all active emergencies
- Click markers to see emergency details in a popup
- Use map controls (bottom-right) to zoom and navigate

### Resolving Emergencies

- Click the "Resolve" button on any emergency card
- Resolved emergencies are removed from the active list
- Resolution count is displayed in the bottom-right statistics panel

## Customization

### Adding New Emergencies

Edit `data/emergencies.json` to add new emergency calls:

```json
{
  "id": "EMG-009",
  "time": "2025-10-08T15:00:00",
  "severity": "high",
  "type": "Your Emergency Type",
  "location": {
    "address": "Address here",
    "coordinates": [-86.7816, 36.1627]
  },
  "description": "Emergency description",
  "status": "active",
  "caller": "Caller name",
  "units": ["UNIT-1", "UNIT-2"]
}
```

### Changing the City

In `app/page.tsx`, modify the `city` object:

```typescript
const city: City = {
  name: 'Your City',
  coordinates: [longitude, latitude],
  zoom: 12,
};
```

### Styling

The UI uses Tailwind CSS with custom translucent effects. Main theme colors can be adjusted in:
- `app/globals.css` - Global styles and CSS variables
- Component files - Tailwind classes for individual elements

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Mapbox GL** - Interactive maps
- **React Map GL** - React wrapper for Mapbox

## Building for Production

```bash
npm run build
npm start
```

## License

MIT License - feel free to use this project as you wish!

## Notes

- The default Mapbox token is a public demo token with limited usage
- For production use, create your own Mapbox account and token
- Emergency data is currently static from a JSON file
- Future enhancements could include:
  - WebSocket integration for real-time updates
  - Backend API for emergency management
  - User authentication
  - Advanced filtering and search
  - Audio/visual alerts for new emergencies
  - Multi-city switching
  - Historical data and analytics