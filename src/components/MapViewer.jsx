import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import PlotDetailsModal from './PlotDetailsModal';
import './MapViewer.css';

const MapViewer = ({ project, plots: plotsData }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
  };

  const getFillColor = (status) => {
    switch (status) {
      case 'Available': return 'rgba(16, 185, 129, 0.35)';
      case 'Booked': return 'rgba(245, 158, 11, 0.35)';
      case 'Sold': return 'rgba(239, 68, 68, 0.35)';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const imgDim = project?.imgDimensions || { width: 1000, height: 750 };

  return (
    <div className="map-viewer-wrap">
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.8)' }}></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgba(245, 158, 11, 0.8)' }}></div>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }}></div>
          <span>Sold</span>
        </div>
      </div>

      <div className="map-viewer">
        <TransformWrapper
          initialScale={0.8}
          minScale={0.3}
          maxScale={4}
          centerOnInit={true}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="controls">
                <button onClick={() => zoomIn()}>+</button>
                <button onClick={() => zoomOut()}>−</button>
                <button onClick={() => resetTransform()}>Reset</button>
              </div>
              <TransformComponent wrapperClass="transform-wrapper" contentClass="transform-content">
                <svg
                  viewBox={`0 0 ${imgDim.width} ${imgDim.height}`}
                  className="interactive-map"
                  style={{ backgroundColor: '#f0f0f0' }}
                >
                  {/* Background Map Image */}
                  <image
                    href={project?.mapImageUrl}
                    width={imgDim.width}
                    height={imgDim.height}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  />

                  {/* Interactive Plot Overlays */}
                  {plotsData && plotsData.map((plot) => (
                    <g key={plot.id} onClick={() => handlePlotClick(plot)} className="plot-group">
                      <polygon
                        points={plot.points}
                        fill={getFillColor(plot.status)}
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth="1.5"
                        className="plot-polygon"
                      />
                      <polygon
                        points={plot.points}
                        fill="transparent"
                        className="plot-polygon-hover"
                      />
                    </g>
                  ))}
                </svg>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {selectedPlot && (
        <PlotDetailsModal
          plot={selectedPlot}
          brandColor={project?.brandColor}
          onClose={() => setSelectedPlot(null)}
        />
      )}
    </div>
  );
};

export default MapViewer;
