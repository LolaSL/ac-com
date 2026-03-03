import { useState, useEffect, useContext } from "react";
import PremiumCarousel from "../components/PremiumCarousel.jsx";
import NotificationPopUp from "../components/NotificationPopUp";
import TrustSection from "../components/TrustSection";
import ValuePropositionSection from "../components/ValuePropositionSection";
import HowItWorksSection from "../components/HowItWorksSection";
import TestimonialsSection from "../components/TestimonialsSection";
import ROICalculatorPreview from "../components/ROICalculatorPreview";
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
      title: "AC Commerce Platform",
      description:
        "Revolutionizing HVAC procurement with integrated design tools, AI-powered annotations, and comprehensive marketplace solutions.",
      imageSrc: "/images/hero.jpg",
      linkText: "Explore Our Technology",
      linkTo: "/products",
    },
    {
      title: "Professional Installation Services",
      description:
        "Connect with certified HVAC technicians and service providers through our verified network and project management platform.",
      imageSrc: "/images/intallation.jpg",
      linkText: "Find Service Providers",
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
      title: "Industry-Leading Partnerships",
      description:
        "Trusted by leading HVAC manufacturers including Daikin, LG, Samsung, and Mitsubishi for comprehensive equipment solutions.",
      imageSrc: "/images/about-us.jpg",
      linkText: "View Our Network",
      linkTo: "/sellers",
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
    const requiresLogin =
      banner.linkText ===
      "Redefining Air Conditioning Design — Smart. Fast. Certified";

    const isLoggedIn = userInfo || adminInfo || serviceProviderInfo;

    if (requiresLogin && !isLoggedIn) {
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

      {/* Premium Hero Carousel */}
      <PremiumCarousel banners={banners} onSlideClick={handleSlideClick} />
      {/* Investor-Ready Sections */}
      <TrustSection />
      <ValuePropositionSection />
      <HowItWorksSection />
      <ROICalculatorPreview />
      <TestimonialsSection />
      <NewsletterSignup />
    </div>
  );
}
