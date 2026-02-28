import React, { useReducer, useEffect } from "react";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Product from "../components/Product.jsx";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./FeaturedPage.css";

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
    <div className="featured-page-wrapper">
      <article className="py-4 mb-4">
        <h1 className="featured-title ">Featured Products</h1>
        <h3 className="py-2 mb-2 featured-products text-center fs-4">
          Discover our top-rated and special offer air conditioning units
        </h3>
      </article>
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
  );
};

export default FeaturedPage;
