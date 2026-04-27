import React, { useReducer, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Pagination from "react-bootstrap/Pagination";
import Product from "../components/Product.jsx";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./FeaturedPage.css";
import { FaGem } from "react-icons/fa";

const PRODUCTS_PER_PAGE = 12;

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
  const rawPage = Number(searchParams.get("page") || 1);
  const currentPage = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

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

        // Featured products on this page are limited to discounted items.
        const featuredProducts = data
          .filter((product) => product.discount > 0);

        dispatch({ type: "FETCH_SUCCESS", payload: featuredProducts });
      } catch (err) {
        console.error("Error fetching products:", err.message);
        dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };

    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = products.slice(
    (safeCurrentPage - 1) * PRODUCTS_PER_PAGE,
    safeCurrentPage * PRODUCTS_PER_PAGE
  );

  return (
    <div className="featured-page">
      {/* Full-Bleed Hero */}
      <section className="fp-hero">
        <div className="fp-hero__inner">
          <FaGem className="fp-hero__icon" />
          <h1 className="fp-hero__title">Featured Products</h1>
          <p className="fp-hero__sub">
            Discover our discounted air conditioning units and special offers
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
            <>
              <div className="fp-results-meta">
                Showing {paginatedProducts.length} of {products.length} featured products
              </div>
              <Row className="g-3 mx-0">
                {paginatedProducts.map((product) => (
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
              {totalPages > 1 && (
                <Pagination className="fp-pagination justify-content-center mt-4">
                  <Pagination.Prev
                    as={Link}
                    to={safeCurrentPage > 2 ? `/products?page=${safeCurrentPage - 1}` : "/products"}
                    disabled={safeCurrentPage === 1}
                  />
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <Pagination.Item
                      key={page}
                      as={Link}
                      to={page === 1 ? "/products" : `/products?page=${page}`}
                      active={page === safeCurrentPage}
                    >
                      {page}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    as={Link}
                    to={`/products?page=${safeCurrentPage + 1}`}
                    disabled={safeCurrentPage === totalPages}
                  />
                </Pagination>
              )}
            </>
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
