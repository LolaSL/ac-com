import { useEffect, useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function Offers() {
  const [loading, setLoading] = useState(true);

  const offers = [
    {
      title: "Season Sale!",
      description: "Units on sale!",
      imageSrc: "/images/offer1.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
    },
    {
      title: "Saver Discount",
      description: "Save money and energy!",
      imageSrc: "/images/offer2.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
    },
    {
      title: "Hot Autumn Deals",
      description: "Stay cool with 30% off!",
      imageSrc: "/images/offer3.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=21-30&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Cool Savings",
    },
    {
      title: "Premium Comfort Offer",
      description: "5-star and discount!",
      imageSrc: "/images/offer4.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=10-20&rating=5&btu=all&brand=all&order=newest&page=1",
      linkText: "View Premium",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mt-5">
      <h1 className="offers text-center mb-4">Special Offers</h1>
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
                    className="go-to-btn btn-text"
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
