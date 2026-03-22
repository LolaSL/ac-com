import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import { getError } from "../utils.js";
import "./SignInPage.css";

export default function SignInPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await Axios.post("/api/users/signin", {
        email,
        password,
      });
      ctxDispatch({ type: "USER_SIGNIN", payload: data });
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate(redirect || "/");
      toast.success("Signed in successfully");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  return (
    <div className="signin-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="signin-container">
        <div className="signin-wrapper">
          {/* Left Side - Branding */}
          <div className="signin-left">
            <div className="signin-branding">
              <div className="signin-logo-container">
                <i className="fas fa-snowflake signin-logo-icon"></i>
              </div>
              <h1 className="signin-brand-title">AC-Commerce</h1>
              <h2 className="signin-brand-subtitle">Welcome Back</h2>
              <p className="signin-brand-description">
              The smarter way to shop for HVAC. Browse your apartment plan, design your system, calculate your needs, and get expert quote guidance — from planning to installation.
              </p>
   
              <div className="signin-features">
                  <div className="signin-feature-item">
                  <i className="fas fa-ruler-combined"></i>
                  <span>Measurement System</span>
                </div>
                <div className="signin-feature-item">
                  <i className="fas fa-shopping-cart"></i>
                  <span>Smart Shopping</span>
                </div>
                <div className="signin-feature-item">
                  <i className="fas fa-truck"></i>
                  <span>Fast Delivery</span>
                </div>
           
                <div className="signin-feature-item">
                  <i className="fas fa-headset"></i>
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="signin-right">
            <div className="signin-form-container">
              <div className="signin-form-header">
                <i className="fas fa-user-circle signin-form-icon"></i>
                <h2 className="signin-form-title">User Login</h2>
                <p className="signin-form-subtitle">
                  Sign in to access your account
                </p>
              </div>

              <Form
                onSubmit={submitHandler}
                noValidate
                className="signin-form"
              >
                {error && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError("")}
                    className="signin-error-alert"
                  >
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </Alert>
                )}

                <Form.Group controlId="email" className="signin-form-group">
                  <Form.Label className="signin-form-label">
                    <i className="fas fa-envelope me-2"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="signin-form-input"
                  />
                </Form.Group>

                <Form.Group controlId="password" className="signin-form-group">
                  <Form.Label className="signin-form-label">
                    <i className="fas fa-lock me-2"></i>
                    Password
                  </Form.Label>
                  <div className="signin-password-wrapper">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="signin-form-input"
                    />
                    <button
                      type="button"
                      className="signin-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      <i
                        className={
                          showPassword ? "fas fa-eye-slash" : "fas fa-eye"
                        }
                      ></i>
                    </button>
                  </div>
                </Form.Group>

                <div className="signin-forgot-row">
                  <div className="signin-new-customer">
                    <span>New customer? </span>
                    <Link
                      to={`/signup?redirect=${redirect}`}
                      className="signin-signup-link"
                    >
                      Create your account
                    </Link>
                  </div>
                  <Link to="/forget-password" className="signin-forgot-link">
                    Forgot password?
                  </Link>
                </div>

                <div className="d-grid">
                  <Button
                    type="submit"
                    className="signin-button"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        ></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In
                      </>
                    )}
                  </Button>
                </div>
              </Form>


            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
