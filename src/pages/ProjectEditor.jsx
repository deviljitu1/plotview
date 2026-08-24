import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import PlotDetailsModal from '../components/PlotDetailsModal';
import MapAligner from '../components/MapAligner';
import northIcon from '../assets/north-symbol-icon.svg';
import southIcon from '../assets/south-symbol-icon.svg';
import eastIcon from '../assets/east-symbol-icon.svg';
import westIcon from '../assets/west-symbol-icon.svg';
import './ProjectEditor.css';

const sortPlots = (plotsArr) => {
  return [...plotsArr].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
};

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
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [northOffset, setNorthOffset] = useState(0);
  const [projectFacing, setProjectFacing] = useState('North');
  
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  
  // Georeferencing
  const [enableSatellite, setEnableSatellite] = useState(false);
  const [geoTopLeftLat, setGeoTopLeftLat] = useState('');
  const [geoTopLeftLng, setGeoTopLeftLng] = useState('');
  const [geoBottomRightLat, setGeoBottomRightLat] = useState('');
  const [geoBottomRightLng, setGeoBottomRightLng] = useState('');

  // Map Image
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [mapImageFile, setMapImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Brochure
  const [customBrochureFile, setCustomBrochureFile] = useState(null);
  const [customBrochureUrl, setCustomBrochureUrl] = useState('');
  const [brochureFileName, setBrochureFileName] = useState('');

  // Plots
  const [plots, setPlots] = useState([]);
  const [phases, setPhases] = useState(['Phase 1']);
  const [activePhase, setActivePhase] = useState('Phase 1');
  const [alignPhaseFilter, setAlignPhaseFilter] = useState('All');
  const [editingPlot, setEditingPlot] = useState(null); // index or null
  const [plotForm, setPlotForm] = useState({
    name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '', phase: 'Phase 1'
  });
  const [saveStatus, setSaveStatus] = useState('');

  // Bulk Import
  const [importPreview, setImportPreview] = useState(null); // parsed rows for preview
  const [importErrors, setImportErrors] = useState([]);

  // Bulk Select
  const [selectedPlots, setSelectedPlots] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkFacing, setBulkFacing] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Align Mode
  const [activeTab, setActiveTab] = useState('details');
  const [dragState, setDragState] = useState(null);
  const [selectedAlignPlots, setSelectedAlignPlots] = useState(new Set());
  const svgRef = useRef(null);
  const imgRef = useRef(null);
  const formRef = useRef(null);
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
        setContactPhone(data.contactPhone || '');
        setWhatsappNumber(data.whatsappNumber || '');
        setClientPassword(data.clientPassword || '');
        setNorthOffset(data.northOffset || 0);
        setProjectFacing(data.projectFacing || 'North');
        
        setGoogleMapsUrl(data.googleMapsUrl || '');
        
        setEnableSatellite(data.geoBounds?.enabled || false);
        setGeoTopLeftLat(data.geoBounds?.topLeft?.lat || '');
        setGeoTopLeftLng(data.geoBounds?.topLeft?.lng || '');
        setGeoBottomRightLat(data.geoBounds?.bottomRight?.lat || '');
        setGeoBottomRightLng(data.geoBounds?.bottomRight?.lng || '');

        setMapImageUrl(data.mapImageUrl || '');
        setImagePreview(data.mapImageUrl || '');
        setImgDimensions(data.imgDimensions || { width: 1000, height: 750 });
        
        setCustomBrochureUrl(data.customBrochureUrl || '');
        
        // Load plots subcollection
        const plotsSnap = await getDocs(collection(db, 'projects', id, 'plots'));
        const plotsList = plotsSnap.docs.map(d => {
          const pData = d.data();
          return { id: d.id, ...pData, phase: pData.phase || 'Phase 1' };
        });
        
        if (data.phases && data.phases.length > 0) {
          setPhases(data.phases);
          setActivePhase(data.phases[0]);
        } else {
          const loadedPhases = Array.from(new Set(plotsList.map(p => p.phase))).filter(Boolean);
          if (loadedPhases.length > 0) {
            setPhases(loadedPhases);
            setActivePhase(loadedPhases[0]);
          }
        }
        
        setPlots(sortPlots(plotsList));
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

  // ==================== STATS ====================
  const stats = useMemo(() => {
    const phasePlots = plots.filter(p => (p.phase || 'Phase 1') === activePhase);
    const total = phasePlots.length;
    const available = phasePlots.filter(p => p.status === 'Available').length;
    const booked = phasePlots.filter(p => p.status === 'Booked').length;
    const registered = phasePlots.filter(p => p.status === 'Registered').length;
    return { total, available, booked, registered };
  }, [plots, activePhase]);

  // ==================== FILTERED PLOTS ====================
  const filteredPlots = useMemo(() => {
    return plots.filter(p => {
      const matchPhase = (p.phase || 'Phase 1') === activePhase;
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      const matchType = filterType === 'All' || p.type === filterType;
      return matchPhase && matchSearch && matchStatus && matchType;
    });
  }, [plots, searchTerm, filterStatus, filterType, activePhase]);

  // ==================== EXCEL IMPORT ====================
  const handleExcelImport = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Normalize column headers (case-insensitive matching)
        const errors = [];
        const parsed = rawData.map((row, idx) => {
          const normalized = {};
          Object.keys(row).forEach(key => {
            const k = key.toLowerCase().trim();
            if (k.includes('name') || k === 'plot') normalized.name = String(row[key]).trim();
            else if (k.includes('area') || k.includes('sqft') || k.includes('sq ft')) normalized.area = Number(row[key]) || 0;
            else if (k.includes('size') || k.includes('dimension')) normalized.size = String(row[key]).trim();
            else if (k === 'type' || k.includes('category')) normalized.type = String(row[key]).trim() || 'Plot';
            else if (k === 'status') normalized.status = String(row[key]).trim() || 'Available';
            else if (k.includes('facing') || k.includes('direction')) normalized.facing = String(row[key]).trim() || 'East';
            else if (k === 'phase') normalized.phase = String(row[key]).trim();
          });

          // Validate
          if (!normalized.name) {
            errors.push(`Row ${idx + 2}: Missing plot name`);
          }

          // Validate status
          const validStatuses = ['Available', 'Booked', 'Registered'];
          if (normalized.status && !validStatuses.includes(normalized.status)) {
            // Try case-insensitive match
            const match = validStatuses.find(s => s.toLowerCase() === normalized.status.toLowerCase());
            normalized.status = match || 'Available';
          }

          return {
            id: uuidv4(),
            name: normalized.name || `Plot ${idx + 1}`,
            phase: normalized.phase || activePhase,
            area: normalized.area || 0,
            size: normalized.size || '',
            type: normalized.type || 'Plot',
            status: normalized.status || 'Available',
            facing: normalized.facing || 'East',
            points: '100,100 200,100 200,200 100,200'
          };
        });

        setImportPreview(parsed);
        setImportErrors(errors);
      } catch (err) {
        alert('Error reading file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!importPreview) return;
    
    const newPhases = new Set(phases);
    importPreview.forEach(p => {
      if (p.phase) newPhases.add(p.phase);
    });
    setPhases(Array.from(newPhases));

    setPlots(prev => sortPlots([...prev, ...importPreview]));
    setImportPreview(null);
    setImportErrors([]);
  };

  const cancelImport = () => {
    setImportPreview(null);
    setImportErrors([]);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExcelExport = () => {
    if (plots.length === 0) return alert('No plots to export.');
    const data = plots.map(p => ({
      'Plot Name': p.name,
      'Phase': p.phase || 'Phase 1',
      'Area (sq ft)': p.area,
      'Size': p.size,
      'Type': p.type,
      'Status': p.status,
      'Facing': p.facing
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plots');
    XLSX.writeFile(wb, `${projectName || 'plots'}_data.xlsx`);
  };

  const downloadTemplate = () => {
    const template = [
      { 'Plot Name': 'Plot 1', 'Phase': 'Phase 1', 'Area (sq ft)': 1200, 'Size': "40' x 30'", 'Type': 'Plot', 'Status': 'Available', 'Facing': 'East' },
      { 'Plot Name': 'Plot 2', 'Phase': 'Phase 1', 'Area (sq ft)': 1500, 'Size': "50' x 30'", 'Type': 'LIG', 'Status': 'Booked', 'Facing': 'North' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'PlotView_Import_Template.xlsx');
  };

  // ==================== BULK STATUS UPDATE ====================
  const toggleSelectPlot = (plotId) => {
    setSelectedPlots(prev => {
      const next = new Set(prev);
      if (next.has(plotId)) next.delete(plotId);
      else next.add(plotId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPlots.size === filteredPlots.length) {
      setSelectedPlots(new Set());
    } else {
      setSelectedPlots(new Set(filteredPlots.map(p => p.id)));
    }
  };

  const applyBulkStatus = () => {
    if (!bulkStatus || selectedPlots.size === 0) return;
    setPlots(prev => prev.map(p => selectedPlots.has(p.id) ? { ...p, status: bulkStatus } : p));
    setSelectedPlots(new Set());
    setBulkStatus('');
  };

  const applyBulkFacing = () => {
    if (!bulkFacing || selectedPlots.size === 0) return;
    setPlots(prev => prev.map(p => selectedPlots.has(p.id) ? { ...p, facing: bulkFacing } : p));
    setSelectedPlots(new Set());
    setBulkFacing('');
  };

  const bulkDeleteSelected = () => {
    if (selectedPlots.size === 0) return;
    if (!window.confirm(`Delete ${selectedPlots.size} selected plot(s)?`)) return;
    setPlots(prev => prev.filter(p => !selectedPlots.has(p.id)));
    setSelectedPlots(new Set());
  };

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

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 4096;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas is empty'));
            const uniqueName = `${uuidv4()}_${file.name.replace(/\.[^/.]+$/, "")}.webp`;
            const compressedFile = new File([blob], uniqueName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/webp', 0.8);
        };
        img.onerror = (err) => reject(err);
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (projectId) => {
    if (!mapImageFile) return mapImageUrl;
    setUploadingImage(true);
    setSaveStatus('Compressing & Uploading Map...');
    try {
      const compressedFile = await compressImage(mapImageFile);
      
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', 'ml_default');

      const res = await fetch('https://api.cloudinary.com/v1_1/djm7sh0zd/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
      
      const url = data.secure_url;
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
      try {
        const formData = new FormData();
        // Append UUID to logo filename to prevent Cloudinary overwrites
        formData.append('file', file, `${uuidv4()}_${file.name}`);
        formData.append('upload_preset', 'ml_default');

        const res = await fetch('https://api.cloudinary.com/v1_1/djm7sh0zd/image/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        if (res.ok) {
          setClientLogo(data.secure_url);
        } else {
          console.error('Cloudinary Error:', data.error?.message);
          alert('Failed to upload logo: ' + data.error?.message);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Failed to upload logo: ' + err.message);
      }
    }
  }, []);

  const handleBrochureUpload = useCallback((e) => {
    const file = e.target?.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCustomBrochureFile(file);
      setBrochureFileName(file.name);
    } else if (file) {
      alert("Please upload a valid PDF file.");
    }
  }, []);

  const uploadBrochureToFirebase = async (projectId) => {
    if (!customBrochureFile) return customBrochureUrl;
    setUploadingImage(true);
    setSaveStatus('Uploading Brochure... 0%');
    try {
      const storageRef = ref(storage, `brochures/${projectId}/${customBrochureFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, customBrochureFile);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setSaveStatus(`Uploading Brochure... ${Math.round(progress)}%`);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);
      setCustomBrochureUrl(url);
      setUploadingImage(false);
      return url;
    } catch (err) {
      console.error('Error uploading brochure:', err);
      setUploadingImage(false);
      return customBrochureUrl;
    }
  };

  // Plot CRUD
  const addPlot = () => {
    if (!plotForm.name) return alert('Plot name is required.');
    const newPlot = {
      id: uuidv4(),
      ...plotForm,
      phase: plotForm.phase || activePhase,
      area: Number(plotForm.area) || 0,
      points: '100,100 200,100 200,200 100,200' // Default rectangle
    };
    setPlots(prev => sortPlots([...prev, newPlot]));
    setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '', phase: activePhase });
  };

  const updatePlot = () => {
    if (editingPlot === null) return;
    setPlots(prev => sortPlots(prev.map((p, i) => i === editingPlot ? { ...p, ...plotForm, area: Number(plotForm.area) || 0 } : p)));
    setEditingPlot(null);
    setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '', phase: activePhase });
  };

  const deletePlot = (index) => {
    if (!window.confirm('Delete this plot?')) return;
    setPlots(prev => prev.filter((_, i) => i !== index));
  };

  const duplicatePlot = (index) => {
    const p = plots[index];
    // Offset the copied plot slightly so it doesn't overlap exactly
    const newPoints = p.points.split(' ').map(pt => {
      const [x, y] = pt.split(',').map(Number);
      return `${x + 20},${y + 20}`;
    }).join(' ');

    const newPlot = {
      ...p,
      id: uuidv4(),
      points: newPoints
    };
    
    setPlots(prev => sortPlots([...prev, newPlot]));
  };

  const startEditPlot = (index) => {
    const p = plots[index];
    setPlotForm({ name: p.name, area: p.area, type: p.type, status: p.status, facing: p.facing, size: p.size, phase: p.phase || activePhase });
    setEditingPlot(index);
  };

  // --- Align Mode Logic ---
  const handlePointPointerDown = (e, plotId, pointIndex) => {
    e.stopPropagation();
    setDragState({ type: 'point', plotId, pointIndex });
  };

  const handlePlotPointerDown = (e, plotId, pointsArr) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
    
    setDragState({ 
      type: 'plot', 
      plotId, 
      startX: cursorPt.x, 
      startY: cursorPt.y, 
      startPointsArr: pointsArr 
    });
  };

  const handlePointerMove = useCallback((e) => {
    if (!dragState || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    setPlots(prev => prev.map(plot => {
      if (plot.id === dragState.plotId) {
        if (dragState.type === 'point') {
          const pointsArr = plot.points.trim().split(' ').map(p => p.split(',').map(Number));
          pointsArr[dragState.pointIndex] = [Math.round(cursorPt.x), Math.round(cursorPt.y)];
          return { ...plot, points: pointsArr.map(p => p.join(',')).join(' ') };
        } else if (dragState.type === 'plot') {
          const dx = cursorPt.x - dragState.startX;
          const dy = cursorPt.y - dragState.startY;
          const pointsArr = dragState.startPointsArr.map(p => [Math.round(p[0] + dx), Math.round(p[1] + dy)]);
          return { ...plot, points: pointsArr.map(p => p.join(',')).join(' ') };
        }
      }
      return plot;
    }));
  }, [dragState]);

  const handlePointerUp = useCallback(() => {
    setDragState(null);
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

  const handleSave = async () => {
    if (!projectName || !slug) {
      setSaveStatus('Error: Name and Slug required');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    setSaving(true);
    setSaveStatus('Uploading Image...');
    try {
      const projectId = id || uuidv4();
      
      console.log('Step 1: Uploading image to Cloudinary...');
      const imageUrl = await uploadImage(projectId);
      console.log('Image uploaded/processed. URL:', imageUrl);

      const brochureUrl = await uploadBrochureToFirebase(projectId);

      // Save project doc
      setSaveStatus('Saving Project Data...');
      console.log('Step 2: Saving project document to Firestore...');
      await setDoc(doc(db, 'projects', projectId), {
        name: projectName,
        slug,
        clientName,
        clientLogo,
        brandColor,
        description,
        contactPhone,
        whatsappNumber,
        clientPassword,
        northOffset: Number(northOffset),
        projectFacing,
        mapImageUrl: imageUrl,
        customBrochureUrl: brochureUrl,
        phases: phases,
        imgDimensions,
        plotCount: plots.length,
        googleMapsUrl,
        geoBounds: {
          enabled: enableSatellite,
          topLeft: { lat: Number(geoTopLeftLat) || 0, lng: Number(geoTopLeftLng) || 0 },
          bottomRight: { lat: Number(geoBottomRightLat) || 0, lng: Number(geoBottomRightLng) || 0 }
        },
        updatedAt: new Date().toISOString(),
        ...(!isEditing && { createdAt: new Date().toISOString() })
      }, { merge: true });
      console.log('Project document saved successfully.');

      setSaveStatus('Updating Plots...');
      console.log('Step 3: Preparing batch commit for plots...');
      // Save plots as subcollection using batch
      const batch = writeBatch(db);
      
      // Delete existing plots first
      if (isEditing) {
        console.log('Fetching existing plots to delete...');
        const existingPlots = await getDocs(collection(db, 'projects', projectId, 'plots'));
        existingPlots.docs.forEach(d => batch.delete(d.ref));
        console.log(`Queued ${existingPlots.docs.length} existing plots for deletion.`);
      }

      // Add new plots
      plots.forEach(plot => {
        const plotRef = doc(db, 'projects', projectId, 'plots', plot.id);
        batch.set(plotRef, {
          name: plot.name,
          phase: plot.phase || 'Phase 1',
          area: plot.area,
          type: plot.type,
          status: plot.status,
          facing: plot.facing,
          size: plot.size,
          points: plot.points
        });
      });

      console.log('Step 4: Committing batch...');
      await batch.commit();
      console.log('Batch committed successfully.');
      
      setSaveStatus('Saved Successfully!');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error saving project at step:', saveStatus, err);
      setSaveStatus('Failed to Save');
      setTimeout(() => setSaveStatus(''), 3000);
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
          {saving ? (saveStatus || 'Saving...') : 'Save Project'}
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
                  <label>Map North Orientation (°)</label>
                  <input type="number" value={northOffset} onChange={e => setNorthOffset(e.target.value)} placeholder="0" min="-360" max="360" />
                  <span className="form-hint">Angle of North relative to the top of image (0 = Up).</span>
                </div>
                <div className="form-group">
                  <label>Project Facing Direction</label>
                  <select value={projectFacing} onChange={e => setProjectFacing(e.target.value)}>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North-East">North-East</option>
                    <option value="North-West">North-West</option>
                    <option value="South-East">South-East</option>
                    <option value="South-West">South-West</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Client Logo</label>
                  <div
                    className="logo-drop-zone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleLogoDrop}
                    onClick={() => document.getElementById('logoInput').click()}
                    style={{ position: 'relative' }}
                  >
                    {clientLogo ? (
                      <>
                        <img src={clientLogo} alt="Client Logo" className="logo-preview" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientLogo('');
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            fontWeight: 'bold'
                          }}
                          title="Remove Logo"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <span>Drag & drop or click to upload logo</span>
                    )}
                    <input id="logoInput" type="file" accept="image/*" onChange={handleLogoDrop} hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Information & Location</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Contact Phone Number</label>
                  <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. +919876543210" />
                </div>
                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="e.g. +919876543210" />
                </div>
                <div className="form-group full-width">
                  <label>Google Maps Location URL</label>
                  <input value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} placeholder="e.g. https://maps.app.goo.gl/..." />
                </div>
                <div className="form-group full-width">
                  <label>Custom Brochure (PDF)</label>
                  <input 
                    id="brochureInput"
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleBrochureUpload} 
                    className="file-input"
                  />
                  {(brochureFileName || customBrochureUrl) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      {brochureFileName ? (
                        <p className="form-hint" style={{ color: '#10b981', margin: 0 }}>Selected: {brochureFileName}</p>
                      ) : (
                        <p className="form-hint" style={{ margin: 0 }}>
                          <a href={customBrochureUrl} target="_blank" rel="noopener noreferrer" style={{color: '#6366f1'}}>View Current Brochure</a>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setCustomBrochureFile(null);
                          setBrochureFileName('');
                          setCustomBrochureUrl('');
                          const fileInput = document.getElementById('brochureInput');
                          if (fileInput) fileInput.value = '';
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Remove Brochure
                      </button>
                    </div>
                  )}
                  <p className="form-hint">Upload a custom PDF brochure. If not provided, a beautiful auto-generated brochure will be created for clients to download.</p>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Client Management Portal</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Client Password</label>
                  <input type="text" value={clientPassword} onChange={e => setClientPassword(e.target.value)} placeholder="e.g. sell2026" />
                </div>
                <div className="form-group full-width" style={{ display: 'flex', alignItems: 'flex-end', marginTop: '-0.5rem' }}>
                  {slug && clientPassword ? (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ width: '100%' }}
                      onClick={() => {
                        const url = `${window.location.origin}/manage/${slug}`;
                        navigator.clipboard.writeText(`Manage your plots here:\nURL: ${url}\nPassword: ${clientPassword}`);
                        alert('Client management link and password copied to clipboard!');
                      }}
                    >
                      📋 Copy Client Login Details
                    </button>
                  ) : (
                    <span className="form-hint" style={{ marginTop: 'auto', marginBottom: '1rem' }}>
                      Save project with a slug and password to generate link.
                    </span>
                  )}
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
                  <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <img src={imagePreview} alt="Map Preview" className="map-preview-img" />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMapImageFile(null);
                        setMapImageUrl('');
                        setImagePreview('');
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      Remove Image
                    </button>
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        pointerEvents: 'none',
                        fontSize: '0.875rem'
                      }}>
                      Click or drag to change
                    </div>
                  </div>
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

            <div className="form-section">
              <h3>Georeferencing (Satellite Map Integration)</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={enableSatellite} 
                      onChange={e => setEnableSatellite(e.target.checked)} 
                    />
                    Enable Satellite Map View
                  </label>
                  <p className="form-hint" style={{ marginTop: '0.25rem' }}>
                    Provide the Top-Left and Bottom-Right GPS coordinates of your layout image to enable the satellite map overlay.
                  </p>
                </div>
                
                {enableSatellite && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                    <MapAligner 
                      imageUrl={imagePreview}
                      initialTopLeft={
                        geoTopLeftLat && geoTopLeftLng ? { lat: Number(geoTopLeftLat), lng: Number(geoTopLeftLng) } : null
                      }
                      initialBottomRight={
                        geoBottomRightLat && geoBottomRightLng ? { lat: Number(geoBottomRightLat), lng: Number(geoBottomRightLng) } : null
                      }
                      onChange={(bounds) => {
                        setGeoTopLeftLat(bounds.topLeft.lat);
                        setGeoTopLeftLng(bounds.topLeft.lng);
                        setGeoBottomRightLat(bounds.bottomRight.lat);
                        setGeoBottomRightLng(bounds.bottomRight.lng);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB: PLOTS ======================== */}
        {activeTab === 'plots' && (
          <div className="tab-content">
          
            {/* ===== PHASE TABS ===== */}
            <div className="phase-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {phases.map(p => (
                <button 
                  key={p} 
                  className={`btn-sm ${activePhase === p ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setActivePhase(p);
                    setPlotForm(prev => ({...prev, phase: p}));
                  }}
                >
                  {p}
                </button>
              ))}
              <button 
                className="btn-sm btn-secondary" 
                onClick={() => {
                  const name = prompt('Enter new phase name (e.g. Phase 2):');
                  if (name && !phases.includes(name)) {
                    setPhases(prev => [...prev, name]);
                    setActivePhase(name);
                    setPlotForm(prev => ({...prev, phase: name}));
                  }
                }}
              >
                + Add Phase
              </button>
            </div>

            {/* ===== STATS CARDS ===== */}
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total Plots</span>
              </div>
              <div className="stat-card stat-available">
                <span className="stat-number">{stats.available}</span>
                <span className="stat-label">Available</span>
              </div>
              <div className="stat-card stat-booked">
                <span className="stat-number">{stats.booked}</span>
                <span className="stat-label">Booked</span>
              </div>
              <div className="stat-card stat-registered">
                <span className="stat-number">{stats.registered}</span>
                <span className="stat-label">Registered</span>
              </div>
              {stats.total > 0 && (
                <div className="stat-card stat-progress">
                  <div className="progress-bar">
                    <div className="progress-registered" style={{ width: `${(stats.registered / stats.total) * 100}%` }}></div>
                    <div className="progress-booked" style={{ width: `${(stats.booked / stats.total) * 100}%` }}></div>
                  </div>
                  <span className="stat-label">{Math.round(((stats.registered + stats.booked) / stats.total) * 100)}% Registered/Booked</span>
                </div>
              )}
            </div>

            {/* ===== IMPORT / EXPORT BAR ===== */}
            <div className="import-export-bar">
              <div className="ie-left">
                <label className="import-btn">
                  📥 Import Excel/CSV
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} hidden />
                </label>
                <button className="template-btn" onClick={downloadTemplate}>📄 Download Template</button>
              </div>
              <div className="ie-right">
                <button className="export-btn" onClick={handleExcelExport} disabled={plots.length === 0}>
                  📤 Export to Excel
                </button>
              </div>
            </div>

            {/* ===== IMPORT PREVIEW ===== */}
            {importPreview && (
              <div className="import-preview-section">
                <h3>📋 Import Preview — {importPreview.length} plot(s) found</h3>
                {importErrors.length > 0 && (
                  <div className="import-errors">
                    {importErrors.map((err, i) => <p key={i}>⚠️ {err}</p>)}
                  </div>
                )}
                <div className="plots-table-wrapper" style={{maxHeight: '300px'}}>
                  <table className="plots-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Phase</th><th>Area</th><th>Size</th><th>Type</th><th>Status</th><th>Facing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((p, i) => (
                        <tr key={i} className={!p.name ? 'row-error' : ''}>
                          <td>{p.name}</td>
                          <td>{p.phase}</td>
                          <td>{p.area}</td>
                          <td>{p.size}</td>
                          <td>{p.type}</td>
                          <td><span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span></td>
                          <td>{p.facing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="import-actions">
                  <button className="btn-primary" onClick={confirmImport}>✅ Import All ({importPreview.length})</button>
                  <button className="btn-secondary" onClick={cancelImport}>Cancel</button>
                </div>
              </div>
            )}

            {/* ===== ADD PLOT FORM ===== */}
            {editingPlot === null && (
              <div className="form-section" ref={formRef}>
                <h3>Add New Plot</h3>
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
                  <label>Phase</label>
                  <select value={plotForm.phase} onChange={e => setPlotForm(p => ({...p, phase: e.target.value}))}>
                    {phases.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={plotForm.status} onChange={e => setPlotForm(p => ({...p, status: e.target.value}))}>
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Registered">Registered</option>
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
                <button className="btn-primary" onClick={addPlot}>+ Add Plot</button>
              </div>
            </div>
            )}

            {/* ===== SEARCH & FILTER BAR ===== */}
            <div className="form-section">
              <div className="search-filter-bar">
                <input
                  className="search-input"
                  type="text"
                  placeholder="🔍 Search plots by name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Registered">Registered</option>
                </select>
                <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="Plot">Plot</option>
                  <option value="LIG">LIG</option>
                  <option value="EWS">EWS</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>

              {/* ===== BULK ACTIONS BAR ===== */}
              {selectedPlots.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="bulk-count">{selectedPlots.size} selected</span>
                  
                  <div className="bulk-action-group">
                    <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="bulk-status-select">
                      <option value="">Change Status…</option>
                      <option value="Available">Available</option>
                      <option value="Booked">Booked</option>
                      <option value="Registered">Registered</option>
                    </select>
                    <button className="btn-primary btn-sm" onClick={applyBulkStatus} disabled={!bulkStatus}>Apply</button>
                  </div>

                  <div className="bulk-action-group">
                    <select value={bulkFacing} onChange={e => setBulkFacing(e.target.value)} className="bulk-status-select">
                      <option value="">Change Facing…</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="North-East">North-East</option>
                      <option value="North-West">North-West</option>
                      <option value="South-East">South-East</option>
                      <option value="South-West">South-West</option>
                    </select>
                    <button className="btn-primary btn-sm" onClick={applyBulkFacing} disabled={!bulkFacing}>Apply</button>
                  </div>

                  <button className="btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={bulkDeleteSelected}>🗑️ Delete</button>
                </div>
              )}

              <h3>Plots ({filteredPlots.length}{filteredPlots.length !== plots.length ? ` of ${plots.length}` : ''})</h3>
              {plots.length === 0 ? (
                <p className="no-plots">No plots added yet. Add your first plot above, or import from an Excel file.</p>
              ) : (
                <div className="plots-table-wrapper">
                  <table className="plots-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={selectedPlots.size === filteredPlots.length && filteredPlots.length > 0}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th>Name</th>
                        <th>Phase</th>
                        <th>Area</th>
                        <th>Size</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Facing</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlots.map((plot) => {
                        const realIdx = plots.findIndex(p => p.id === plot.id);
                        return (
                          <tr key={plot.id} className={selectedPlots.has(plot.id) ? 'row-selected' : ''}>
                            {editingPlot === realIdx ? (
                              <>
                                <td>
                                  <input type="checkbox" disabled />
                                </td>
                                <td><input value={plotForm.name} onChange={e => setPlotForm(p => ({...p, name: e.target.value}))} style={{width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}} /></td>
                                <td>
                                  <select value={plotForm.phase} onChange={e => setPlotForm(p => ({...p, phase: e.target.value}))} style={{padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                    {phases.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                                  </select>
                                </td>
                                <td><input type="number" value={plotForm.area} onChange={e => setPlotForm(p => ({...p, area: e.target.value}))} style={{width: '70px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}} /></td>
                                <td><input value={plotForm.size} onChange={e => setPlotForm(p => ({...p, size: e.target.value}))} style={{width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}} /></td>
                                <td>
                                  <select value={plotForm.type} onChange={e => setPlotForm(p => ({...p, type: e.target.value}))} style={{padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                    <option value="Plot">Plot</option>
                                    <option value="LIG">LIG</option>
                                    <option value="EWS">EWS</option>
                                    <option value="Commercial">Commercial</option>
                                  </select>
                                </td>
                                <td>
                                  <select value={plotForm.status} onChange={e => setPlotForm(p => ({...p, status: e.target.value}))} style={{padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                    <option value="Available">Available</option>
                                    <option value="Booked">Booked</option>
                                    <option value="Registered">Registered</option>
                                  </select>
                                </td>
                                <td>
                                  <select value={plotForm.facing} onChange={e => setPlotForm(p => ({...p, facing: e.target.value}))} style={{padding: '4px', border: '1px solid #ccc', borderRadius: '4px'}}>
                                    <option value="East">East</option>
                                    <option value="West">West</option>
                                    <option value="North">North</option>
                                    <option value="South">South</option>
                                    <option value="North-East">North-East</option>
                                    <option value="North-West">North-West</option>
                                    <option value="South-East">South-East</option>
                                    <option value="South-West">South-West</option>
                                  </select>
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <button className="table-btn edit" onClick={updatePlot} style={{ background: '#22c55e', color: 'white', marginRight: '4px', border: 'none' }}>Save</button>
                                  <button className="table-btn delete" onClick={() => {
                                    setEditingPlot(null);
                                    setPlotForm({ name: '', area: '', type: 'Plot', status: 'Available', facing: 'East', size: '', phase: activePhase });
                                  }} style={{ border: 'none' }}>Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedPlots.has(plot.id)}
                                    onChange={() => toggleSelectPlot(plot.id)}
                                  />
                                </td>
                                <td>{plot.name}</td>
                                <td>{plot.phase || 'Phase 1'}</td>
                                <td>{plot.area} sq ft</td>
                                <td>{plot.size}</td>
                                <td><span className={`type-badge ${plot.type.toLowerCase()}`}>{plot.type}</span></td>
                                <td><span className={`status-badge ${plot.status.toLowerCase()}`}>{plot.status}</span></td>
                                <td>{plot.facing}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <button className="table-btn edit" onClick={() => startEditPlot(realIdx)}>Edit</button>
                                  <button className="table-btn duplicate" onClick={() => duplicatePlot(realIdx)} style={{ marginLeft: '4px', marginRight: '4px' }}>Duplicate</button>
                                  <button className="table-btn delete" onClick={() => deletePlot(realIdx)}>Delete</button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '0.5rem' }}>
                      <p style={{ margin: 0 }}>🎯 <strong>Drag the red corner dots</strong> to align each plot boundary over the map image. Click a plot to select it (Hold <strong>Shift</strong> to select multiple).</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>View Phase:</span>
                        <select 
                          value={alignPhaseFilter} 
                          onChange={e => setAlignPhaseFilter(e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="All">All Phases</option>
                          {phases.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="visual-compass-calibrator" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>North Offset (°)</label>
                        <input 
                          type="range" 
                          min="-180" max="180" 
                          value={northOffset} 
                          onChange={(e) => setNorthOffset(Number(e.target.value))} 
                        />
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{northOffset}°</div>
                      </div>
                      <div style={{ 
                        width: '40px', height: '40px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        transform: `rotate(${northOffset}deg)`,
                        transition: 'transform 0.1s'
                      }}>
                        <img 
                          src={
                            projectFacing === 'South' ? southIcon :
                            projectFacing === 'East' ? eastIcon :
                            projectFacing === 'West' ? westIcon :
                            northIcon
                          } 
                          alt="Compass" style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="align-canvas-wrapper" style={{ display: 'flex', position: 'relative', overflow: 'hidden', minHeight: '600px' }}>
                  {selectedAlignPlots.size > 0 && (() => {
                    const getBulkValue = (field) => {
                      const arr = Array.from(selectedAlignPlots);
                      const firstVal = plots.find(p => p.id === arr[0])?.[field];
                      for (let i = 1; i < arr.length; i++) {
                        const val = plots.find(p => p.id === arr[i])?.[field];
                        if (val !== firstVal) return ''; // Mixed values
                      }
                      return firstVal || '';
                    };

                    const updateSelectedPlots = (field, value) => {
                      setPlots(prev => prev.map(p => {
                        if (selectedAlignPlots.has(p.id)) {
                          return { ...p, [field]: value };
                        }
                        return p;
                      }));
                    };

                    return (
                      <div style={{
                        width: '300px',
                        flexShrink: 0,
                        background: 'white',
                        padding: '20px',
                        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        overflowY: 'auto',
                        borderRight: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                            {selectedAlignPlots.size === 1 ? 'Edit Plot' : `Edit ${selectedAlignPlots.size} Plots`}
                          </h3>
                          <button 
                            onClick={() => setSelectedAlignPlots(new Set())}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem', padding: '0 4px' }}
                            title="Close"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {selectedAlignPlots.size === 1 && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '13px', marginBottom: '4px' }}>Name</label>
                              <input 
                                value={getBulkValue('name')} 
                                onChange={(e) => updateSelectedPlots('name', e.target.value)} 
                                style={{ padding: '6px', fontSize: '13px' }}
                              />
                            </div>
                          )}

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Phase</label>
                            <select 
                              value={getBulkValue('phase')} 
                              onChange={(e) => updateSelectedPlots('phase', e.target.value)}
                              style={{ padding: '6px', fontSize: '13px' }}
                            >
                              {selectedAlignPlots.size > 1 && getBulkValue('phase') === '' && <option value="" disabled>--- Mixed ---</option>}
                              {phases.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Area (sq ft)</label>
                            <input 
                              type="number" 
                              value={getBulkValue('area')}
                              onChange={(e) => updateSelectedPlots('area', e.target.value)} 
                              placeholder={selectedAlignPlots.size > 1 ? '--- Mixed ---' : ''}
                              style={{ padding: '6px', fontSize: '13px' }}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Size</label>
                            <input 
                              value={getBulkValue('size')}
                              onChange={(e) => updateSelectedPlots('size', e.target.value)} 
                              placeholder={selectedAlignPlots.size > 1 ? '--- Mixed ---' : ''}
                              style={{ padding: '6px', fontSize: '13px' }}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Type</label>
                            <select 
                              value={getBulkValue('type')} 
                              onChange={(e) => updateSelectedPlots('type', e.target.value)}
                              style={{ padding: '6px', fontSize: '13px' }}
                            >
                              {selectedAlignPlots.size > 1 && getBulkValue('type') === '' && <option value="" disabled>--- Mixed ---</option>}
                              <option value="Plot">Plot</option>
                              <option value="LIG">LIG</option>
                              <option value="EWS">EWS</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Status</label>
                            <select 
                              value={getBulkValue('status')} 
                              onChange={(e) => updateSelectedPlots('status', e.target.value)}
                              style={{ padding: '6px', fontSize: '13px' }}
                            >
                              {selectedAlignPlots.size > 1 && getBulkValue('status') === '' && <option value="" disabled>--- Mixed ---</option>}
                              <option value="Available">Available</option>
                              <option value="Booked">Booked</option>
                              <option value="Registered">Registered</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '13px', marginBottom: '4px' }}>Facing</label>
                            <select 
                              value={getBulkValue('facing')} 
                              onChange={(e) => updateSelectedPlots('facing', e.target.value)}
                              style={{ padding: '6px', fontSize: '13px' }}
                            >
                              {selectedAlignPlots.size > 1 && getBulkValue('facing') === '' && <option value="" disabled>--- Mixed ---</option>}
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
                      </div>
                    );
                  })()}
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${imgDimensions.width} ${imgDimensions.height}`}
                      className="align-svg"
                      style={{ cursor: dragState ? 'grabbing' : 'crosshair', width: '100%', height: '100%' }}
                      onPointerDown={(e) => {
                        if (e.target === svgRef.current || e.target.tagName?.toLowerCase() === 'image') {
                          setSelectedAlignPlots(new Set());
                        }
                      }}
                    >
                    <image
                      href={imagePreview || mapImageUrl}
                      width={imgDimensions.width}
                      height={imgDimensions.height}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    />

                    {plots.filter(p => alignPhaseFilter === 'All' || (p.phase || 'Phase 1') === alignPhaseFilter).map((plot) => {
                      const pointsArr = plot.points.trim().split(' ').map(p => p.split(',').map(Number));
                      const isHighlighted = selectedAlignPlots.has(plot.id);

                      return (
                        <g key={plot.id}>
                          <polygon
                            points={plot.points}
                            fill={isHighlighted ? 'rgba(99,102,241,0.35)' : 'rgba(0,0,0,0.2)'}
                            stroke={isHighlighted ? '#6366f1' : 'rgba(255,255,255,0.7)'}
                            strokeWidth={isHighlighted ? 3 : 1.5}
                            style={{ pointerEvents: 'all', cursor: 'grab' }}
                            onPointerDown={(e) => {
                              setSelectedAlignPlots(prev => {
                                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                  const next = new Set(prev);
                                  if (next.has(plot.id)) next.delete(plot.id);
                                  else next.add(plot.id);
                                  return next;
                                }
                                return new Set([plot.id]);
                              });
                              handlePlotPointerDown(e, plot.id, pointsArr);
                            }}
                            onClick={(e) => e.stopPropagation()}
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
                                setSelectedAlignPlots(prev => {
                                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                    const next = new Set(prev);
                                    next.add(plot.id);
                                    return next;
                                  }
                                  return new Set([plot.id]);
                                });
                                handlePointPointerDown(e, plot.id, idx);
                              }}
                              onClick={(e) => e.stopPropagation()}
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
                              pointerEvents: 'none', 
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                            }}
                          >
                            {alignPhaseFilter === 'All' ? `${plot.name} (${plot.phase || 'Phase 1'})` : plot.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
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
