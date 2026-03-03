import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Store } from "../Store.js";
import { getError } from "../utils";
import "./UserMessagesPage.css";
import { Table, Badge, Button } from "react-bootstrap";
import { FaEnvelope, FaBoxOpen, FaEye } from "react-icons/fa";

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

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const getPaymentBadge = (order) =>
    order.isPaid ? (
      <Badge bg="success">Paid {fmtDate(order.paidAt)}</Badge>
    ) : (
      <Badge bg="warning" text="dark">Pending</Badge>
    );

  const getDeliveryBadge = (order) =>
    order.isDelivered ? (
      <Badge bg="primary">Delivered {fmtDate(order.deliveredAt)}</Badge>
    ) : (
      <Badge bg="secondary">Not Shipped</Badge>
    );

  return (
    <div className="umsg-page">
      <div className="umsg-hero">
        <div className="umsg-hero__inner">
          <div className="umsg-hero__icon"><FaEnvelope /></div>
          <h1 className="umsg-hero__title">Order Messages</h1>
          <p className="umsg-hero__sub">View status updates and messages for your orders.</p>
        </div>
      </div>
      <div className="umsg-inner">
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders.length === 0 ? (
        <div className="umsg-empty">
          <div className="umsg-empty__icon"><FaBoxOpen /></div>
          <h4>No orders yet</h4>
          <p>Your order messages will appear here once you place an order.</p>
          <Button variant="primary" onClick={() => navigate('/products')}>Shop Now</Button>
        </div>
      ) : (
        <div className="table-responsive">
          <Table className="umsg-table" borderless>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td data-label="Order ID">
                    <span className="umsg-order-ref">{order._id}</span>
                  </td>
                  <td data-label="Date">
                    {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td data-label="Total" className="fw-bold">
                    ${order.totalPrice?.toFixed(2) || '0.00'}
                  </td>
                  <td data-label="Payment">{getPaymentBadge(order)}</td>
                  <td data-label="Delivery">{getDeliveryBadge(order)}</td>
                  <td data-label="Actions">
                    <Button
                      type="button"
                      className="btn-admin-edit"
                      title="View Details"
                      onClick={() => navigate(`/order/${order._id}`)}
                    >
                      <FaEye />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      </div>
    </div>
  );
}
