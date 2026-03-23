import { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { Link } from "react-router-dom";
import "./OurNetworkPage.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, sellers: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};


const benefits = [
  { icon: "fas fa-lock", title: "Enterprise Security", text: "ISO 27001 Certified", color: "#67e8f9" },
  { icon: "fas fa-certificate", title: "Industry Certified", text: "HVAC Standards Compliant", color: "#34d399" },
  { icon: "fas fa-star", title: "Top Rated", text: "4.8/5 Average Rating", color: "#fbbf24" },
];

export default function OurNetworkPage() {
  const [{ loading, error, sellers }, dispatch] = useReducer(reducer, {
    sellers: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get("/api/sellers/all");
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, []);

  return (
    <div className="on-page">
      {/* Hero */}
      <section className="on-hero">
        <div className="on-hero__inner">
          <i className="fas fa-network-wired on-hero__icon" />
          <h1 className="on-hero__title">Our Network</h1>
          <p className="on-hero__sub">
            Trusted suppliers, service providers, and manufacturer partnerships
            powering HVAC excellence across the region.
          </p>
          <div className="on-hero__badges">
            <span className="on-hero__badge"><i className="fas fa-certificate" /> Certified Partners</span>
            <span className="on-hero__badge"><i className="fas fa-globe-americas" /> Global Reach</span>
            <span className="on-hero__badge"><i className="fas fa-shield-alt" /> Quality Assured</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="on-stats">
        <div className="on-stats__item">
          <span className="on-stats__number">{sellers.length || "8+"}</span>
          <span className="on-stats__label">Industry Partners</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">10,000+</span>
          <span className="on-stats__label">Projects Completed</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">500+</span>
          <span className="on-stats__label">Service Providers</span>
        </div>
        <div className="on-stats__divider" />
        <div className="on-stats__item">
          <span className="on-stats__number">50,000+</span>
          <span className="on-stats__label">Active Users</span>
        </div>
      </div>

      <div className="on-inner">
        {/* Sellers Section */}
        <section className="on-section">
          <div className="on-section-header">
            <h2 className="on-section-header__title">Our Suppliers</h2>
            <p className="on-section-header__sub">Browse verified HVAC suppliers in our network</p>
          </div>
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : sellers && sellers.length > 0 ? (
            <div className="on-grid on-grid--4">
              {sellers.map((seller) => (
                <div className="on-card" key={seller._id}>
                  <div className="on-card__logo-wrap">
                    {seller.logo && seller.logo !== "undefined" && seller.logo !== "" ? (
                      <img
                        src={seller.logo}
                        alt={`${seller.name} logo`}
                        className="on-card__logo"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <i className="fas fa-building on-card__logo-fallback" />
                    )}
                  </div>
                  <Link to={`/sellers/${seller._id}`} className="on-card__name">
                    {seller.name}
                  </Link>
                  <p className="on-card__desc">HVAC Supplier &amp; Service Provider</p>
                  <Link to={`/sellers/${seller._id}`} className="on-card__btn">
                    View Seller <i className="fas fa-arrow-right" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="on-empty">
              <i className="fas fa-building on-empty__icon" />
              <p>No suppliers available at the moment.</p>
            </div>
          )}
        </section>
        {/* Benefits */}
        <section className="on-benefits">
          <h3 className="on-benefits__title">Why Choose Our Network?</h3>
          <div className="on-benefits__grid">
            {benefits.map((b, i) => (
              <div className="on-benefits__card" key={i}>
                <i className={`${b.icon} on-benefits__icon`} style={{ color: b.color }} />
                <h5 className="on-benefits__heading">{b.title}</h5>
                <p className="on-benefits__text">{b.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
