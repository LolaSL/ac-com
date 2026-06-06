import { useState, useEffect, useContext } from "react";
import NotificationPopUp from "../components/NotificationPopUp";
import TrustSection from "../components/TrustSection";
import ValuePropositionSection from "../components/ValuePropositionSection";
import TestimonialsSection from "../components/TestimonialsSection";
// import ROICalculatorPreview from "../components/ROICalculatorPreview";
import NewsletterSignup from "../components/NewsletterSignup";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./HomeBannerPage.css";

export default function HomeBannerPage() {
  const [fetchedNotifications, setFetchedNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);

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
      imageSrc: "/images/hero.jpg",
      linkText: "View Recommendations",
      linkTo: "/recommendations",
    },
      {
      title: "Special offers and discounts",
      description:
        "Exclusive deals on top HVAC brands, available only through AC-Commerce. Check back regularly for new promotions and savings opportunities.",
      imageSrc: "/images/offer-spring1.png",
      linkText: "Explore Now",
      linkTo: "/offers",
    },

  ];

  useEffect(() => {
    const fetchNotifications = async (token) => {
      try {
        const { data } = await axios.get("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFetchedNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    const userToken =
      userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

    if (userToken) {
      fetchNotifications(userToken);
    }
  }, [userInfo, adminInfo, serviceProviderInfo]);
  useEffect(() => {
    let timer;

    if (fetchedNotifications.length > 0) {
      const firstUnread = fetchedNotifications.find(
        (notification) => !notification.isRead
      );

      if (firstUnread) {
        setCurrentNotification(firstUnread);

        const updatedNotifications = fetchedNotifications.filter(
          (n) => n._id !== firstUnread._id
        );

        timer = setTimeout(() => {
          setCurrentNotification(null);
          setFetchedNotifications(updatedNotifications);
        }, 4000);
      }
    }

    return () => {
      clearTimeout(timer);
    };
  }, [fetchedNotifications]);

  const resolveNotificationLink = async (notification) => {
    // Use stored link first (new notifications)
    if (notification.link) return notification.link;

    // Fall back: extract short order ID from message for old notifications
    const orderMatch =
      notification.message && notification.message.match(/#([a-zA-Z0-9]{6})/);
    if (orderMatch) {
      try {
        const token =
          userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;
        const { data } = await axios.get(
          `/api/orders/by-short-id/${orderMatch[1]}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return adminInfo
          ? `/admin/order/${data.orderId}`
          : `/order/${data.orderId}`;
      } catch {
        return null;
      }
    }

    // Other known routes
    const { title, recipientType } = notification;
    if (title === 'Get A Quote') return userInfo || adminInfo || serviceProviderInfo ? '/measurement' : '/signin?redirect=/measurement';
    if (title === 'Discount Offer') return '/offers';
    if (recipientType === 'serviceProvider') return '/serviceprovider/messages';

    // Fallback: send each role to their notifications view
    if (adminInfo) return '/admin/dashboard/notification';
    if (serviceProviderInfo) return '/serviceprovider/notifications';
    return '/profile';
  };

  const handleNotificationClick = async () => {
    if (!currentNotification) return;
    const link = await resolveNotificationLink(currentNotification);
    setCurrentNotification(null);
    if (link) navigate(link);
  };

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
      {/* Notification Popup */}
      {currentNotification && (
        <NotificationPopUp
          notification={currentNotification}
          onClose={() => setCurrentNotification(null)}
          buttonText={
            currentNotification.title === "Get A Quote"
              ? "Get Quote"
              : "Review Details"
          }
          onButtonClick={handleNotificationClick}
        />
      )}
      
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
