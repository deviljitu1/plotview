import React from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';
import './PlotDetailsModal.css';

const PlotDetailsModal = ({ plot, brandColor, onClose }) => {
  if (!plot) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ '--modal-accent': brandColor || '#6366f1' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Unit Details</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <h3 className="section-title">GENERAL INFORMATION</h3>
          
          <div className="info-grid">
            <div className="info-card">
              <span className="info-label">Name</span>
              <span className="info-value">{plot.name}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Type</span>
              <span className="info-value">{plot.type}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Status</span>
              <span className={`status-badge ${plot.status.toLowerCase()}`}>
                {plot.status}
              </span>
            </div>
            <div className="info-card">
              <span className="info-label">Facing</span>
              <span className="info-value">{plot.facing}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Size</span>
              <span className="info-value">{plot.size}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Carpet Area</span>
              <span className="info-value">{plot.area} sq.ft</span>
            </div>
          </div>

          <div className="booking-section">
            <h3>Booking & Inquiry</h3>
            <p>Contact us for booking assistance and unit inquiries</p>
            <div className="action-buttons">
              <button className="btn-call">
                <Phone size={18} /> Call
              </button>
              <button className="btn-whatsapp">
                <MessageCircle size={18} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlotDetailsModal;
