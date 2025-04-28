import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
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
    <Container className="small-container">
      <h1 className="text-center pt-4 mb-4 fw-bold my-3">Register</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="email">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="typeOfProvider">
          <Form.Label>Type of Service Provider</Form.Label>
          <Form.Select
            value={typeOfProvider}
            onChange={(e) => setTypeOfProvider(e.target.value)}
          >
            <option value="">Select Type</option>
            <option value="architect">Architect</option>
            <option value="constructor">Constructor</option>
            <option value="designer">Designer</option>
          </Form.Select>
        </Form.Group>

        <Form.Group controlId="phone">
          <Form.Label>Phone</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="company">
          <Form.Label>Company</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          ></Form.Control>
        </Form.Group>

        <Form.Group controlId="experience">
          <Form.Label>Experience (Years)</Form.Label>
          <Form.Control
            type="number"
            placeholder="Enter experience in years"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          ></Form.Control>
        </Form.Group>
        <Form.Group controlId="portfolio">
          <Form.Label>Portfolio</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter portfolio link"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
          ></Form.Control>
        </Form.Group>
        <div className="mb-3">
          <Button
            type="submit"
            variant="secondary"
            className="btn btn-secondary btn-md me-2"
          >
            Register
          </Button>
        </div>
        <div className="mb-3">
          Already have an account?{" "}
          <Link to={`/serviceprovider/login?redirect=${redirect}`}>
            Login In
          </Link>
        </div>
      </Form>
    </Container>
  );
};

export default ServiceProviderRegister;
