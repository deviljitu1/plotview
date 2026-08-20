import React, { useEffect } from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';
import './PlotDetailsModal.css';

const PlotDetailsModal = ({ plot, project, brandColor, onClose }) => {
  if (!plot) return null;

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ '--modal-accent': brandColor || '#6366f1' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (visual cue on mobile) */}
        <div className="modal-handle-bar">
          <div className="modal-handle" />
        </div>

        <div className="modal-header">
          <h2>Unit Details</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-grid">
            <div className="info-chip">
              <span className="info-label">Name</span>
              <span className="info-value">{plot.name}</span>
            </div>
            <div className="info-chip">
              <span className="info-label">Type</span>
              <span className="info-value">{plot.type}</span>
            </div>
            <div className="info-chip">
              <span className="info-label">Status</span>
              <span className={`status-badge ${plot.status.toLowerCase()}`}>
                {plot.status}
              </span>
            </div>
            <div className="info-chip">
              <span className="info-label">Facing</span>
              <span className="info-value">{plot.facing}</span>
            </div>
            <div className="info-chip">
              <span className="info-label">Size</span>
              <span className="info-value">{plot.size}</span>
            </div>
            <div className="info-chip">
              <span className="info-label">Area</span>
              <span className="info-value">{plot.area} sq.ft</span>
            </div>
          </div>

          <div className="action-row">
            <a 
              href={project?.contactPhone ? `tel:${project.contactPhone.replace(/\s+/g, '')}` : '#'} 
              className={`btn-action btn-call ${!project?.contactPhone ? 'disabled' : ''}`}
              onClick={(e) => !project?.contactPhone && e.preventDefault()}
            >
              <Phone size={16} /> Call
            </a>
            <a 
              href={project?.whatsappNumber ? `https://wa.me/${project.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, I am interested in plot ${plot.name} at ${project.name}`)}` : '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`btn-action btn-whatsapp ${!project?.whatsappNumber ? 'disabled' : ''}`}
              onClick={(e) => !project?.whatsappNumber && e.preventDefault()}
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotDetailsModal;
