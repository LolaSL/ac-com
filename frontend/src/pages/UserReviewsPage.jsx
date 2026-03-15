import React, {
  useContext,
  useEffect,
  useReducer,
  useState,
  useCallback,
} from "react";
import {
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
} from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { toast } from "react-toastify";
import "./UserReviewsPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        productReviews: action.payload.productReviews,
        sellerReviews: action.payload.sellerReviews,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

function UserReviewsPage() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const [actionLoading, setActionLoading] = useState(false);

  const [
    { loading, error, productReviews = [], sellerReviews = [] },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    productReviews: [],
    sellerReviews: [],
  });

  const fetchReviews = useCallback(async () => {
    try {
      dispatch({ type: "FETCH_REQUEST" });
      const { data } = await axios.get("/api/user-reviews", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "FETCH_FAIL", payload: getError(err) });
    }
  }, [userInfo?.token]); // depends only on userInfo.token

  useEffect(() => {
    if (userInfo) {
      fetchReviews();
    } else {
      navigate("/signin");
    }
  }, [userInfo, navigate, fetchReviews]);

  const undoToast = (message, onUndo) => {
    toast(
      ({ closeToast }) => (
        <div className="d-flex align-items-center justify-content-between undo-toast">
          <span>{message}</span>
          <Button
            size="sm"
            variant="link"
            onClick={async () => {
              await onUndo();
              closeToast();
            }}
          >
            Undo
          </Button>
        </div>
      ),
      { autoClose: 6000 }
    );
  };

  const deleteProductReview = async (productId) => {
    if (!window.confirm("Remove your review for this product?")) return;
    try {
      setActionLoading(true);
      await axios.delete(`/api/user-reviews/products/${productId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success("Product review removed");
      undoToast("Review removed.", async () => {
        await axios.post(
          `/api/user-reviews/products/${productId}/restore`,
          {},
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success("Review restored");
        await fetchReviews();
      });
      await fetchReviews();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSellerReview = async (sellerId) => {
    if (!window.confirm("Remove your review for this seller?")) return;
    try {
      setActionLoading(true);
      await axios.delete(`/api/user-reviews/sellers/${sellerId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success("Seller review removed");
      undoToast("Review removed.", async () => {
        await axios.post(
          `/api/user-reviews/sellers/${sellerId}/restore`,
          {},
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success("Review restored");
        await fetchReviews();
      });
      await fetchReviews();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const clearAllReviews = async () => {
    if (!window.confirm("This will remove all your reviews. Continue?")) return;
    try {
      setActionLoading(true);
      await axios.delete("/api/user-reviews/all", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast.success("All your reviews were removed");
      await fetchReviews();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="urv-page">
      <div className="urv-hero">
        <div className="urv-hero__inner">
          <div className="urv-hero__icon"><FaStar /></div>
          <h1 className="urv-hero__title">My Reviews</h1>
          <p className="urv-hero__sub">Manage your product and seller reviews.</p>
        </div>
      </div>
      <div className="urv-inner">
        <div className="d-flex justify-content-end align-items-center mb-4">
          <div>
          <Button
            variant="outline-danger"
            onClick={clearAllReviews}
            disabled={loading || actionLoading}
            className="urv-clear-btn"
          >
            Clear All My Reviews
          </Button>
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
      ) : (
        <Row>
          <Col md={6} className="mb-4">
            <h3 className="urv-section-title">Product Reviews</h3>
            {productReviews.length === 0 ? (
              <Alert variant="info">
                You haven't reviewed any products yet.
              </Alert>
            ) : (
              productReviews.map((r) => (
                <Card key={`${r.productId}-${r.createdAt}`} className="mb-3 urv-card">
                  <Card.Body className="urv-card__body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <Card.Title className="mb-1 urv-card__title">
                          <Link to={`/product/${r.productSlug}`} className="urv-card__link">
                            {r.productName}
                          </Link>
                        </Card.Title>
                        <div className="urv-card__date">
                          Reviewed on{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="urv-card__rating">{r.rating} ★</span>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => deleteProductReview(r.productId)}
                          disabled={actionLoading}
                          className="urv-remove-btn"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <Card.Text className="mt-2 urv-card__comment">{r.comment}</Card.Text>
                  </Card.Body>
                </Card>
              ))
            )}
          </Col>

          <Col md={6} className="mb-4">
            <h3 className="urv-section-title">Seller Reviews</h3>
            {sellerReviews.length === 0 ? (
              <Alert variant="info">
                You haven't reviewed any sellers yet.
              </Alert>
            ) : (
              sellerReviews.map((r, idx) => (
                <Card key={idx} className="mb-3 urv-card">
                  <Card.Body className="urv-card__body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <Card.Title className="mb-1 urv-card__title">{r.sellerName}</Card.Title>
                        <div className="urv-card__date">
                          Reviewed on{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="urv-card__rating urv-card__rating--seller">{r.rating} ★</span>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => deleteSellerReview(r.sellerId)}
                          disabled={actionLoading}
                          className="urv-remove-btn"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <Card.Text className="mt-2 urv-card__comment">{r.comment}</Card.Text>
                  </Card.Body>
                </Card>
              ))
            )}
          </Col>
        </Row>
      )}
      </div>
    </div>
  );
}

export default UserReviewsPage;
