import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import "./SignUpPage.css";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { state, dispatch: ctxDispatch } = useContext(Store);
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

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      let ref = new URLSearchParams(search).get("ref"); // Get referral code from URL
      if (!ref) {
        ref = localStorage.getItem("referralCode"); // Fallback to localStorage
      }
      console.log(
        "Signup ref from URL:",
        new URLSearchParams(search).get("ref")
      );
      console.log(
        "Signup ref from localStorage:",
        localStorage.getItem("referralCode")
      );
      console.log("Final ref used:", ref);
      const { data } = await Axios.post(
        `/api/users/signup${ref ? `?ref=${ref}` : ""}`,
        {
          name,
          email,
          password,
        }
      );

      ctxDispatch({ type: "USER_SIGNIN", payload: data });
      localStorage.setItem("userInfo", JSON.stringify(data));
      if (ref) {
        localStorage.removeItem("referralCode"); // Clear after use
      }
      toast.success("Account created successfully!");
      navigate(redirect || "/");
    } catch (err) {
      toast.error(getError(err));
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
    <Container className="small-container">
      <h1 className="my-3">Sign Up</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control onChange={(e) => setName(e.target.value)} required />
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
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
              className="password-toggle-btn"
            >
              <i
                className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
              ></i>
            </Button>
          </div>
          {password && (
            <div className="password-strength-container">
              <div className="d-flex align-items-center gap-2">
                <div className="password-strength-bar-container">
                  <div
                    className="password-strength-bar"
                    style={{
                      width: `${
                        (getPasswordStrength(password).strength / 4) * 100
                      }%`,
                      backgroundColor:
                        getPasswordStrength(password).color === "danger"
                          ? "#dc3545"
                          : getPasswordStrength(password).color === "warning"
                          ? "#ffc107"
                          : getPasswordStrength(password).color === "info"
                          ? "#0dcaf0"
                          : "#198754",
                    }}
                  />
                </div>
                <small
                  className={`text-${
                    getPasswordStrength(password).color
                  } password-strength-label`}
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
          <Form.Label>Confirm Password</Form.Label>
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
              className="password-toggle-btn"
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

        <div className="mb-3">
          <Button
            type="submit"
            className="go-to-btn btn-text me-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </div>
        <div className="mb-3">
          Already have an account?{" "}
          <Link to={`/signin?redirect=${redirect}`}>Sign-In</Link>
        </div>
      </Form>
    </Container>
  );
}
