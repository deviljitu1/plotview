import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ImageOverlay, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapAligner.css';

// Fix Leaflet's default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map center changes from search
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  return null;
};

const MapAligner = ({ imageUrl, initialTopLeft, initialBottomRight, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([21.25, 81.63]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Draggable Markers state
  const [topLeft, setTopLeft] = useState(initialTopLeft || { lat: 21.251, lng: 81.629 });
  const [bottomRight, setBottomRight] = useState(initialBottomRight || { lat: 21.249, lng: 81.631 });

  // Update parent when coords change
  useEffect(() => {
    onChange({ topLeft, bottomRight });
  }, [topLeft, bottomRight]);

  // Derived bounds for the ImageOverlay
  const bounds = useMemo(() => {
    return [
      [topLeft.lat, topLeft.lng],
      [bottomRight.lat, bottomRight.lng]
    ];
  }, [topLeft, bottomRight]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setMapCenter([newLat, newLng]);
        
        // Also move the markers to the new search area roughly
        setTopLeft({ lat: newLat + 0.001, lng: newLng - 0.001 });
        setBottomRight({ lat: newLat - 0.001, lng: newLng + 0.001 });
      } else {
        alert('Location not found. Try a different search term.');
      }
    } catch (err) {
      console.error('Error searching location:', err);
      alert('Error searching location.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="map-aligner-container">
      <div className="map-aligner-search">
        <input 
          type="text" 
          placeholder="Search for a city or location (e.g., 'Raipur, Chhattisgarh')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="image-overlay-help">
        <span>💡</span> Drag the two blue markers on the map to position and stretch your layout image.
      </div>

      <div className="map-aligner-wrapper">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ width: '100%', height: '100%' }}
          maxZoom={22}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            maxNativeZoom={18}
            maxZoom={22}
          />
          <MapController center={mapCenter} />

          {/* Draggable Markers */}
          <Marker 
            position={topLeft} 
            draggable={true}
            eventHandlers={{
              drag: (e) => setTopLeft(e.target.getLatLng())
            }}
          >
            <Tooltip permanent direction="top">Top Left Corner</Tooltip>
          </Marker>

          <Marker 
            position={bottomRight} 
            draggable={true}
            eventHandlers={{
              drag: (e) => setBottomRight(e.target.getLatLng())
            }}
          >
            <Tooltip permanent direction="bottom">Bottom Right Corner</Tooltip>
          </Marker>

          {/* Layout Image Overlay */}
          {imageUrl && (
            <ImageOverlay
              url={imageUrl}
              bounds={bounds}
              opacity={0.7}
            />
          )}
        </MapContainer>
      </div>

      <div className="map-aligner-controls">
        <div className="coord-box">
          <label>Top Left</label>
          <div>Lat: {topLeft.lat.toFixed(6)}</div>
          <div>Lng: {topLeft.lng.toFixed(6)}</div>
        </div>
        <div className="coord-box">
          <label>Bottom Right</label>
          <div>Lat: {bottomRight.lat.toFixed(6)}</div>
          <div>Lng: {bottomRight.lng.toFixed(6)}</div>
        </div>
      </div>
    </div>
  );
};

export default MapAligner;
