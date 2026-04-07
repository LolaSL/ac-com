import React, { useReducer, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Product from "../components/Product.jsx";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./FeaturedPage.css";
import { FaGem } from "react-icons/fa";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, products: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const FeaturedPage = () => {
  const [searchParams] = useSearchParams();
  const [{ loading, error, products }, dispatch] = useReducer(reducer, {
    products: [],
    loading: true,
    error: "",
  });

  // Capture referral code from URL into localStorage so SignUpPage can use it
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("referralCode", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/products");

        // Filter for featured products: high ratings, discounts, or in stock
        const featuredProducts = data
          .filter(
            (product) =>
              product.discount > 0 ||
              product.rating >= 4.5 ||
              (product.countInStock > 0 && product.rating >= 4.0)
          )
          .slice(0, 12); // Limit to 12 featured products

        dispatch({ type: "FETCH_SUCCESS", payload: featuredProducts });
      } catch (err) {
        console.error("Error fetching products:", err.message);
        dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };

    fetchData();
  }, []);

  return (
    <div className="featured-page">
      {/* Full-Bleed Hero */}
      <section className="fp-hero">
        <div className="fp-hero__inner">
          <FaGem className="fp-hero__icon" />
          <h1 className="fp-hero__title">Featured Products</h1>
          <p className="fp-hero__sub">
            Discover our top-rated and special offer air conditioning units
          </p>
        </div>
      </section>

      {/* Content Wrapper */}
      <div className="fp-content">
        <div className="featured-products-container">
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : products.length ? (
            <Row className="g-3 mx-0">
              {products.map((product) => (
                <Col
                  key={product.slug}
                  xs={12}
                  sm={6}
                  md={4}
                  lg={3}
                  className="p-2"
                >
                  <Product product={product} />
                </Col>
              ))}
            </Row>
          ) : (
            <MessageBox variant="info">
              No featured products available at the moment. Check back soon!
            </MessageBox>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedPage;
