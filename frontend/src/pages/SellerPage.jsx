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
import ListGroup from "react-bootstrap/ListGroup";
import Form from "react-bootstrap/Form";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Button from "react-bootstrap/Button";

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
      seller: [],
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
    <div>
      <h1 className="mt-4 mb-4 p-4">Seller Details</h1>
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          <div className="seller">
            <div className="logo-container p-4">
              <img
                src={`${seller.logo}`}
                alt={`${seller.name} logo`}
                className="seller-logo"
              />
            </div>
            <h2 className="p-4">{seller.name}</h2>
            <p>Brand: {seller.brand}</p>
            <p>
              Company website:{" "}
              <a
                href={seller.companyLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit {seller.name}'s Website
              </a>
            </p>
            <p>Information: {seller.info}</p>
          </div>
          <div className="iframe-container">
            <p>
              <strong>VIDEO:</strong>
            </p>
            <iframe
              className="rounded"
              src={seller.link}
              title={`${seller.name} Product Video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
          <div>
            <h2 className="mt-2 mb-2 p-2" ref={reviewsRef}>
              Reviews
            </h2>
            <ListGroup>
              {seller.reviews.map((review) => (
                <ListGroup.Item key={review._id}>
                  <strong>{review.name}</strong>
                  <Rating rating={review.rating} caption=" "></Rating>
                  <p>{review.createdAt.substring(0, 10)}</p>
                  <p>{review.comment}</p>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <div>
              {userInfo ? (
                <form onSubmit={submitHandler}>
                  <h2 className="mt-2 mb-2 p-2">Write a customer review</h2>
                  <Form.Group className="mb-3" controlId="rating">
                    <Form.Label>Rating</Form.Label>
                    <Form.Control
                      as="select"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="1">1- Poor</option>
                      <option value="2">2- Fair</option>
                      <option value="3">3- Good</option>
                      <option value="4">4- Very good</option>
                      <option value="5">5- Excellent</option>
                    </Form.Control>
                  </Form.Group>
                  <FloatingLabel
                    controlId="floatingTextarea"
                    label="Comments"
                    className="mb-3"
                  >
                    <Form.Control
                      as="textarea"
                      placeholder="Leave a comment here"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </FloatingLabel>
                  <div className="mb-3">
                    <Button
                      disabled={loadingCreateReview}
                      className="btn btn-secondary"
                      type="submit"
                    >
                      Submit
                    </Button>
                    {loadingCreateReview && <LoadingBox />}
                  </div>
                </form>
              ) : (
                <MessageBox>
                  Please{" "}
                  <Link to={`/signin?redirect=/seller/${id}`}>Sign In</Link> to
                  write a review
                </MessageBox>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
