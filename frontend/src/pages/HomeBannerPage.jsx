import { useState, useEffect, useContext } from "react";
import Banner from "../components/Banner.jsx";
import NotificationPopUp from "../components/NotificationPopUp";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Carousel from "react-bootstrap/Carousel";

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
      linkTo: "/uploadfile",
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

  const handleNotificationClick = () => {
    if (!currentNotification) return;

    if (currentNotification.title === "Get A Quote") {
      if (adminInfo || userInfo || serviceProviderInfo) {
        navigate("/uploadfile");
      } else {
        navigate("/signin?redirect=/uploadfile");
      }
    } else if (currentNotification.title === "Discount Offer") {
      navigate("/offers");
    } else if (currentNotification.recipientType === "serviceProvider") {
      navigate("/serviceprovider/messages");
    }

    setCurrentNotification(null);
  };

  return (
    <div className="home-banner-container">
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

      <Carousel
        interval={5000}
        pause={false}
        controls={false}
        indicators={false}
        className="home-carousel"
      >
        {banners.map((banner, index) => {
          const requiresLogin =
            banner.linkText ===
            "Redefining Air Conditioning Design — Smart. Fast. Certified";

          const isLoggedIn = userInfo || adminInfo || serviceProviderInfo;

          const handleClick = () => {
            if (requiresLogin && !isLoggedIn) {
              navigate("/signin?redirect=/uploadfile");
            } else {
              navigate(banner.linkTo);
            }
          };

          return (
            <Carousel.Item key={index}>
              <Banner
                title={banner.title}
                description={banner.description}
                imageSrc={banner.imageSrc}
                linkText={banner.linkText}
                onClick={handleClick}
              />
            </Carousel.Item>
          );
        })}
      </Carousel>
    </div>
  );
}
