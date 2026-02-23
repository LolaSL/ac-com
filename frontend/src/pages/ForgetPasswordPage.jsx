import axios from "axios";
import { useContext, useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Store } from "../Store";
import { getError } from "../utils";
import "./ForgetPasswordPage.css";

export default function ForgetPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

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
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="small-container">
      <h1 className="my-3">Forget Password</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            required
            onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
          />
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
                Sending...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
}
