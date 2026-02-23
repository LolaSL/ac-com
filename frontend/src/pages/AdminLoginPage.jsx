import axios from "axios";
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { dispatch: ctxDispatch } = useContext(Store);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { data } = await axios.post(`/api/users/admin/signin`, {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      ctxDispatch({ type: "ADMIN_LOGIN", payload: data });
      localStorage.setItem("adminInfo", JSON.stringify(data));

      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (error) {
      const msg =
        error.response?.data?.message || "Invalid email or password";
      setLoginError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar d-none d-md-flex">
        <div style={{ padding: "1rem" }}>
          <h3>Admin Portal</h3>
          <div>
            <i className="fas fa-shield-alt"></i>
            Secure Access
          </div>
          <div>
            <i className="fas fa-user-cog"></i>
            Administration
          </div>
          <div>
            <i className="fas fa-chart-line"></i>
            Dashboard
          </div>
        </div>
      </div>

      <div className="main-content">
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <Card className="admin-card shadow-sm">
            <Card.Body className="admin-card-body">
              <div className="text-center mb-4">
                <i className="fas fa-user-shield fa-3x admin-icon mb-3"></i>
                <h2 className="fw-bold admin-title fs-1">Admin Login</h2>
                <p className="admin-subtitle">
                  Access the administration dashboard
                </p>
              </div>

              <Form onSubmit={handleAdminLogin} noValidate>
                {loginError && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setLoginError("")}
                    className="mb-3"
                  >
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {loginError}
                  </Alert>
                )}

                <Form.Group controlId="email" className="mb-3">
                  <Form.Label className="form-label">
                    <i className="fas fa-envelope"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="xxxxxx@xxxxxx.xxx"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email)
                        setFieldErrors((p) => ({ ...p, email: "" }));
                      if (loginError) setLoginError("");
                    }}
                    isInvalid={!!fieldErrors.email}
                    className="form-control-lg"
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group controlId="password" className="mb-4">
                  <Form.Label className="form-label">
                    <i className="fas fa-lock"></i>
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((p) => ({ ...p, password: "" }));
                      if (loginError) setLoginError("");
                    }}
                    isInvalid={!!fieldErrors.password}
                    className="form-control-lg"
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-grid">
                  <Button
                    type="submit"
                    className="btn btn-primary btn-lg fw-semibold btn-admin-login"
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
                        Login as Admin
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="admin-footer">
                <small>
                  <i className="fas fa-info-circle"></i>
                  Authorized personnel only
                </small>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}
