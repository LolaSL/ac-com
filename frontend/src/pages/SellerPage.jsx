import React, {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Rating from "../components/Rating";
import { Store } from "../Store";
import Form from "react-bootstrap/Form";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Button from "react-bootstrap/Button";
import "./SellerPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, seller: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreateReview: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreateReview: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreateReview: false };
    default:
      return state;
  }
};

export default function SellerPage() {
  const { id } = useParams();
  const reviewsRef = useRef();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [{ loading, error, seller, loadingCreateReview }, dispatch] =
    useReducer(reducer, {
      seller: { reviews: [] },
      loading: true,
      error: "",
    });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get(`/api/sellers/${id}`);
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [id]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!comment || !rating) {
      toast.error("Please enter comment and rating");
      return;
    }
    try {
      const { data } = await axios.post(
        `/api/sellers/${id}/reviews`,
        { rating, comment, name: userInfo.name },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );

      dispatch({
        type: "CREATE_SUCCESS",
      });
      toast.success("Review submitted successfully");
      seller.reviews.unshift(data.review);
      seller.numReviews = data.numReviews;
      seller.rating = data.rating;
      dispatch({ type: "FETCH_SUCCESS", payload: seller });
      window.scrollTo({
        behavior: "smooth",
        top: reviewsRef.current.offsetTop,
      });
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: "CREATE_FAIL" });
    }
  };

  return (
    <div className="seller-page">
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          {/* ── Hero Card ── */}
          <div className="sp-hero">
            <div className="sp-hero__banner" />
            <div className="sp-hero__body">
              <div className="sp-hero__logo-wrap">
                <img
                  src={seller.logo}
                  alt={seller.name}
                  className="sp-hero__logo"
                />
              </div>
              <div className="sp-hero__info">
                <h1 className="sp-hero__name">{seller.name || "Seller Name"}</h1>
                {seller.brand && (
                  <span className="sp-hero__badge">{seller.brand}</span>
                )}
                <p className="sp-hero__desc">
                  {seller.info || "No additional information available."}
                </p>
                <div className="sp-hero__meta">
                  {seller.companyLink ? (
                    <a
                      href={seller.companyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sp-hero__link"
                    >
                      🌐 Visit Website
                    </a>
                  ) : (
                    <span className="sp-hero__link sp-hero__link--disabled">
                      🌐 Website not available
                    </span>
                  )}
                  {seller.rating > 0 && (
                    <span className="sp-hero__rating-pill">
                      ★ {Number(seller.rating).toFixed(1)} &nbsp;·&nbsp; {seller.numReviews} review{seller.numReviews !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Video ── */}
          {seller.link && (
            <div className="sp-section sp-video-section">
              <h2 className="sp-section__title">📹 Product Video</h2>
              <div className="sp-iframe-wrap">
                <iframe
                  src={seller.link}
                  title={`${seller.name} Product Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          <div className="sp-section" ref={reviewsRef}>
            <h2 className="sp-section__title">⭐ Customer Reviews</h2>
            {seller.reviews && seller.reviews.length > 0 ? (
              <div className="sp-reviews-list">
                {seller.reviews.map((review) => (
                  <div className="sp-review-card" key={review._id}>
                    <div className="sp-review-card__header">
                      <span className="sp-review-card__name">{review.name}</span>
                      <span className="sp-review-card__date">
                        {review.createdAt.substring(0, 10)}
                      </span>
                    </div>
                    <Rating rating={review.rating} caption=" " />
                    <p className="sp-review-card__comment">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sp-no-reviews">
                <span className="sp-no-reviews__icon">💬</span>
                <p>No reviews yet. Be the first to share your experience!</p>
                {!userInfo && (
                  <MessageBox className="mt-3">
                    Please{" "}
                    <Link to={`/signin?redirect=/sellers/${id}`}>Sign In</Link>{" "}
                    to write a review
                  </MessageBox>
                )}
              </div>
            )}
          </div>

          {/* ── Write Review ── */}
          {userInfo ? (
            <div className="sp-section sp-review-form-section">
              <h2 className="sp-section__title">✍️ Write a Review</h2>
              <form onSubmit={submitHandler} className="sp-review-form">
                <Form.Group className="mb-3" controlId="rating">
                  <Form.Label className="sp-form-label">Your Rating</Form.Label>
                  <Form.Control
                    as="select"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="sp-select"
                  >
                    <option value="">Select a rating…</option>
                    <option value="1">⭐ 1 – Poor</option>
                    <option value="2">⭐⭐ 2 – Fair</option>
                    <option value="3">⭐⭐⭐ 3 – Good</option>
                    <option value="4">⭐⭐⭐⭐ 4 – Very Good</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 – Excellent</option>
                  </Form.Control>
                </Form.Group>
                <FloatingLabel controlId="floatingTextarea" label="Your comment" className="mb-3">
                  <Form.Control
                    as="textarea"
                    placeholder="Leave a comment here"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ minHeight: "120px" }}
                  />
                </FloatingLabel>
                <Button
                  disabled={loadingCreateReview}
                  className="sp-submit-btn"
                  type="submit"
                >
                  {loadingCreateReview ? "Submitting…" : "Submit Review"}
                </Button>
                {loadingCreateReview && <LoadingBox />}
              </form>
            </div>
          ) : seller.reviews && seller.reviews.length > 0 ? (
            <div className="sp-section">
              <MessageBox>
                Please{" "}
                <Link to={`/signin?redirect=/sellers/${id}`}>Sign In</Link> to
                write a review
              </MessageBox>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
