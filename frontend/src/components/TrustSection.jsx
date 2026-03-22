import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TrustSection.css";

export default function TrustSection() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const { data } = await axios.get("/api/sellers?limit=100");
        setSellers(data.sellers || []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch sellers:", error);
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const metrics = [
    { label: "Industry Partners", value: sellers.length || "8+", icon: "fas fa-handshake" },
    { label: "Projects Completed", value: "10,000+", icon: "fas fa-project-diagram" },
    { label: "Service Providers", value: "500+", icon: "fas fa-hard-hat" },
    { label: "Active Users", value: "50,000+", icon: "fas fa-users" },
  ];

  const certifications = [
    { icon: "fas fa-lock", title: "Enterprise Security", description: "ISO 27001 Certified", color: "#67e8f9" },
    { icon: "fas fa-certificate", title: "Industry Certified", description: "HVAC Standards Compliant", color: "#34d399" },
    { icon: "fas fa-star", title: "Top Rated", description: "4.8/5 Average Rating", color: "#fbbf24" },
  ];

  return (
    <section className="trs-section">
      <div className="trs-container">
        {/* Metrics */}
        <div className="trs-metrics">
          {metrics.map((metric, index) => (
            <div className="trs-metric" key={index}>
              <i className={`${metric.icon} trs-metric-icon`} />
              <span className="trs-metric-value">{metric.value}</span>
              <span className="trs-metric-label">{metric.label}</span>
            </div>
          ))}
        </div>

        {/* Partner Logos */}
        <div className="trs-partners">
          <div className="trs-partners-header">
            <span className="trs-badge">Partners</span>
            <h3 className="trs-title">
              Trusted By <span>Industry Leaders</span>
            </h3>
          </div>

          {loading ? (
            <div className="trs-spinner">
              <i className="fas fa-circle-notch fa-spin" />
            </div>
          ) : (
            <div className="trs-logos-grid">
              {sellers.map((seller) => (
                <div className="trs-logo-card" key={seller._id}>
                  {seller.logo && seller.logo !== "undefined" && seller.logo !== "" ? (
                    <img src={seller.logo} alt={seller.name} className="trs-logo-img" />
                  ) : (
                    <span className="trs-logo-fallback">{seller.name}</span>
                  )}
                  <span className="trs-logo-name">{seller.brand || seller.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certifications */}
        <div className="trs-certs">
          {certifications.map((cert, index) => (
            <div className="trs-cert" key={index}>
              <i className={`${cert.icon} trs-cert-icon`} style={{ color: cert.color }} />
              <h6 className="trs-cert-title">{cert.title}</h6>
              <p className="trs-cert-desc">{cert.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
