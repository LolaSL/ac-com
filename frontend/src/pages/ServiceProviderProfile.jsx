import React, { useContext, useReducer, useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import NavLink from "react-bootstrap/NavLink";

const reducer = (state, action) => {
  switch (action.type) {
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

export default function ServiceProviderProfile() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [name, setName] = useState(serviceProviderInfo?.name || "");
  const [typeOfProvider, setTypeOfProvider] = useState(
    serviceProviderInfo?.typeOfProvider || ""
  );
  const [experience, setExperience] = useState(
    serviceProviderInfo?.experience || ""
  );
  const [email, setEmail] = useState(serviceProviderInfo?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [{ loadingUpdate }, dispatch] = useReducer(reducer, {
    loadingUpdate: false,
  });
  console.log(serviceProviderInfo);
  console.log(serviceProviderInfo?._id);
  const submitHandler = async (e) => {
    e.preventDefault();

    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!serviceProviderInfo || !serviceProviderInfo._id) {
      toast.error(
        "Service Provider information is missing or you are not logged in."
      );
      return;
    }

    try {
      const { data } = await axios.put(
        `/api/service-providers/profile/${serviceProviderInfo._id}`,
        {
          name,
          typeOfProvider,
          experience,
          email,
          password: password || undefined,
        },
        {
          headers: { Authorization: `Bearer ${serviceProviderInfo.token}` },
        }
      );

      dispatch({ type: "UPDATE_SUCCESS" });
      ctxDispatch({ type: "SERVICE_PROVIDER_LOGIN", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      toast.success("Service Provider updated successfully");
      navigate("/");
    } catch (err) {
      dispatch({ type: "UPDATE_FAIL" });
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (!serviceProviderInfo) {
      navigate("/serviceprovider/login");
    }
  }, [serviceProviderInfo, navigate]);

  return (
    <Container className="container small-container">
      <h1 className="mt-4 mb-4 fw-bold">Service Provider Profile</h1>
      <div className="card p-3 mb-4">
        <h1 className="mt-2 mb-2-italic">{name}</h1>
        {serviceProviderInfo && (
          <div className="provider-update">
            <p>{typeOfProvider}.</p>
            <p>{experience} years.</p>
          </div>
        )}

        <div className="profile-icons d-flex mb-4">
          <NavLink href="#">
            {" "}
            <i className="fa-brands fa-facebook"></i>
          </NavLink>
          <NavLink href="#">
            {" "}
            <i className="fa-brands fa-twitter"></i>
          </NavLink>
          <NavLink href="#">
            {" "}
            <i className="fa-brands fa-instagram"></i>
          </NavLink>
          <NavLink href="#">
            {" "}
            <i className="fa-brands fa-linkedin-in"></i>
          </NavLink>
        </div>
      </div>

      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="typeOfProvider">
          <Form.Label>Profession</Form.Label>
          <Form.Control
            value={typeOfProvider}
            onChange={(e) => setTypeOfProvider(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="experience">
          <Form.Label>Experience</Form.Label>
          <Form.Control
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="confirmPassword">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Form.Group>
        <div className="mb-3">
          <Button type="submit" disabled={loadingUpdate} className="btn btn-secondary mt-3">
            {loadingUpdate ? "Updating..." : "Update"}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

