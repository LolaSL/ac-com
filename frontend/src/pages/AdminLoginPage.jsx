import axios from "axios";
import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { dispatch: ctxDispatch } = useContext(Store);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginError, setLoginError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (trimmedEmail, trimmedPassword) => {
    const errors = {};
    if (!trimmedEmail) {
      errors.email = "Email address is required";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address";
    }
    if (!trimmedPassword) {
      errors.password = "Password is required";
    } else if (trimmedPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    return errors;
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    const errors = validate(trimmedEmail, trimmedPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoginError("");
    setSubmitting(true);

    try {
      const payload = {
        email: trimmedEmail,
        password: trimmedPassword,
      };
      if (mfaRequired) payload.totp = totp.trim();

      const { data } = await axios.post(`/api/users/admin/signin`, payload);

      ctxDispatch({ type: "ADMIN_LOGIN", payload: data });
      localStorage.setItem("adminInfo", JSON.stringify(data));

      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (error) {
      const resp = error.response?.data;
      if (resp?.mfaRequired) {
        setMfaRequired(true);
        setLoginError(
          totp ? resp.message || "Invalid authenticator code" : ""
        );
      } else {
        setLoginError(resp?.message || "Invalid email or password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="admin-login-container">
        <div className="admin-login-wrapper">
          {/* Left Side - Branding & Info */}
          <div className="admin-login-left">
            <div className="admin-branding">
              <div className="admin-logo-container">
                <i className="fas fa-shield-alt admin-logo-icon"></i>
              </div>
              <h1 className="admin-brand-title">AC-Commerce</h1>
              <h2 className="admin-brand-subtitle">Admin Portal</h2>
              <p className="admin-brand-description">
                Secure access to your administration dashboard. Manage products, orders, and analytics.
              </p>
              
              <div className="admin-features">
                <div className="admin-feature-item">
                  <i className="fas fa-chart-line"></i>
                  <span>Advanced Analytics</span>
                </div>
                <div className="admin-feature-item">
                  <i className="fas fa-users-cog"></i>
                  <span>User Management</span>
                </div>
                <div className="admin-feature-item">
                  <i className="fas fa-cube"></i>
                  <span>Product Control</span>
                </div>
                <div className="admin-feature-item">
                  <i className="fas fa-lock"></i>
                  <span>Secure Platform</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="admin-login-right">
            <div className="admin-form-container">
              <div className="admin-form-header">
                <i className="fas fa-user-shield admin-form-icon"></i>
                <h2 className="admin-form-title">Admin Login</h2>
                <p className="admin-form-subtitle">Enter your credentials to continue</p>
              </div>

              <Form onSubmit={handleAdminLogin} noValidate className="admin-login-form">
                {loginError && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setLoginError("")}
                    className="admin-error-alert"
                  >
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {loginError}
                  </Alert>
                )}

                <Form.Group controlId="email" className="admin-form-group">
                  <Form.Label className="admin-form-label">
                    <i className="fas fa-envelope me-2"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="admin@accommerce.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email)
                        setFieldErrors((p) => ({ ...p, email: "" }));
                      if (loginError) setLoginError("");
                    }}
                    isInvalid={!!fieldErrors.email}
                    className="admin-form-input"
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="password" className="admin-form-group">
                  <Form.Label className="admin-form-label">
                    <i className="fas fa-lock me-2"></i>
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((p) => ({ ...p, password: "" }));
                      if (loginError) setLoginError("");
                    }}
                    isInvalid={!!fieldErrors.password}
                    className="admin-form-input"
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                {mfaRequired && (
                  <Form.Group controlId="totp" className="admin-form-group">
                    <Form.Label className="admin-form-label">
                      <i className="fas fa-shield-alt me-2"></i>
                      Authenticator Code
                    </Form.Label>
                    <Form.Control
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={totp}
                      onChange={(e) => {
                        setTotp(e.target.value.replace(/\D/g, ""));
                        if (loginError) setLoginError("");
                      }}
                      className="admin-form-input"
                      autoFocus
                    />
                    <Form.Text className="text-muted">
                      Enter the code from your authenticator app.
                    </Form.Text>
                  </Form.Group>
                )}

                <div className="d-grid">
                  <Button
                    type="submit"
                    className="admin-login-button"
                    disabled={submitting}
                  >
                    {submitting ? (
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
                        Sign In to Dashboard
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="admin-form-footer">
                <i className="fas fa-info-circle me-2"></i>
                <small>Authorized personnel only • Protected by encryption</small>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
