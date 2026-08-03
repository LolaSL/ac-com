import { useContext } from "react";
import { useTranslation } from "react-i18next";
import TrustSection from "../components/TrustSection";
import ValuePropositionSection from "../components/ValuePropositionSection";
import TestimonialsSection from "../components/TestimonialsSection";
// import ROICalculatorPreview from "../components/ROICalculatorPreview";
import NewsletterSignup from "../components/NewsletterSignup";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import "./HomeBannerPage.css";

const BANNER_IMAGES = [
  "/images/about-us4.jpg",
  "/images/hero.jpg",
  "/images/hvac-business-partnership.jpg",
  "/images/floor-plan.jpg",
  "/images/offer01.jpg",
  "/images/special-offers.jpg",
];
const BANNER_LINKS = [
  "/about-us",
  "/products",
  "/sellers",
  "/measurement",
  "/recommendations",
  "/offers",
];

export default function HomeBannerPage() {
  // Notification auto-popup removed. Users access notifications via the bell icon
  // in the header, which navigates to /notifications for a dedicated view.
  const { t } = useTranslation();
  const { state } = useContext(Store);
  const { userInfo, adminInfo, serviceProviderInfo } = state;
  const navigate = useNavigate();

  const translatedBanners = t("home.banners", { returnObjects: true });
  const banners = translatedBanners.map((banner, idx) => ({
    ...banner,
    imageSrc: BANNER_IMAGES[idx],
    linkTo: BANNER_LINKS[idx],
  }));

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
          <h1 className="home-hero__title">{t("home.hero.title")}</h1>
          <p className="home-hero__sub">{t("home.hero.subtitle")}</p>
        </div>
        <p className="home-hero__corner-tag">{t("home.hero.cornerTag")}</p>
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
