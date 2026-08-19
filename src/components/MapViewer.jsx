import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Search, Filter, X } from 'lucide-react';
import PlotDetailsModal from './PlotDetailsModal';
import './MapViewer.css';

const MapViewer = ({ project, plots: plotsData, searchQuery, filterType, filterStatus }) => {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [containerSize, setContainerSize] = useState(null);
  const containerRef = useRef(null);
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

  const plotTypes = ['All', ...new Set((plotsData || []).map(p => p.type).filter(Boolean))];

  const isPlotVisible = (plot) => {
    if (filterType !== 'All' && plot.type !== filterType) return false;
    if (filterStatus !== 'All' && plot.status !== filterStatus) return false;
    if (searchQuery && !plot.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  };

  // Measure the container and compute the SVG pixel dimensions that fit
  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    setContainerSize({ width: w, height: h });
  }, []);

  useEffect(() => {
    // Measure after initial layout
    measure();
    // Small delay to catch post-paint layout shifts (mobile address bar, etc.)
    const t = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    // Also listen for orientation change on mobile
    window.addEventListener('orientationchange', () => setTimeout(measure, 200));
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Compute the SVG pixel size that perfectly fits the container while
  // preserving the map's aspect ratio — this becomes the "1x" size for
  // react-zoom-pan-pinch so initialScale=1 means "fit the whole map".
  let svgW = imgDim.width;
  let svgH = imgDim.height;
  if (containerSize) {
    const scaleX = containerSize.width / imgDim.width;
    const scaleY = containerSize.height / imgDim.height;
    const fitScale = Math.min(scaleX, scaleY);
    svgW = imgDim.width * fitScale;
    svgH = imgDim.height * fitScale;
  }

  return (
    <div className="map-viewer-wrap">
      <div className="map-viewer" ref={containerRef}>
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
        {containerSize && (
          <TransformWrapper
            key={`${containerSize.width}x${containerSize.height}`}
            initialScale={1}
            minScale={0.5}
            maxScale={5}
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
            doubleClick={{ mode: 'reset', animationTime: 200 }}
            velocityAnimation={{ disabled: true }}
            zoomAnimation={{ animationTime: 200 }}
            autoAlignment={{
              animationTime: 200,
              velocityAlignmentTime: 100,
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="controls">
                  <button onClick={() => zoomIn()} aria-label="Zoom in">+</button>
                  <button onClick={() => zoomOut()} aria-label="Zoom out">−</button>
                  <button onClick={() => resetTransform()} aria-label="Reset zoom">⟲</button>
                </div>
                <TransformComponent
                  wrapperClass="transform-wrapper"
                  contentClass="transform-content"
                >
                  <svg
                    width={svgW}
                    height={svgH}
                    viewBox={`0 0 ${imgDim.width} ${imgDim.height}`}
                    className="interactive-map"
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
                    {hasPlots && plotsData.map((plot) => {
                      const visible = isPlotVisible(plot);
                      return (
                        <g 
                          key={plot.id} 
                          onClick={visible ? () => handlePlotClick(plot) : undefined} 
                          className={`plot-group ${visible ? '' : 'plot-hidden'}`}
                        >
                          <polygon
                            points={plot.points}
                            fill={visible ? getFillColor(plot.status) : 'rgba(0,0,0,0.1)'}
                            stroke={visible ? 'rgba(255,255,255,0.6)' : 'transparent'}
                            strokeWidth="1.5"
                            className="plot-polygon"
                          />
                          {visible && (
                            <polygon
                              points={plot.points}
                              fill="transparent"
                              className="plot-polygon-hover"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        )}
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
