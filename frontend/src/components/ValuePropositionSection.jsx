import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  FaDollarSign,
  FaClock,
  FaCheckCircle,
  FaChartLine,
} from "react-icons/fa";
import "./ValuePropositionSection.css";

export default function ValuePropositionSection() {
  const values = [
    {
      icon: <FaDollarSign size={32} />,
      title: "Save 40% on Costs",
      description:
        "Competitive pricing and automated design reduce project expenses significantly",
      color: "success",
    },
    {
      icon: <FaClock size={32} />,
      title: "10x Faster Quotes",
      description:
        "AI-powered instant calculations vs traditional manual processes",
      color: "info",
    },
    {
      icon: <FaCheckCircle size={32} />,
      title: "Verified Professionals",
      description:
        "Certified, vetted service providers with proven track records",
      color: "primary",
    },
    {
      icon: <FaChartLine size={32} />,
      title: "Real-Time Analytics",
      description:
        "Dashboard insights for project tracking and ROI measurement",
      color: "warning",
    },
    {
      icon: <span style={{ fontSize: "2rem" }}>🌍</span>,
      title: "National Coverage",
      description: "Access to thousands of providers across the United States",
      color: "danger",
    },
    {
      icon: <span style={{ fontSize: "2rem" }}>📱</span>,
      title: "Mobile Optimized",
      description: "Full functionality on any device for on-site management",
      color: "secondary",
    },
  ];

  return (
    <section className="value-proposition-section py-5">
      <Container>
        <Row className="mb-5 text-center">
          <Col>
            <h2 className="fw-bold mb-3">Why Choose Our Platform?</h2>
            <p className="text-muted lead">
              Transforming how HVAC projects are designed, quoted, and executed
            </p>
          </Col>
        </Row>

        <Row>
          {values.map((value, index) => (
            <Col md={4} sm={6} xs={12} key={index} className="mb-4">
              <div className="value-card p-4 rounded h-100 border-0">
                <div className={`text-${value.color} mb-3`}>{value.icon}</div>
                <h5 className="fw-bold mb-3">{value.title}</h5>
                <p className="text-muted small">{value.description}</p>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}
