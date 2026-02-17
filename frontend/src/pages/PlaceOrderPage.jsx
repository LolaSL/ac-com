import Axios from "axios";
import { useContext, useEffect, useReducer } from "react";
import { Link, useNavigate } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import { toast } from "react-toastify";
import { getError } from "../utils";
import { Store } from "../Store";
import CheckoutSteps from "../components/CheckoutSteps";
import LoadingBox from "../components/LoadingBox";
import Image from "react-bootstrap/Image";

const reducer = (state, action) => {
  switch (action.type) {
    case "CREATE_REQUEST":
      return { ...state, loading: true };
    case "CREATE_SUCCESS":
      return { ...state, loading: false };
    case "CREATE_FAIL":
      return { ...state, loading: false };
    default:
      return state;
  }
};

export default function PlaceOrderPage() {
  const navigate = useNavigate();

  const [{ loading }, dispatch] = useReducer(reducer, {
    loading: false,
  });

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  const round2 = (num) => Math.round(num * 100 + Number.EPSILON) / 100;

  cart.itemsPrice = cart.cartItems?.length
    ? round2(
        cart.cartItems.reduce(
          (a, c) => a + c.quantity * (c.price * (1 - (c.discount || 0) / 100)),
          0
        )
      )
    : 0;
  const getShippingPrice = (itemsPrice, items) => {
    if (itemsPrice > 5000) return round2(100);
    if (itemsPrice > 2000) return round2(50);
    if (itemsPrice > 500) return round2(25);
    return round2(10);
  };

  cart.shippingPrice = getShippingPrice(cart.itemsPrice, cart.cartItems);
  cart.taxPrice = round2(0.15 * cart.itemsPrice);
  cart.totalPrice = cart.itemsPrice + cart.shippingPrice + cart.taxPrice;

  console.log("Cart Calculations:", {
    itemsPrice: cart.itemsPrice,
    shippingPrice: cart.shippingPrice,
    taxPrice: cart.taxPrice,
    totalPrice: cart.totalPrice,
  });

  const placeOrderHandler = async () => {
    try {
      dispatch({ type: "CREATE_REQUEST" });

      // Validate all orderItems have required fields
      const hasInvalidItems = cart.cartItems.some(item => !item.slug || !item.name || !item.image);
      if (hasInvalidItems) {
        const invalidItems = cart.cartItems.filter(item => !item.slug || !item.name || !item.image);
        console.error("Invalid cart items:", invalidItems);
        toast.error("Cart contains items with missing information. Please clear cart and re-add items.");
        dispatch({ type: "CREATE_FAIL" });
        return;
      }

      console.log("Sending order request with data:", {
        orderItems: cart.cartItems,
        shippingAddress: cart.shippingAddress,
        paymentMethod: cart.paymentMethod,
        itemsPrice: cart.itemsPrice,
        shippingPrice: cart.shippingPrice,
        taxPrice: cart.taxPrice,
        totalPrice: cart.totalPrice,
      });

      const { data } = await Axios.post(
        "/api/orders",
        {
          orderItems: cart.cartItems,
          shippingAddress: cart.shippingAddress,
          paymentMethod: cart.paymentMethod,
          itemsPrice: cart.itemsPrice,
          shippingPrice: cart.shippingPrice,
          taxPrice: cart.taxPrice,
          totalPrice: cart.totalPrice,
        },
        {
          headers: {
            authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      console.log("Order response data:", data);
      console.log("Order object:", data.order);
      console.log("Order ID:", data.order?._id);

      if (!data.order || !data.order._id) {
        console.error("Invalid response structure:", data);
        toast.error("Order created but missing ID. Please contact support.");
        dispatch({ type: "CREATE_FAIL" });
        return;
      }

      ctxDispatch({ type: "CART_CLEAR" });
      dispatch({ type: "CREATE_SUCCESS" });
      localStorage.removeItem("cartItems");
      
      console.log(`Navigating to /order/${data.order._id}`);
      navigate(`/order/${data.order._id}`);
    } catch (err) {
      dispatch({ type: "CREATE_FAIL" });
      const errorMessage = err.response?.data?.message || getError(err);
      console.error("Order placement error:", err);
      console.error("Error response:", err.response?.data);
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    if (!cart.paymentMethod) {
      navigate("/payment");
    }
  }, [cart.cartItems, cart.itemsPrice, cart.paymentMethod, navigate]);

  return (
    <div>
      <CheckoutSteps step1 step2 step3 step4></CheckoutSteps>
      <h1 className="my-3 fs-2">Preview Order</h1>
      <Row>
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Shipping Address</Card.Title>
              <Card.Text>
                <strong>Name:</strong> {cart.shippingAddress.fullName} <br />
                <strong>Address:</strong> {cart.shippingAddress.address},{" "}
                {cart.shippingAddress.city}, {cart.shippingAddress.postalCode},{" "}
                {cart.shippingAddress.country}
                {cart.shippingAddress.location &&
                  cart.shippingAddress.location.lat && (
                    <>
                      <br />
                      <strong>Location:</strong> LAT:{" "}
                      {cart.shippingAddress.location.lat}, LNG:{" "}
                      {cart.shippingAddress.location.lng}
                    </>
                  )}
              </Card.Text>
              <Link to="/shipping" className="order-link">
                Edit
              </Link>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Payment</Card.Title>
              <Card.Text>
                <strong>Method:</strong> {cart.paymentMethod}
              </Card.Text>
              <Link to="/payment" className="order-link">
                Edit
              </Link>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Items</Card.Title>
              <ListGroup variant="flush">
                {cart.cartItems.map((item, index) => (
                  <ListGroup.Item key={index}>
                    <Row className="align-items-center">
                      <Link
                        to={`/product/${item.slug}`}
                        className="order-link mb-2"
                      >
                        {item.name}
                      </Link>
                      <Col md={6}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          className="img-fluid rounded cart-thumbnail"
                        ></Image>{" "}
                      </Col>
                      <Col md={3}>
                        <span>{item.quantity}</span>
                      </Col>
                      <Col md={3}>
                        <div>
                          ${item.price.toFixed(2)}
                          {item.discount > 0 && (
                            <div style={{ color: "green" }}>
                              ($
                              {(item.price * (1 - item.discount / 100)).toFixed(
                                2
                              )}{" "}
                              after {item.discount}% off)
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <Link to="/cart" className="order-link mb-2">
                Edit
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Order Summary</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Items</Col>
                    <Col>${cart.itemsPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Shipping</Col>
                    <Col>${cart.shippingPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Tax</Col>
                    <Col>${cart.taxPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>
                      <strong> Order Total</strong>
                    </Col>
                    <Col>
                      <strong>${cart.totalPrice.toFixed(2)}</strong>
                    </Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <div className="d-grid">
                    <Button
                      className="go-to-btn btn-text"
                      type="button"
                      onClick={placeOrderHandler}
                      disabled={cart.cartItems.length === 0}
                    >
                      Place Order
                    </Button>
                  </div>
                  {loading && <LoadingBox></LoadingBox>}
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
