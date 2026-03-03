import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Container, Table, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import "./MessagesServiceProviders.css";
const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return {
        ...state,
        messages: action.payload.messages || [],
        loading: false,
        currentPage: action.payload.currentPage || 1,
        totalPages: action.payload.totalPages || 1,
        totalMessages: action.payload.totalMessages || 0,
        successDelete: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "DELETE_REQUEST":
      return { ...state, loadingDelete: true };
    case "DELETE_SUCCESS":
      return { ...state, loadingDelete: false, successDelete: true };
    case "DELETE_FAIL":
      return { ...state, loadingDelete: false };
    default:
      return state;
  }
};

const MessagesServiceProviders = () => {
  const { state } = useContext(Store);
  const { adminInfo } = state;
  const token = adminInfo?.token;

  const [{ loading, error, messages, successDelete, currentPage }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: "",
      messages: [],
      currentPage: 1,
      totalPages: 1,
      successDelete: false,
    });

  const { search } = useLocation();
  const navigate = useNavigate();
  const sp = new URLSearchParams(search);
  const pageFromUrl = parseInt(sp.get("page"), 10) || 1;

  const [sortedMessages, setSortedMessages] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (currentPage !== pageFromUrl) {
      dispatch({
        type: "FETCH_SUCCESS",
        payload: {
          messages,
          currentPage: pageFromUrl,
          totalPages: 1,
          totalMessages: 0,
        },
      });
    }
  }, [pageFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!adminInfo || !token) {
      navigate("/admin-login", { replace: true });
      return;
    }

    const fetchMessages = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get(
          `/api/service-providers/messages/all`,
          {
            params: { page: pageFromUrl, pageSize: 10 },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchMessages();
  }, [adminInfo, token, pageFromUrl, successDelete, navigate]);

  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSortedMessages([]);
      return;
    }

    const sorted = [...messages].sort((a, b) => {
      let valueA, valueB;

      if (sortColumn === "serviceProvider") {
        valueA = a.serviceProvider?.name || "";
        valueB = b.serviceProvider?.name || "";
      } else if (sortColumn === "client") {
        valueA = a.client || "";
        valueB = b.client || "";
      } else if (sortColumn === "date") {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        valueA = a[sortColumn] || "";
        valueB = b[sortColumn] || "";
      }

      if (typeof valueA === "string" && typeof valueB === "string") {
        const comparison = valueA.localeCompare(valueB);
        return sortOrder === "asc" ? comparison : -comparison;
      }
      return 0;
    });

    setSortedMessages(sorted);
  }, [messages, sortColumn, sortOrder]);

  const deleteHandler = async (messageId) => {
    if (!messageId || !messageId.match(/^[0-9a-fA-F]{24}$/)) {
      alert("Invalid message ID.");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this message? This action is logged for audit purposes and cannot be undone."
      )
    ) {
      dispatch({ type: "DELETE_REQUEST" });
      try {
        await axios.delete(`/api/service-providers/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            adminAction: true,
            reason: "Admin deletion",
            timestamp: new Date().toISOString(),
          },
        });
        dispatch({ type: "DELETE_SUCCESS" });
        alert("Message deleted successfully. Action has been logged.");
      } catch (err) {
        dispatch({ type: "DELETE_FAIL" });
        alert(getError(err));
      }
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const editHandler = (messageId) => {
    navigate(`/admin/message/${messageId}/edit`);
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container className="messages-service-providers">
      <div className="mb-4 mt-4 header-section">
        <h1 className="mb-2 fw-bold">Admin - Service Provider Messages</h1>
        <p className="text-muted mb-0">
          Monitor and moderate communications between clients and service
          providers for quality assurance and support.
        </p>
        <small className="text-muted">
          Access to messages is granted for platform moderation, dispute
          resolution, and customer support in accordance with Terms of Service.
        </small>
      </div>
      {messages.length === 0 ? (
        <div>
          <p>No messages available</p>
          <p>Check API response and ensure messages exist in the database.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <Table striped bordered hover responsive className="messages">
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("serviceProvider")}
                  >
                    Provider{" "}
                    {sortColumn === "serviceProvider" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>
                  <button type="button" onClick={() => handleSort("client")}>
                    Client{" "}
                    {sortColumn === "client" &&
                      (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>Project</th>
                <th>Message</th>
                <th>
                  <button type="button" onClick={() => handleSort("date")}>
                    Date{" "}
                    {sortColumn === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMessages.map((message, index) => (
                <tr key={message._id || index}>
                  <td data-label="ID">{index + 1}</td>
                  <td data-label="Provider">
                    {message.serviceProvider?.name || "N/A"}
                  </td>
                  <td data-label="Client">{message.client || "N/A"}</td>
                  <td data-label="Project">{message.projectName || "N/A"}</td>
                  <td data-label="Message">{message.text || "N/A"}</td>
                  <td data-label="Date">
                    {new Date(message.date).toLocaleDateString()}
                  </td>
                  <td>
                    <Button
                      type="button"
                      className="btn-admin-edit"
                      title="Edit"
                      onClick={() => editHandler(message._id)}
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      type="button"
                      className="btn-admin-delete"
                      title="Delete"
                      onClick={() => deleteHandler(message._id)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
};

export default MessagesServiceProviders;
