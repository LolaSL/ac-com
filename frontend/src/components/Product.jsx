import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Rating from "./Rating.jsx";
import axios from "axios";
import { useContext, useState, useEffect } from "react";
import { Store } from "../Store.js";
import Image from "react-bootstrap/Image";
import { toast } from "react-toastify";

function Product(props) {
  const { product } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;

  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const checkWishlist = async () => {
      if (userInfo && product._id) {
        try {
          const { data } = await axios.get(
            `/api/wishlist/check/${product._id}`,
            {
              headers: { Authorization: `Bearer ${userInfo.token}` },
            }
          );
          setInWishlist(data.inWishlist);
        } catch (error) {
          console.error("Error checking wishlist:", error);
        }
      }
    };
    checkWishlist();
  }, [product._id, userInfo]);

  const addToCartHandler = async (item) => {
    const existItem = cartItems.find((x) => x._id === product._id);
    const quantity = existItem ? existItem.quantity + 1 : 1;
    const { data } = await axios.get(`/api/products/${item._id}`);
    if (data.countInStock < quantity) {
      window.alert("Sorry. Product is out of stock");
      return;
    }
    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...item, quantity },
    });
  };

  const toggleWishlistHandler = async (e) => {
    e.preventDefault();

    if (!userInfo) {
      toast.error("Please sign in to save products");
      return;
    }

    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await axios.delete(`/api/wishlist/${product._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await axios.post(
          "/api/wishlist",
          { productId: product._id },
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <Card className="h-100" style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Link to={`/product/${product.slug}`}>
          <Image
            src={product.image}
            className="responsive"
            alt={product.name}
          />
        </Link>
        <button
          onClick={toggleWishlistHandler}
          disabled={wishlistLoading}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "white",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "transform 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <i
            className={inWishlist ? "fas fa-heart" : "far fa-heart"}
            style={{
              color: inWishlist ? "#ff6b35" : "#6c757d",
              fontSize: "1.2rem",
            }}
          />
        </button>
      </div>

      <Card.Body>
        <Link
          to={`/product/${product.slug}`}
          className="card-link text-secondary"
        >
          <Card.Title>
            <strong>Product:</strong> {product.name}
          </Card.Title>

          <div className="mb-1">
            <span className="fs-5 fw-semibold">Brand: {product.brand}</span>
            {product.discount > 0 && (
              <span className="sale-badge ms-2">On Sale</span>
            )}
          </div>
        </Link>

        <Rating rating={product.rating} numReviews={product.numReviews} />

        <Card.Text className="mt-2">
          <span className={product.discount > 0 ? "original-price" : ""}>
            ${product.price.toFixed(2)}
          </span>

          {product.discount > 0 && (
            <>
              <span className="ms-2 discount-text fw-bold">
                Save {product.discount}%
              </span>
              <div className="discounted-price">
                ${((product.price * (100 - product.discount)) / 100).toFixed(2)}
              </div>
            </>
          )}
        </Card.Text>

        {product.countInStock === 0 ? (
          <Button className="btn-out-of-stock" variant="secondary" disabled>
            Out of stock
          </Button>
        ) : (
          <Button
            className="go-to-btn btn-text w-auto"
            onClick={() => addToCartHandler(product)}
          >
            Add to cart
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

export default Product;
