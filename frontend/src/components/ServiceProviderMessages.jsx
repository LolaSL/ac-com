import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Container, Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import "./ServiceProviderMessages.css";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";

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
<>
      <style>
        {`
          .table-responsive td::before {
            color: #333 !important;
          }
          .table-responsive td {
            color: #333 !important; 
          }
        `}
      </style>
      <Container>
        <h1 className="page-title">Messages from Clients</h1>
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
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
                  <td data-label="ID">{message._id}</td>
                  <td data-label="Client Name">{message.client}</td>
                  <td data-label="Project Name">{message.projectName}</td>
                  <td data-label="Message">{message.text}</td>
                  <td data-label="Date">{new Date(message.date).toLocaleDateString()}</td>
                  <td data-label="Actions">
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
    </>
  );
};

export default ServiceProviderMessages;
