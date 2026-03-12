import { memo, useCallback, useContext, useState, useEffect } from "react";
import { Card, Button, Spinner, Image, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import Rating from "./Rating";
import axios from "axios";
import { Store } from "../Store";
import { toast } from "react-toastify";
import "./Product.css";

const Product = memo(({ product }) => {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart: { cartItems }, userInfo } = state;
  
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    if (userInfo) {
      // Check if product is in wishlist
      const checkWishlist = async () => {
        try {
          const { data } = await axios.get("/api/wishlist", {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          setInWishlist(data.products.some(p => p._id === product._id));
        } catch (error) {
          console.error("Error checking wishlist:", error);
        }
      };
      checkWishlist();
    }

    return () => {
      setWishlistLoading(false);
      setAddingToCart(false);
    };
  }, [product._id, userInfo]);

  const addToCartHandler = useCallback(
    async (item) => {
      if (addingToCart) return;

      setAddingToCart(true);
      try {
        const existItem = cartItems.find((x) => x._id === product._id);
        const quantity = existItem ? existItem.quantity + 1 : 1;
        
        const { data } = await axios.get(`/api/products/${item._id}`);
        if (data.countInStock < quantity) {
          toast.error("Sorry. Product is out of stock");
          return;
        }
        
        ctxDispatch({
          type: "CART_ADD_ITEM",
          payload: { ...item, quantity },
        });
        toast.success("Added to cart successfully!");
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
    <Card className="product-card h-100">
      {/* Image Section with Overlays */}
      <div className="product-image-wrapper">
        <Link to={`/product/${product.slug}`} className="product-image-link">
          {imageLoading && (
            <div className="image-loader">
              <Spinner animation="border" variant="primary" size="sm" />
            </div>
          )}
          <Image
            src={product.image}
            className={`product-image ${!imageLoading ? "loaded" : ""}`}
            alt={product.name}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            loading="lazy"
          />
        </Link>

        {/* Discount Badge */}
        {product.discount > 0 && (
          <Badge className="product-discount-badge">
            <i className="fas fa-tag me-1"></i>
            {product.discount}% OFF
          </Badge>
        )}

        {/* Wishlist Button */}
        <button
          onClick={toggleWishlistHandler}
          disabled={wishlistLoading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className={`product-wishlist-btn ${inWishlist ? "active" : ""}`}
        >
          {wishlistLoading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <i className={`${inWishlist ? "fas" : "far"} fa-heart`} />
          )}
        </button>

        {/* Stock Badge */}
        {product.countInStock > 0 && product.countInStock <= 5 && (
          <Badge className="product-stock-badge" bg="warning" text="dark">
            <i className="fas fa-exclamation-circle me-1"></i>
            Only {product.countInStock} left
          </Badge>
        )}

        {product.countInStock === 0 && (
          <Badge className="product-stock-badge" bg="danger">
            Out of Stock
          </Badge>
        )}
      </div>

      {/* Card Body */}
      <Card.Body className="product-card-body">
        <Link
          to={`/product/${product.slug}`}
          className="product-title-link"
        >
          <Card.Title className="product-title">
            {product.name}
          </Card.Title>
        </Link>

        {/* Brand */}
        <div className="product-brand-section">
          <i className="fas fa-industry me-2 text-muted"></i>
          <span className="product-brand-label">Brand:</span>
          <span className="product-brand-name">{product.brand}</span>
        </div>

        {/* Rating */}
        <div className="product-rating-section">
          <Rating rating={product.rating} numReviews={product.numReviews} />
        </div>

        {/* Price Section */}
        <div className="product-price-section mt-auto">
          {product.discount > 0 ? (
            <>
              <div className="price-original">
                <span className="price-label">Was:</span>
                <span className="price-value">${product.price.toFixed(2)}</span>
              </div>
              <div className="price-discounted">
                <span className="price-label">Now:</span>
                <span className="price-value">
                  ${((product.price * (100 - product.discount)) / 100).toFixed(2)}
                </span>
                <span className="price-savings ms-2">
                  Save ${(product.price * product.discount / 100).toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="price-regular">
              <span className="price-value">${product.price.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <div className="product-actions">
          {product.countInStock === 0 ? (
            <Button
              className="product-btn product-btn-disabled"
              variant="secondary"
              disabled
            >
              <i className="fas fa-ban me-2"></i>
              Out of Stock
            </Button>
          ) : (
            <Button
              className="product-btn product-btn-primary"
              onClick={() => addToCartHandler(product)}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-shopping-cart me-2"></i>
                  Add to Cart
                </>
              )}
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
});

Product.displayName = "Product";

export default Product;