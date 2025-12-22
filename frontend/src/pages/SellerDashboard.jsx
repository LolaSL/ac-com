import React, { useContext, useEffect, useReducer } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Store } from "../Store";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, stats: action.payload };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "USERS_REQUEST":
      return { ...state, loadingUsers: true };
    case "USERS_SUCCESS":
      return { ...state, loadingUsers: false, referredUsers: action.payload };
    case "USERS_FAIL":
      return { ...state, loadingUsers: false, errorUsers: action.payload };
    case "ORDERS_REQUEST":
      return { ...state, loadingOrders: true };
    case "ORDERS_SUCCESS":
      return { ...state, loadingOrders: false, referredOrders: action.payload };
    case "ORDERS_FAIL":
      return { ...state, loadingOrders: false, errorOrders: action.payload };
    default:
      return state;
  }
};

export default function SellerDashboard() {
  const { id } = useParams();
  const { state } = useContext(Store);

  const [
    {
      loading,
      error,
      stats,
      loadingUsers,
      referredUsers,
      errorUsers,
      loadingOrders,
      referredOrders,
      errorOrders,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    error: "",
    stats: null,
    loadingUsers: false,
    referredUsers: null,
    errorUsers: "",
    loadingOrders: false,
    referredOrders: null,
    errorOrders: "",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data } = await axios.get(`/api/sellers/${id}/referral-stats`);
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchStats();
  }, [id]);

  const fetchReferredUsers = async () => {
    try {
      dispatch({ type: "USERS_REQUEST" });
      const { data } = await axios.get(`/api/sellers/${id}/referred-users`);
      dispatch({ type: "USERS_SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "USERS_FAIL", payload: getError(err) });
    }
  };

  const fetchReferredOrders = async () => {
    try {
      dispatch({ type: "ORDERS_REQUEST" });
      const { data } = await axios.get(`/api/sellers/${id}/referred-orders`);
      dispatch({ type: "ORDERS_SUCCESS", payload: data });
    } catch (err) {
      dispatch({ type: "ORDERS_FAIL", payload: getError(err) });
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Seller Referral Dashboard</h1>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        stats && (
          <>
            {/* Statistics Cards */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title className="text-primary">
                      {stats.referredUsersCount}
                    </Card.Title>
                    <Card.Text>Referred Users</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title className="text-success">
                      {stats.totalReferredOrders}
                    </Card.Title>
                    <Card.Text>Referred Orders</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title className="text-info">
                      ${stats.totalReferredSales.toFixed(2)}
                    </Card.Title>
                    <Card.Text>Total Sales</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title className="text-warning">
                      ${stats.totalCommission.toFixed(2)}
                    </Card.Title>
                    <Card.Text>
                      Commission ({(stats.commissionRate * 100).toFixed(0)}%)
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Action Buttons */}
            <Row className="mb-4">
              <Col>
                <Button
                  variant="outline-primary"
                  onClick={fetchReferredUsers}
                  disabled={loadingUsers}
                  className="me-2"
                >
                  {loadingUsers ? "Loading..." : "View Referred Users"}
                </Button>
                <Button
                  variant="outline-success"
                  onClick={fetchReferredOrders}
                  disabled={loadingOrders}
                >
                  {loadingOrders ? "Loading..." : "View Referred Orders"}
                </Button>
              </Col>
            </Row>

            {/* Referred Users Table */}
            {referredUsers && (
              <Card className="mb-4">
                <Card.Header>
                  <h5>Referred Users ({referredUsers.totalCount})</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Signup Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referredUsers.users.map((user) => (
                        <tr key={user._id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {/* Referred Orders Table */}
            {referredOrders && (
              <Card>
                <Card.Header>
                  <h5>
                    Referred Orders ({referredOrders.totalCount}) - Total Sales:
                    ${referredOrders.totalSales.toFixed(2)}
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referredOrders.orders.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <Link to={`/order/${order._id}`}>
                              {order._id.substring(-8)}
                            </Link>
                          </td>
                          <td>{order.user.name}</td>
                          <td>${order.totalPrice.toFixed(2)}</td>
                          <td>
                            <Badge bg={order.isPaid ? "success" : "warning"}>
                              {order.isPaid ? "Paid" : "Pending"}
                            </Badge>
                          </td>
                          <td>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

            {/* Error Messages */}
            {errorUsers && (
              <MessageBox variant="danger">{errorUsers}</MessageBox>
            )}
            {errorOrders && (
              <MessageBox variant="danger">{errorOrders}</MessageBox>
            )}
          </>
        )
      )}
    </div>
  );
}
