import React, { useReducer, useEffect } from "react";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Product from "../components/Product.jsx";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Link } from "react-router-dom";

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
  const [{ loading, error, products }, dispatch] = useReducer(reducer, {
    products: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/products");
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        console.error("Error fetching products:", err.message);
        dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <article className="py-4 mb-4">
        <h1 className="featured-title text-center pt-4 mb-4 fw-bold">
          Featured Products
        </h1>
        <h3 className="py-2 mb-2 featured-products text-center">
          Introducing our latest line of air conditioning units
        </h3>
      </article>
      <div className="products">
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : products.length ? (
          <Row className="gy-4">
            {products.map((product) => (
              <Col
                key={product.slug}
                xs={12}
                md={4}
                lg={3}
                className="product-item"
              >
                <div className="product-card">
                  <Product product={product} />
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <MessageBox variant="info">
            No products match the selected offer.
          </MessageBox>
        )}
      </div>
      <div className="mt-4 mb-4 text-center">
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default FeaturedPage;
