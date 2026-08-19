import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsList);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project.');
    }
  };

  const handleCopyLink = (slug) => {
    const url = `${window.location.origin}/project/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="url(#grad2)"/>
            <path d="M14 34V18l10-8 10 8v16H28V26h-8v8H14z" fill="#fff"/>
            <defs><linearGradient id="grad2" x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient></defs>
          </svg>
          <span>PlotView Admin</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Your Projects</h1>
            <p>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/admin/project/new" className="new-project-btn">
            + New Project
          </Link>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect width="80" height="80" rx="20" fill="rgba(99,102,241,0.1)"/>
              <path d="M24 56V32l16-12 16 12v24H44V44H36v12H24z" fill="rgba(99,102,241,0.4)"/>
            </svg>
            <h2>No projects yet</h2>
            <p>Create your first interactive plot brochure</p>
            <Link to="/admin/project/new" className="new-project-btn">
              + Create Project
            </Link>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-thumbnail" style={{
                  backgroundImage: project.mapImageUrl ? `url(${project.mapImageUrl})` : 'none',
                  backgroundColor: project.mapImageUrl ? 'transparent' : '#1e293b'
                }}>
                  {!project.mapImageUrl && (
                    <span className="no-image">No Image</span>
                  )}
                  <div className="project-badge">
                    {project.plotCount || 0} plots
                  </div>
                </div>
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="project-slug">/project/{project.slug}</p>
                  <div className="project-branding" style={{
                    borderLeft: `3px solid ${project.brandColor || '#6366f1'}`
                  }}>
                    <span>{project.clientName || 'No client set'}</span>
                  </div>
                </div>
                <div className="project-actions">
                  <button onClick={() => navigate(`/admin/project/${project.id}/edit`)} className="action-btn edit-btn">
                    Edit
                  </button>
                  <button onClick={() => handleCopyLink(project.slug)} className="action-btn copy-btn">
                    {copiedId === project.slug ? '✓ Copied!' : 'Copy Link'}
                  </button>
                  <button onClick={() => window.open(`/project/${project.slug}`, '_blank')} className="action-btn preview-btn">
                    Preview
                  </button>
                  <button onClick={() => handleDelete(project.id, project.name)} className="action-btn delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
