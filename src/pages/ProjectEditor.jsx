import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import PlotDetailsModal from '../components/PlotDetailsModal';
import './ProjectEditor.css';

const TABS = ['details', 'plots', 'align'];

const ProjectEditor = () => {
  const { id } = useParams(); // undefined if new
  const navigate = useNavigate();
  const isEditing = !!id;

  // Project Details
  const [projectName, setProjectName] = useState('');
  const [slug, setSlug] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientLogo, setClientLogo] = useState('');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  
  // Map Image
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [mapImageFile, setMapImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Plots
  const [plots, setPlots] = useState([]);
  const [editingPlot, setEditingPlot] = useState(null); // index or null
  const [plotForm, setPlotForm] = useState({
    name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: ''
  });

  // Align Mode
  const [activeTab, setActiveTab] = useState('details');
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [selectedAlignPlot, setSelectedAlignPlot] = useState(null);
  const svgRef = useRef(null);
  const imgRef = useRef(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 1000, height: 750 });

  // General
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  // Load existing project
  useEffect(() => {
    if (isEditing) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', id));
      if (projectDoc.exists()) {
        const data = projectDoc.data();
        setProjectName(data.name || '');
        setSlug(data.slug || '');
        setClientName(data.clientName || '');
        setClientLogo(data.clientLogo || '');
        setBrandColor(data.brandColor || '#6366f1');
        setDescription(data.description || '');
        setMapImageUrl(data.mapImageUrl || '');
        setImagePreview(data.mapImageUrl || '');
        setImgDimensions(data.imgDimensions || { width: 1000, height: 750 });

        // Load plots subcollection
        const plotsSnap = await getDocs(collection(db, 'projects', id, 'plots'));
        const plotsList = plotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPlots(plotsList);
      }
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing) {
      setSlug(projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [projectName, isEditing]);

  // Image handling
  const handleImageDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setMapImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target.result);
        // Get natural dimensions
        const img = new Image();
        img.onload = () => {
          setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadImage = async (projectId) => {
    if (!mapImageFile) return mapImageUrl;
    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `projects/${projectId}/map.${mapImageFile.name.split('.').pop()}`);
      await uploadBytes(storageRef, mapImageFile);
      const url = await getDownloadURL(storageRef);
      setMapImageUrl(url);
      setUploadingImage(false);
      return url;
    } catch (err) {
      console.error('Error uploading image:', err);
      setUploadingImage(false);
      return mapImageUrl;
    }
  };

  // Upload client logo
  const handleLogoDrop = useCallback(async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const projectId = id || uuidv4();
      const storageRef = ref(storage, `projects/${projectId}/logo.${file.name.split('.').pop()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setClientLogo(url);
    }
  }, [id]);

  // Plot CRUD
  const addPlot = () => {
    if (!plotForm.name) return alert('Plot name is required.');
    const newPlot = {
      id: uuidv4(),
      ...plotForm,
      area: Number(plotForm.area) || 0,
      points: '100,100 200,100 200,200 100,200' // Default rectangle
    };
    setPlots(prev => [...prev, newPlot]);
    setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '' });
  };

  const updatePlot = () => {
    if (editingPlot === null) return;
    setPlots(prev => prev.map((p, i) => i === editingPlot ? { ...p, ...plotForm, area: Number(plotForm.area) || 0 } : p));
    setEditingPlot(null);
    setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '' });
  };

  const deletePlot = (index) => {
    if (!window.confirm('Delete this plot?')) return;
    setPlots(prev => prev.filter((_, i) => i !== index));
  };

  const startEditPlot = (index) => {
    const p = plots[index];
    setPlotForm({ name: p.name, area: p.area, type: p.type, status: p.status, facing: p.facing, size: p.size });
    setEditingPlot(index);
  };

  // --- Align Mode Logic ---
  const handlePointerDown = (e, plotId, pointIndex) => {
    e.stopPropagation();
    setDraggingPoint({ plotId, pointIndex });
  };

  const handlePointerMove = useCallback((e) => {
    if (!draggingPoint || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    setPlots(prev => prev.map(plot => {
      if (plot.id === draggingPoint.plotId) {
        const pointsArr = plot.points.trim().split(' ').map(p => p.split(',').map(Number));
        pointsArr[draggingPoint.pointIndex] = [Math.round(cursorPt.x), Math.round(cursorPt.y)];
        return { ...plot, points: pointsArr.map(p => p.join(',')).join(' ') };
      }
      return plot;
    }));
  }, [draggingPoint]);

  const handlePointerUp = useCallback(() => {
    setDraggingPoint(null);
  }, []);

  useEffect(() => {
    if (activeTab === 'align') {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeTab, handlePointerMove, handlePointerUp]);

  // Save everything
  const handleSave = async () => {
    if (!projectName || !slug) return alert('Project name and slug are required.');
    setSaving(true);
    try {
      const projectId = id || uuidv4();
      const imageUrl = await uploadImage(projectId);

      // Save project doc
      await setDoc(doc(db, 'projects', projectId), {
        name: projectName,
        slug,
        clientName,
        clientLogo,
        brandColor,
        description,
        mapImageUrl: imageUrl,
        imgDimensions,
        plotCount: plots.length,
        updatedAt: new Date().toISOString(),
        ...(!isEditing && { createdAt: new Date().toISOString() })
      }, { merge: true });

      // Save plots as subcollection using batch
      const batch = writeBatch(db);
      
      // Delete existing plots first
      if (isEditing) {
        const existingPlots = await getDocs(collection(db, 'projects', projectId, 'plots'));
        existingPlots.docs.forEach(d => batch.delete(d.ref));
      }

      // Add new plots
      plots.forEach(plot => {
        const plotRef = doc(db, 'projects', projectId, 'plots', plot.id);
        batch.set(plotRef, {
          name: plot.name,
          area: plot.area,
          type: plot.type,
          status: plot.status,
          facing: plot.facing,
          size: plot.size,
          points: plot.points
        });
      });

      await batch.commit();
      alert('Project saved successfully!');
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Error saving project:', err);
      alert('Error saving project: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <nav className="editor-nav">
        <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
          ← Back
        </button>
        <h2>{isEditing ? 'Edit Project' : 'New Project'}</h2>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Project'}
        </button>
      </nav>

      {/* Tabs */}
      <div className="editor-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'details' && '① Project Details'}
            {tab === 'plots' && '② Plot Data'}
            {tab === 'align' && '③ Align on Image'}
          </button>
        ))}
      </div>

      <main className="editor-main">
        {/* ======================== TAB: DETAILS ======================== */}
        {activeTab === 'details' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>Project Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Yuvraj Park" />
                </div>
                <div className="form-group">
                  <label>URL Slug *</label>
                  <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. yuvraj-park" />
                  <span className="form-hint">Public URL: /project/{slug || '...'}</span>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of the project" rows={3} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>White Label / Client Branding</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. ABC Developers" />
                </div>
                <div className="form-group">
                  <label>Brand Color</label>
                  <div className="color-input-row">
                    <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="color-picker" />
                    <input value={brandColor} onChange={e => setBrandColor(e.target.value)} placeholder="#6366f1" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Client Logo</label>
                  <div
                    className="logo-drop-zone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleLogoDrop}
                    onClick={() => document.getElementById('logoInput').click()}
                  >
                    {clientLogo ? (
                      <img src={clientLogo} alt="Client Logo" className="logo-preview" />
                    ) : (
                      <span>Drag & drop or click to upload logo</span>
                    )}
                    <input id="logoInput" type="file" accept="image/*" onChange={handleLogoDrop} hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Map Image</h3>
              <div
                className="image-drop-zone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleImageDrop}
                onClick={() => document.getElementById('mapInput').click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Map Preview" className="map-preview-img" />
                ) : (
                  <div className="drop-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <p>Drag & drop your map image here, or click to browse</p>
                    <span>Supports PNG, JPG, WebP</span>
                  </div>
                )}
                <input id="mapInput" type="file" accept="image/*" onChange={handleImageDrop} hidden />
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB: PLOTS ======================== */}
        {activeTab === 'plots' && (
          <div className="tab-content">
            <div className="form-section">
              <h3>{editingPlot !== null ? 'Edit Plot' : 'Add New Plot'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Plot Name *</label>
                  <input value={plotForm.name} onChange={e => setPlotForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Plot 1" />
                </div>
                <div className="form-group">
                  <label>Area (sq ft)</label>
                  <input type="number" value={plotForm.area} onChange={e => setPlotForm(p => ({...p, area: e.target.value}))} placeholder="e.g. 1225" />
                </div>
                <div className="form-group">
                  <label>Size</label>
                  <input value={plotForm.size} onChange={e => setPlotForm(p => ({...p, size: e.target.value}))} placeholder="e.g. 50' x 24'6&quot;" />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={plotForm.type} onChange={e => setPlotForm(p => ({...p, type: e.target.value}))}>
                    <option value="Plot">Plot</option>
                    <option value="LIG">LIG</option>
                    <option value="EWS">EWS</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={plotForm.status} onChange={e => setPlotForm(p => ({...p, status: e.target.value}))}>
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Facing</label>
                  <select value={plotForm.facing} onChange={e => setPlotForm(p => ({...p, facing: e.target.value}))}>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="North-East">North-East</option>
                    <option value="North-West">North-West</option>
                    <option value="South-East">South-East</option>
                    <option value="South-West">South-West</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                {editingPlot !== null ? (
                  <>
                    <button className="btn-primary" onClick={updatePlot}>Update Plot</button>
                    <button className="btn-secondary" onClick={() => {
                      setEditingPlot(null);
                      setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '' });
                    }}>Cancel</button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={addPlot}>+ Add Plot</button>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Plots ({plots.length})</h3>
              {plots.length === 0 ? (
                <p className="no-plots">No plots added yet. Add your first plot above.</p>
              ) : (
                <div className="plots-table-wrapper">
                  <table className="plots-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Area</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Facing</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plots.map((plot, idx) => (
                        <tr key={plot.id}>
                          <td>{plot.name}</td>
                          <td>{plot.area} sq ft</td>
                          <td>{plot.size}</td>
                          <td><span className={`type-badge ${plot.type.toLowerCase()}`}>{plot.type}</span></td>
                          <td><span className={`status-badge ${plot.status.toLowerCase()}`}>{plot.status}</span></td>
                          <td>{plot.facing}</td>
                          <td>
                            <button className="table-btn edit" onClick={() => startEditPlot(idx)}>Edit</button>
                            <button className="table-btn delete" onClick={() => deletePlot(idx)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================== TAB: ALIGN ======================== */}
        {activeTab === 'align' && (
          <div className="tab-content align-tab">
            {!imagePreview && !mapImageUrl ? (
              <div className="align-empty">
                <p>Please upload a map image in the "Project Details" tab first.</p>
              </div>
            ) : plots.length === 0 ? (
              <div className="align-empty">
                <p>Please add plots in the "Plot Data" tab first.</p>
              </div>
            ) : (
              <>
                <div className="align-instructions">
                  <p>🎯 <strong>Drag the red corner dots</strong> to align each plot boundary over the map image. Click a plot label to highlight it.</p>
                </div>
                <div className="align-canvas-wrapper">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${imgDimensions.width} ${imgDimensions.height}`}
                    className="align-svg"
                    style={{ cursor: draggingPoint ? 'grabbing' : 'crosshair' }}
                  >
                    <image
                      href={imagePreview || mapImageUrl}
                      width={imgDimensions.width}
                      height={imgDimensions.height}
                    />

                    {plots.map((plot) => {
                      const pointsArr = plot.points.trim().split(' ').map(p => p.split(',').map(Number));
                      const isHighlighted = selectedAlignPlot === plot.id;

                      return (
                        <g key={plot.id}>
                          <polygon
                            points={plot.points}
                            fill={isHighlighted ? 'rgba(99,102,241,0.35)' : 'rgba(0,0,0,0.2)'}
                            stroke={isHighlighted ? '#6366f1' : 'rgba(255,255,255,0.7)'}
                            strokeWidth={isHighlighted ? 3 : 1.5}
                            style={{ pointerEvents: 'none' }}
                          />
                          {/* Draggable corner handles */}
                          {pointsArr.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt[0]}
                              cy={pt[1]}
                              r={isHighlighted ? 8 : 5}
                              fill={isHighlighted ? '#6366f1' : '#ef4444'}
                              stroke="#fff"
                              strokeWidth="2"
                              style={{ cursor: 'grab', pointerEvents: 'all' }}
                              onPointerDown={(e) => {
                                setSelectedAlignPlot(plot.id);
                                handlePointerDown(e, plot.id, idx);
                              }}
                            />
                          ))}
                          {/* Label */}
                          <text
                            x={(pointsArr[0][0] + pointsArr[2][0]) / 2}
                            y={(pointsArr[0][1] + pointsArr[2][1]) / 2}
                            fill="#fff"
                            fontSize={isHighlighted ? 18 : 14}
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            style={{ 
                              pointerEvents: 'all', 
                              cursor: 'pointer',
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                            }}
                            onClick={() => setSelectedAlignPlot(plot.id === selectedAlignPlot ? null : plot.id)}
                          >
                            {plot.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectEditor;
