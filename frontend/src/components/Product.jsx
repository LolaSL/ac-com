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

const Product = memo(function Product(props) {
  const { product } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;

  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageHover, setImageHover] = useState(false);

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
    <Card
      className="h-100 product-card"
      style={{
        position: "relative",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <div style={{ position: "relative", overflow: "hidden" }}>
        <Link to={`/product/${product.slug}`}>
          {imageLoading && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1,
              }}
            >
              <Spinner animation="border" variant="primary" />
            </div>
          )}
          <Image
            src={product.image}
            className="responsive"
            alt={product.name}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            onMouseEnter={() => setImageHover(true)}
            onMouseLeave={() => setImageHover(false)}
            style={{
              transition: "transform 0.3s ease",
              transform: imageHover ? "scale(1.05)" : "scale(1)",
              opacity: imageLoading ? 0 : 1,
            }}
          />
        </Link>
        <button
          onClick={toggleWishlistHandler}
          disabled={wishlistLoading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
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
            cursor: wishlistLoading ? "wait" : "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "transform 0.2s, box-shadow 0.2s",
            zIndex: 10,
            opacity: wishlistLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!wishlistLoading) {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
          }}
        >
          {wishlistLoading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <i
              className={inWishlist ? "fas fa-heart" : "far fa-heart"}
              style={{
                color: inWishlist ? "#ff6b35" : "#6c757d",
                fontSize: "1.2rem",
              }}
            />
          )}
        </button>
      </div>

      <Card.Body>
        {product.discount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
              color: "white",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(255,107,53,0.4)",
              zIndex: 10,
            }}
          >
            -{product.discount}% OFF
          </div>
        )}

        <Link
          to={`/product/${product.slug}`}
          className="card-link text-secondary"
          style={{ textDecoration: "none" }}
        >
          <Card.Title className="text-truncate" title={product.name}>
            <strong>Product:</strong> {product.name}
          </Card.Title>

          <div className="mb-1">
            <span className="fs-6 fw-semibold">Brand: {product.brand}</span>
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
