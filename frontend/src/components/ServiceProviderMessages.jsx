import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaEnvelope, FaBoxOpen } from "react-icons/fa";
import "./ServiceProviderMessages.css";
import "../pages/AdminHero.css";
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
    <div className="spm-page">
      <div className="spm-hero">
        <div className="spm-hero__inner">
          <div className="spm-hero__icon"><FaEnvelope /></div>
          <h1 className="spm-hero__title">Client Messages</h1>
          <p className="spm-hero__sub">Manage incoming messages from your clients.</p>
        </div>
      </div>

      <div className="spm-body">
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : messages.length === 0 ? (
          <div className="spm-empty">
            <FaBoxOpen className="spm-empty__icon" />
            <p>No messages found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="spm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client Name</th>
                  <th>Project Name</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message, index) => (
                  <tr key={message._id}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Client Name">{message.client}</td>
                    <td data-label="Project Name">{message.projectName}</td>
                    <td data-label="Message">{message.text}</td>
                    <td data-label="Date">{new Date(message.date).toLocaleDateString()}</td>
                    <td data-label="Actions">
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProviderMessages;
