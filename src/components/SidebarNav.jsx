import React, { useState } from 'react';
import { X, Share2, Phone, MessageCircle, Search, Filter, Check, ChevronDown } from 'lucide-react';
import './SidebarNav.css';

const SidebarNav = ({
  isOpen,
  onClose,
  project,
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  plotTypes
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: project?.name || 'Real Estate Project',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleWhatsApp = () => {
    const text = `Hi, I am interested in knowing more about the project: ${project?.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button className="btn-close-sidebar" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-action-list">
            <button className="sidebar-action-item" onClick={handleShare}>
              {copied ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
              <span>{copied ? 'Link Copied!' : 'Share Project'}</span>
            </button>

            <button className="sidebar-action-item" onClick={handleWhatsApp}>
              <MessageCircle size={18} color="#25D366" />
              <span>WhatsApp</span>
            </button>

            <button className="sidebar-action-item" onClick={() => window.location.href = `tel:`}>
              <Phone size={18} />
              <span>Contact Us</span>
            </button>
          </div>

          <div className="sidebar-divider"></div>

          <div className="sidebar-expandable">
            <button className="sidebar-action-item" onClick={() => toggleSection('search')}>
              <Search size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>Search Plot</span>
              <ChevronDown 
                size={16} 
                className={`chevron ${expandedSection === 'search' ? 'open' : ''}`} 
              />
            </button>
            <div className={`expandable-content ${expandedSection === 'search' ? 'expanded' : ''}`}>
              <div className="sidebar-search-input">
                <Search size={14} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter plot name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="sidebar-expandable">
            <button className="sidebar-action-item" onClick={() => toggleSection('filter')}>
              <Filter size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>Filter Map</span>
              <ChevronDown 
                size={16} 
                className={`chevron ${expandedSection === 'filter' ? 'open' : ''}`} 
              />
            </button>
            <div className={`expandable-content ${expandedSection === 'filter' ? 'expanded' : ''}`}>
              <div className="sidebar-filter-inputs">
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="sidebar-select"
                >
                  {plotTypes.map(type => (
                    <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>
                  ))}
                </select>

                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="sidebar-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default SidebarNav;
