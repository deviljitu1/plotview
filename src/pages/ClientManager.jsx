import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import {
  collection, query, where, getDocs,
  doc, updateDoc, onSnapshot
} from 'firebase/firestore';
import './ClientManager.css';

const ClientManager = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [plots, setPlots] = useState([]);
  const [activePhase, setActivePhase] = useState('All');

  // Auth
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null); // plotId being saved

  // Edit modal
  const [editingPlot, setEditingPlot] = useState(null); // full plot object
  const [editForm, setEditForm] = useState({});
  const [saveError, setSaveError] = useState('');

  // Real-time unsubscribe ref
  const unsubRef = useRef(null);

  // ── Step 1: Load project by slug (one-time, just to get project info + password) ──
  useEffect(() => {
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
        setError('Failed to load project: ' + err.message);
        setLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  // ── Step 2: Once authenticated, subscribe to plots in real-time ──
  useEffect(() => {
    if (!isAuthenticated || !projectId) return;

    // Unsubscribe any previous listener
    if (unsubRef.current) unsubRef.current();

    const plotsCol = collection(db, 'projects', projectId, 'plots');
    const unsub = onSnapshot(
      plotsCol,
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setPlots(list);
      },
      (err) => {
        console.error('Firestore onSnapshot error:', err);
        setError('Live sync error: ' + err.message);
      }
    );

    unsubRef.current = unsub;
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [isAuthenticated, projectId]);

  // ── Login ──
  const handleLogin = (e) => {
    e.preventDefault();
    if (!project) return;
    if (!project.clientPassword) {
      setError('Client login not configured. Contact administrator.');
      return;
    }
    if (passwordInput === project.clientPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  // ── Quick status change (one-click, saves directly to Firestore) ──
  const handleQuickStatus = async (plotId, newStatus) => {
    setUpdating(plotId);
    setSaveError('');
    try {
      const plotRef = doc(db, 'projects', projectId, 'plots', plotId);
      await updateDoc(plotRef, { status: newStatus });
      // onSnapshot will automatically refresh the list
    } catch (err) {
      console.error('Firestore updateDoc error:', err.code, err.message);
      setSaveError(`Failed to update plot ${plotId}: [${err.code}] ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // ── Open edit modal ──
  const openEdit = (plot) => {
    setEditingPlot(plot);
    setEditForm({
      name: plot.name || '',
      type: plot.type || 'Plot',
      size: plot.size || '',
      area: plot.area || '',
      status: plot.status || 'Available',
      phase: plot.phase || 'Phase 1',
      facing: plot.facing || 'East',
      registryClientName: plot.registryClientName || '',
    });
    setSaveError('');
  };

  const closeEdit = () => {
    setEditingPlot(null);
    setSaveError('');
  };

  // ── Save all fields from edit modal ──
  const handleSaveEdit = async () => {
    if (!editingPlot) return;
    setUpdating(editingPlot.id);
    setSaveError('');
    try {
      const plotRef = doc(db, 'projects', projectId, 'plots', editingPlot.id);
      const updatedData = {
        name: editForm.name,
        type: editForm.type,
        size: editForm.size,
        area: Number(editForm.area) || 0,
        status: editForm.status,
        phase: editForm.phase,
        facing: editForm.facing,
        registryClientName: editForm.registryClientName,
      };
      await updateDoc(plotRef, updatedData);
      // onSnapshot will refresh automatically
      closeEdit();
    } catch (err) {
      console.error('Firestore save error:', err.code, err.message);
      setSaveError(`Save failed: [${err.code}] ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // ── Computed values ──
  const availablePhases = useMemo(() => {
    if (project?.phases && project.phases.length > 0) return project.phases;
    const fromPlots = Array.from(new Set(plots.map(p => p.phase))).filter(Boolean);
    return fromPlots.length > 0 ? fromPlots : ['Phase 1'];
  }, [project, plots]);

  const filteredPlots = useMemo(() =>
    plots.filter(p => activePhase === 'All' || (p.phase || 'Phase 1') === activePhase),
    [plots, activePhase]
  );

  const stats = useMemo(() => ({
    total: filteredPlots.length,
    available: filteredPlots.filter(p => p.status === 'Available').length,
    booked: filteredPlots.filter(p => p.status === 'Booked').length,
    registered: filteredPlots.filter(p => p.status === 'Registered').length,
  }), [filteredPlots]);

  // ── Render: Loading ──
  if (loading) return <div className="client-manager-loading">Loading...</div>;
  if (error && !project) return <div className="client-manager-error">{error}</div>;

  // ── Render: Login screen ──
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
            <div className="client-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Access Password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
              />
              <button
                type="button"
                className="client-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label="Toggle password"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {error && <div className="error-text">{error}</div>}
            <button type="submit" style={{ background: project?.brandColor || '#6366f1' }}>
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const STATUS_OPTIONS = ['Available', 'Booked', 'Registered'];
  const brandColor = project?.brandColor || '#6366f1';

  // ── Render: Dashboard ──
  return (
    <div className="client-dashboard">
      <header className="client-dashboard-header" style={{ borderBottomColor: brandColor }}>
        <div className="header-content">
          {project?.clientLogo && <img src={project.clientLogo} alt="Logo" className="header-logo" />}
          <div>
            <h1>{project?.name}</h1>
            <p>Inventory Status Manager</p>
          </div>
        </div>
        <button className="btn-logout" onClick={() => { setIsAuthenticated(false); setPlots([]); }}>
          Lock / Logout
        </button>
      </header>

      <main className="client-dashboard-main">
        {/* Global error banner */}
        {saveError && (
          <div className="cm-error-banner">
            ⚠️ {saveError}
            <button onClick={() => setSaveError('')}>✕</button>
          </div>
        )}

        {/* Phase tabs */}
        {availablePhases.length > 1 && (
          <div className="client-phase-tabs">
            <button
              className={`btn-phase ${activePhase === 'All' ? 'active' : ''}`}
              onClick={() => setActivePhase('All')}
              style={activePhase === 'All' ? { background: brandColor, borderColor: brandColor } : {}}
            >
              All Phases
            </button>
            {availablePhases.map(p => (
              <button
                key={p}
                className={`btn-phase ${activePhase === p ? 'active' : ''}`}
                onClick={() => setActivePhase(p)}
                style={activePhase === p ? { background: brandColor, borderColor: brandColor } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div className="client-stats-bar">
          <div className="client-stat-chip">
            <span className="client-stat-num">{stats.total}</span>
            <span className="client-stat-label">Total</span>
          </div>
          <div className="client-stat-chip available">
            <span className="client-stat-num">{stats.available}</span>
            <span className="client-stat-label">Available</span>
          </div>
          <div className="client-stat-chip booked">
            <span className="client-stat-num">{stats.booked}</span>
            <span className="client-stat-label">Booked</span>
          </div>
          <div className="client-stat-chip registered">
            <span className="client-stat-num">{stats.registered}</span>
            <span className="client-stat-label">Registered</span>
          </div>
        </div>

        {/* Plot grid */}
        {filteredPlots.length === 0 ? (
          <div className="cm-empty">No plots found. Make sure plots are saved in the admin panel.</div>
        ) : (
          <div className="plots-grid">
            {filteredPlots.map(plot => {
              const isBusy = updating === plot.id;
              return (
                <div key={plot.id} className={`plot-manager-card status-card-${plot.status?.toLowerCase()}`}>
                  {/* Header row */}
                  <div className="plot-info-header">
                    <h3>{plot.name}</h3>
                    <span className={`status-badge ${plot.status?.toLowerCase()}`}>{plot.status}</span>
                  </div>

                  {/* Details grid */}
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
                    <div className="detail-item">
                      <span className="detail-label">Facing</span>
                      <span className="detail-value">{plot.facing || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phase</span>
                      <span className="detail-value">{plot.phase || 'Phase 1'}</span>
                    </div>
                    {plot.registryClientName && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Registry Client</span>
                        <span className="detail-value">{plot.registryClientName}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick status buttons */}
                  <div className="quick-status-row">
                    <span className="quick-status-label">Change Status:</span>
                    <div className="quick-status-btns">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          className={`btn-quick-status ${s.toLowerCase()} ${plot.status === s ? 'current' : ''}`}
                          onClick={() => handleQuickStatus(plot.id, s)}
                          disabled={isBusy || plot.status === s}
                          title={`Mark as ${s}`}
                        >
                          {isBusy && plot.status !== s ? '…' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Edit all details button */}
                  <div className="plot-actions-row">
                    <button
                      className="btn-edit"
                      onClick={() => openEdit(plot)}
                      disabled={isBusy}
                    >
                      ✏️ Edit Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Edit Modal ── */}
      {editingPlot && (
        <div className="cm-modal-overlay" onClick={closeEdit}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Edit Plot — {editingPlot.name}</h2>
              <button className="cm-modal-close" onClick={closeEdit}>✕</button>
            </div>

            <div className="cm-modal-body">
              {saveError && <div className="error-text" style={{ marginBottom: '0.75rem' }}>{saveError}</div>}

              <div className="cm-form-grid">
                <div className="edit-form-group">
                  <label>Plot Name</label>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Plot 19"
                  />
                </div>

                <div className="edit-form-group">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className={`status-select ${editForm.status?.toLowerCase()}`}
                  >
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Registered">Registered</option>
                  </select>
                </div>

                <div className="edit-form-group">
                  <label>Type</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="Plot">Plot</option>
                    <option value="LIG">LIG</option>
                    <option value="EWS">EWS</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="edit-form-group">
                  <label>Facing</label>
                  <select
                    value={editForm.facing}
                    onChange={e => setEditForm(f => ({ ...f, facing: e.target.value }))}
                  >
                    {['East','West','North','South','North-East','North-West','South-East','South-West'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="edit-form-group">
                  <label>Size</label>
                  <input
                    value={editForm.size}
                    onChange={e => setEditForm(f => ({ ...f, size: e.target.value }))}
                    placeholder="e.g. 40' x 30'"
                  />
                </div>

                <div className="edit-form-group">
                  <label>Area (sqft)</label>
                  <input
                    type="number"
                    value={editForm.area}
                    onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))}
                    placeholder="e.g. 1200"
                  />
                </div>

                <div className="edit-form-group full-width">
                  <label>Registry Client Name</label>
                  <input
                    value={editForm.registryClientName}
                    onChange={e => setEditForm(f => ({ ...f, registryClientName: e.target.value }))}
                    placeholder="Buyer / registered owner name"
                  />
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button className="btn-cancel" onClick={closeEdit} disabled={updating === editingPlot.id}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSaveEdit}
                disabled={updating === editingPlot.id}
                style={{ background: brandColor }}
              >
                {updating === editingPlot.id ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
