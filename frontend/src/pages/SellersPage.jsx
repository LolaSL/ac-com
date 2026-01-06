import { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card } from "react-bootstrap";

const reducer = (state, action) => {
  switch (action.type) {
    case "REFRESH_PRODUCT":
      return { ...state, sellers: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreateReview: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreateReview: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreateReview: false };
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

export default function SellersPage() {
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
        <h1 className="display-4 fw-bold text-primary mb-3">Our Suppliers</h1>
        <p className="lead text-muted">
          Trusted HVAC suppliers and service providers
        </p>
        <hr className="w-25 mx-auto" />
      </div>

      <Row className="mb-5">
        <Col lg={8} className="mx-auto text-center">
          <p className="fs-5 mb-4">
            Connect with certified HVAC suppliers and service providers offering
            premium air conditioning products, installation services, and
            maintenance solutions.
          </p>
          <p className="text-muted">
            Our verified network ensures quality products and professional
            service for all your HVAC needs.
          </p>
        </Col>
      </Row>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          <Row className="g-4">
            {sellers && sellers.length > 0 ? (
              sellers.map((seller, index) => (
                <Col lg={3} md={4} sm={6} key={index}>
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
                        className="btn go-to-btn btn-sm btn-text"
                      >
                        View Profile
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

          <Row className="mt-5">
            <Col lg={10} className="mx-auto">
              <Card className="border-0 shadow-sm bg-light">
                <Card.Body className="text-center p-5">
                  <h3 className="mb-3">Why Choose Our Suppliers?</h3>
                  <Row className="g-4">
                    <Col md={4}>
                      <div className="mb-3">
                        <i className="fas fa-shield-alt fa-3x text-primary"></i>
                      </div>
                      <h5>Verified Quality</h5>
                      <p className="text-muted">
                        All suppliers are verified and meet our quality
                        standards
                      </p>
                    </Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <i className="fas fa-tools fa-3x text-primary"></i>
                      </div>
                      <h5>Expert Service</h5>
                      <p className="text-muted">
                        Professional installation and maintenance services
                      </p>
                    </Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <i className="fas fa-handshake fa-3x text-primary"></i>
                      </div>
                      <h5>Reliable Support</h5>
                      <p className="text-muted">
                        Ongoing support and warranty coverage for all products
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <div className="text-center mt-4">
        <Link to="/" className="btn btn go-to-btn btn-sm btn-text">
          Back to Home
        </Link>
      </div>
    </Container>
  );
}
