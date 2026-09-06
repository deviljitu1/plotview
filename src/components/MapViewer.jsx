import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Search, Filter, X, RotateCcw, RotateCw } from 'lucide-react';
import PlotDetailsModal from './PlotDetailsModal';
import northIcon from '../assets/north-symbol-icon.svg';
import southIcon from '../assets/south-symbol-icon.svg';
import eastIcon from '../assets/east-symbol-icon.svg';
import westIcon from '../assets/west-symbol-icon.svg';
import './MapViewer.css';

const MapViewer = ({ project, plots: plotsData, searchQuery, filterType, filterStatus, filterPhase = 'All', northOffset = 0, projectFacing = 'North', selectedPlot, setSelectedPlot, disableModal = false }) => {
  const [containerSize, setContainerSize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isFingerRotating, setIsFingerRotating] = useState(false);
  const [initialAngle, setInitialAngle] = useState(null);
  const containerRef = useRef(null);
  const mapImageUrl = project?.mapImageUrl || project?.backgroundUrl || '';

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
  };

  const getFillColor = (status) => {
    switch (status) {
      case 'Available': return 'rgba(16, 185, 129, 0.35)';
      case 'Booked': return 'rgba(250, 204, 21, 0.4)';
      case 'Registered': return 'rgba(239, 68, 68, 0.4)';
      default: return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const imgDim = project?.imgDimensions || { width: 1000, height: 750 };
  const hasPlots = Array.isArray(plotsData) && plotsData.length > 0;

  const plotTypes = ['All', ...new Set((plotsData || []).map(p => p.type).filter(Boolean))];

  const isPlotVisible = (plot) => {
    if (filterPhase !== 'All' && (plot.phase || 'Phase 1') !== filterPhase) return false;
    if (filterType !== 'All' && plot.type !== filterType) return false;
    if (filterStatus !== 'All' && plot.status !== filterStatus) return false;
    if (searchQuery) {
      const qLower = searchQuery.toLowerCase();
      const plotName = (plot.name || '').toLowerCase();
      const pNum = plotName.replace(/\D/g, '');
      const qNum = qLower.replace(/\D/g, '');
      
      if (!plotName.includes(qLower) && !(qNum && pNum && pNum.includes(qNum))) {
        return false;
      }
    }
    return true;
  };

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    setContainerSize({ width: w, height: h });
  }, []);

  const touchState = useRef({ initialAngle: null, startRotation: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // We capture the current rotation from the state by using a state functional update trick,
        // but it's simpler to just store the latest rotation in a ref if needed. 
        // We can just rely on the React state value if we add `rotation` to deps,
        // but to avoid re-binding, let's keep rotation in a ref too, or use functional update.
        // Let's use functional update to get current rotation:
        setRotation(currentRotation => {
          touchState.current.initialAngle = angle;
          touchState.current.startRotation = currentRotation;
          return currentRotation;
        });
        setIsFingerRotating(true);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchState.current.initialAngle !== null) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        let delta = currentAngle - touchState.current.initialAngle;
        
        setRotation(touchState.current.startRotation + delta);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        touchState.current.initialAngle = null;
        setIsFingerRotating(false);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { capture: true });
    el.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
    el.addEventListener('touchend', handleTouchEnd, { capture: true });
    el.addEventListener('touchcancel', handleTouchEnd, { capture: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart, { capture: true });
      el.removeEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
      el.removeEventListener('touchend', handleTouchEnd, { capture: true });
      el.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
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
  let rotationScale = 1;

  if (containerSize) {
    // 1. Calculate static fit scale (0 degrees)
    const scaleX = containerSize.width / imgDim.width;
    const scaleY = containerSize.height / imgDim.height;
    const fitScale = Math.min(scaleX, scaleY);
    
    svgW = imgDim.width * fitScale;
    svgH = imgDim.height * fitScale;

    // 2. Calculate dynamic rotation scale to keep corners inside
    const rad = (rotation * Math.PI) / 180;
    const renderedBoundingW = Math.abs(svgW * Math.cos(rad)) + Math.abs(svgH * Math.sin(rad));
    const renderedBoundingH = Math.abs(svgW * Math.sin(rad)) + Math.abs(svgH * Math.cos(rad));

    const rotScaleX = containerSize.width / renderedBoundingW;
    const rotScaleY = containerSize.height / renderedBoundingH;
    rotationScale = Math.min(rotScaleX, rotScaleY);
    if (rotationScale > 1) rotationScale = 1; // Only shrink if needed
  }

  return (
    <div className="map-viewer-wrap">
      <div 
        className="map-viewer" 
        ref={containerRef}
      >
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
                  <div className="compass-indicator" style={{ transform: `rotate(${rotation + Number(northOffset)}deg)` }} title={`${projectFacing} Direction`}>
                    <img 
                      src={
                        projectFacing === 'South' ? southIcon :
                        projectFacing === 'East' ? eastIcon :
                        projectFacing === 'West' ? westIcon :
                        northIcon
                      } 
                      alt={projectFacing} 
                      style={{ width: 32, height: 32, objectFit: 'contain' }} 
                    />
                  </div>
                  <button onClick={() => setRotation(r => r - 90)} aria-label="Rotate left" title="Rotate left"><RotateCcw size={18} /></button>
                  <button onClick={() => setRotation(r => r + 90)} aria-label="Rotate right" title="Rotate right"><RotateCw size={18} /></button>
                  <button onClick={() => zoomIn()} aria-label="Zoom in" title="Zoom in">+</button>
                  <button onClick={() => zoomOut()} aria-label="Zoom out" title="Zoom out">−</button>
                  <button onClick={() => { resetTransform(); setRotation(0); }} aria-label="Reset zoom" title="Reset view">⟲</button>
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
                    style={{ 
                      transform: `scale(${rotationScale}) rotate(${rotation}deg)`, 
                      transition: isFingerRotating ? 'none' : 'transform 0.3s ease' 
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
                    {hasPlots && plotsData.map((plot) => {
                      const visible = isPlotVisible(plot);
                      
                      // Calculate center of polygon for label/arrow
                      let cx = 0, cy = 0;
                      if (visible && plot.points) {
                        const pts = plot.points.trim().split(' ').map(p => p.split(',').map(Number));
                        cx = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
                        cy = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
                      }

                      const getFacingIcon = (facing) => {
                        switch(facing?.toLowerCase()) {
                          case 'north': return northIcon;
                          case 'south': return southIcon;
                          case 'east': return eastIcon;
                          case 'west': return westIcon;
                          case 'north-east': return northIcon; // Fallbacks
                          case 'north-west': return northIcon;
                          case 'south-east': return southIcon;
                          case 'south-west': return southIcon;
                          default: return null;
                        }
                      };

                      const facingIconSrc = getFacingIcon(plot.facing);

                      return (
                        <g 
                          key={plot.id} 
                          onClick={visible ? () => handlePlotClick(plot) : undefined} 
                          className={`plot-group ${visible ? '' : 'plot-hidden'}`}
                          style={{ cursor: visible ? 'pointer' : 'default' }}
                        >
                          <polygon
                            points={plot.points}
                            fill={visible ? getFillColor(plot.status) : 'rgba(0,0,0,0.1)'}
                            stroke={visible ? 'rgba(255,255,255,0.8)' : 'transparent'}
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

      {!disableModal && selectedPlot && (
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

export default MapViewer;
