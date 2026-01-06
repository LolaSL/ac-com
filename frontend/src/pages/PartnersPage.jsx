import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";

const PartnersPage = () => {
  const partners = [
    {
      name: "Daikin",
      logo: "/images/daikin-logo.png",
      description: "Global leader in air conditioning and heating solutions",
      partnership: "Authorized distributor and service partner",
    },
    {
      name: "LG",
      logo: "/images/lg-logo.png",
      description: "Innovative HVAC systems with smart technology",
      partnership: "Premium product line partner",
    },
    {
      name: "Samsung",
      logo: "/images/samsung-logo.png",
      description: "Advanced climate control and energy-efficient solutions",
      partnership: "Technology integration partner",
    },
    {
      name: "Mitsubishi",
      logo: "/images/mitsubishi-logo.png",
      description: "High-performance heating and cooling systems",
      partnership: "Commercial and residential solutions partner",
    },
    {
      name: "Lennox",
      logo: "/images/lennox-logo.png",
      description: "Premium comfort systems and indoor air quality",
      partnership: "Quality assurance partner",
    },
    {
      name: "Haier",
      logo: "/images/haier-logo.png",
      description: "Smart appliances and climate control technology",
      partnership: "Innovation and design partner",
    },
    {
      name: "Electra",
      logo: "/images/electra-logo.png",
      description: "Reliable cooling and heating equipment",
      partnership: "Regional distribution partner",
    },
    {
      name: "Fujitsu",
      logo: "/images/fujitsu-logo.png",
      description: "Energy-efficient and eco-friendly HVAC solutions",
      partnership: "Sustainability partner",
    },
  ];

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Our Partners</h1>
        <p className="lead text-muted">
          Trusted partnerships with industry-leading HVAC manufacturers
        </p>
        <hr className="w-25 mx-auto" />
      </div>

      <Row className="mb-5">
        <Col lg={8} className="mx-auto text-center">
          <p className="fs-5 mb-4">
            AC Commerce has established strategic partnerships with the world's
            most trusted HVAC manufacturers, ensuring our customers have access
            to premium, certified products and cutting-edge technology.
          </p>
          <p className="text-muted">
            Our partnerships extend beyond product distribution to include
            training, certification, and ongoing support for our service
            provider network.
          </p>
        </Col>
      </Row>

      <Row className="g-4">
        {partners.map((partner, index) => (
          <Col lg={3} md={4} sm={6} key={index}>
            <Card className="h-100 border-0 shadow-sm hover-lift">
              <Card.Body className="text-center p-4">
                <div className="mb-3" style={{ height: "60px" }}>
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="img-fluid"
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <h5 className="card-title fw-bold mb-2">{partner.name}</h5>
                <p className="text-muted small mb-2">{partner.description}</p>
                <span className="badge bg-primary">{partner.partnership}</span>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mt-5">
        <Col lg={10} className="mx-auto">
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body className="text-center p-5">
              <h3 className="mb-3">Why Partner with AC Commerce?</h3>
              <Row className="g-4">
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-certificate fa-3x text-primary"></i>
                  </div>
                  <h5>Certified Quality</h5>
                  <p className="text-muted">
                    All products meet industry standards and manufacturer
                    certifications
                  </p>
                </Col>
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-tools fa-3x text-primary"></i>
                  </div>
                  <h5>Technical Support</h5>
                  <p className="text-muted">
                    Comprehensive training and support for our service provider
                    network
                  </p>
                </Col>
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-handshake fa-3x text-primary"></i>
                  </div>
                  <h5>Strategic Alliance</h5>
                  <p className="text-muted">
                    Long-term partnerships focused on innovation and customer
                    satisfaction
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PartnersPage;
