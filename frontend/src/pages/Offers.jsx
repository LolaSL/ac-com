import { useEffect, useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
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
    <div className="offers-page container-fluid container-lg mt-5 px-3 px-md-4">
      <h1 className="page-title text-center mb-4">Special Offers</h1>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
          {offers.map((offer, index) => (
            <div className="col" key={index}>
              <Card>
                <img
                  className="offer-img"
                  src={offer.imageSrc}
                  alt={offer.title}
                />
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="offer-title">{offer.title}</Card.Title>
                  <Card.Text className="offer-desc flex-grow-1">
                    {offer.description}
                  </Card.Text>
                  <div className="mt-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="go-to-btn btn-text w-auto"
                      as={Link}
                      to={offer.linkTo}
                    >
                      {offer.linkText}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
