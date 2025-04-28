import axios from "axios";
import { useContext, useEffect, useReducer, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { BsSnow, BsDroplet, BsFan, BsVolumeMute } from "react-icons/bs";
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
};

function ProductPage() {
  const reviewsRef = useRef();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const navigate = useNavigate();
  const params = useParams();
  const { slug } = params;

  const [{ loading, error, product, loadingCreateReview }, dispatch] =
    useReducer(reducer, {
      product: { images: [], reviews: [] },
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

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  const addToCartHandler = async () => {
    const existItem = cart.cartItems.find((x) => x._id === product._id);
    const quantity = existItem ? existItem.quantity + 1 : 1;
    const { data } = await axios.get(`/api/products/${product._id}`);
    if (data.countInStock < quantity) {
      window.alert("Sorry. Product is out of stock");
      return;
    }
    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...product, quantity },
    });
    navigate("/cart");
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!comment || !rating) {
      toast.error("Please enter comment and rating");
      return;
    }
    try {
      const { data } = await axios.post(
        `/api/products/${product._id}/reviews`,
        { rating, comment, name: userInfo.name },
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
      window.scrollTo({
        behavior: "smooth",
        top: reviewsRef.current.offsetTop,
      });
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: "CREATE_FAIL" });
    }
  };

  return loading ? (
    <LoadingBox />
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div className="p-4">
      <Row>
        <Col md={6}>
          <ListGroup.Item>
            <h1 className="product-title">
              <strong>{product.name}</strong>
            </h1>
          </ListGroup.Item>
          <Image
            className="responsive"
            src={selectedImage || product.image}
            alt={product.name}
          ></Image>
        </Col>
        <Col md={3}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <Rating
                rating={product.rating}
                numReviews={product.numReviews}
              ></Rating>
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
                      <span className="ms-2">
                        $
                        {(product.price * (1 - product.discount / 100)).toFixed(
                          2
                        )}
                      </span>
                      <span className="ms-2 text-success">
                        On Sale! Save {product.discount}%
                      </span>
                    </>
                  ) : (
                    <span>${product.price.toFixed(2)}</span>
                  )}
                </Col>
              </Row>
            </ListGroup.Item>

            <ListGroup.Item>
              <Row xs={1} md={2} className="g-2">
                {[product.image, ...(product.images || [])].map((x) => (
                  <Col key={x}>
                    <Card>
                      <Button
                        className="thumbnail"
                        type="button"
                        variant="light"
                        onClick={() => setSelectedImage(x)}
                      >
                        <Card.Img variant="top" src={x} alt="product" />
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong> Description: </strong>
              <p className="product-paragraph">{product.description}</p>
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>BTU:</strong> {product.btu}BTU
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Area coverage:</strong> {product.areaCoverage}m2
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Energy eficiency:</strong> {product.energyEfficiency}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Product Features:</strong> <br />
              {product.features?.join(", ")}
            </ListGroup.Item>
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
        {icon} <span style={{ marginLeft: "5px" }}>{trimmedMode}</span>
      </span>
    ) : null; 
  })}
</ListGroup.Item>

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
        <Col md={3}>
          <Card>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Brand:</Col>
                    <Col>
                      <p>{product.brand}</p>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Status:</Col>
                    <Col>
                      {product.countInStock > 0 ? (
                        <Badge bg="success">In Stock</Badge>
                      ) : (
                        <Badge bg="danger">Unavailable</Badge>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>

                {product.countInStock > 0 && (
                  <ListGroup.Item>
                    <div className="d-grid">
                      <Button onClick={addToCartHandler} variant="secondary">
                        Add to Cart
                      </Button>
                    </div>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
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

              <div className="mb-2">
                <Button
                  className="btn btn-secondary"
                  disabled={loadingCreateReview}
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
              <Link to={`/signin?redirect=/product/${product.slug}`}>
                Sign In
              </Link>{" "}
              to write a review
            </MessageBox>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
