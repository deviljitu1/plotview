import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Menu } from 'lucide-react';
import { db } from '../lib/firebase';
import MapViewer from '../components/MapViewer';
import SidebarNav from '../components/SidebarNav';
import mockPlots from '../data/plots.json';
import './ProjectViewer.css';

const ProjectViewer = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPhase, setFilterPhase] = useState('All');
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Holds unsubscribe functions for real-time listeners
  const unsubscribeRef = useRef([]);

  useEffect(() => {
    // Clean up any previous listeners
    unsubscribeRef.current.forEach(fn => fn());
    unsubscribeRef.current = [];

    if (slug === 'example') {
      setProject({
        id: 'example',
        name: 'Sunrise Villas (Example)',
        clientName: 'Demo Real Estate',
        brandColor: '#8b5cf6',
        mapImageUrl: '/map-background.png',
        imgDimensions: { width: 1000, height: 750 },
        geoBounds: {
          enabled: true,
          topLeft: { lat: 21.2460, lng: 81.6275 },
          bottomRight: { lat: 21.2435, lng: 81.6320 }
        }
      });
      setPlots(mockPlots);
      setLoading(false);
      return;
    }

    // Real-time listener: project by slug
    const projectQuery = query(collection(db, 'projects'), where('slug', '==', slug));
    const unsubProject = onSnapshot(projectQuery, (snapshot) => {
      if (snapshot.empty) {
        setError('Project not found.');
        setLoading(false);
        return;
      }

      const projectDoc = snapshot.docs[0];
      const projectData = { id: projectDoc.id, ...projectDoc.data() };
      setProject(projectData);

      // Real-time listener: plots subcollection
      const plotsCol = collection(db, 'projects', projectDoc.id, 'plots');
      const unsubPlots = onSnapshot(plotsCol, (plotsSnap) => {
        const plotsList = plotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        plotsList.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setPlots(plotsList);
        setLoading(false);
      }, (err) => {
        console.error('Error listening to plots:', err);
        setError('Failed to load plots.');
        setLoading(false);
      });

      // Replace plots unsubscribe (index 1)
      if (unsubscribeRef.current[1]) unsubscribeRef.current[1]();
      unsubscribeRef.current[1] = unsubPlots;
    }, (err) => {
      console.error('Error listening to project:', err);
      setError('Failed to load project.');
      setLoading(false);
    });

    unsubscribeRef.current[0] = unsubProject;

    // Cleanup on unmount or slug change
    return () => {
      unsubscribeRef.current.forEach(fn => fn && fn());
      unsubscribeRef.current = [];
    };
  }, [slug]);

  const plotTypes = ['All', ...new Set(plots.map(p => p.type).filter(Boolean))];
  const phases = ['All', ...new Set(plots.map(p => p.phase || 'Phase 1'))];

  if (loading) {
    return (
      <div className="viewer-loading">
        <div className="loading-spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="viewer-error">
        <h2>😕 {error}</h2>
        <p>The project you are looking for does not exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="viewer-container" style={{ '--brand-color': project.brandColor || '#6366f1' }}>
      {/* White-label header */}
      <div className="viewer-header" style={{ borderBottomColor: project.brandColor || '#6366f1' }}>
        <div className="viewer-brand">
          {project.clientLogo && (
            <img src={project.clientLogo} alt={project.clientName} className="viewer-logo" />
          )}
          <div>
            <h1 style={{ color: project.brandColor || '#333' }}>{project.name}</h1>
            {project.clientName && <span className="viewer-client">{project.clientName}</span>}
          </div>
        </div>
        <div className="nav-legend">
          <div className="nav-legend-item">
            <div className="nav-legend-color available"></div>
            <span>Available</span>
          </div>
          <div className="nav-legend-item">
            <div className="nav-legend-color booked"></div>
            <span>Booked</span>
          </div>
          <div className="nav-legend-item">
            <div className="nav-legend-color registered"></div>
            <span>Registered</span>
          </div>
        </div>

        <div className="viewer-actions">
          <button className="btn-menu" onClick={() => setIsMenuOpen(true)} aria-label="Open menu">
            <Menu size={24} color="#333" />
          </button>
        </div>
      </div>

      <SidebarNav 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        project={project}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPhase={filterPhase}
        setFilterPhase={setFilterPhase}
        plotTypes={plotTypes}
        phases={phases}
        plots={plots}
        setSelectedPlot={setSelectedPlot}
      />

      <MapViewer
        project={project}
        plots={plots}
        searchQuery={searchQuery}
        filterType={filterType}
        filterStatus={filterStatus}
        filterPhase={filterPhase}
        northOffset={project?.northOffset || 0}
        projectFacing={project?.projectFacing || 'North'}
        selectedPlot={selectedPlot}
        setSelectedPlot={setSelectedPlot}
      />
    </div>
  );
};

export default ProjectViewer;
