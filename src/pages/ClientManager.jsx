import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import './ClientManager.css';

const ClientManager = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [plots, setPlots] = useState([]);
  
  const [editingPlotId, setEditingPlotId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', type: '', size: '', area: '', status: 'Available' });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [slug]);

  const fetchProject = async () => {
    try {
      const q = query(collection(db, 'projects'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Project not found');
        setLoading(false);
        return;
      }

      const pDoc = snapshot.docs[0];
      setProject(pDoc.data());
      setProjectId(pDoc.id);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project.');
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!project) return;
    
    if (!project.clientUsername || !project.clientPassword) {
      setError('Client login is not fully configured for this project. Please contact the administrator.');
      return;
    }

    if (usernameInput === project.clientUsername && passwordInput === project.clientPassword) {
      setIsAuthenticated(true);
      setError('');
      await loadPlots(projectId);
    } else {
      setError('Incorrect login ID or password');
    }
  };

  const loadPlots = async (id) => {
    try {
      const plotsSnap = await getDocs(collection(db, 'projects', id, 'plots'));
      const plotsList = plotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort alphabetically/numerically
      plotsList.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB || a.name.localeCompare(b.name);
      });

      setPlots(plotsList);
    } catch (err) {
      console.error('Error loading plots:', err);
      setError('Failed to load plots');
    }
  };

  const handleStatusChange = async (plotId, newStatus) => {
    setUpdating(plotId);
    try {
      const plotRef = doc(db, 'projects', projectId, 'plots', plotId);
      await updateDoc(plotRef, { status: newStatus });
      setPlots(prev => prev.map(p => p.id === plotId ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const startEdit = (plot) => {
    setEditingPlotId(plot.id);
    setEditForm({
      name: plot.name || '',
      type: plot.type || '',
      size: plot.size || '',
      area: plot.area || '',
      status: plot.status || 'Available'
    });
  };

  const cancelEdit = () => {
    setEditingPlotId(null);
  };

  const handleSavePlot = async (plotId) => {
    setUpdating(plotId);
    try {
      const plotRef = doc(db, 'projects', projectId, 'plots', plotId);
      const updatedData = {
        name: editForm.name,
        type: editForm.type,
        size: editForm.size,
        area: Number(editForm.area) || 0,
        status: editForm.status
      };
      await updateDoc(plotRef, updatedData);
      setPlots(prev => prev.map(p => p.id === plotId ? { ...p, ...updatedData } : p));
      setEditingPlotId(null);
    } catch (err) {
      console.error('Error updating plot:', err);
      alert('Failed to update plot. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <div className="client-manager-loading">Loading...</div>;
  }

  if (error && !project) {
    return <div className="client-manager-error">{error}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="client-login-container">
        <div className="client-login-card">
          {project?.clientLogo && (
            <img src={project.clientLogo} alt="Logo" className="client-login-logo" />
          )}
          <h2>{project?.name}</h2>
          <p>Client Management Portal</p>
          
          <form onSubmit={handleLogin} className="client-login-form">
            <input 
              type="text" 
              placeholder="Enter Login ID" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Enter Access Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
            />
            {error && <div className="error-text">{error}</div>}
            <button type="submit" style={{ background: project?.brandColor || '#6366f1' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <header className="client-dashboard-header" style={{ borderBottomColor: project?.brandColor || '#6366f1' }}>
        <div className="header-content">
          {project?.clientLogo && <img src={project.clientLogo} alt="Logo" className="header-logo" />}
          <div>
            <h1>{project?.name}</h1>
            <p>Inventory Status Manager</p>
          </div>
        </div>
        <button className="btn-logout" onClick={() => setIsAuthenticated(false)}>
          Lock / Logout
        </button>
      </header>

      <main className="client-dashboard-main">
        <div className="plots-grid">
          {plots.map(plot => (
            <div key={plot.id} className="plot-manager-card">
              {editingPlotId === plot.id ? (
                <div className="plot-edit-form">
                  <div className="edit-form-group">
                    <label>Name</label>
                    <input 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})} 
                      placeholder="Name" 
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Type</label>
                    <input 
                      value={editForm.type} 
                      onChange={e => setEditForm({...editForm, type: e.target.value})} 
                      placeholder="Type" 
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Size</label>
                    <input 
                      value={editForm.size} 
                      onChange={e => setEditForm({...editForm, size: e.target.value})} 
                      placeholder="Size" 
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Area (sqft)</label>
                    <input 
                      type="number" 
                      value={editForm.area} 
                      onChange={e => setEditForm({...editForm, area: e.target.value})} 
                      placeholder="Area" 
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Status</label>
                    <select 
                      value={editForm.status} 
                      onChange={e => setEditForm({...editForm, status: e.target.value})}
                      className={`status-select ${editForm.status.toLowerCase()}`}
                    >
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Registered">Registered</option>
                    </select>
                  </div>
                  <div className="edit-actions">
                    <button className="btn-save" onClick={() => handleSavePlot(plot.id)} disabled={updating === plot.id}>
                      {updating === plot.id ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn-cancel" onClick={cancelEdit} disabled={updating === plot.id}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="plot-info-extended">
                    <div className="plot-info-header">
                      <h3>{plot.name}</h3>
                      <span className={`status-badge ${plot.status.toLowerCase()}`}>{plot.status}</span>
                    </div>
                    <div className="plot-details-grid">
                      <div className="detail-item">
                        <span className="detail-label">Type</span>
                        <span className="detail-value">{plot.type || '-'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Size</span>
                        <span className="detail-value">{plot.size || '-'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Area</span>
                        <span className="detail-value">{plot.area ? `${plot.area} sqft` : '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="plot-actions-row">
                    <button onClick={() => startEdit(plot)} className="btn-edit" disabled={updating === plot.id}>Edit Plot</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientManager;
