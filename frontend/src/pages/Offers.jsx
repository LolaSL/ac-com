import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTag } from "react-icons/fa";
import "./Offers.css";

export default function Offers() {
  const [loading, setLoading] = useState(true);

  const offers = [
    {
      title: "Half Price Sale",
      description: "Premium units at 50% off — limited time only.",
      imageSrc: "/images/offer-spring2.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
    },
    {
      title: "Up to 40% Off",
      description: "Save big on select HVAC units — 31-40% discount on top brands.",
      imageSrc: "/images/offer-spring1.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
    },
    {
      title: "Smart Savings",
      description: "Quality units with 21-30% off — best value for your budget.",
      imageSrc: "/images/offer02.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=21-30&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "View Deals",
    },
    {
      title: "Top-Rated Picks",
      description: "5-star rated units with 10-20% off — comfort guaranteed.",
      imageSrc: "/images/offer-spring3.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=10-20&rating=5&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
    },
    {
      title: "Premium Systems",
      description: "High-end HVAC systems $1,000+ — professional grade equipment.",
      imageSrc: "/images/offer01.jpg",
      linkTo:
        "/search?category=all&query=all&price=1001-10000&discount=any&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Explore",
    },
    {
      title: "Best Sellers",
      description: "Most popular 4-star+ rated units — trusted by thousands.",
      imageSrc: "/images/offer03.png",
      linkTo:
        "/search?category=all&query=all&price=all&discount=any&rating=4&btu=all&brand=all&order=toprated&page=1",
      linkText: "See Top Rated",
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
