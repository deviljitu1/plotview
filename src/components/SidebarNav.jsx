import React, { useState } from 'react';
import { X, Share2, Phone, MessageCircle, Search, Filter, Check } from 'lucide-react';
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
  const [expandedSection, setExpandedSection] = useState(null); // 'search', 'filter', or null

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
      {/* Overlay */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer - Icon Only */}
      <div className={`sidebar-drawer ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="btn-close-sidebar" onClick={onClose} aria-label="Close menu" title="Close">
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-content">
          {/* Action List */}
          <div className="sidebar-action-list">
            <button className="sidebar-action-item" onClick={handleShare} title="Share Project">
              {copied ? <Check size={20} color="#10b981" /> : <Share2 size={20} />}
            </button>

            <button className="sidebar-action-item" onClick={handleWhatsApp} title="WhatsApp">
              <MessageCircle size={20} color="#25D366" />
            </button>

            <button className="sidebar-action-item" onClick={() => window.location.href = `tel:`} title="Contact Us">
              <Phone size={20} />
            </button>
          </div>

          <div className="sidebar-divider"></div>

          <div className="sidebar-action-list">
            {/* Expandable Search */}
            <div className="sidebar-expandable">
              <button className={`sidebar-action-item ${expandedSection === 'search' ? 'active' : ''}`} onClick={() => toggleSection('search')} title="Search Plot">
                <Search size={20} />
              </button>
              <div className={`popout-content ${expandedSection === 'search' ? 'expanded' : ''}`}>
                <div className="popout-search-input">
                  <Search size={14} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Search plot..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Expandable Filter */}
            <div className="sidebar-expandable">
              <button className={`sidebar-action-item ${expandedSection === 'filter' ? 'active' : ''}`} onClick={() => toggleSection('filter')} title="Filter Map">
                <Filter size={20} />
              </button>
              <div className={`popout-content ${expandedSection === 'filter' ? 'expanded' : ''}`}>
                <div className="popout-filter-inputs">
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="popout-select"
                  >
                    {plotTypes.map(type => (
                      <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>
                    ))}
                  </select>

                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="popout-select"
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
      </div>
    </>
  );
};

export default SidebarNav;
