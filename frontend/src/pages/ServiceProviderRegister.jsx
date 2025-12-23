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

const ServiceProviderRegister = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get("redirect");
  const redirect = redirectInUrl ? redirectInUrl : "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [typeOfProvider, setTypeOfProvider] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolio, setPortfolio] = useState("");

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { serviceProviderInfo } = state;

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post("/api/service-providers/register", {
        name,
        email,
        password,
        typeOfProvider,
        phone,
        company,
        experience,
        portfolio,
      });
      ctxDispatch({ type: "SERVICE_PROVIDER_REGISTER", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      navigate(redirect || "/");
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
    <Container className="d-flex justify-content-center align-items-center min-vh-100 py-4">
      <Card
        className="shadow-lg p-4"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <Card.Body>
          <h1 className="text-center mb-4 fw-bold text-primary">
            Service Provider Register
          </h1>
          <Form onSubmit={submitHandler}>
            <Form.Group controlId="name" className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>

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

            <Form.Group controlId="typeOfProvider" className="mb-3">
              <Form.Label>Type of Service Provider</Form.Label>
              <Form.Select
                value={typeOfProvider}
                onChange={(e) => setTypeOfProvider(e.target.value)}
                required
              >
                <option value="">Select Type</option>
                <option value="architect">Architect</option>
                <option value="constructor">Constructor</option>
                <option value="designer">Designer</option>
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="phone" className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="company" className="mb-3">
              <Form.Label>Company</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="experience" className="mb-3">
              <Form.Label>Experience (Years)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter experience in years"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="portfolio" className="mb-3">
              <Form.Label>Portfolio</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter portfolio link"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
              />
            </Form.Group>
            <div className="d-grid mb-3">
              <Button
                type="submit"
                className="go-to-btn btn-lg"
                variant="primary"
              >
                Register
              </Button>
            </div>
            <div className="text-center">
              Already have an account?{" "}
              <Link to={`/serviceprovider/login?redirect=${redirect}`}>
                Login here
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ServiceProviderRegister;
