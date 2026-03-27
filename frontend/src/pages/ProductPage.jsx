import axios from "axios";
import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Rating from "../components/Rating";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import { Store } from "../Store";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import { toast } from "react-toastify";
import Image from "react-bootstrap/Image";
import { FaFilePdf } from "react-icons/fa";
import { FaFileImage } from "react-icons/fa";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import {
  BsSnow,
  BsDroplet,
  BsFan,
  BsVolumeMute,
  BsBrush,
  BsMicMute,
  BsMoonStars,
  BsZoomIn,
} from "react-icons/bs";
import "./ProductPage.css";
const reducer = (state, action) => {
  switch (action.type) {
    case "REFRESH_PRODUCT":
      return { ...state, product: action.payload };
    case "CREATE_REQUEST":
      return { ...state, loadingCreateReview: true };
    case "CREATE_SUCCESS":
      return { ...state, loadingCreateReview: false };
    case "CREATE_FAIL":
      return { ...state, loadingCreateReview: false };
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, product: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const modeIcons = {
  "Cooling Mode": <BsSnow className="mode-icon" />,
  "Drying Mode": <BsDroplet className="mode-icon" />,
  "Fan Mode": <BsFan className="mode-icon" />,
  "Silent Mode": <BsVolumeMute className="mode-icon" />,
  "Self-cleaning": <BsBrush className="mode-icon" />,
  "Low Noise": <BsMicMute className="mode-icon" />,
  "Night Mode": <BsMoonStars className="mode-icon" />,
};

// Unified regex for condenser/VRF detection
const CONDENSER_REGEX =
  /\b(?:vrf(?:\s+system)?|condens(?:er|ing)|outdoor unit|outdoor|heat recovery|heat pump)\b/i;

function ProductPage() {
  const reviewsRef = useRef();
  const viewRecorded = useRef(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  const navigate = useNavigate();
  const params = useParams();
  const { slug } = params;
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");

  const [{ loading, error, product, loadingCreateReview }, dispatch] =
    useReducer(reducer, {
      product: {
        images: [],
        reviews: [],
        price: 0,
        discount: 0,
        name: "",
        slug: "",
        image: "",
        brand: "",
        model: "",
        countInStock: 0,
        rating: 0,
        numReviews: 0,
        description: "",
        btu: 0,
        areaCoverage: 0,
        energyEfficiency: 0,
        features: [],
        mode: [],
        documents: [],
        dimension: { width: 0, height: 0, depth: 0 },
      },
      loading: true,
      error: "",
    });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const result = await axios.get(`/api/products/slug/${slug}`);
        dispatch({ type: "FETCH_SUCCESS", payload: result.data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (product._id && !viewRecorded.current) {
      viewRecorded.current = true;
      axios.post(`/api/products/${product._id}/view`).catch(() => {});
    }
  }, [product._id]);

  useEffect(() => {
    if (ref) {
      localStorage.setItem("referralCode", ref);
      console.log("Referral code captured:", ref);
    }
  }, [ref]);

  // Handle screen resize for responsive modal
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  // Check if product is in wishlist
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
          console.error("Error checking wishlist:", error);
        }
      }
    };
    checkWishlist();
    return () => {
      isMounted = false;
    };
  }, [product._id, userInfo]);

  // Track product view for logged-in users
  useEffect(() => {
    const recordView = async () => {
      if (userInfo && product._id) {
        try {
          await axios.post(
            "/api/browsing-history",
            { productId: product._id },
            {
              headers: { Authorization: `Bearer ${userInfo.token}` },
            }
          );
        } catch (err) {
          // Silently fail - browsing history is not critical
          console.log("Could not record view");
        }
      }
    };
    recordView();
  }, [product._id, userInfo]);

  const addToCartHandler = useCallback(async () => {
    if (addingToCart || !product._id) return;

    try {
      setAddingToCart(true);
      const existItem = cart.cartItems.find((x) => x._id === product._id);
      const quantity = existItem ? existItem.quantity + 1 : 1;

      const { data } = await axios.get(`/api/products/${product._id}`);

      if (!data.countInStock || data.countInStock < quantity) {
        toast.error("Sorry. Product is out of stock");
        return;
      }

      ctxDispatch({
        type: "CART_ADD_ITEM",
        payload: { ...product, quantity },
      });

      toast.success(`${product.name || "Product"} added to cart!`);
      navigate("/cart");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }, [addingToCart, cart.cartItems, product, ctxDispatch, navigate]);

  const toggleWishlistHandler = useCallback(async () => {
    if (!userInfo) {
      toast.info("Please sign in to save products to your wishlist");
      navigate(`/signin?redirect=/product/${product.slug || ""}`);
      return;
    }

    if (!product._id) return;

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
    }
  }, [userInfo, inWishlist, product, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment || comment.trim().length < 10) {
      toast.error("Please enter a comment with at least 10 characters");
      return;
    }

    if (comment.trim().length > 500) {
      toast.error("Comment must be less than 500 characters");
      return;
    }

    try {
      dispatch({ type: "CREATE_REQUEST" });

      const { data } = await axios.post(
        `/api/products/${product._id}/reviews`,
        { rating, comment: comment.trim(), name: userInfo.name },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );

      dispatch({
        type: "CREATE_SUCCESS",
      });

      toast.success("Review submitted successfully");

      product.reviews.unshift(data.review);
      product.numReviews = data.numReviews;
      product.rating = data.rating;
      dispatch({ type: "REFRESH_PRODUCT", payload: product });

      // Reset form
      setRating(0);
      setComment("");

      window.scrollTo({
        behavior: "smooth",
        top: reviewsRef.current.offsetTop,
      });
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: "CREATE_FAIL" });
    }
  };

  const discountedPrice = useMemo(() => {
    if (!product.price) return "0.00";
    if (product.discount > 0) {
      return (product.price * (1 - product.discount / 100)).toFixed(2);
    }
    return product.price.toFixed(2);
  }, [product.price, product.discount]);

  const allImages = useMemo(() => {
    if (!product.image) return [];
    return [product.image, ...(product.images || [])];
  }, [product.image, product.images]);

  return loading ? (
    <LoadingBox />
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div className="p-4 product-page-container">
      <Row className="g-4">
        <Col xs={12} lg={6}>
          <ListGroup.Item>
            <h1 className="product-title">
              <strong>{product.name}</strong>
            </h1>
            {ref && (
              <Badge bg="info" className="ms-2">
                Referred by: {ref}
              </Badge>
            )}
          </ListGroup.Item>

          <div style={{ position: "relative" }}>
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
              className="responsive product-main-image"
              src={selectedImage || product.image}
              alt={product.name}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              onClick={(e) => {
                if (isSmallScreen) {
                  e.preventDefault();
                  setShowImageModal(true);
                }
              }}
              style={{
                opacity: imageLoading ? 0 : 1,
                transition: "opacity 0.3s",
                cursor: isSmallScreen ? "pointer" : "default",
              }}
            />
            {isSmallScreen && (
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setShowImageModal(true);
                }}
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <BsZoomIn /> Click to zoom
              </div>
            )}
          </div>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <ListGroup variant="flush" className="product-details-section">
            <ListGroup.Item>
              <Rating
                rating={product.rating}
                numReviews={product.numReviews}
              ></Rating>
              <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-eye me-1"></i>
                {product.views || 0} views
              </div>
            </ListGroup.Item>
            <ListGroup.Item>
              <Row>
                <Col>
                  <strong>Price:</strong>
                </Col>
                <Col>
                  {product.discount > 0 ? (
                    <>
                      <span
                        className="text-muted"
                        style={{ textDecoration: "line-through" }}
                      >
                        ${product.price.toFixed(2)}
                      </span>
                      <span
                        className="ms-2 fw-bold text-success"
                        style={{ fontSize: "1rem" }}
                      >
                        ${discountedPrice}
                      </span>
                      <Badge bg="danger" className="ms-2">
                        Save {product.discount}%
                      </Badge>
                    </>
                  ) : (
                    <span className="fw-bold" style={{ fontSize: "1rem" }}>
                      ${(product.price || 0).toFixed(2)}
                    </span>
                  )}
                </Col>
              </Row>
            </ListGroup.Item>

            <ListGroup.Item className="product-image-gallery">
              <Row xs={1} md={2} className="g-2">
                {allImages.map((x, idx) => (
                  <Col key={x}>
                    <Card
                      className={selectedImage === x ? "border-primary" : ""}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow:
                          selectedImage === x
                            ? "0 0 10px rgba(13,110,253,0.5)"
                            : "none",
                      }}
                    >
                      <Button
                        className="thumbnail p-0"
                        type="button"
                        variant="light"
                        onClick={() => {
                          if (selectedImage !== x) {
                            setSelectedImage(x);
                            setImageLoading(true);
                            // Fallback: set loading false after 3 seconds in case onLoad doesn't fire
                            setTimeout(() => setImageLoading(false), 3000);
                          }
                          if (isSmallScreen) {
                            setShowImageModal(true);
                          }
                        }}
                        style={{ border: "none" }}
                      >
                        <Card.Img
                          variant="top"
                          src={x}
                          alt={`product view ${idx + 1}`}
                          loading="lazy"
                        />
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>BTU:</strong> {product.btu}BTU
            </ListGroup.Item>

            {/* Conditional rendering based on product type */}
            {(() => {
              const name = (product.name || "").toString();
              const category = (product.category || "").toString();

              // Detect condenser/VRF via explicit field OR regex match
              const hasMaxIndoor =
                product.numberOfMaximumIndoorUnits !== undefined &&
                product.numberOfMaximumIndoorUnits !== null &&
                product.numberOfMaximumIndoorUnits !== "";
              const isCondenser =
                hasMaxIndoor ||
                CONDENSER_REGEX.test(name) ||
                CONDENSER_REGEX.test(category);

              if (isCondenser) {
                // For Condenser/VRF products: show Max Indoor Units
                return (
                  <>
                    {hasMaxIndoor && (
                      <ListGroup.Item>
                        <strong>Max Indoor Units:</strong>{" "}
                        {product.numberOfMaximumIndoorUnits}
                      </ListGroup.Item>
                    )}
                  </>
                );
              } else {
                // For AC/Indoor products: show Area Coverage, Energy Efficiency, Mode
                return (
                  <>
                    {product.areaCoverage && (
                      <ListGroup.Item>
                        <strong>Area coverage:</strong> {product.areaCoverage}m2
                      </ListGroup.Item>
                    )}
                    {product.energyEfficiency && (
                      <ListGroup.Item>
                        <strong>Energy eficiency:</strong>{" "}
                        {product.energyEfficiency}
                      </ListGroup.Item>
                    )}
                  </>
                );
              }
            })()}

            <ListGroup.Item>
              <strong>Product Features:</strong> <br />
              {product.features?.join(", ")}
            </ListGroup.Item>

            {/* Mode only for non-condenser products */}
            {(() => {
              const name = (product.name || "").toString();
              const category = (product.category || "").toString();
              const hasMaxIndoor =
                product.numberOfMaximumIndoorUnits !== undefined &&
                product.numberOfMaximumIndoorUnits !== null &&
                product.numberOfMaximumIndoorUnits !== "";
              const isCondenser =
                hasMaxIndoor ||
                CONDENSER_REGEX.test(name) ||
                CONDENSER_REGEX.test(category);

              if (!isCondenser && product.mode?.length > 0) {
                return (
                  <ListGroup.Item>
                    <strong>Mode:</strong> <br />
                    {product.mode?.map((m, index) => {
                      const trimmedMode = m.trim();
                      const icon = modeIcons[trimmedMode];

                      return icon ? (
                        <span
                          key={index}
                          style={{
                            marginRight: "10px",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {icon}{" "}
                          <span style={{ marginLeft: "5px" }}>
                            {trimmedMode}
                          </span>
                        </span>
                      ) : null;
                    })}
                  </ListGroup.Item>
                );
              }
              return null;
            })()}

            <ListGroup.Item>
              <strong>Product dimensions (WxHxD):</strong>{" "}
              {product.dimension &&
              (product.dimension.width > 0 ||
                product.dimension.height > 0 ||
                product.dimension.depth > 0)
                ? `${product.dimension.width} x ${product.dimension.height} x ${product.dimension.depth} cm`
                : "Not specified"}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col xs={12} md={6} lg={3}>
          <Card className="product-info-card">
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Brand:</Col>
                    <Col>
                      <p>{product.brand}</p>
                    </Col>
                  </Row>
                  <Row>
                    <Col>Model:</Col>
                    <Col>
                      <p>{product.model}</p>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Status:</Col>
                    <Col>
                      {product.countInStock > 0 ? (
                        <>
                          <Badge bg="success">In Stock</Badge>
                          {product.countInStock <= 5 && (
                            <div className="text-warning small mt-1">
                              Only {product.countInStock} left!
                            </div>
                          )}
                        </>
                      ) : (
                        <Badge bg="danger">Unavailable</Badge>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>

                {product.countInStock > 0 && (
                  <>
                    <ListGroup.Item>
                      <div className="d-grid">
                        <Button
                          onClick={addToCartHandler}
                          variant="primary"
                          className="go-to-btn btn-text"
                          disabled={addingToCart}
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
                            <>
                              <i className="fas fa-shopping-cart me-2"></i>
                              Add to Cart
                            </>
                          )}
                        </Button>
                      </div>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <div className="d-grid">
                        <Button
                          onClick={toggleWishlistHandler}
                          variant={inWishlist ? "danger" : "outline-danger"}
                          className="go-to-btn btn-text"
                        >
                          <i
                            className={
                              inWishlist
                                ? "fas fa-heart me-2"
                                : "far fa-heart me-2"
                            }
                          ></i>
                          {inWishlist
                            ? "Remove from Wishlist"
                            : "Add to Wishlist"}
                        </Button>
                      </div>
                    </ListGroup.Item>
                  </>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Description — spans two column widths on large screens */}
      <Row className="g-4 mt-0">
        <Col xs={12} lg={{ span: 6, offset: 6 }}>
          <div className="product-description-block">
            <strong>Description:</strong>
            <p className="product-paragraph mt-1">{product.description}</p>
          </div>
        </Col>
      </Row>

      <div className="my-3 mb-3">
        <h3 className="product-title">Documentation</h3>
        <ul>
          {product.documents && product.documents.length > 0 ? (
            product.documents.map((doc, index) => (
              <li key={index}>
                <p>
                  <strong>{doc.description} </strong>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.type === "PDF" ? (
                      <>
                        <FaFilePdf color="red" size="1.5em" />
                      </>
                    ) : doc.type === "Image" ? (
                      <>
                        <FaFileImage color="blue" size="1.5em" />
                      </>
                    ) : (
                      doc.type
                    )}
                  </a>
                </p>
              </li>
            ))
          ) : (
            <p>No documentation available.</p>
          )}
        </ul>
      </div>
      <div className="my-3">
        <h3 className="product-title" ref={reviewsRef}>
          Reviews
        </h3>
        <div className="mb-3">
          {product.reviews.length === 0 && (
            <MessageBox>No review found</MessageBox>
          )}
        </div>
        <ListGroup>
          {product.reviews.map((review) => (
            <ListGroup.Item key={review._id}>
              <strong>{review.name}</strong>
              <Rating rating={review.rating} caption=" "></Rating>
              <p>{review.createdAt.substring(0, 10)}</p>
              <p>{review.comment}</p>
            </ListGroup.Item>
          ))}
        </ListGroup>
        <div className="my-3">
          {userInfo ? (
            <form onSubmit={submitHandler}>
              <h3 className="product-title">Write a customer review</h3>
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
              <FloatingLabel
                controlId="floatingTextarea"
                label="Comments (minimum 10 characters)"
                className="mb-3"
              >
                <Form.Control
                  as="textarea"
                  placeholder="Leave a comment here"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                  style={{ minHeight: "100px" }}
                />
                <Form.Text className="text-muted">
                  {comment.length}/500 characters
                </Form.Text>
              </FloatingLabel>

              <div className="mb-2">
                <Button
                  className="go-to-btn btn-text"
                  disabled={loadingCreateReview}
                  type="submit"
                >
                  {loadingCreateReview ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <MessageBox>
              Please{" "}
              <Link to={`/signin?redirect=/product/${product.slug}`}>
                Sign In
              </Link>{" "}
              to write a review
            </MessageBox>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <Modal
        show={showImageModal}
        onHide={() => {
          console.log("Closing modal");
          setShowImageModal(false);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{product.name || "Product Image"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
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
            src={selectedImage || product.image}
            alt={product.name}
            fluid
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            style={{
              maxHeight: "70vh",
              objectFit: "contain",
              opacity: imageLoading ? 0 : 1,
              transition: "opacity 0.3s",
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ProductPage;
