import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Store } from "../Store.js";
import { getError } from "../utils";
import "./UserMessagesPage.css";
import { Badge, Button } from "react-bootstrap";
import {
  FaEnvelope,
  FaBoxOpen,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaCreditCard,
  FaTruck,
  FaTimesCircle,
  FaShoppingBag,
  FaExternalLinkAlt,
  FaBell,
} from "react-icons/fa";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, orders: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const TIMELINE_ICONS = {
  'Order Placed': <FaShoppingBag />,
  'Order Confirmed': <FaCheckCircle />,
  'Payment Confirmed': <FaCreditCard />,
  'Delivered': <FaTruck />,
  'Order Delivered': <FaTruck />,
  'Order Cancelled': <FaTimesCircle />,
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtShortDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function UserMessagesPage() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const token = userInfo?.token;
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

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
        const { data } = await axios.get("/api/orders/mine/messages", {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [userInfo, token, navigate]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const getStatusBadge = (order) => {
    if (order.isCancelled) return <Badge bg="danger">Cancelled</Badge>;
    if (order.isDelivered) return <Badge bg="success">Delivered</Badge>;
    if (order.isPaid) return <Badge bg="info">Paid — Processing</Badge>;
    return <Badge bg="warning" text="dark">Awaiting Payment</Badge>;
  };

  return (
    <div className="umsg-page">
      <div className="umsg-hero">
        <div className="umsg-hero__inner">
          <div className="umsg-hero__icon"><FaEnvelope /></div>
          <h1 className="umsg-hero__title">Order Messages</h1>
          <p className="umsg-hero__sub">
            Track status updates and notifications for all your orders.
          </p>
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
            <Button variant="primary" onClick={() => navigate("/products")}>
              Shop Now
            </Button>
          </div>
        ) : (
          <div className="umsg-list">
            {orders.map((order) => {
              const isOpen = expanded[order._id];
              // const lastEvent = order.timeline[order.timeline.length - 1];
              return (
                <div
                  className={`umsg-card ${isOpen ? "umsg-card--open" : ""}`}
                  key={order._id}
                >
                  {/* Card header */}
                  <div
                    className="umsg-card__header"
                    onClick={() => toggleExpand(order._id)}
                  >
                    <div className="umsg-card__left">
                      {order.firstItemImage && (
                        <img
                          src={order.firstItemImage}
                          alt=""
                          className="umsg-card__thumb"
                        />
                      )}
                      <div>
                        <div className="umsg-card__title">
                          {order.firstItemName}
                          {order.itemCount > 1 && (
                            <span className="umsg-card__more">
                              +{order.itemCount - 1} more
                            </span>
                          )}
                        </div>
                        <div className="umsg-card__meta">
                          <span className="umsg-card__id">
                            #{order._id.toString().slice(-6)}
                          </span>
                          <span className="umsg-card__date">
                            {fmtShortDate(order.createdAt)}
                          </span>
                          <span className="umsg-card__price">
                            ${order.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="umsg-card__right">
                      {order.unreadCount > 0 && (
                        <span className="umsg-card__unread">
                          <FaBell /> {order.unreadCount}
                        </span>
                      )}
                      {getStatusBadge(order)}
                      <span className="umsg-card__chevron">
                        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                      </span>
                    </div>
                  </div>

                  {/* Timeline (expandable) */}
                  {isOpen && (
                    <div className="umsg-card__body">
                      <div className="umsg-timeline">
                        {order.timeline.map((event, idx) => (
                          <div className="umsg-timeline__item" key={idx}>
                            <div className="umsg-timeline__dot">
                              {TIMELINE_ICONS[event.title] || <FaBell />}
                            </div>
                            <div className="umsg-timeline__content">
                              <div className="umsg-timeline__title">
                                {event.title}
                              </div>
                              <div className="umsg-timeline__msg">
                                {event.message}
                              </div>
                              <div className="umsg-timeline__time">
                                {fmtDate(event.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="umsg-card__footer">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/order/${order._id}`)}
                        >
                          <FaExternalLinkAlt className="me-1" />
                          View Order
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
