import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import InputGroup from "react-bootstrap/InputGroup";
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

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
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
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "600px", width: "100%" }}
      >
        <Card.Body>
          <h1 className="text-center text-primary fs-1 pt-4 mb-4 fw-bold my-3">
            User Login
          </h1>
          <Form onSubmit={submitHandler}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                required
                className="w-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  required
                 className="w-auto"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  // variant="outline-success"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i
                    className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                  ></i>
                </Button>
              </InputGroup>
            </Form.Group>
            <div className="d-grid mb-3">
              <Button
                type="submit"
                className="go-to-btn btn-lg  btn-text"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
            <div className="text-center">
              New customer?{" "}
              <Link to={`/signup?redirect=${redirect}`}>
                Create your account
              </Link>
            </div>
            <div className="text-center">
              Forget Password?{" "}
              <Link to={`/forget-password`}>Reset Password</Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
