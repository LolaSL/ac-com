import React, { useContext, useEffect, useReducer, useCallback } from "react";
import axios from "axios";
import { Store } from "../Store.js";
import { getError } from "../utils.js";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Button, Badge, Card, Container, Row, Col } from "react-bootstrap";

const initialState = {
  loading: true,
  notifications: [],
  error: "",
  loadingDelete: false,
  successDelete: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, notifications: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "MARK_AS_READ":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification._id === action.payload
            ? { ...notification, isRead: true }
            : notification
        ),
      };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true };
    case "DELETE_SUCCESS":
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
        notifications: state.notifications.filter(
          (notification) => notification._id !== action.payload
        ),
      };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    case "DELETE_RESET":
      return { ...state, successDelete: false };
    default:
      return state;
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const [{ loading, notifications, error }, dispatch] = useReducer(
    reducer,
    initialState
  );
  const { state } = useContext(Store);
  const { userInfo, adminInfo, serviceProviderInfo } = state;
  const token = userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;
  const isAdmin = adminInfo !== null;

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    dispatch({ type: "FETCH_REQUEST" });
    try {
      const { data } = await axios.get(`/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "FETCH_FAIL", payload: getError(err) });
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "MARK_AS_READ", payload: id });
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const deleteHandler = async (notification) => {
    if (!notification._id) {
      toast.error("Notification ID missing.");
      return;
    }

    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/notifications/${notification._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Notification deleted successfully");
        dispatch({ type: "DELETE_SUCCESS", payload: notification._id });
      } catch (err) {
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getNotificationBadge = (type) => {
    const badges = {
      info: "info",
      discount: "success",
      urgent: "danger",
      quote: "warning",
    };
    return badges[type] || "secondary";
  };

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">Notifications</h1>
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : notifications.length === 0 ? (
            <MessageBox>No notifications to display.</MessageBox>
          ) : (
            <div>
              {notifications.map((notification) => (
                <Card
                  key={notification._id || `${notification.title}-${notification.createdAt}`}
                  className="mb-3"
                  bg={notification.isRead ? "light" : "white"}
                  border={notification.isRead ? "secondary" : "primary"}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="mb-0">
                        {notification.title}
                        {!notification.isRead && (
                          <Badge bg="primary" className="ms-2">New</Badge>
                        )}
                      </Card.Title>
                      <Badge bg={getNotificationBadge(notification.type)}>
                        {notification.type}
                      </Badge>
                    </div>
                    <Card.Text className="mt-2">{notification.message}</Card.Text>
                    <div className="text-muted small mb-3">
                      <div>
                        <i className="bi bi-person-badge"></i> Recipient: <em>{notification.recipientType}</em>
                      </div>
                      <div>
                        <i className="bi bi-calendar"></i> {formatDate(notification.createdAt)} at {formatTime(notification.createdAt)}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => markAsRead(notification._id)}
                        >
                          <i className="bi bi-check2"></i> Mark as Read
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteHandler(notification)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}
