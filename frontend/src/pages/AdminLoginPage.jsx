import axios from "axios";
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { dispatch: ctxDispatch } = useContext(Store);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Email and password are required");
      return;
    }

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
      toast.error(error.response?.data?.message || "Invalid admin credentials");
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

              <Form onSubmit={handleAdminLogin}>
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label className="form-label">
                    <i className="fas fa-envelope"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="xxxxxx@xxxxxx.xxx"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-control-lg"
                  />
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-control-lg"
                  />
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
