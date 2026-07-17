import React from "react";
import "./Rating.css";

export default function Rating(props) {
  const { rating, numReviews, caption } = props;

  // Empty-state rule: only apply the "No reviews yet" placeholder when we're
  // rendering an actual product rating (no caption + no reviews).
  // If a `caption` is passed (e.g., search-page filter "& up" thresholds,
  // or explicit labels), always render the stars for the given rating —
  // those are threshold indicators, not real ratings.
  const isThresholdOrLabeled = caption != null && caption !== "";
  const hasReviews = Number(numReviews) > 0 && Number(rating) > 0;
  if (!isThresholdOrLabeled && !hasReviews) {
    return (
      <div className="rating rating--empty">
        <span className="rating-text rating-empty-text">
          No reviews yet — be the first to review
        </span>
      </div>
    );
  }

  return (
    <div className="rating">
      <span>
        <i
          className={
            rating >= 1
              ? "fa fa-star"
              : rating >= 0.5
              ? "fa fa-star-half-o"
              : "fa fa-star-o"
          }
        ></i>
      </span>
      <span>
        <i
          className={
            rating >= 2
              ? "fa fa-star"
              : rating >= 1.5
              ? "fa fa-star-half-o"
              : "fa fa-star-o"
          }
        ></i>
      </span>
      <span>
        <i
          className={
            rating >= 3
              ? "fa fa-star"
              : rating >= 2.5
              ? "fa fa-star-half-o"
              : "fa fa-star-o"
          }
        ></i>
      </span>
      <span>
        <i
          className={
            rating >= 4
              ? "fa fa-star"
              : rating >= 3.5
              ? "fa fa-star-half-o"
              : "fa fa-star-o"
          }
        ></i>
      </span>
      <span>
        <i
          className={
            rating >= 5
              ? "fa fa-star"
              : rating >= 4.5
              ? "fa fa-star-half-o"
              : "fa fa-star-o"
          }
        ></i>
      </span>
      {caption ? (
        <span className="rating-text">{caption}</span>
      ) : numReviews ? (
        <span className="rating-text">{" " + numReviews + " reviews"}</span>
      ) : (
        ""
      )}
    </div>
  );
}
