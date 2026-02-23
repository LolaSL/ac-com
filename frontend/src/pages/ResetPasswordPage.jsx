import Axios from "axios";
import { useContext, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import { getError } from "../utils";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const { state } = useContext(Store);
  const { userInfo } = state;

  const getPasswordStrength = (pass) => {
    if (!pass) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[^a-zA-Z\d]/.test(pass)) strength++;

    const levels = [
      { strength: 0, label: "", color: "" },
      { strength: 1, label: "Weak", color: "danger" },
      { strength: 2, label: "Fair", color: "warning" },
      { strength: 3, label: "Good", color: "info" },
      { strength: 4, label: "Strong", color: "success" },
    ];
    return levels[strength];
  };

  useEffect(() => {
    if (userInfo || !token) {
      navigate("/");
    }
  }, [navigate, userInfo, token]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setFormError("");
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await Axios.post("/api/users/reset-password", {
        password,
        token,
      });
      toast.success("Password updated successfully! Redirecting...");
      setTimeout(() => {
        navigate("/signin");
      }, 1500);
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="small-container">
      <h1 className="my-3">Reset Password</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>New Password</Form.Label>
          <div className="position-relative">
            <Form.Control
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              variant="link"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "0",
                border: "none",
                background: "none",
                color: "#6c757d",
              }}
            >
              <i
                className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
              ></i>
            </Button>
          </div>
          {password && (
            <div className="mt-2">
              <div className="d-flex align-items-center gap-2">
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    backgroundColor: "#e9ecef",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${
                        (getPasswordStrength(password).strength / 4) * 100
                      }%`,
                      height: "100%",
                      backgroundColor:
                        getPasswordStrength(password).color === "danger"
                          ? "#dc3545"
                          : getPasswordStrength(password).color === "warning"
                          ? "#ffc107"
                          : getPasswordStrength(password).color === "info"
                          ? "#0dcaf0"
                          : "#198754",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <small
                  className={`text-${getPasswordStrength(password).color}`}
                  style={{ minWidth: "60px" }}
                >
                  {getPasswordStrength(password).label}
                </small>
              </div>
              <Form.Text className="text-muted">
                Use 8+ characters with mix of letters, numbers & symbols
              </Form.Text>
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-3" controlId="confirmPassword">
          <Form.Label>Confirm New Password</Form.Label>
          <div className="position-relative">
            <Form.Control
              type={showConfirmPassword ? "text" : "password"}
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
              required
            />
            <Button
              variant="link"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                padding: "0",
                border: "none",
                background: "none",
                color: "#6c757d",
              }}
            >
              <i
                className={
                  showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"
                }
              ></i>
            </Button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <Form.Text className="text-danger">
              Passwords do not match
            </Form.Text>
          )}
        </Form.Group>

        {formError && (
          <Alert variant="danger" dismissible onClose={() => setFormError("")} className="mb-3">
            <i className="fas fa-exclamation-circle me-2"></i>{formError}
          </Alert>
        )}

        <div className="mb-3">
          <Button
            className="go-to-btn btn-text"
            variant="btn-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
