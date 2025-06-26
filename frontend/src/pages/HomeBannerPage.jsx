import { useState, useEffect, useContext } from "react";
import Banner from "../components/Banner.jsx";
import NotificationPopUp from "../components/NotificationPopUp";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";

const notifications = [
  {
    title: "Service Request Assigned",
    message:
      "You have got a new service request message. Please review the details and respond promptly.",
    type: "urgent",
    recipientType: "serviceProvider",
    isRead: false,
    createdAt: new Date(),
  },
  {
    title: "Get A Quote",
    message: "Your Dream Deal Starts Here – Get a Quote Now!",
    type: "quote",
    recipientType: "user",
    isRead: false,
    createdAt: new Date(),
  },
  {
    title: "Get A Quote",
    message: "Stay Cool and Comfortable All Year – Get a Quote Now!",
    type: "quote",
    recipientType: "",
    isRead: false,
    createdAt: new Date(),
  },
];

export default function HomeBannerPage() {
  const [notification, setNotification] = useState(null);
  const { state } = useContext(Store);
  const { userInfo, serviceProviderInfo } = state;
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
    let notificationToShow = null;

    if (serviceProviderInfo) {
      notificationToShow = notifications.find(
        (n) => n.recipientType === "serviceProvider" && !n.isRead
      );
    } else if (userInfo) {
      notificationToShow = notifications.find(
        (n) => n.recipientType === "user" && !n.isRead
      );
    } else {
      notificationToShow = notifications.find(
        (n) => n.recipientType === "" && !n.isRead
      );
    }

    if (notificationToShow) {
      setNotification(notificationToShow);

      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [userInfo, serviceProviderInfo]);

  const handleNotificationClick = (buttonText) => {
    if (buttonText === "Get Quote") {
      if (userInfo || serviceProviderInfo) {
        navigate("/uploadfile");
      } else {
        navigate("/signup");
      }
    } else if (buttonText === "Review Details") {
      navigate("/serviceprovider/messages");
    }
    setNotification(null);
  };

  return (
    <div className="container">
      {notification && (
        <NotificationPopUp
          notification={notification}
          onClose={() => setNotification(null)}
          buttonText={
            notification.title === "Get A Quote"
              ? "Get Quote"
              : "Review Details"
          }
          onButtonClick={() =>
            handleNotificationClick(
              notification.title === "Get A Quote"
                ? "Get Quote"
                : "Review Details"
            )
          }
        />
      )}

      {banners.map((banner, index) => (
        <Banner
          key={index}
          title={banner.title}
          imageSrc={banner.imageSrc}
          linkTo={banner.linkTo}
          linkText={banner.linkText}
        ></Banner>
      ))}
    </div>
  );
}
