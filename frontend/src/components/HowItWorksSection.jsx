import React from "react";
import { Container, Row, Col } from "react-bootstrap";

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

        <Row>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <Col md={3} sm={6} xs={12} className="mb-4">
                <div className="text-center">
                  <div
                    className="step-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      backgroundColor: "#007bff",
                      color: "white",
                      fontSize: "2.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {step.icon}
                  </div>
                  <h5 className="fw-bold mt-3">{step.title}</h5>
                  <p className="text-muted small mt-2">{step.description}</p>
                </div>
              </Col>

              {/* Arrow between steps (except after last) */}
              {index < steps.length - 1 && (
                <Col
                  md={0}
                  className="d-none d-md-flex align-items-center justify-content-center mb-4"
                  style={{ position: "relative", height: "80px" }}
                >
                  <div
                    style={{
                      width: "100%",
                      textAlign: "center",
                      marginTop: "-60px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.5rem",
                        color: "#007bff",
                        fontWeight: "bold",
                      }}
                    >
                      →
                    </span>
                  </div>
                </Col>
              )}
            </React.Fragment>
          ))}
        </Row>

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
