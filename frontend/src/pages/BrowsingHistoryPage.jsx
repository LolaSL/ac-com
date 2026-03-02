import React, { useContext, useEffect, useReducer, useState } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
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
            className="me-2"
          >
            <FaArrowDown className="me-1" />
            {filterPriceDrops ? "Show All" : "Price Drops Only"}
          </Button>
          {browsingHistory.length > 0 && (
            <Button variant="outline-danger" onClick={clearAllHistory}>
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
              <Card className="h-100 shadow-sm position-relative">
                {item.priceDropped && (
                  <Badge
                    bg="success"
                    className="position-absolute top-0 end-0 m-2"
                    style={{ zIndex: 1 }}
                  >
                    <FaArrowDown className="me-1" />
                    {calculateDiscount(item.priceAtView, item.currentPrice)}%
                    OFF
                  </Badge>
                )}

                <Link to={`/product/${item.product?.slug}`}>
                  <Card.Img
                    variant="top"
                    src={item.product?.image}
                    alt={item.product?.name}
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                </Link>

                <Card.Body className="d-flex flex-column">
                  <Link
                    to={`/product/${item.product?.slug}`}
                    className="text-decoration-none text-dark"
                  >
                    <Card.Title className="fs-6" style={{ minHeight: "48px" }}>
                      {item.product?.name}
                    </Card.Title>
                  </Link>

                  <div className="mt-auto">
                    <div className="mb-2">
                      <small className="text-muted">
                        <FaClock className="me-1" />
                        Viewed {formatDate(item.viewedAt)}
                      </small>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        {/* Show price drop or discount visually */}
                        {item.product && item.product.discount > 0 ? (
                          <>
                            <div className="text-muted text-decoration-line-through small">
                              ${item.product.price.toFixed(2)}
                            </div>
                            <div className="fw-bold text-success fs-5">
                              $
                              {(
                                (item.product.price *
                                  (100 - item.product.discount)) /
                                100
                              ).toFixed(2)}
                            </div>
                            <span className="ms-2 discount-text fw-bold text-danger">
                              Save {item.product.discount}%
                            </span>
                          </>
                        ) : item.priceAtView > item.currentPrice ? (
                          <>
                            <div className="text-muted text-decoration-line-through small">
                              ${item.priceAtView.toFixed(2)}
                            </div>
                            <div className="fw-bold text-success fs-5">
                              ${item.currentPrice.toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <div className="fw-bold fs-5">
                            ${item.currentPrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        as={Link}
                        to={`/product/${item.product?.slug}`}
                        className="flex-grow-1"
                      >
                        View Product
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => deleteHandler(item._id)}
                        disabled={loadingDelete}
                      >
                        <FaTrash />
                      </Button>
                    </div>
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
