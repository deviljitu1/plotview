import React from 'react';

const BrochureTemplate = ({ project, plots }) => {
  const {
    name,
    clientName,
    clientLogo,
    brandColor = '#6366f1',
    description,
    contactPhone,
    whatsappNumber,
    mapImageUrl
  } = project || {};

  const availablePlots = plots.filter(p => p.status === 'Available');
  const bookedPlots = plots.filter(p => p.status === 'Booked' || p.status === 'Registered');

  return (
    <div
      id="brochure-container"
      style={{
        width: '800px', // Fixed width for consistent PDF A4-ish ratio
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        color: '#333',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* HEADER */}
      <div style={{
        backgroundColor: brandColor,
        padding: '40px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '4px solid rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{name}</h1>
          {clientName && <h2 style={{ margin: '8px 0 0', fontSize: '18px', opacity: 0.9 }}>By {clientName}</h2>}
        </div>
        {clientLogo && (
          <img
            src={clientLogo}
            alt="Logo"
            style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain', backgroundColor: 'white', padding: '8px', borderRadius: '8px' }}
          />
        )}
      </div>

      {/* DESCRIPTION */}
      {description && (
        <div style={{ padding: '30px 40px', fontSize: '16px', lineHeight: '1.6', color: '#555', backgroundColor: '#f9fafb' }}>
          {description}
        </div>
      )}

      {/* MAP IMAGE */}
      {mapImageUrl && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '22px', marginBottom: '20px', color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: '10px', display: 'inline-block' }}>Project Layout</h3>
          <img
            src={mapImageUrl}
            alt="Project Layout"
            crossOrigin="anonymous"
            style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
        </div>
      )}

      {/* PLOT SUMMARY */}
      <div style={{ padding: '0 40px 40px' }}>
        <h3 style={{ fontSize: '22px', marginBottom: '20px', color: brandColor, borderBottom: `2px solid ${brandColor}`, paddingBottom: '10px', display: 'inline-block' }}>Plots Overview</h3>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
           <div style={{ flex: 1, padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
             <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>{availablePlots.length}</div>
             <div style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>Available Plots</div>
           </div>
           <div style={{ flex: 1, padding: '20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
             <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#991b1b' }}>{bookedPlots.length}</div>
             <div style={{ fontSize: '14px', color: '#991b1b', fontWeight: '500' }}>Booked / Sold</div>
           </div>
        </div>

        {availablePlots.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ fontSize: '18px', color: '#333', marginBottom: '15px' }}>Currently Available</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Plot No.</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Type</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Facing</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Area (sq ft)</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #e5e7eb' }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {availablePlots.slice(0, 15).map((plot, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{plot.name}</td>
                    <td style={{ padding: '12px' }}>{plot.type}</td>
                    <td style={{ padding: '12px' }}>{plot.facing}</td>
                    <td style={{ padding: '12px' }}>{plot.area}</td>
                    <td style={{ padding: '12px' }}>{plot.size}</td>
                  </tr>
                ))}
                {availablePlots.length > 15 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                      And {availablePlots.length - 15} more available plots...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        backgroundColor: '#1f2937',
        color: '#f9fafb',
        padding: '30px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto'
      }}>
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>Contact Us</h4>
          {contactPhone && <div style={{ marginBottom: '5px' }}>📞 {contactPhone}</div>}
          {whatsappNumber && <div>💬 {whatsappNumber}</div>}
        </div>
        <div style={{ textAlign: 'right', opacity: 0.8, fontSize: '12px' }}>
          <div>Generated by PlotView</div>
          <div>{new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
};

export default BrochureTemplate;
