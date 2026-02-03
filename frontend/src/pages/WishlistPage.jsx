import { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import { toast } from "react-toastify";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Rating from "../components/Rating";
import "./WishlistPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, wishlistItems: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "REMOVE_ITEM":
      return {
        ...state,
        wishlistItems: state.wishlistItems.filter(
          (item) => item.product && item.product._id !== action.payload
        ),
      };
    default:
      return state;
  }
};

export default function WishlistPage() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, wishlistItems }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
    wishlistItems: [],
  });

  // Only items with a valid product
  const validWishlistItems = wishlistItems.filter((item) => item.product);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get("/api/wishlist", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (error) {
        dispatch({
          type: "FETCH_FAIL",
          payload: error.response?.data?.message || "Failed to fetch wishlist",
        });
      }
    };

    if (userInfo) {
      fetchWishlist();
    } else {
      navigate("/signin?redirect=/wishlist");
    }
  }, [userInfo, navigate]);

  const removeFromWishlistHandler = async (productId) => {
    try {
      await axios.delete(`/api/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "REMOVE_ITEM", payload: productId });
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error("Failed to remove item from wishlist");
    }
  };

  const addToCartHandler = async (product) => {
    const { data } = await axios.get(`/api/products/${product._id}`);
    if (data.countInStock < 1) {
      toast.error("Sorry. Product is out of stock");
      return;
    }
    navigate(`/product/${product.slug}`);
  };

  return (
    <div className="container my-5">
      <h1 className="mb-4 fs-1">
        <i className="fas fa-heart me-2 heart-icon"></i>
        My Wishlist
      </h1>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : wishlistItems.length === 0 ? (
        <MessageBox>
          Your wishlist is empty. <Link to="/search">Continue Shopping</Link>
        </MessageBox>
      ) : (
        <Row className="g-3 mx-0">
          {validWishlistItems.map((item) => (
            <Col key={item._id} xs={12} sm={6} md={4} lg={3} className="p-2">
              <Card className="h-100">
                <div className="wishlist-card-relative">
                  <Link to={`/product/${item.product.slug}`}>
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      className="card-img-top wishlist-card-img"
                    />
                  </Link>
                  <button
                    onClick={() => removeFromWishlistHandler(item.product._id)}
                    className="remove-wishlist-btn"
                  >
                    <i className="fas fa-heart remove-wishlist-icon" />
                  </button>
                </div>

                <Card.Body className="d-flex flex-column">
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="text-decoration-none text-dark"
                  >
                    <Card.Title className="fs-6">
                      {item.product.name}
                    </Card.Title>
                  </Link>

                  <div className="mb-2">
                    <span className="fw-semibold">{item.product.brand}</span>
                    {item.product.discount > 0 && (
                      <span className="badge bg-danger ms-2">
                        {item.product.discount}% OFF
                      </span>
                    )}
                  </div>

                  <Rating
                    rating={item.product.rating}
                    numReviews={item.product.numReviews}
                  />

                  <div className="mt-2 mb-3">
                    {item.product.discount > 0 ? (
                      <>
                        <span className="text-decoration-line-through text-muted me-2">
                          ${item.product.price.toFixed(2)}
                        </span>
                        <span className="fw-bold text-danger fs-5">
                          $
                          {(
                            (item.product.price *
                              (100 - item.product.discount)) /
                            100
                          ).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="fw-bold fs-5">
                        ${item.product.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto">
                    {item.product.countInStock === 0 ? (
                      <Button variant="secondary" disabled className="w-100">
                        Out of Stock
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => addToCartHandler(item.product)}
                        className="w-100"
                      >
                        View Product
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {validWishlistItems.length > 0 && (
        <div className="mt-4">
          <p className="text-muted">
            <i className="fas fa-info-circle me-2"></i>
            You have {validWishlistItems.length} product
            {validWishlistItems.length !== 1 ? "s" : ""} in your wishlist
          </p>
        </div>
      )}
    </div>
  );
}
