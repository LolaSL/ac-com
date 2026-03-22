import axios from "axios";
import { useContext, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import { getError } from "../utils";
import "./ForgetPasswordPage.css";

export default function ForgetPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    if (userInfo) {
      navigate("/");
    }
  }, [navigate, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    try {
      const { data } = await axios.post("/api/users/forget-password", {
        email,
      });
      toast.success(data.message || "Password reset link sent to your email!");
      setSent(true);
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-page">
      <Link to="/" className="auth-home-link">
        <i className="fas fa-home"></i>
        <span>Home</span>
      </Link>
      <Container fluid className="fp-container">
        <div className="fp-wrapper">
          {/* Left Side - Branding */}
          <div className="fp-left">
            <div className="fp-branding">
              <div className="fp-logo-container">
                <i className="fas fa-key fp-logo-icon"></i>
              </div>
              <h1 className="fp-brand-title">AC-Commerce</h1>
              <h2 className="fp-brand-subtitle">Password Recovery</h2>
              <p className="fp-brand-description">
                Don't worry — it happens to everyone. Enter your email and
                we'll send you a secure link to reset your password.
              </p>

              <div className="fp-steps">
                <div className="fp-step">
                  <div className="fp-step-num">1</div>
                  <div className="fp-step-text">
                    <strong>Enter Email</strong>
                    <span>Provide your registered email address</span>
                  </div>
                </div>
                <div className="fp-step">
                  <div className="fp-step-num">2</div>
                  <div className="fp-step-text">
                    <strong>Check Inbox</strong>
                    <span>We'll send a secure reset link</span>
                  </div>
                </div>
                <div className="fp-step">
                  <div className="fp-step-num">3</div>
                  <div className="fp-step-text">
                    <strong>Reset Password</strong>
                    <span>Create a new strong password</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="fp-right">
            <div className="fp-form-container">
              {sent ? (
                <div className="fp-success-card">
                  <i className="fas fa-check-circle fp-success-icon"></i>
                  <h2 className="fp-success-title">Email Sent!</h2>
                  <p className="fp-success-text">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Check your inbox and follow the instructions.
                  </p>
                  <p className="fp-success-hint">
                    Didn't receive it? Check your spam folder or
                    <button
                      type="button"
                      className="fp-resend-btn"
                      onClick={() => setSent(false)}
                    >
                      try again
                    </button>
                  </p>
                  <Link to="/signin" className="fp-back-link">
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <div className="fp-form-header">
                    <i className="fas fa-unlock-alt fp-form-icon"></i>
                    <h2 className="fp-form-title">Forgot Password?</h2>
                    <p className="fp-form-subtitle">
                      Enter your email to receive a reset link
                    </p>
                  </div>

                  <Form
                    onSubmit={submitHandler}
                    noValidate
                    className="fp-form"
                  >
                    {formError && (
                      <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setFormError("")}
                        className="fp-error-alert"
                      >
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {formError}
                      </Alert>
                    )}

                    <Form.Group controlId="email" className="fp-form-group">
                      <Form.Label className="fp-form-label">
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
                          setFormError("");
                        }}
                        className="fp-form-input"
                      />
                    </Form.Group>

                    <div className="fp-form-footer">
                      <span>Remember your password?  </span>
                       <Link to="/signin" className="fp-signin-link">
                         Sign In
                      </Link>
                    </div>

                    <div className="d-grid">
                      <Button
                        type="submit"
                        className="fp-button"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                            ></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane me-2"></i>
                            Send Reset Link
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
