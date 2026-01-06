import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Store } from "../Store.js";
import { getError } from "../utils";
import { Container, Table, Badge } from "react-bootstrap";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        orders: action.payload,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function UserMessagesPage() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const token = userInfo?.token;

  const navigate = useNavigate();
  const [{ loading, error, orders = [] }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
    orders: [],
  });

  useEffect(() => {
    if (!userInfo) {
      navigate("/signin");
      return;
    }

    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/orders/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Extract orders from paginated response if needed
        const ordersList = Array.isArray(data) ? data : data.orders || [];
        dispatch({ type: "FETCH_SUCCESS", payload: ordersList });
      } catch (error) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(error),
        });
      }
    };
    fetchData();
  }, [userInfo, token, navigate]);

  const getStatusBadge = (order) => {
    if (order.isDelivered) {
      return <Badge bg="success">Delivered</Badge>;
    }
    if (order.isPaid) {
      return <Badge bg="info">Paid - In Transit</Badge>;
    }
    return <Badge bg="warning">Pending Payment</Badge>;
  };

  const getPaymentStatus = (order) => {
    return order.isPaid ? (
      <Badge bg="success">Paid</Badge>
    ) : (
      <Badge bg="danger">Not Paid</Badge>
    );
  };

  const getDeliveryStatus = (order) => {
    return order.isDelivered ? (
      <Badge bg="success">Delivered</Badge>
    ) : (
      <Badge bg="secondary">Not Delivered</Badge>
    );
  };

  return (
    <Container className="provider-container my-5">
      <h1 className="mb-4">Order Status Messages</h1>
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders.length === 0 ? (
        <MessageBox>You have no orders yet.</MessageBox>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>ORDER ID</th>
                  <th>TRANSACTION ID</th>
                  <th>DATE</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                  <th>PAYMENT</th>
                  <th>DELIVERY</th>
                  <th>PAID DATE</th>
                  <th>DELIVERED DATE</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} className="align-middle">
                    <td
                      data-label="Order ID"
                      className="fw-semibold"
                      style={{ wordBreak: "break-all" }}
                    >
                      {order._id}
                    </td>
                    <td data-label="Transaction ID">
                      {order.paymentResult?.id || "-"}
                    </td>
                    <td data-label="Date">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td data-label="Total" className="fw-bold">
                      ${order.totalPrice?.toFixed(2) || "0.00"}
                    </td>
                    <td data-label="Status">{getStatusBadge(order)}</td>
                    <td data-label="Payment">{getPaymentStatus(order)}</td>
                    <td data-label="Delivery">{getDeliveryStatus(order)}</td>
                    <td data-label="Paid Date">
                      {order.isPaid && order.paidAt
                        ? new Date(order.paidAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td data-label="Delivered Date">
                      {order.isDelivered && order.deliveredAt
                        ? new Date(order.deliveredAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {orders.length > 0 && (
            <div className="mt-4 p-3 bg-light rounded">
              <h5>Status Legend</h5>
              <div className="d-flex flex-wrap gap-3">
                <div>
                  <Badge bg="warning" className="me-2">
                    Pending Payment
                  </Badge>
                  Order awaiting payment.
                </div>
                <div>
                  <Badge bg="info" className="me-2">
                    Paid - In Transit
                  </Badge>
                  Payment received, order in transit.
                </div>
                <div>
                  <Badge bg="success" className="me-2">
                    Delivered
                  </Badge>
                  Order delivered successfully.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Container>
  );
}
