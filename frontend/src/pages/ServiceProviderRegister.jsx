import Axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useContext, useEffect, useState } from "react";
import { Store } from "../Store";
import { toast } from "react-toastify";
import { getError } from "../utils";
import { FaToolbox, FaEnvelope, FaLock, FaUser, FaPhone, FaBuilding, FaStar, FaLink } from "react-icons/fa";
import "./ServiceProviderRegister.css";

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
        name, email, password, typeOfProvider, phone, company, experience, portfolio,
      });
      ctxDispatch({ type: "SERVICE_PROVIDER_REGISTER", payload: data });
      localStorage.setItem("serviceProviderInfo", JSON.stringify(data));
      navigate(redirect || "/");
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (serviceProviderInfo) navigate(redirect);
  }, [navigate, redirect, serviceProviderInfo]);

  return (
    <div className="sp-reg-page">
      <div className="sp-reg-hero">
        <div className="sp-reg-hero__icon"><FaToolbox /></div>
        <h1 className="sp-reg-hero__title">Join as a Service Provider</h1>
        <p className="sp-reg-hero__sub">Create your account to start receiving projects and managing earnings.</p>
      </div>

      <div className="sp-reg-card">
        <h2 className="sp-reg-card__title">Create Account</h2>
        <p className="sp-reg-card__sub">Fill in your details below</p>

        <Form onSubmit={submitHandler}>
          <div className="sp-reg-grid">
            <Form.Group controlId="name">
              <Form.Label className="sp-reg-label"><FaUser className="sp-reg-label__icon" /> Full Name</Form.Label>
              <Form.Control type="text" placeholder="Your full name" className="sp-reg-input"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </Form.Group>

            <Form.Group controlId="email">
              <Form.Label className="sp-reg-label"><FaEnvelope className="sp-reg-label__icon" /> Email Address</Form.Label>
              <Form.Control type="email" placeholder="your@email.com" className="sp-reg-input"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Form.Group>

            <Form.Group controlId="password">
              <Form.Label className="sp-reg-label"><FaLock className="sp-reg-label__icon" /> Password</Form.Label>
              <Form.Control type="password" placeholder="Create a password" className="sp-reg-input"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Form.Group>

            <Form.Group controlId="typeOfProvider">
              <Form.Label className="sp-reg-label"><FaToolbox className="sp-reg-label__icon" /> Type of Provider</Form.Label>
              <Form.Select className="sp-reg-input" value={typeOfProvider}
                onChange={(e) => setTypeOfProvider(e.target.value)} required>
                <option value="">Select type…</option>
                <option value="architect">Architect</option>
                <option value="constructor">Constructor</option>
                <option value="designer">Designer</option>
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="phone">
              <Form.Label className="sp-reg-label"><FaPhone className="sp-reg-label__icon" /> Phone</Form.Label>
              <Form.Control type="text" placeholder="+1 000-000-0000" className="sp-reg-input"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Form.Group>

            <Form.Group controlId="company">
              <Form.Label className="sp-reg-label"><FaBuilding className="sp-reg-label__icon" /> Company</Form.Label>
              <Form.Control type="text" placeholder="Company name" className="sp-reg-input"
                value={company} onChange={(e) => setCompany(e.target.value)} />
            </Form.Group>

            <Form.Group controlId="experience">
              <Form.Label className="sp-reg-label"><FaStar className="sp-reg-label__icon" /> Experience (Years)</Form.Label>
              <Form.Control type="number" placeholder="e.g. 5" className="sp-reg-input"
                value={experience} onChange={(e) => setExperience(e.target.value)} />
            </Form.Group>

            <Form.Group controlId="portfolio">
              <Form.Label className="sp-reg-label"><FaLink className="sp-reg-label__icon" /> Portfolio URL</Form.Label>
              <Form.Control type="text" placeholder="https://yourportfolio.com" className="sp-reg-input"
                value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
            </Form.Group>
          </div>

          <Button type="submit" className="sp-reg-btn">Create Account</Button>
        </Form>

        <div className="sp-reg-footer">
          Already have an account?{" "}
          <Link to={`/serviceprovider/login?redirect=${redirect}`}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderRegister;

