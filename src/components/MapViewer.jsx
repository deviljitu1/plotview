import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import PlotDetailsModal from './PlotDetailsModal';
import './MapViewer.css';

const MapViewer = ({ project, plots: plotsData }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const mapImageUrl = project?.mapImageUrl || project?.backgroundUrl || '';

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
  const hasPlots = Array.isArray(plotsData) && plotsData.length > 0;

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
        {!mapImageUrl && (
          <div className="map-empty-state">
            <h2>Map image missing</h2>
            <p>This project is saved, but no map image is attached yet.</p>
          </div>
        )}
        {mapImageUrl && !hasPlots && (
          <div className="map-empty-state">
            <h2>No plots added</h2>
            <p>The map is available, but no plot boundaries have been saved.</p>
          </div>
        )}
        <TransformWrapper
          initialScale={1}
          minScale={0.75}
          maxScale={2.25}
          centerOnInit={true}
          centerZoomedOut={true}
          limitToBounds={false}
          wheel={{ step: 0.08 }}
          panning={{
            velocityDisabled: true,
            allowLeftClickPan: true,
            excluded: ['button'],
          }}
          trackPadPanning={{
            velocityDisabled: true,
            excluded: ['button'],
          }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: 'reset', animationTime: 180 }}
          velocityAnimation={{ disabled: true }}
          zoomAnimation={{ animationTime: 180 }}
          autoAlignment={{
            animationTime: 160,
            velocityAlignmentTime: 80,
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="controls">
                <button onClick={() => zoomIn()}>+</button>
                <button onClick={() => zoomOut()}>−</button>
                <button onClick={() => resetTransform()}>Reset</button>
              </div>
              <TransformComponent
                wrapperClass="transform-wrapper"
                contentClass="transform-content"
                wrapperStyle={{ width: 'max-content', minWidth: '100%', overflow: 'visible' }}
                contentStyle={{ width: 'max-content', minWidth: '100%' }}
              >
                <svg
                  width={imgDim.width}
                  height={imgDim.height}
                  viewBox={`0 0 ${imgDim.width} ${imgDim.height}`}
                  className="interactive-map"
                  style={{
                    '--map-width': `${imgDim.width}px`,
                    '--map-height': `${imgDim.height}px`,
                    aspectRatio: `${imgDim.width} / ${imgDim.height}`,
                  }}
                >
                  {/* Background Map Image */}
                  <image
                    href={mapImageUrl}
                    width={imgDim.width}
                    height={imgDim.height}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  />

                  {/* Interactive Plot Overlays */}
                  {hasPlots && plotsData.map((plot) => (
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
