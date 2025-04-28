import React, { useEffect, useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function Offers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const offers = [
    {
      title: "Spring Sale!",
      description: "Spring units on sale!",
      imageSrc: "/images/offer1.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Shop Now",
      criteria: (product) => (product.discount = 40),
    },
    {
      title: "Energy Saver Discount",
      description: "Save money and energy!",
      imageSrc: "/images/offer2.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Learn More",
      criteria: (product) => (product.discount = 50),
    },
    {
      title: "Combo Deals:",
      description: "Buy  units.",
      imageSrc: "/images/offer3.jpg",
      linkTo:
        "/search?category=all&query=all&price=all&discount=0&rating=all&btu=all&brand=all&order=newest&page=1",
      linkText: "Explore Deals",
      criteria: () => true,
    },
  ];

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products/search");
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filterOffers = () => {
    if (loading) return [];

    return offers.filter((offer) => {
      if (typeof offer.criteria === "function") {
        const matchingProducts = products.filter((product) =>
          offer.criteria(product)
        );
        return matchingProducts.length > 0;
      }
      return false;
    });
  };

  const filteredOffers = filterOffers();

  return (
    <div className="container mt-5">
      <h1 className="offers text-center mb-4">Special Offers</h1>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : filteredOffers.length > 0 ? (
        <div className="row">
          {filteredOffers.map((offer, index) => (
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
                    as={Link}
                    to={
                      offer.linkText === "Shop Now"
                        ? "/search?category=all&query=all&price=all&discount=31-40&rating=all&btu=all&brand=all&order=newest&page=1"
                        : offer.linkText === "Learn More"
                        ? "/search?category=all&query=all&price=all&discount=50&rating=all&btu=all&brand=all&order=newest&page=1"
                        : "/search?category=all&query=all&price=all&discount=0&rating=all&btu=all&brand=all&order=newest&page=1"
                    }
                  >
                    {offer.linkText}
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center">
          No offers match your criteria at this time.
        </p>
      )}
    </div>
  );
}
