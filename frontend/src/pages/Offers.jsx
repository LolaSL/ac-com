import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTag } from "react-icons/fa";
import "./Offers.css";

export default function Offers() {
  const [loading, setLoading] = useState(true);

  const offers = [
    {
      title: "Spring Sales!",
      description: "Units on sale!",
      imageSrc: "/images/offer-spring1.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    {
      title: "Spring Deals!",
      description: "Save money!",
      imageSrc: "/images/offer-spring2.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    // {
    //   title: "New Year deal!",
    //   description: "Save energy!",
    //   imageSrc: "/images/offer-crist4.jpg",
    //   linkTo:
    //     "/search?category=all&query=all&price=all&discount=21-30&rating=all&btu=all&brand=all&order=newest&page=1",
    //   linkText: "Learn More",
    // },
    {
      title: "Premium Comfort Offer",
      description: "5-star and discount!",
      imageSrc: "/images/offer-spring3.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=10-20&rating=5&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="of-page">
      {/* Hero */}
      <div className="of-hero">
        <div className="of-hero__inner">
          <div className="of-hero__icon"><FaTag /></div>
          <h1 className="of-hero__title">Special Offers</h1>
          <p className="of-hero__sub">Exclusive deals on HVAC units — save big today.</p>
        </div>
      </div>

      <div className="of-inner">
        {loading ? (
          <div className="of-spinner-wrap">
            <div className="of-spinner" />
          </div>
        ) : (
          <div className="of-grid">
            {offers.map((offer, index) => (
              <div className="of-card" key={index}>
                <div className="of-card__img-wrap">
                  <img
                    className="of-card__img"
                    src={offer.imageSrc}
                    alt={offer.title}
                  />
                </div>
                <div className="of-card__body">
                  <h2 className="of-card__title">{offer.title}</h2>
                  <p className="of-card__desc">{offer.description}</p>
                  <Link className="of-card__btn" to={offer.linkTo}>
                    {offer.linkText}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
