import React, { useContext, useEffect, useReducer, useCallback } from "react";
import axios from "axios";
import { Store } from "../Store.js";
import { getError } from "../utils.js";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

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
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

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

  return (
    <div>
   <h1 className="mb-4 mt-4">Notifications</h1>
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : notifications.length === 0 ? (
        <MessageBox>No notifications to display.</MessageBox>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {notifications.map((notification) => (
            <li
              key={
                notification._id || `${notification.title}-${notification.createdAt}`
              }
              style={{
                backgroundColor: notification.isRead ? "#f1f1f1" : "#fff",
                padding: "16px",
                marginBottom: "12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                Recipient: <em>{notification.recipientType}</em>
              </div>
              <div style={{ marginTop: "12px" }}>
                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "10px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "background-color 0.3s",
                    }}
                    onMouseOver={(e) =>
                      (e.target.style.backgroundColor = "#0056b3")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.backgroundColor = "#007bff")
                    }
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => deleteHandler(notification)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    transition: "background-color 0.3s",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#b02a37")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#dc3545")
                  }
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
