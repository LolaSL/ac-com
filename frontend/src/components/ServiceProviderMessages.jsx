import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Container, Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import "./ServiceProviderMessages.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return {
        ...state,
        messages: action.payload || [],
        loading: false,
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

const ServiceProviderMessages = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;
  const token = serviceProviderInfo?.token;

  const [{ loading, error, messages, successDelete }, dispatch] = useReducer(
    reducer,
    {
      loading: true,
      error: "",
      messages: [],
      successDelete: false,
    }
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (!serviceProviderInfo || !token) {
      navigate("/serviceprovider/login", { replace: true });
      return;
    }

    const fetchMessages = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/service-providers/messages", {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchMessages();
  }, [serviceProviderInfo, token, successDelete, navigate]);

  useEffect(() => {
    if (messages.length === 0 && !loading) {
      // Handle empty state
    }
  }, [messages, loading]);

  const deleteHandler = async (messageId) => {
    if (window.confirm("Are you sure to delete this message?")) {
      dispatch({ type: "DELETE_REQUEST" });
      try {
        await axios.delete(`/api/service-providers/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "DELETE_SUCCESS" });
      } catch (err) {
        dispatch({ type: "DELETE_FAIL" });
        alert(getError(err));
      }
    }
  };

  return (
    <Container className="service-provider-messages mt-4">
      <h2 className="mb-4">My Messages</h2>
      {loading ? (
        <p className="loading-message">Loading messages...</p>
      ) : error ? (
        <p className="error-message">Error loading messages: {error}</p>
      ) : messages.length === 0 ? (
        <p className="no-messages">No messages data found</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client Name</th>
              <th>Project Name</th>
              <th>Message</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message._id}>
                <td>{message._id}</td>
                <td>{message.client}</td>
                <td>{message.projectName}</td>
                <td>{message.text}</td>
                <td>{new Date(message.date).toLocaleDateString()}</td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteHandler(message._id)}
                  >
                    <FaTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default ServiceProviderMessages;
