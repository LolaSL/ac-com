import { useContext } from "react";
import TrustSection from "../components/TrustSection";
import ValuePropositionSection from "../components/ValuePropositionSection";
import TestimonialsSection from "../components/TestimonialsSection";
// import ROICalculatorPreview from "../components/ROICalculatorPreview";
import NewsletterSignup from "../components/NewsletterSignup";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import "./HomeBannerPage.css";

export default function HomeBannerPage() {
  // Notification auto-popup removed. Users access notifications via the bell icon
  // in the header, which navigates to /notifications for a dedicated view.
  const { state } = useContext(Store);
  const { userInfo, adminInfo, serviceProviderInfo } = state;
  const navigate = useNavigate();

  const banners = [
      {
      title: "About Us - AC-Commerce",
      description:
        "Learn more about AC-Commerce, our mission, values, and the team driving innovation in the HVAC industry.",
      imageSrc: "/images/about-us4.jpg",
      linkText: "Learn More",
      linkTo: "/about-us",
    },
    {
      title: "AC-Commerce Marketplace Technology",
      description:
        "Revolutionizing HVAC procurement with comprehensive marketplace solutions.",
      imageSrc: "/images/hero.jpg",
      linkText: "Explore Our Products",
      linkTo: "/products",
    },
  {
      title: "Industry-Leading Partnerships",
      description:
        "Trusted by leading HVAC manufacturers including Daikin, LG, Samsung, and Mitsubishi for comprehensive equipment solutions.",
      imageSrc: "/images/hvac-business-partnership.jpg",
      linkText: "View Our Suppliers",
      linkTo: "/sellers",
    },
    {
      title: "Advanced Design Technology",
      description:
        "Upload floor plans and receive professional AC unit annotations, BTU calculations, and installation specifications instantly.",
      imageSrc: "/images/floor-plan.jpg",
      linkText: "Try Design Tools",
      linkTo: "/measurement",
    },
    {
      title: "✅ View Results on Recommendations Page",
      description:
        "See your BTU calculations, matched AC products, system summaries, and installation accessories — all tailored to your floor plan.",
      imageSrc: "/images/offer01.jpg",
      linkText: "View Recommendations",
      linkTo: "/recommendations",
    },
      {
      title: "Special offers and discounts",
      description:
        "Exclusive deals on top HVAC brands, available only through AC-Commerce. Check back regularly for new promotions and savings opportunities.",
      imageSrc: "/images/special-offers.jpg",
      linkText: "Explore Now",
      linkTo: "/offers",
    },

  ];

  // Auto-fetch + auto-popup disabled. Users now access notifications via the bell icon
  // in the header, which navigates to /notifications for a dedicated view.

  const handleSlideClick = (index) => {
    const banner = banners[index];
    const isLoggedIn = userInfo || adminInfo || serviceProviderInfo;

    if (banner.linkTo === "/measurement" && !isLoggedIn) {
      navigate("/signin?redirect=/measurement");
    } else {
      navigate(banner.linkTo);
    }
  };

  return (
    <div className="home-banner-page">
      {/* Notification popup removed — replaced by header bell + /notifications page */}
      
      {/* Hero with video background - Full bleed */}
      <div className="home-hero">
        <video
          className="home-hero__video"
          autoPlay
          loop
          muted
          playsInline
          poster="/images/hero.jpg"
        >
          <source src="/videos/banner2-video.mp4" type="video/mp4" />
        </video>
        <div className="home-hero__overlay" />
        <div className="home-hero__inner">
          <h1 className="home-hero__title">Welcome to AC-Commerce</h1>
          <p className="home-hero__sub">Smarter HVAC design, planning, shopping, and installation — powered by technology, delivered with trust.</p>
        </div>
        <p className="home-hero__corner-tag">Any space. Any size. Always cool.</p>
      </div>

      {/* Content wrapper */}
      <div className="home-page">
        {/* Premium Hero Cards Grid */}
        <div className="premium-cards-grid">
        {banners.map((banner, idx) => (
          <div className="premium-card" key={idx}>
            <div className="premium-card-image">
              <img src={banner.imageSrc} alt={banner.title} className="premium-card-img" />
            </div>
            <div className="premium-card-content">
              <h1 className="premium-card-title">{banner.title}</h1>
              <p className="premium-card-description">{banner.description}</p>
              <button
                className="premium-card-btn"
                onClick={() => handleSlideClick(idx)}
              >
                {banner.linkText} <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        ))}
        </div>
        
        {/* Investor-Ready Sections */}
        <TrustSection />
        <ValuePropositionSection />
        <TestimonialsSection />
        {/* <ROICalculatorPreview /> */}
        <NewsletterSignup />
      </div>
    </div>
  );
}
