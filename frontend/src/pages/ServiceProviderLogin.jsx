import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";

const ServiceProviderLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { search } = useLocation();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post("/api/service-providers/login", {
        email,
        password,
      });
      ctxDispatch({ type: "SERVICE_PROVIDER_LOGIN", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      navigate(redirect);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (serviceProviderInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, serviceProviderInfo]);

  return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "400px", width: "100%" }}
      >
        <Card.Body>
          <h1 className="text-center mb-4 fw-bold text-primary">
            Service Provider Login
          </h1>
          <Form onSubmit={submitHandler}>
            <Form.Group controlId="email" className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="password" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-grid mb-3">
              <Button
                type="submit"
                className="go-to-btn btn-lg"
                variant="primary"
              >
                Login
              </Button>
            </div>
            <div className="text-center">
              New service provider?{" "}
              <Link to={`/serviceprovider/register?redirect=${redirect}`}>
                Register here
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ServiceProviderLogin;
