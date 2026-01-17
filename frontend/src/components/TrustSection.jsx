import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Row, Col, Spinner } from "react-bootstrap";
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
    { label: "Industry Partners", value: sellers.length || "8+" },
    { label: "Projects Completed", value: "10,000+" },
    { label: "Service Providers", value: "500+" },
    { label: "Active Users", value: "50,000+" },
  ];

  return (
    <section className="trust-section">
      <Container>
        {/* Metrics Cards */}
        <Row className="metrics-container">
          {metrics.map((metric, index) => (
            <Col md={3} sm={6} xs={12} key={index} className="mb-3 mb-sm-4">
              <div className="metric-card">
                <div className="metric-value fs-4">{metric.value}</div>
                <p className="metric-label">{metric.label}</p>
              </div>
            </Col>
          ))}
        </Row>

        {/* Partner Logos Section */}
        <div className="partners-section">
          <h3 className="section-title text-center">
            <span>Trusted By</span> Industry Leaders
          </h3>

          {loading ? (
            <div className="spinner-container">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <Row>
              {sellers.map((seller) => (
                <Col
                  md={2}
                  sm={4}
                  xs={6}
                  key={seller._id}
                  className="mb-3 mb-md-4"
                >
                  <div className="partner-logo-container">
                    {seller.logo &&
                    seller.logo !== "undefined" &&
                    seller.logo !== "" ? (
                      <img
                        src={seller.logo}
                        alt={seller.name}
                        className="partner-logo-img"
                      />
                    ) : (
                      <div className="partner-brand-name">{seller.name}</div>
                    )}
                  </div>
                  <p className="partner-brand-name text-center">
                    {seller.brand || seller.name}
                  </p>
                </Col>
              ))}
            </Row>
          )}
        </div>

        {/* Certification Badges */}
        <Row className="certifications-section">
          <Col md={4} xs={12} className="mb-3">
            <div className="badge-item">
              <div className="badge-icon">🔒</div>
              <h6 className="badge-title">Enterprise Security</h6>
              <p className="badge-description">ISO 27001 Certified</p>
            </div>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <div className="badge-item">
              <div className="badge-icon">✅</div>
              <h6 className="badge-title">Industry Certified</h6>
              <p className="badge-description">HVAC Standards Compliant</p>
            </div>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <div className="badge-item">
              <div className="badge-icon">⭐</div>
              <h6 className="badge-title">Top Rated</h6>
              <p className="badge-description">4.8/5 Average Rating</p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
