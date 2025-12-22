import React, { useEffect, useReducer } from "react";
import axios from "axios";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import { Link } from "react-router-dom";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, data: action.payload };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function TotalSellerDashboard() {
  const [{ loading, error, data }, dispatch] = useReducer(reducer, {
    loading: true,
    error: "",
    data: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data: statsData } = await axios.get(
          "/api/sellers/all-referral-stats"
        );
        dispatch({ type: "FETCH_SUCCESS", payload: statsData });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, []);

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Total Seller Referral Dashboard</h1>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-primary">
                    {data.totalSellers}
                  </Card.Title>
                  <Card.Text>Total Sellers</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-success">
                    {data.sellers.reduce(
                      (sum, item) => sum + item.stats.referredUsersCount,
                      0
                    )}
                  </Card.Title>
                  <Card.Text>Total Referred Users</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-info">
                    $
                    {data.sellers
                      .reduce(
                        (sum, item) => sum + item.stats.totalReferredSales,
                        0
                      )
                      .toFixed(2)}
                  </Card.Title>
                  <Card.Text>Total Referral Sales</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-warning">
                    $
                    {data.sellers
                      .reduce(
                        (sum, item) => sum + item.stats.totalCommission,
                        0
                      )
                      .toFixed(2)}
                  </Card.Title>
                  <Card.Text>Total Commissions</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Sellers Table */}
          <Card>
            <Card.Header>
              <h5>All Sellers Referral Performance</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Brand</th>
                    <th>Referral Code</th>
                    <th>Referred Users</th>
                    <th>Referred Orders</th>
                    <th>Total Sales</th>
                    <th>Commission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellers.map((item) => (
                    <tr key={item.seller._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {item.seller.logo && (
                            <img
                              src={item.seller.logo}
                              alt={`${item.seller.name} logo`}
                              style={{
                                width: "40px",
                                height: "40px",
                                marginRight: "10px",
                                objectFit: "contain",
                              }}
                            />
                          )}
                          <div>
                            <strong>{item.seller.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{item.seller.brand}</td>
                      <td>
                        <Badge bg="secondary">{item.seller.referralCode}</Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg="primary">
                          {item.stats.referredUsersCount}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Badge bg="success">
                          {item.stats.totalReferredOrders}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <strong>
                          ${item.stats.totalReferredSales.toFixed(2)}
                        </strong>
                      </td>
                      <td className="text-end">
                        <strong className="text-warning">
                          ${item.stats.totalCommission.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <Link
                          to={`/seller/dashboard/${item.seller._id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      ) : null}
    </div>
  );
}
