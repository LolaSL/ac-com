import axios from "axios";
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";

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
      <div
        className="sidebar d-none d-md-flex"
        style={{ backgroundColor: "#f8f9fa", borderRight: "1px solid #ddd" }}
      >
        <div style={{ padding: "1rem" }}>
          <h3
            style={{
              marginBottom: "2rem",
              color: "#343a40",
              fontWeight: "bold",
            }}
          >
            Admin Portal
          </h3>
          <div style={{ marginBottom: "1rem" }}>
            <i
              className="fas fa-shield-alt"
              style={{ marginRight: "0.5rem", color: "#007bff" }}
            ></i>
            Secure Access
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <i
              className="fas fa-user-cog"
              style={{ marginRight: "0.5rem", color: "#007bff" }}
            ></i>
            Administration
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <i
              className="fas fa-chart-line"
              style={{ marginRight: "0.5rem", color: "#007bff" }}
            ></i>
            Dashboard
          </div>
        </div>
      </div>

      <div className="main-content" style={{ backgroundColor: "#ffffff" }}>
        <Container className="d-flex justify-content-center align-items-center min-vh-100">
          <Card
            className="shadow-sm"
            style={{
              maxWidth: "450px",
              width: "100%",
              border: "1px solid #e9ecef",
            }}
          >
            <Card.Body style={{ padding: "2rem" }}>
              <div className="text-center mb-4">
                <i className="fas fa-user-shield fa-3x text-primary mb-3"></i>
                <h2 className="fw-bold text-dark">Admin Login</h2>
                <p className="text-muted">
                  Access the administration dashboard
                </p>
              </div>

              <Form onSubmit={handleAdminLogin}>
                <Form.Group controlId="email" className="mb-3">
                  <Form.Label className="fw-semibold">
                    <i className="fas fa-envelope me-2 text-primary"></i>
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
                  <Form.Label className="fw-semibold">
                    <i className="fas fa-lock me-2 text-primary"></i>
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
                    className="btn btn-primary btn-lg fw-semibold"
                    disabled={submitting}
                    style={{
                      background:
                        "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                    }}
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

              <div className="text-center mt-4">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
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
