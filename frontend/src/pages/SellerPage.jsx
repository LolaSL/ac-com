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
import Button from "react-bootstrap/Button";
import "./SellerPage.css";

const buildTrackedCompanyUrl = (companyLink, campaignId) => {
  try {
    const url = new URL(companyLink);
    url.searchParams.set("utm_source", "accommerce");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", campaignId || "seller");
    return url.toString();
  } catch {
    return companyLink;
  }
};

const trackSellerClick = (sellerId, userId) => {
  const endpoint = `/api/sellers/${sellerId}/track-click`;
  const payload = JSON.stringify({ userId: userId || null });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // fire-and-forget
  });
};

const toEmbedUrl = (url) => {
  try {
    const u = new URL(url);
    // Standard watch URL: youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    // Short URL: youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    // Already an embed URL or other — use as-is
    return url;
  } catch {
    return url;
  }
};

const shouldOpenExternalInSameTab = () => {  const ua = navigator.userAgent || "";
  const iOSDevice = /iPhone|iPad|iPod/i.test(ua);
  const iPadOSDesktopUA =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOSDesktopUA;
};

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

  const trackedCompanyLink = seller?.companyLink
    ? buildTrackedCompanyUrl(seller.companyLink, seller.referralCode || seller._id)
    : "";
  const openExternalInSameTab = shouldOpenExternalInSameTab();

  const handleCompanyLinkClick = () => {
    if (!seller?._id) return;
    trackSellerClick(seller._id, userInfo?._id);
  };

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
                      href={trackedCompanyLink}
                      onClick={handleCompanyLinkClick}
                      target={openExternalInSameTab ? "_self" : "_blank"}
                      rel={openExternalInSameTab ? undefined : "noopener noreferrer"}
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
          {seller.link && (() => {
            const embedUrl = toEmbedUrl(seller.link);
            const videoId = embedUrl.match(/embed\/([^?]+)/)?.[1];
            const thumbUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : null;
            const watchUrl = videoId
              ? `https://www.youtube.com/watch?v=${videoId}`
              : seller.link;
            return (
              <div className="sp-section sp-video-section">
                <h2 className="sp-section__title">📹 Product Video</h2>
                {thumbUrl ? (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sp-video-thumb-link"
                    aria-label="Watch video on YouTube"
                  >
                    <div className="sp-video-thumb-wrap">
                      <img
                        src={thumbUrl}
                        alt={`${seller.name} product video`}
                        className="sp-video-thumb"
                      />
                      <span className="sp-video-play-btn" aria-hidden="true">▶</span>
                    </div>
                    <p className="sp-video-cta">▶ Watch on YouTube</p>
                  </a>
                ) : (
                  <div className="sp-iframe-wrap">
                    <iframe
                      src={embedUrl}
                      title={`${seller.name} Product Video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            );
          })()}

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
                    <option value="1">⭐ Poor</option>
                    <option value="2">⭐⭐ Fair</option>
                    <option value="3">⭐⭐⭐ Good</option>
                    <option value="4">⭐⭐⭐⭐ Very Good</option>
                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                  </Form.Control>
                </Form.Group>
                <Form.Group className="mb-3" controlId="comment">
                  <Form.Label className="sp-form-label">Your Comment</Form.Label>
                  <Form.Control
                    as="textarea"
                    placeholder="Share your experience... 😊"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onInput={(e) => setComment(e.target.value)}
                    style={{ minHeight: "120px" }}
                  />
                </Form.Group>
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
