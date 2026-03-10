import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import Rating from "./Rating.jsx";
import axios from "axios";
import { useContext, useState, useEffect, memo, useCallback } from "react";
import { Store } from "../Store.js";
import Image from "react-bootstrap/Image";
import { toast } from "react-toastify";
import Spinner from "react-bootstrap/Spinner";
import "./Product.css";

// Unified regex for condenser/VRF detection
const CONDENSER_REGEX =
  /\b(?:vrf(?:\s+system)?|condens(?:er|ing)|outdoor unit|outdoor|heat recovery|heat pump)\b/i;

const Product = memo(({ product }) => {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;

  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkWishlist = async () => {
      if (userInfo && product._id) {
        try {
          const { data } = await axios.get(
            `/api/wishlist/check/${product._id}`,
            {
              headers: { Authorization: `Bearer ${userInfo.token}` },
            }
          );
          if (isMounted) {
            setInWishlist(data.inWishlist);
          }
        } catch (error) {
          if (isMounted && error.response?.status !== 401) {
            console.error("Error checking wishlist:", error);
          }
        }
      }
    };
    checkWishlist();
    return () => {
      isMounted = false;
    };
  }, [product._id, userInfo]);

  const addToCartHandler = useCallback(
    async (item) => {
      if (addingToCart) return;

      try {
        setAddingToCart(true);
        const existItem = cartItems.find((x) => x._id === product._id);
        const quantity = existItem ? existItem.quantity + 1 : 1;

        const { data } = await axios.get(`/api/products/${item._id}`);

        if (!data.countInStock || data.countInStock < quantity) {
          toast.error("Sorry. Product is out of stock");
          return;
        }

        ctxDispatch({
          type: "CART_ADD_ITEM",
          payload: { ...item, quantity },
        });

        toast.success(`${item.name} added to cart!`);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to add to cart");
      } finally {
        setAddingToCart(false);
      }
    },
    [addingToCart, cartItems, product._id, ctxDispatch]
  );

  const toggleWishlistHandler = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!userInfo) {
        toast.info("Please sign in to save products to your wishlist");
        return;
      }

      if (wishlistLoading) return;

      setWishlistLoading(true);
      const previousState = inWishlist;

      // Optimistic update
      setInWishlist(!inWishlist);

      try {
        if (previousState) {
          await axios.delete(`/api/wishlist/${product._id}`, {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          toast.success("Removed from wishlist");
        } else {
          await axios.post(
            "/api/wishlist",
            { productId: product._id },
            {
              headers: { Authorization: `Bearer ${userInfo.token}` },
            }
          );
          toast.success("Added to wishlist");
        }
      } catch (error) {
        // Revert optimistic update on error
        setInWishlist(previousState);
        toast.error(
          error.response?.data?.message || "Failed to update wishlist"
        );
      } finally {
        setWishlistLoading(false);
      }
    },
    [userInfo, wishlistLoading, inWishlist, product._id]
  );

  return (
    <Card className="h-100 product-card">
      <div className="image-container">
        <Link to={`/product/${product.slug}`}>
          {imageLoading && (
            <div className="spinner-container">
              <Spinner animation="border" variant="primary" />
            </div>
          )}
          <Image
            src={product.image}
            className={`responsive product-image ${
              !imageLoading ? "loaded" : ""
            }`}
            alt={product.name}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
        </Link>
        <button
          onClick={toggleWishlistHandler}
          disabled={wishlistLoading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`wishlist-btn ${wishlistLoading ? "loading" : ""}`}
        >
          {wishlistLoading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <i
              className={`${
                inWishlist ? "fas fa-heart" : "far fa-heart"
              } wishlist-icon ${inWishlist ? "in-wishlist" : ""}`}
            />
          )}
        </button>
      </div>

      <Card.Body>
        {product.discount > 0 && (
          <div className="discount-badge">-{product.discount}% OFF</div>
        )}

        <Link
          to={`/product/${product.slug}`}
          className="card-link text-secondary product-link"
        >
          <Card.Title style={{ 
     fontSize: "0.85rem",
    whiteSpace: "nowrap",
    // overflow: "hidden",
            // textOverflow: "ellipsis",
     wordBreak: "break-word", // break long words
    display: "block",
    maxWidth: "100%"

}}>
            <strong>
              {CONDENSER_REGEX.test(product.name || product.category || "Product")
                ? "Condenser:"
                : "Product:"}
            </strong>{" "}
            {product.name}
          </Card.Title>

          <div className="mb-1">
            <span className="product-brand">Brand: {product.brand}</span>
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
          <Button
            className="btn-out-of-stock"
            variant="secondary"
            disabled
            aria-label="Product out of stock"
          >
            Out of stock
          </Button>
        ) : (
          <Button
            className="go-to-btn btn-text w-auto"
            onClick={() => addToCartHandler(product)}
            disabled={addingToCart}
            aria-label={`Add ${product.name} to cart`}
          >
            {addingToCart ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Adding...
              </>
            ) : (
              "Add to cart"
            )}
          </Button>
        )}

        {product.countInStock > 0 && product.countInStock <= 5 && (
          <small className="text-warning d-block mt-2">
            Only {product.countInStock} left in stock!
          </small>
        )}
      </Card.Body>
    </Card>
  );
});

export default Product;
