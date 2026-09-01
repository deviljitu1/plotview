import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PlotDetailsModal from './PlotDetailsModal';
import { transformPlotPoints } from '../utils/coordinateTransform';
import './LeafletMapViewer.css';

const LeafletMapViewer = ({ project, plots: plotsData, searchQuery, filterType, filterStatus }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);

  const hasPlots = Array.isArray(plotsData) && plotsData.length > 0;
  
  // Georeferencing data from project
  const geoBounds = project?.geoBounds; // { topLeft: { lat, lng }, bottomRight: { lat, lng } }
  const imgDim = project?.imgDimensions || { width: 1000, height: 750 };
  
  const hasGeoreferencing = geoBounds?.enabled && geoBounds?.topLeft && geoBounds?.bottomRight;

  const getFillColor = (status) => {
    switch (status) {
      case 'Available': return '#10b981';
      case 'Booked': return '#facc15';
      case 'Registered': return '#ef4444';
      default: return '#ffffff';
    }
  };

  // Calculate map center based on bounds if available, otherwise default to a generic location
  const mapCenter = hasGeoreferencing ? [
    (geoBounds.topLeft.lat + geoBounds.bottomRight.lat) / 2,
    (geoBounds.topLeft.lng + geoBounds.bottomRight.lng) / 2
  ] : [21.25, 81.63];

  const isPlotVisible = (plot) => {
    if (filterType !== 'All' && plot.type !== filterType) return false;
    if (filterStatus !== 'All' && plot.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const plotName = (plot.name || '').toLowerCase();
      if (!plotName.includes(q)) return false;
    }
    return true;
  };

  // Auto-open plot details if search query exactly matches
  useEffect(() => {
    if (searchQuery && hasPlots) {
      const q = searchQuery.toLowerCase().trim();
      const exactMatch = plotsData.find(p => (p.name || '').toLowerCase() === q);
      if (exactMatch) {
        setSelectedPlot(exactMatch);
      }
    }
  }, [searchQuery, hasPlots, plotsData]);

  if (!hasGeoreferencing) {
    return (
      <div className="leaflet-empty-state">
        <h2>Georeferencing Not Configured</h2>
        <p>This project does not have GPS coordinates configured for the satellite map.</p>
        <p>Please edit the project settings to enable Satellite Map view.</p>
      </div>
    );
  }

  return (
    <div className="leaflet-viewer-wrap">
      <MapContainer 
        center={mapCenter} 
        zoom={17} 
        style={{ width: '100%', height: '100%' }}
        maxZoom={22}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          maxNativeZoom={18}
          maxZoom={22}
        />
        
        {hasPlots && plotsData.map((plot) => {
          const visible = isPlotVisible(plot);
          if (!visible) return null;
          
          const latLngs = transformPlotPoints(plot.points, geoBounds, imgDim);
          
          if (latLngs.length === 0) return null;

          return (
            <Polygon
              key={plot.id}
              positions={latLngs}
              pathOptions={{
                fillColor: getFillColor(plot.status),
                fillOpacity: 0.5,
                color: '#ffffff',
                weight: 2
              }}
              eventHandlers={{
                click: () => setSelectedPlot(plot)
              }}
            >
              <Tooltip sticky className="plot-tooltip">{plot.name}</Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>

      {selectedPlot && (
        <PlotDetailsModal
          plot={selectedPlot}
          project={project}
          brandColor={project?.brandColor}
          onClose={() => setSelectedPlot(null)}
        />
      )}
    </div>
  );
};

export default LeafletMapViewer;
