import { useEffect, useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./Offers.css";

export default function Offers() {
  const [loading, setLoading] = useState(true);

  const offers = [
    {
      title: "Winter Sales!",
      description: "Units on sale!",
      imageSrc: "/images/offer-crist1.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    {
      title: "Christmas Deals!",
      description: "Save money!",
      imageSrc: "/images/offer-crist2.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    {
      title: "New Year deal!",
      description: "Save energy!",
      imageSrc: "/images/offer-crist4.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=21-30&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    {
      title: "Premium Comfort Offer",
      description: "5-star and discount!",
      imageSrc: "/images/offer-crist5.jpg",
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
    <div className="container mt-5">
      <h1 className="offers text-center mb-4 fs-1">Special Offers</h1>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <div className="row">
          {offers.map((offer, index) => (
            <div className="col-md-4 mb-4" key={index}>
              <Card>
                <Card.Img
                  variant="top"
                  src={offer.imageSrc}
                  alt={offer.title}
                />
                <Card.Body>
                  <Card.Title className="offer-title">{offer.title}</Card.Title>
                  <Card.Text className="offer-desc">
                    {offer.description}
                  </Card.Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="go-to-btn btn-text w-auto"
                    as={Link}
                    to={offer.linkTo}
                  >
                    {offer.linkText}
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 mb-4 text-center">
        <Link to="/" className="go-to-btn btn-text">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
