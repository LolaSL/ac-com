import React, { useContext, useEffect, useReducer, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Button from "react-bootstrap/Button";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, error: "" };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "UPDATE_REQUEST":
      return { ...state, loadingUpdate: true };
    case "UPDATE_SUCCESS":
      return { ...state, loadingUpdate: false };
    case "UPDATE_FAIL":
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

const MessageEditPage = () => {
  const navigate = useNavigate();
  const { id: messageId } = useParams();

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const [{ loading, error, loadingUpdate }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const [client, setClient] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [projectName, setProjectName] = useState("");
  const [serviceProviders, setServiceProviders] = useState([]);

  // Fetch all service providers
  useEffect(() => {
    if (!token) return;

    const fetchServiceProviders = async () => {
      try {
        const { data } = await axios.get("/api/service-providers/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServiceProviders(data);
      } catch (error) {
        toast.error(getError(error));
      }
    };
    fetchServiceProviders();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchMessage = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/service-providers/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setClient(data.client || "");
        setText(data.text || "");
        setDate(data.date ? data.date.substring(0, 10) : ""); // ISO date (yyyy-mm-dd)
        setServiceProvider(data.serviceProvider?._id || data.serviceProvider || "");
        setProjectName(data.projectName || "");
        dispatch({ type: "FETCH_SUCCESS" });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchMessage();
  }, [messageId, token]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("You are not authenticated.");
      return;
    }
    try {
      dispatch({ type: "UPDATE_REQUEST" });
      await axios.put(
        `/api/service-providers/messages/${messageId}`,
        {
          client,
          text,
          date,
          serviceProvider,
          projectName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch({ type: "UPDATE_SUCCESS" });
      toast.success("Message updated successfully");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: "UPDATE_FAIL" });
    }
  };

  return (
    <Container className="small-container">
      <h1>Edit Message {messageId}</h1>
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="client">
            <Form.Label>Client</Form.Label>
            <Form.Control
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="text">
            <Form.Label>Text</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="date">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="serviceProvider">
            <Form.Label>Service Provider</Form.Label>
            <Form.Select
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              required
            >
              <option value="">Select Service Provider</option>
              {serviceProviders.map((provider) => (
                <option key={provider._id} value={provider._id}>
                  {provider.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="projectName">
            <Form.Label>Project Name</Form.Label>
            <Form.Control
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </Form.Group>

          <div className="mb-3">
            <Button disabled={loadingUpdate} type="submit" variant="secondary">
              Update
            </Button>
            {loadingUpdate && <LoadingBox />}
          </div>
        </Form>
      )}
    </Container>
  );
};

export default MessageEditPage;
