import { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Link } from "react-router-dom";
import { Row, Col, Card, Badge } from "react-bootstrap";
import {
  FaNetworkWired,
  FaShieldAlt,
  FaBuilding,
  FaIndustry,
  FaCertificate,
  FaGlobeAmericas,
} from "react-icons/fa";
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
    <div className="on-page">
      {/* Hero */}
      <div className="on-hero">
        <div className="on-hero__inner">
          <div className="on-hero__icon"><FaNetworkWired /></div>
          <h1 className="on-hero__title">Our Network</h1>
          <p className="on-hero__sub">
            Trusted suppliers, service providers, and manufacturer partnerships
            powering HVAC excellence across the region.
          </p>
          <div className="on-hero__badges">
            <span className="on-hero__badge"><FaCertificate /> Certified Partners</span>
            <span className="on-hero__badge"><FaGlobeAmericas /> Global Reach</span>
            <span className="on-hero__badge"><FaShieldAlt /> Quality Assured</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="on-stats">
        <div className="on-stats__item">
          <span className="on-stats__number">{sellers.length || '8+'}</span>
          <span className="on-stats__label">Industry Partners</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">10,000+</span>
          <span className="on-stats__label">Projects Completed</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">500+</span>
          <span className="on-stats__label">Service Providers</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">50,000+</span>
          <span className="on-stats__label">Active Users</span>
        </div>
      </div>

      <div className="on-inner">

      {/* Sellers Section */}
      <div className="mb-5">
        <div className="on-section-header">
          <FaBuilding className="on-section-header__icon" />
          <h2 className="on-section-header__title">Our Suppliers</h2>
          <p className="on-section-header__sub">Browse verified HVAC suppliers in our network</p>
        </div>
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
                        className="btn on-view-seller-btn btn-sm d-flex align-items-center gap-2"
                      >
                        View Seller
                        <i className="fas fa-arrow-right"></i>
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
        <div className="on-section-header">
          <FaIndustry className="on-section-header__icon" />
          <h2 className="on-section-header__title">Our Manufacturer Partners</h2>
          <p className="on-section-header__sub">World-class brands we collaborate with</p>
        </div>
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
                  <Badge className="on-partner-badge">
                    {partner.partnership}
                  </Badge>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Certifications & Benefits */}
      <div className="on-benefits">
        <h3 className="on-benefits__title">Why Choose Our Network?</h3>
        <Row className="g-4">
          <Col md={4}>
            <div className="on-benefits__card">
              <div className="on-benefits__emoji">🔒</div>
              <h5 className="on-benefits__heading">Enterprise Security</h5>
              <p className="on-benefits__text">ISO 27001 Certified</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="on-benefits__card">
              <div className="on-benefits__emoji">✅</div>
              <h5 className="on-benefits__heading">Industry Certified</h5>
              <p className="on-benefits__text">HVAC Standards Compliant</p>
            </div>
          </Col>
          <Col md={4}>
            <div className="on-benefits__card">
              <div className="on-benefits__emoji">⭐</div>
              <h5 className="on-benefits__heading">Top Rated</h5>
              <p className="on-benefits__text">4.8/5 Average Rating</p>
            </div>
          </Col>
        </Row>
      </div>

      <div className="on-home-row">
        <Link to="/" className="home-btn">
          🏠 Home
        </Link>
      </div>
      </div>
    </div>
  );
}
