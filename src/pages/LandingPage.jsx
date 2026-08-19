import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <div className="landing-brand">
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="url(#lgr)"/>
            <path d="M14 34V18l10-8 10 8v16H28V26h-8v8H14z" fill="#fff"/>
            <defs><linearGradient id="lgr" x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient></defs>
          </svg>
          <span>PlotView</span>
        </div>
        <a href="#contact" className="landing-login-btn">Contact Us</a>
      </nav>

      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">Interactive Real Estate Brochures</div>
          <h1>Showcase Your Projects<br/>Like Never Before</h1>
          <p>
            Create stunning, interactive plot maps for your real estate projects. 
            Upload your master plan, mark individual plots, and share beautiful 
            brochures with your clients — all from one powerful platform.
          </p>
          <div className="hero-cta">
            <a href="#contact" className="cta-primary">Get in Touch</a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="mock-card">
            <div className="mock-header">
              <div className="mock-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="mock-url">plotview.app/project/sunrise-villas</div>
            </div>
            <div className="mock-body">
              <div className="mock-map">
                <div className="mock-plot p1">1</div>
                <div className="mock-plot p2">2</div>
                <div className="mock-plot p3">3</div>
                <div className="mock-plot p4">4</div>
                <div className="mock-plot p5">5</div>
                <div className="mock-plot p6">6</div>
                <div className="mock-road h">Road</div>
                <div className="mock-road v">Road</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Everything You Need</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(16,185,129,0.15)', color: '#10b981'}}>📸</div>
            <h3>Upload Map Images</h3>
            <p>Drag & drop your rendered master plan or blueprint image. Supports PNG, JPG, WebP.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(99,102,241,0.15)', color: '#6366f1'}}>📐</div>
            <h3>Visual Alignment</h3>
            <p>Drag plot boundaries directly onto your image for pixel-perfect interactive overlays.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(245,158,11,0.15)', color: '#f59e0b'}}>📊</div>
            <h3>Plot Details</h3>
            <p>Add area, size, facing, type, and status for each plot. Clients click to view details.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(236,72,153,0.15)', color: '#ec4899'}}>🎨</div>
            <h3>White Label</h3>
            <p>Customize with your client's logo, brand colors, and company name for every project.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(139,92,246,0.15)', color: '#8b5cf6'}}>🔗</div>
            <h3>Shareable Links</h3>
            <p>Each project gets a unique URL you can share with buyers, agents, or embed anywhere.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: 'rgba(20,184,166,0.15)', color: '#14b8a6'}}>📱</div>
            <h3>Mobile First</h3>
            <p>Every brochure looks stunning on desktop, tablet, and mobile. Pan, zoom, and tap.</p>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-card">
          <h2>Ready to digitize your real estate projects?</h2>
          <p>Get in touch with us to start building your interactive brochures.</p>
          <div className="contact-links">
            <a href="mailto:hello@plotview.app" className="contact-link email-link">
              <span className="icon">✉️</span> hello@plotview.app
            </a>
            <a href="https://wa.me/" className="contact-link wa-link" target="_blank" rel="noreferrer">
              <span className="icon">💬</span> Message on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Built with ♥ for Real Estate Professionals</p>
      </footer>
    </div>
  );
};

export default LandingPage;
