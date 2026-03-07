import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./HowItWorksSection.css";

export default function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Upload Floor Plan",
      description: "Submit your residential or commercial floor plan in PDF format only in high resolution and create your air conditioner system design",
      icon: "📄",
    },
    {
      number: "2",
      title: "Engineer Analysis",
      description: "In case of purchasing, our advanced Engineers analyze the space and generate AC unit recommendations ",
      icon: "🤖",
    },
    {
      number: "3",
      title: "Get Instant Quote",
      description: "Receive detailed quotes with BTU calculations and relevant products from our trusted HVAC partners",
      icon: "📊",
    },
    {
      number: "4",
      title: "Make a purchase",
      description: "Purchase AC units, match with certified installers, and close the project deal",
      icon: "🤝",
    },
  ];


  return (
    <section className="how-it-works-section py-5 bg-light">
      <Container>
        <Row className="mb-5 text-center">
          <Col>
            <h2 className="section-title">How It Works</h2>
            <p className="text-muted lead">
              From design to installation in 4 simple steps
            </p>
          </Col>
        </Row>

        <div className="howitworks-cards-grid">
          {steps.map((step, idx) => (
            <div className="howitworks-card" key={idx}>
              <div className="howitworks-card-icon">
                {step.icon}
              </div>
              <div className="howitworks-card-content">
                <h5 className="howitworks-card-title">{step.title}</h5>
                <p className="howitworks-card-desc">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Benefits */}
        <Row className="mt-5 pt-5 border-top">
          <Col md={4} xs={12} className="mb-3">
            <div className="benefit-item">
              <h6 className="fw-bold">⏱️ Save Time</h6>
              <p className="text-muted small mt-2">
                Get quotes in minutes instead of days
              </p>
            </div>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <div className="benefit-item">
              <h6 className="fw-bold">💡 Expert Guidance</h6>
              <p className="text-muted small mt-2">
                Engineering powered recommendations based on industry standards
              </p>
            </div>
          </Col>
          <Col md={4} xs={12} className="mb-3">
            <div className="benefit-item">
              <h6 className="fw-bold">🎯 Accurate Results</h6>
              <p className="text-muted small mt-2">
                Precise BTU calculations and professional specifications
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
