import axios from "axios";
import { useContext, useEffect, useReducer } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useNavigate, useParams } from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Card from "react-bootstrap/Card";
import { Link } from "react-router-dom";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { toast } from "react-toastify";
import { Container } from "react-bootstrap";
import printJS from "print-js";

function printOrder() {
  const orderContainer = document.querySelector("#order-container");
  if (!orderContainer) return;

  const clone = orderContainer.cloneNode(true);

  // Remove elements that shouldn't be printed
  clone
    .querySelectorAll("button, a, .badge, .no-print")
    .forEach((el) => el.remove());

  // Get order ID from the heading
  // const orderHeading = clone.querySelector("h1");
  const orderNumber = clone.querySelector(".fw-bold")?.textContent || "";

  printJS({
    printable: clone.innerHTML,
    type: "raw-html",
    style: `
      @media print {
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .card-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
        }
        .card-text {
          line-height: 1.6;
          margin-bottom: 10px;
        }
        img {
          max-width: 80px;
          height: auto;
          display: block;
        }
        .row {
          display: flex;
          margin-bottom: 10px;
        }
        .col-md-8 {
          width: 66%;
        }
        .col-md-4 {
          width: 33%;
        }
        .list-group-item {
          border: 1px solid #eee;
          padding: 10px;
          margin-bottom: 5px;
        }
        strong {
          font-weight: bold;
        }
        .alert {
          padding: 10px;
          margin: 10px 0;
          border-radius: 4px;
        }
        .alert-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .alert-warning {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeeba;
        }
        a {
          display: none;
        }
      }
    `,
    documentTitle: "Order " + orderNumber,
  });
}

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, order: action.payload, error: "" };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "PAY_REQUEST":
      return { ...state, loadingPay: true };
    case "PAY_SUCCESS":
      return { ...state, loadingPay: false, successPay: true };
    case "PAY_FAIL":
      return { ...state, loadingPay: false };
    case "PAY_RESET":
      return { ...state, loadingPay: false, successPay: false };
    case "DELIVER_REQUEST":
      return { ...state, loadingDeliver: true };
    case "DELIVER_SUCCESS":
      return { ...state, loadingDeliver: false, successDeliver: true };
    case "DELIVER_FAIL":
      return { ...state, loadingDeliver: false };
    case "DELIVER_RESET":
      return { ...state, loadingDeliver: false, successDeliver: false };
    default:
      return state;
  }
}

export default function OrderPage() {
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state || {};
  const token = userInfo?.token || adminInfo?.token;
  const isAdmin = userInfo?.isAdmin || adminInfo?.isAdmin;

  const navigate = useNavigate();
  const params = useParams();
  const { id: orderId } = params;

  const [
    {
      loading,
      error,
      order,
      successPay,
      loadingPay,
      loadingDeliver,
      successDeliver,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: "",
    successPay: false,
    loadingPay: false,
    loadingDeliver: false,
    successDeliver: false,
  });

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    if (
      !order._id ||
      successPay ||
      successDeliver ||
      (order._id && order._id !== orderId)
    ) {
      fetchOrder();
      if (successPay) dispatch({ type: "PAY_RESET" });
      if (successDeliver) dispatch({ type: "DELIVER_RESET" });
    } else {
      const loadPaypalScript = async () => {
        try {
          const { data: clientId } = await axios.get("/api/keys/paypal", {
            headers: { authorization: `Bearer ${token}` },
          });
          paypalDispatch({
            type: "resetOptions",
            value: {
              "client-id": clientId,
              currency: "USD",
            },
          });
          paypalDispatch({ type: "setLoadingStatus", value: "pending" });
        } catch (err) {
          toast.error("Failed to load PayPal script");
        }
      };
      loadPaypalScript();
    }
  }, [
    order,
    orderId,
    token,
    navigate,
    successPay,
    successDeliver,
    paypalDispatch,
  ]);

  async function deliverOrderHandler() {
    try {
      dispatch({ type: "DELIVER_REQUEST" });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
        {},
        {
          headers: { authorization: `Bearer ${token}` },
        }
      );
      dispatch({ type: "DELIVER_SUCCESS", payload: data });
      toast.success("Order is delivered");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "DELIVER_FAIL" });
    }
  }

  function createOrder(data, actions) {
    // Round to 2 decimal places to avoid PayPal DECIMAL_PRECISION error
    const roundedTotal = Math.round(order.totalPrice * 100) / 100;
    return actions.order
      .create({
        purchase_units: [{ amount: { value: roundedTotal.toFixed(2) } }],
      })
      .then((orderID) => orderID);
  }

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        dispatch({ type: "PAY_REQUEST" });
        const { data } = await axios.put(
          `/api/orders/${order._id}/pay`,
          details,
          {
            headers: { authorization: `Bearer ${token}` },
          }
        );
        dispatch({ type: "PAY_SUCCESS", payload: data });
        toast.success("Order is paid");
      } catch (err) {
        dispatch({ type: "PAY_FAIL", payload: getError(err) });
        toast.error(getError(err));
      }
    });
  }

  function onError(err) {
    toast.error(getError(err));
  }

  if (!token) return null;

  if (loading) {
    return <LoadingBox></LoadingBox>;
  }

  if (error) {
    return <MessageBox variant="danger">{error}</MessageBox>;
  }

  if (!order || !order.shippingAddress) {
    return <LoadingBox></LoadingBox>;
  }

  return (
    <div>
      <Container id="order-container">
        <div className="d-flex justify-space-between align-items-center my-3 fs-1">
          <h1 className="my-3">Order: #{orderId} </h1>
          <div>
            {order.isPaid ? (
              <span
                className="badge bg-success me-2 "
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
              >
                Paid
              </span>
            ) : (
              <span
                className="badge bg-warning  me-2"
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
              >
                Unpaid
              </span>
            )}
            {order.isDelivered ? (
              <span
                className="badge bg-success"
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
              >
                Delivered
              </span>
            ) : (
              <span
                className="badge bg-secondary"
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
              >
                Pending
              </span>
            )}
          </div>
        </div>
        <Row>
          <Col md={8}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Shipping</Card.Title>
                <Card.Text>
                  <strong>Name:</strong> {order.shippingAddress.fullName} <br />
                  <strong>Address:</strong> {order.shippingAddress.address},{" "}
                  {order.shippingAddress.city},{" "}
                  {order.shippingAddress.postalCode},{" "}
                  {order.shippingAddress.country}
                  {order.shippingAddress.location &&
                    order.shippingAddress.location.lat && (
                      <>
                        <br />
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`https://maps.google.com?q=${order.shippingAddress.location.lat},${order.shippingAddress.location.lng}`}
                          className="btn btn-sm go-to-btn btn-text mt-2"
                        >
                          📍 Show On Map
                        </a>
                      </>
                    )}
                </Card.Text>
                {order.isDelivered ? (
                  <MessageBox variant="success">
                    Delivered on{" "}
                    {new Date(order.deliveredAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </MessageBox>
                ) : (
                  <MessageBox variant="warning">Not Delivered Yet</MessageBox>
                )}
              </Card.Body>
            </Card>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Payment</Card.Title>
                <Card.Text>
                  <strong>Method:</strong> {order.paymentMethod}
                </Card.Text>
                {order.isPaid ? (
                  <MessageBox variant="success">
                    Paid on{" "}
                    {new Date(order.paidAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </MessageBox>
                ) : (
                  <MessageBox variant="warning">Awaiting Payment</MessageBox>
                )}
              </Card.Body>
            </Card>

            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Items ({order.orderItems.length})</Card.Title>
                <ListGroup variant="flush">
                  {order.orderItems.map((item) => (
                    <ListGroup.Item key={item._id}>
                      <Row className="align-items-center">
                        <Col md={2}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="img-fluid rounded"
                            style={{ maxHeight: "80px", objectFit: "contain" }}
                          />
                        </Col>
                        <Col md={4}>
                          <Link
                            to={`/product/${item.slug}`}
                            className="order-link"
                          >
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={3}>
                          <strong>Quantity:</strong> {item.quantity}
                        </Col>
                        <Col md={3}>
                          <strong>Price:</strong> ${item.price.toFixed(2)}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Order Summary</Card.Title>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Row>
                      <Col>Items</Col>
                      <Col>${order.itemsPrice.toFixed(2)}</Col>
                    </Row>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Row>
                      <Col>Shipping</Col>
                      <Col>${order.shippingPrice.toFixed(2)}</Col>
                    </Row>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Row>
                      <Col>Tax</Col>
                      <Col>${order.taxPrice.toFixed(2)}</Col>
                    </Row>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Row>
                      <Col>
                        <strong> Order Total</strong>
                      </Col>
                      <Col>
                        <strong>${order.totalPrice.toFixed(2)}</strong>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                  {order.isPaid && (
                    <ListGroup.Item>
                      <div className="d-grid">
                        <Button
                          onClick={printOrder}
                          variant="light"
                          size="sm"
                          className="go-to-btn btn-text w-auto pt-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-printer"
                          >
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect width="12" height="8" x="6" y="14" />
                          </svg>
                          Print Order
                        </Button>
                      </div>
                    </ListGroup.Item>
                  )}
                  {order.isPaid ? (
                    <MessageBox variant="success order-paid">
                      Paid on{" "}
                      {new Date(order.paidAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </MessageBox>
                  ) : (
                    <MessageBox variant="warning">Awaiting Payment</MessageBox>
                  )}
                  {!order.isPaid && !isAdmin && (
                    <ListGroup.Item>
                      <div className="payment-section">
                        <h5>Pay with PayPal</h5>
                        <div className="paypal-section">
                          {isPending ? (
                            <div className="loading-box">
                              <LoadingBox />
                            </div>
                          ) : (
                            <div className="paypal-buttons-container">
                              <PayPalButtons
                                createOrder={createOrder}
                                onApprove={onApprove}
                                onError={onError}
                              />
                            </div>
                          )}
                          {loadingPay && (
                            <div className="loading-box">
                              <LoadingBox />
                            </div>
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  )}
                  {isAdmin === true && order.isPaid && !order.isDelivered && (
                    <ListGroup.Item>
                      {loadingDeliver && <LoadingBox />}
                      <div className="d-grid">
                        <Button
                          className="go-to-btn btn-text"
                          type="button"
                          onClick={deliverOrderHandler}
                        >
                          Deliver Order
                        </Button>
                      </div>
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
