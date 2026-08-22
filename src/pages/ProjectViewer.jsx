import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  const [selectedPlot, setSelectedPlot] = useState(null);

  useEffect(() => {
    loadProject();
  }, [slug]);

  const loadProject = async () => {
    try {
      if (slug === 'example') {
        // Load mock example
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

      // Query project by slug
      const q = query(collection(db, 'projects'), where('slug', '==', slug));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('Project not found.');
        setLoading(false);
        return;
      }

      const projectDoc = querySnapshot.docs[0];
      const projectData = { id: projectDoc.id, ...projectDoc.data() };
      setProject(projectData);

      // Load plots
      const plotsSnap = await getDocs(collection(db, 'projects', projectDoc.id, 'plots'));
      const plotsList = plotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      plotsList.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
      setPlots(plotsList);
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  const plotTypes = ['All', ...new Set(plots.map(p => p.type).filter(Boolean))];

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
        plotTypes={plotTypes}
        plots={plots}
        setSelectedPlot={setSelectedPlot}
      />

      <MapViewer
        project={project}
        plots={plots}
        searchQuery={searchQuery}
        filterType={filterType}
        filterStatus={filterStatus}
        northOffset={project?.northOffset || 0}
        projectFacing={project?.projectFacing || 'North'}
        selectedPlot={selectedPlot}
        setSelectedPlot={setSelectedPlot}
      />
    </div>
  );
};

export default ProjectViewer;
