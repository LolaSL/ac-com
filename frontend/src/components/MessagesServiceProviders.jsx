import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Container, Table, Button } from "react-bootstrap";
import { useLocation } from "react-router-dom";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        messages: action.payload.messages || [],
        loading: false,
        currentPage: action.payload.currentPage,
        totalPages: action.payload.totalPages,
        totalMessages: action.payload.totalMessages,
        page: action.payload.page,
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
  const { userInfo } = state;
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
  const sp = new URLSearchParams(search);
  const page = sp.get("page") || 1;

  const [sortedMessages, setSortedMessages] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    if (messages) {
      const sorted = [...messages].sort((a, b) => {
        const valueA =
          sortColumn === "serviceProvider"
            ? a[sortColumn]?.name
            : a[sortColumn];
        const valueB =
          sortColumn === "serviceProvider"
            ? b[sortColumn]?.name
            : b[sortColumn];

        if (valueA === undefined || valueB === undefined) {
          return 0;
        }

        if (typeof valueA === "string" && typeof valueB === "string") {
          const nameComparison = valueA.localeCompare(valueB);
          if (nameComparison !== 0)
            return sortOrder === "asc" ? nameComparison : -nameComparison;
        }

        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA !== dateB) {
          return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        }

        return 0;
      });

      setSortedMessages(sorted);
    }
  }, [messages, sortColumn, sortOrder]);

  useEffect(() => {
    const fetchMessages = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      if (!userInfo || !userInfo.token) {
        console.error("User is not authenticated.");
        return;
      }
      try {
        const { data } = await axios.get(
          `/api/service-providers/messages/all`,
          {
            params: { page: currentPage, pageSize: 10 },
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchMessages();
  }, [userInfo, successDelete, currentPage, page]);

  const deleteHandler = async (messageId) => {
    if (!messageId || !messageId.match(/^[0-9a-fA-F]{24}$/)) {
      alert("Invalid message ID.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this message?")) {
      dispatch({ type: "DELETE_REQUEST" });
      try {
        const { data } = await axios.delete(
          `/api/service-providers/message/${messageId}`,
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        dispatch({ type: "DELETE_SUCCESS", payload: data });
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
    window.location.href = `/admin/message/${messageId}/edit`;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <Container>
      <h1 className="mt-4 mb-4 fw-bold">Service Provider Messages</h1>
      {messages.length === 0 && (
        <div>
          <p>No messages available</p>
          <p>Check API response and ensure messages exist in the database.</p>
        </div>
      )}
      {messages.length > 0 && (
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
                  {sortColumn === "client" && (sortOrder === "asc" ? "↑" : "↓")}
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
              <tr key={message._id}>
                <td data-label="ID">{index + 1}</td>
                <td data-label= "Provider ">{message.serviceProvider?.name}</td>
                <td data-label="Client ">{message.client}</td>
                <td data-label="Project">{message.projectName}</td>
                <td data-label="Message">{message.text}</td>
                <td data-label="Date">{new Date(message.date).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="secondary"
                    className="me-2 mb-1 btn-sm"
                    onClick={() => editHandler(message._id)}
                  >
                    Edit
                    </Button>
                    &nbsp;
                    <Button
                    variant="danger"
                    className="me-2 btn-sm"
                    onClick={() => deleteHandler(message._id)}
                  >
                    Delete
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