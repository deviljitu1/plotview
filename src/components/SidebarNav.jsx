import React, { useState } from 'react';
import { X, Share2, Search, Filter, Check } from 'lucide-react';
import WhatsAppIcon from '../assets/whatsapp-color-svgrepo-com.svg';
import CallIcon from '../assets/accept-call-icon.svg';
import MapIcon from '../assets/map-icon.svg';
import DocumentIcon from '../assets/document icon.svg';
import { generateBrochure } from '../utils/generateBrochure';
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
  plotTypes,
  plots,
  setSelectedPlot
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // 'search', 'filter', or null
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setExpandedSection(null);
    }
  }, [isOpen]);

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

  const formatPhone = (num) => {
    if (!num) return '';
    const clean = num.replace(/\s+/g, '');
    return clean.length === 10 ? `+91${clean}` : clean;
  };

  const formatWhatsApp = (num) => {
    if (!num) return '';
    const clean = num.replace(/\D/g, '');
    return clean.length === 10 ? `91${clean}` : clean;
  };

  const handleWhatsApp = () => {
    const waNum = project?.whatsappNumber || project?.contactPhone;
    if (!waNum) {
      alert("WhatsApp number is not available for this project.");
      return;
    }
    const text = `Hi, I am interested in knowing more about the project: ${project?.name || 'your project'}`;
    window.open(`https://wa.me/${formatWhatsApp(waNum)}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCall = () => {
    const phoneNum = project?.contactPhone || project?.whatsappNumber;
    if (!phoneNum) {
      alert("Contact number is not available for this project.");
      return;
    }
    window.location.href = `tel:${formatPhone(phoneNum)}`;
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleBrochureDownload = async () => {
    if (project?.customBrochureUrl) {
      window.open(project.customBrochureUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Auto-generate brochure
    setIsGenerating(true);
    try {
      await generateBrochure(project, plots);
    } catch (err) {
      alert("Failed to generate brochure. Please try again.");
    } finally {
      setIsGenerating(false);
    }
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
          <div className="sidebar-action-list">
            <button className="sidebar-action-item" onClick={handleShare} title="Share Project">
              {copied ? <Check size={20} color="#10b981" /> : <Share2 size={20} />}
            </button>

            <button className="sidebar-action-item" onClick={handleWhatsApp} title="WhatsApp">
              <img src={WhatsAppIcon} alt="WhatsApp" style={{ width: '22px', height: '22px' }} />
            </button>

            <button className="sidebar-action-item" onClick={handleCall} title="Contact Us">
              <img src={CallIcon} alt="Call" style={{ width: '22px', height: '22px' }} />
            </button>

            {project?.googleMapsUrl && (
              <button 
                className="sidebar-action-item" 
                onClick={() => window.open(project.googleMapsUrl, '_blank', 'noopener,noreferrer')} 
                title="View on Map"
              >
                <img src={MapIcon} alt="Map" style={{ width: '22px', height: '22px' }} />
              </button>
            )}

            <button 
              className="sidebar-action-item" 
              onClick={handleBrochureDownload} 
              title="Download Brochure"
              disabled={isGenerating}
              style={{ opacity: isGenerating ? 0.6 : 1 }}
            >
              {isGenerating ? (
                <div style={{ width: '22px', height: '22px', border: '3px solid #ccc', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <img src={DocumentIcon} alt="Brochure" style={{ width: '22px', height: '22px' }} />
              )}
            </button>

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
                    placeholder="Search plot number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery) {
                         const queryNum = searchQuery.replace(/\D/g, '');
                         const match = plots?.find(p => {
                           const plotNum = (p.name || '').replace(/\D/g, '');
                           return plotNum && plotNum === queryNum;
                         });
                         if (match) {
                           setSearchQuery(match.name);
                           setSelectedPlot(match);
                           setExpandedSection(null);
                         }
                      }
                    }}
                  />
                  {searchQuery && expandedSection === 'search' && (
                    <div className="search-dropdown">
                      {plots
                        ?.filter(p => {
                           const qLower = searchQuery.toLowerCase();
                           const nameLower = (p.name || '').toLowerCase();
                           const pNum = nameLower.replace(/\D/g, '');
                           const qNum = qLower.replace(/\D/g, '');
                           return nameLower.includes(qLower) || (qNum && pNum && pNum.includes(qNum));
                        })
                        .slice(0, 5)
                        .map(plot => (
                          <div 
                            key={plot.id} 
                            className="search-dropdown-item"
                            onClick={() => {
                              setSearchQuery(plot.name);
                              setSelectedPlot(plot);
                              setExpandedSection(null);
                            }}
                          >
                            <span>{plot.name}</span>
                            <span style={{ fontSize: '10px', color: '#888' }}>{plot.type}</span>
                          </div>
                        ))}
                      {plots?.filter(p => {
                           const qLower = searchQuery.toLowerCase();
                           const nameLower = (p.name || '').toLowerCase();
                           const pNum = nameLower.replace(/\D/g, '');
                           const qNum = qLower.replace(/\D/g, '');
                           return nameLower.includes(qLower) || (qNum && pNum && pNum.includes(qNum));
                      }).length === 0 && (
                        <div className="search-dropdown-item empty">No plots found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Filter */}
            <div className="sidebar-expandable">
              <button className={`sidebar-action-item ${expandedSection === 'filter' ? 'active' : ''}`} onClick={() => toggleSection('filter')} title="Filter Map">
                <Filter size={20} />
                {(filterType !== 'All' || filterStatus !== 'All') && (
                  <span className="filter-badge" />
                )}
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
                    <option value="Registered">Registered</option>
                  </select>

                  {(filterType !== 'All' || filterStatus !== 'All' || searchQuery !== '') && (
                    <button 
                      className="btn-clear-filter"
                      onClick={() => {
                        setFilterType('All');
                        setFilterStatus('All');
                        setSearchQuery('');
                      }}
                    >
                      Clear All Filters
                    </button>
                  )}
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
