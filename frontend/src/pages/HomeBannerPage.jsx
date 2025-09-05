import { useState, useEffect, useContext } from "react";
import Banner from "../components/Banner.jsx";
import NotificationPopUp from "../components/NotificationPopUp";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// const notifications = [
//   {
//     title: "Service Request Assigned",
//     message:
//       "You have got a new service request message. Please review the details and respond promptly.",
//     type: "urgent",
//     recipientType: "serviceProvider",
//     isRead: false,
//     createdAt: new Date(),
//   },
//   {
//     title: "Get A Quote",
//     message: "Your Dream Deal Starts Here – Get a Quote Now!",
//     type: "quote",
//     recipientType: "user",
//     isRead: false,
//     createdAt: new Date(),
//   },
//   {
//     title: "Get A Quote",
//     message: "Stay Cool and Comfortable All Year – Get a Quote Now!",
//     type: "quote",
//     recipientType: "",
//     isRead: false,
//     createdAt: new Date(),
//   },
// ];

export default function HomeBannerPage() {
  const [fetchedNotifications, setFetchedNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);

  const { state } = useContext(Store);
  const { userInfo, adminInfo, serviceProviderInfo } = state;
  const navigate = useNavigate();

  const banners = [
    {
      title: "Welcome To AC Commerce",
      imageSrc: "/images/header2.jpg",
      linkText: "Save Time. Cut Costs. Stay Ahead",
      linkTo: "/advanced-ac",
    },
    {
      title: "Elevate your comfort wherever you are",
      imageSrc: "/images/banner.jpg",
      linkText: "Discover the perfect fit for your needs",
      linkTo: "/blogs",
    },
    {
      title: "Stay with AC Commerce",
      imageSrc: "/images/banner1.jpg",
      linkText: "Redefining Air Conditioning Design — Smart. Fast. Certified",
      linkTo: "/uploadfile",
    },
    {
      title: "Featured Products",
      imageSrc: "/images/hero.jpg",
      linkText:
        "Maximize the comfort of your property with our advanced air systems",
      linkTo: "/products",
    },
  ];

useEffect(() => {
  const fetchNotifications = async (token) => {
    try {
      const { data } = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFetchedNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const userToken = userInfo?.token || adminInfo?.token || serviceProviderInfo?.token;

  // Only proceed if a user is logged in and we have a token
  if (userToken) {
    fetchNotifications(userToken);
  }
}, [userInfo, adminInfo, serviceProviderInfo]);
  useEffect(() => {
    let timer;

    if (fetchedNotifications.length > 0) {
      // Find the first unread notification to display
      const firstUnread = fetchedNotifications.find(
        (notification) => !notification.isRead
      );

      if (firstUnread) {
        setCurrentNotification(firstUnread);

        // Remove the notification from the list so we don't display it again
        const updatedNotifications = fetchedNotifications.filter(
          (n) => n._id !== firstUnread._id
        );

        timer = setTimeout(() => {
          setCurrentNotification(null);
          setFetchedNotifications(updatedNotifications);
        }, 4000); // Wait 4 seconds before hiding and moving to the next
      }
    }

    // Clean up the timer when the component unmounts or state changes
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
    // This is the new navigation for the discount offer
    navigate("/offers");
  } else if (currentNotification.recipientType === "serviceProvider") {
    navigate("/serviceprovider/messages");
  }
  
  // After clicking, hide the pop-up
  setCurrentNotification(null);
};


return (
  <div className="container">
    {/* This section will render a list of all relevant notifications */}
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

    {/* The rest of your code for rendering banners remains unchanged */}
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
        <Banner
          key={index}
          title={banner.title}
          imageSrc={banner.imageSrc}
          linkText={banner.linkText}
          onClick={handleClick}
        />
      );
    })}
  </div>
);
}
