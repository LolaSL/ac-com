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
import { FaHeart } from "react-icons/fa";
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
    <div className="wl-page">
      <div className="wl-hero">
        <div className="wl-hero__inner">
          <div className="wl-hero__icon"><FaHeart /></div>
          <h1 className="wl-hero__title">My Wishlist</h1>
          <p className="wl-hero__sub">Products you&apos;ve saved for later.</p>
        </div>
      </div>
      <div className="wl-inner">

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : validWishlistItems.length === 0 ? (
        <div className="text-center py-5">
          <Button as={Link} to="/search" variant="primary" size="lg" className="go-to-btn btn-text w-auto fs-4">
            Your wish list is empty. Check new arrivals
          </Button>
        </div>
      ) : (
        <Row className="g-3 mx-0">
          {validWishlistItems.map((item) => (
            <Col key={item._id} xs={12} sm={6} md={4} lg={3} className="p-2">
              <Card className="h-100 wl-card">
                <div className="wl-card__img-wrap">
                  <Link to={`/product/${item.product.slug}`}>
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      className="wl-card__img"
                    />
                  </Link>
                  <button
                    onClick={() => removeFromWishlistHandler(item.product._id)}
                    className="wl-card__remove"
                  >
                    <i className="fas fa-heart wl-card__remove-icon" />
                  </button>
                  {item.product.discount > 0 && (
                    <span className="wl-card__discount">
                      {item.product.discount}% OFF
                    </span>
                  )}
                </div>

                <Card.Body className="d-flex flex-column wl-card__body">
                  <span className="wl-card__brand">{item.product.brand}</span>

                  <Link
                    to={`/product/${item.product.slug}`}
                    className="text-decoration-none"
                  >
                    <Card.Title className="wl-card__name">
                      {item.product.name}
                    </Card.Title>
                  </Link>

                  <div className="wl-card__rating">
                    <Rating
                      rating={item.product.rating}
                      numReviews={item.product.numReviews}
                    />
                  </div>

                  <div className="wl-card__price">
                    {item.product.discount > 0 ? (
                      <>
                        <span className="wl-card__price--old">
                          ${item.product.price.toFixed(2)}
                        </span>
                        <span className="wl-card__price--sale">
                          $
                          {(
                            (item.product.price *
                              (100 - item.product.discount)) /
                            100
                          ).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="wl-card__price--current">
                        ${item.product.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2">
                    {item.product.countInStock === 0 ? (
                      <Button variant="secondary" disabled className="w-100 wl-card__oos-btn">
                        Out of Stock
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => addToCartHandler(item.product)}
                        className="w-100 wl-view-product-btn"
                      >
                        View Product
                        <i className="fas fa-arrow-right ms-2"></i>
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
    </div>
  );
}
