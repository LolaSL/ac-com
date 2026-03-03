import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import { FaToolbox, FaEnvelope, FaLock } from "react-icons/fa";
import "./ServiceProviderLogin.css";

const ServiceProviderLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { search } = useLocation();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post("/api/service-providers/login", {
        email,
        password,
      });
      ctxDispatch({ type: "SERVICE_PROVIDER_LOGIN", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      navigate(redirect);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (serviceProviderInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, serviceProviderInfo]);

  return (
    <div className="sp-login-page">
      <div className="sp-login-hero">
        <div className="sp-login-hero__icon"><FaToolbox /></div>
        <h1 className="sp-login-hero__title">Service Provider Portal</h1>
        <p className="sp-login-hero__sub">Sign in to manage your projects, earnings and profile.</p>
      </div>

      <div className="sp-login-card">
        <h2 className="sp-login-card__title">Welcome back</h2>
        <p className="sp-login-card__sub">Enter your credentials to continue</p>

        <Form onSubmit={submitHandler}>
          <Form.Group controlId="email" className="sp-login-field">
            <Form.Label className="sp-login-label">
              <FaEnvelope className="sp-login-label__icon" /> Email Address
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="your@email.com"
              className="sp-login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="password" className="sp-login-field">
            <Form.Label className="sp-login-label">
              <FaLock className="sp-login-label__icon" /> Password
            </Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              className="sp-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button type="submit" className="sp-login-btn">
            Sign In
          </Button>
        </Form>

        <div className="sp-login-footer">
          New here?{" "}
          <Link to={`/serviceprovider/register?redirect=${redirect}`}>Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderLogin;

