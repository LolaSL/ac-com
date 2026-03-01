import { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import "./OurNetworkPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, sellers: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

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

export default function OurNetworkPage() {
  const [{ loading, error, sellers }, dispatch] = useReducer(reducer, {
    sellers: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/sellers/all");
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, []);

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="page-title mb-3">
          Our Network
        </h1>
        <p className="lead text-muted">
          Trusted suppliers, service providers, and manufacturer partnerships
        </p>
        <hr className="w-25 mx-auto" />
      </div>

      <Row className="mb-5">
        <Col lg={8} className="mx-auto text-center">
          <p className="fs-5 mb-4">
            Discover our comprehensive network of verified HVAC suppliers and
            service providers, along with our strategic partnerships with
            industry-leading manufacturers.
          </p>
          <p className="text-muted">
            From local experts to global brands, we connect you with the best in
            HVAC solutions.
          </p>
        </Col>
      </Row>

      {/* Sellers Section */}
      <div className="mb-5">
        <h2
          className="section-title text-center mb-4 "
          style={{
            background: "linear-gradient(135deg, #ff6b35 0%, #ff5722 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            borderBottom: "none"
          }}
        >
          Our Suppliers
        </h2>
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Row className="g-4">
            {sellers && sellers.length > 0 ? (
              sellers.map((seller, index) => (
                <Col lg={3} md={4} sm={12} key={index}>
                  <Card className="h-100 border-0 shadow-sm hover-lift">
                    <Card.Body className="text-center p-4">
                      <div className="mb-3" style={{ height: "60px" }}>
                        {seller.logo &&
                        seller.logo !== "undefined" &&
                        seller.logo !== "" &&
                        seller.logo.startsWith("/images/") ? (
                          <img
                            src={`${seller.logo}`}
                            alt={`${seller.name} logo`}
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
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center bg-light rounded"
                            style={{ height: "100%" }}
                          >
                            <i className="fas fa-building fa-2x text-muted"></i>
                          </div>
                        )}
                      </div>
                      <Link
                        to={`/sellers/${seller._id}`}
                        className="text-decoration-none"
                      >
                        <h5 className="card-title fw-bold mb-2 text-dark">
                          {seller.name}
                        </h5>
                      </Link>
                      <p className="text-muted small mb-3">
                        HVAC Supplier & Service Provider
                      </p>
                      <Link
                        to={`/sellers/${seller._id}`}
                        className="btn go-to-btn btn-text  btn-sm d-flex align-items-center gap-2"
                        style={{
                          borderRadius: "0.5rem", // slightly rounded
                          fontWeight: "500",
                          padding: "0.35rem 0.75rem",
                        }}
                      >
                        View Seller
                      </Link>
                    </Card.Body>
                  </Card>
                </Col>
              ))
            ) : (
              <Col xs={12}>
                <div className="text-center py-5">
                  <i className="fas fa-building fa-3x text-muted mb-3"></i>
                  <p className="text-muted">
                    No suppliers available at the moment.
                  </p>
                </div>
              </Col>
            )}
          </Row>
        )}
      </div>

      {/* Partners Section */}
      <div className="mb-5">
        <h2
          className="section-title text-center mb-4 "
          style={{
            background: "linear-gradient(135deg, #ff6b35 0%, #ff5722 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            borderBottom: "none"
          }}
        >
          Our Manufacturer Partners
        </h2>
        <Row className="g-4">
          {partners.map((partner, index) => (
            <Col lg={3} md={4} sm={12} key={index}>
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
                  <Badge Badge className="badge bg-primary">
                    {partner.partnership}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Combined Benefits Section */}
      <Row className="mt-5">
        <Col lg={10} className="mx-auto">
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body className="text-center p-5">
              <h3 className="mb-3">Why Choose Our Network?</h3>
              <Row className="g-4">
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-shield-alt fa-3x text-primary"></i>
                  </div>
                  <h5>Verified Quality</h5>
                  <p className="text-muted">
                    All partners and suppliers are verified and meet our quality
                    standards
                  </p>
                </Col>
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-tools fa-3x text-primary"></i>
                  </div>
                  <h5>Expert Service</h5>
                  <p className="text-muted">
                    Professional installation, maintenance, and technical
                    support
                  </p>
                </Col>
                <Col md={4}>
                  <div className="mb-3">
                    <i className="fas fa-handshake fa-3x text-primary"></i>
                  </div>
                  <h5>Comprehensive Solutions</h5>
                  <p className="text-muted">
                    From local service to global partnerships, we cover all your
                    HVAC needs
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="text-center mt-4">
        <Link to="/" className="home-btn">
          🏠 Home
        </Link>
      </div>
    </Container>
  );
}
