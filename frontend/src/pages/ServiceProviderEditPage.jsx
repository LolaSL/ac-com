import axios from "axios";
import React, { useContext, useEffect, useReducer, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Store } from "../Store";
import { getError } from "../utils";
import { FaUserEdit } from "react-icons/fa";
import "./AdminHero.css";
import "./ServiceProviderEditPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false };
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

export default function ServiceProviderEditPage() {
  const [{ loading, error, loadingUpdate }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
  });

  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = userInfo?.token || adminInfo?.token;

  const params = useParams();
  const { id: serviceProviderId } = params;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(
          `/api/service-providers/${serviceProviderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setName(data.name);
        setEmail(data.email);
        setIsActive(data.isActive);
        dispatch({ type: "FETCH_SUCCESS" });
      } catch (err) {
        dispatch({
          type: "FETCH_FAIL",
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [serviceProviderId, token, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: "UPDATE_REQUEST" });
      await axios.put(
        `/api/service-providers/${serviceProviderId}`,
        { _id: serviceProviderId, name, email, isActive },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      dispatch({
        type: "UPDATE_SUCCESS",
      });
      toast.success("Service provider updated successfully");
      navigate("/admin/manage-service-providers");
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: "UPDATE_FAIL" });
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaUserEdit /></div>
          <h1 className="adm-hero__title">Edit Service Provider</h1>
          <p className="adm-hero__sub">Update name, email and active status for this provider.</p>
        </div>
      </div>
      <div className="adm-inner">
        <div className="sp-edit-card">
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <Form onSubmit={submitHandler}>
          <Form.Group className="mb-3" controlId="name">
            <Form.Label className="sp-edit-label">Name</Form.Label>
            <Form.Control
              className="sp-edit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label className="sp-edit-label">Email</Form.Label>
            <Form.Control
              className="sp-edit-input"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Check
            className="mb-4"
            type="checkbox"
            id="isActive"
            label="Active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />

          <div className="sp-edit-actions">
            <Button type="submit" className="sp-edit-save-btn" disabled={loadingUpdate}>
              {loadingUpdate ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" className="sp-edit-cancel-btn"
              onClick={() => navigate("/admin/manage-service-providers")}>
              Cancel
            </Button>
          </div>
          {loadingUpdate && <LoadingBox />}
        </Form>
      )}
        </div>
      </div>
    </div>
  );
}
