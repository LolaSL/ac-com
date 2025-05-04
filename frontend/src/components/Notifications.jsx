import React, { useContext, useEffect, useReducer, useCallback } from "react";
import axios from "axios";
import { Store } from "../Store.js";
import { getError } from "../utils.js";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";
import Button from "react-bootstrap/Button";
import { toast } from "react-toastify";

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
      return { ...state, loadingDelete: true, successDelete: false };
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
  const [{ loading, notifications, error }, dispatch] = useReducer(
    reducer,
    initialState
  );
  const { state } = useContext(Store);
  const { userInfo } = state;

  const fetchNotifications = useCallback(async () => {
    dispatch({ type: "FETCH_REQUEST" });
    try {
      const { data } = await axios.get(`/api/notifications`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "FETCH_FAIL", payload: getError(err) });
    }
  }, [userInfo.token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, null, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: "MARK_AS_READ", payload: id });
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const deleteHandler = async (notification) => {
    if (window.confirm("Are you sure to delete?")) {
      try {
        dispatch({ type: "DELETE_REQUEST" });
        await axios.delete(`/api/notifications/${notification._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success("Notification deleted successfully");
        fetchNotifications();
        dispatch({ type: "DELETE_SUCCESS", payload: notification._id });
      } catch (err) {
        console.error("Error deleting notification:", err);
        toast.error(getError(err));
        dispatch({ type: "DELETE_FAIL" });
      }
    }
  };

  return (
    <div>
      <h2>Notifications</h2>
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : !Array.isArray(notifications) || notifications.length === 0 ? (
        <MessageBox>No notifications to display.</MessageBox>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li
              className="notification"
              key={notification._id}
              style={{
                backgroundColor: notification.isRead ? "#e0e0e0" : "#fff",
                padding: "10px",
                margin: "5px 0",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <strong>{notification.title}</strong> - {notification.message} -{" "}
              {notification.recipientType}
              {!notification.isRead && (
                <Button
                  style={{
                    marginLeft: "10px",
                    padding: "5px 10px",
                    cursor: "pointer",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                  }}
                  onClick={() => markAsRead(notification._id)}
                >
                  Mark as Read
                </Button>
              )}
              <Button
                variant="danger"
                style={{
                  marginLeft: "10px",
                  padding: "5px 10px",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "4px",
                }}
                onClick={() => deleteHandler(notification)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
