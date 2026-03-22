import React from "react";
import "./ValuePropositionSection.css";

export default function ValuePropositionSection() {
  const values = [
    {
      icon: "fas fa-dollar-sign",
      title: "Save 40% on Costs",
      description:
        "Competitive pricing and automated design reduce project expenses significantly",
      color: "#34d399",
    },
    {
      icon: "fas fa-clock",
      title: "10x Faster Quotes",
      description:
        "Engineer-powered instant calculations vs traditional manual processes",
      color: "#67e8f9",
    },
    {
      icon: "fas fa-check-circle",
      title: "Verified Professionals",
      description:
        "Certified, vetted service providers with proven track records",
      color: "#3b82f6",
    },
    {
      icon: "fas fa-chart-line",
      title: "Real-Time Analytics",
      description:
        "Dashboard insights for project tracking and ROI measurement",
      color: "#fbbf24",
    },
    {
      icon: "fas fa-globe",
      title: "Global Coverage",
      description: "Access to thousands of providers across the World",
      color: "#f472b6",
    },
    {
      icon: "fas fa-mobile-alt",
      title: "Mobile Optimized",
      description: "Full functionality on any device for on-site management",
      color: "#a78bfa",
    },
  ];

  return (
    <section className="vp-section">
      <div className="vp-container">
        <div className="vp-header">
          <span className="vp-badge">Why Us</span>
          <h2 className="vp-title">Why Choose Our Platform?</h2>
          <p className="vp-subtitle">
            Transforming how HVAC projects are designed, quoted, and executed
          </p>
        </div>

        <div className="vp-grid">
          {values.map((value, index) => (
            <div className="vp-card" key={index}>
              <div className="vp-icon-wrap" style={{ color: value.color }}>
                <i className={value.icon} />
              </div>
              <h5 className="vp-card-title">{value.title}</h5>
              <p className="vp-card-desc">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
