import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import "./ServiceProviderLogin.css";

const ServiceProviderLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { search } = useLocation();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await Axios.post("/api/service-providers/login", {
        email,
        password,
      });
      ctxDispatch({ type: "SERVICE_PROVIDER_LOGIN", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      navigate(redirect);
      toast.success("Signed in successfully");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceProviderInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, serviceProviderInfo]);

  return (
    <div className="spl-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="spl-container">
        <div className="spl-wrapper">
          {/* ── Left Panel ── */}
          <div className="spl-left">
            <div className="spl-brand">
              <div className="spl-brand__icon">
                <i className="fas fa-tools"></i>
              </div>
              <h1 className="spl-brand__title">Service Provider Portal</h1>
              <p className="spl-brand__desc">
                Manage your HVAC projects, track earnings, respond to service
                requests, and grow your business — all from one dashboard.
              </p>
            </div>

            <div className="spl-features">
              <div className="spl-feature">
                <i className="fas fa-project-diagram spl-feature__icon"></i>
                <div>
                  <strong>Project Management</strong>
                  <span>Track jobs from request to completion</span>
                </div>
              </div>
              <div className="spl-feature">
                <i className="fas fa-wallet spl-feature__icon"></i>
                <div>
                  <strong>Earnings Dashboard</strong>
                  <span>Monitor revenue and payment history</span>
                </div>
              </div>
              <div className="spl-feature">
                <i className="fas fa-comments spl-feature__icon"></i>
                <div>
                  <strong>Client Messaging</strong>
                  <span>Communicate directly with customers</span>
                </div>
              </div>
              <div className="spl-feature">
                <i className="fas fa-user-shield spl-feature__icon"></i>
                <div>
                  <strong>Verified Profile</strong>
                  <span>Build trust with a certified badge</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="spl-right">
            <div className="spl-form-box">
              <div className="spl-form-header">
                <div className="spl-form-avatar">
                  <i className="fas fa-hard-hat"></i>
                </div>
                <h2 className="spl-form-title">Welcome Back</h2>
                <p className="spl-form-sub">Sign in to your provider account</p>
              </div>

              {error && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setError("")}
                  className="spl-alert"
                >
                  {error}
                </Alert>
              )}

              <Form onSubmit={submitHandler}>
                <Form.Group controlId="sp-email" className="spl-field">
                  <Form.Label className="spl-label">Email Address</Form.Label>
                  <div className="spl-input-wrap">
                    <i className="fas fa-envelope spl-input-icon"></i>
                    <Form.Control
                      type="email"
                      placeholder="you@company.com"
                      className="spl-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </Form.Group>

                <Form.Group controlId="sp-password" className="spl-field">
                  <Form.Label className="spl-label">Password</Form.Label>
                  <div className="spl-input-wrap">
                    <i className="fas fa-lock spl-input-icon"></i>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="spl-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="spl-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </Form.Group>

                <Button
                  type="submit"
                  className="spl-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Signing in…
                    </>
                  ) : (
                    <>
                      Sign In <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </Button>
              </Form>

              <div className="spl-footer">
                New service provider?{" "}
                <Link to={`/serviceprovider/register?redirect=${redirect}`}>
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ServiceProviderLogin;

