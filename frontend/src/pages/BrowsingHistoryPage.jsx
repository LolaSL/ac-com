import React, { useContext, useEffect, useReducer, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { FaTrash, FaArrowDown, FaEye, FaClock } from "react-icons/fa";
import { toast } from "react-toastify";
import "./BrowsingHistoryPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        browsingHistory: action.payload.browsingHistory,
        page: action.payload.page,
        pages: action.payload.pages,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true };
    case "DELETE_SUCCESS":
      return { ...state, loadingDelete: false };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    default:
      return state;
  }
};

function BrowsingHistoryPage() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, browsingHistory, loadingDelete }, dispatch] =
    useReducer(reducer, {
      browsingHistory: [],
      loading: true,
      error: "",
    });

  const [filterPriceDrops, setFilterPriceDrops] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get("/api/browsing-history", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (userInfo) {
      fetchHistory();
    } else {
      navigate("/signin");
    }
  }, [userInfo, navigate]);

  const deleteHandler = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to remove this item from your browsing history?"
      )
    ) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/browsing-history/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "DELETE_SUCCESS" });
        toast.success("Item removed from history");
        // Refresh the list
        const { data } = await axios.get("/api/browsing-history", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  const clearAllHistory = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all your browsing history?"
      )
    ) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete("/api/browsing-history", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "DELETE_SUCCESS" });
        toast.success("Browsing history cleared");
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { browsingHistory: [], page: 1, pages: 1 },
        });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const calculateDiscount = (originalPrice, currentPrice) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  // Show only products with a price drop or a discount if filter is enabled
  const filteredHistory = filterPriceDrops
    ? browsingHistory.filter(
        (item) =>
          item.product &&
          (item.priceAtView > item.currentPrice ||
            (item.product && item.product.discount > 0))
      )
    : browsingHistory.filter((item) => item.product);

  return (
    <div className="bh-page">
      <div className="bh-hero">
        <div className="bh-hero__inner">
          <div className="bh-hero__icon"><FaEye /></div>
          <h1 className="bh-hero__title">Browsing History</h1>
          <p className="bh-hero__sub">Products you&apos;ve recently viewed.</p>
        </div>
      </div>
      <div className="bh-inner">
        <div className="d-flex justify-content-end align-items-center mb-4">
          <div>
          <Button
            variant={filterPriceDrops ? "primary" : "outline-primary"}
            onClick={() => setFilterPriceDrops(!filterPriceDrops)}
            className="me-2 bh-filter-btn"
          >
            <FaArrowDown className="me-1" />
            {filterPriceDrops ? "Show All" : "Price Drops Only"}
          </Button>
          {browsingHistory.length > 0 && (
            <Button variant="outline-danger" onClick={clearAllHistory} className="bh-clear-btn">
              <FaTrash className="me-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : filteredHistory.length === 0 ? (
        <Alert variant="info">
          {filterPriceDrops
            ? "No price drops found in your browsing history."
            : "Your browsing history is empty. Start exploring products!"}
        </Alert>
      ) : (
        <Row className="g-3 mx-0">
          {filteredHistory.map((item) => (
            <Col key={item._id} xs={12} sm={6} md={4} lg={3} className="p-2">
              <Card className="h-100 bh-card">
                <div className="bh-card__img-wrap">
                  <Link to={`/product/${item.product?.slug}`}>
                    <Card.Img
                      variant="top"
                      src={item.product?.image}
                      alt={item.product?.name}
                      className="bh-card__img"
                    />
                  </Link>
                  <button
                    onClick={() => deleteHandler(item._id)}
                    disabled={loadingDelete}
                    className="bh-card__remove"
                  >
                    <FaTrash className="bh-card__remove-icon" />
                  </button>
                  {item.priceDropped && (
                    <span className="bh-card__discount">
                      <FaArrowDown className="me-1" />
                      {calculateDiscount(item.priceAtView, item.currentPrice)}%
                      OFF
                    </span>
                  )}
                  {item.product && item.product.discount > 0 && !item.priceDropped && (
                    <span className="bh-card__discount">
                      {item.product.discount}% OFF
                    </span>
                  )}
                </div>

                <Card.Body className="d-flex flex-column bh-card__body">
                  <span className="bh-card__brand">{item.product?.brand}</span>

                  <Link
                    to={`/product/${item.product?.slug}`}
                    className="text-decoration-none"
                  >
                    <Card.Title className="bh-card__name">
                      {item.product?.name}
                    </Card.Title>
                  </Link>

                  <div className="bh-card__viewed">
                    <FaClock className="me-1" />
                    Viewed {formatDate(item.viewedAt)}
                  </div>

                  <div className="bh-card__price">
                    {item.product && item.product.discount > 0 ? (
                      <>
                        <span className="bh-card__price--old">
                          ${item.product.price.toFixed(2)}
                        </span>
                        <span className="bh-card__price--sale">
                          $
                          {(
                            (item.product.price *
                              (100 - item.product.discount)) /
                            100
                          ).toFixed(2)}
                        </span>
                      </>
                    ) : item.priceAtView > item.currentPrice ? (
                      <>
                        <span className="bh-card__price--old">
                          ${item.priceAtView.toFixed(2)}
                        </span>
                        <span className="bh-card__price--sale">
                          ${item.currentPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="bh-card__price--current">
                        ${item.currentPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2">
                    <Button
                      variant="primary"
                      as={Link}
                      to={`/product/${item.product?.slug}`}
                      className="w-100 bh-view-product-btn"
                    >
                      View Product
                      <i className="fas fa-arrow-right ms-2"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      </div>
    </div>
  );
}

export default BrowsingHistoryPage;
