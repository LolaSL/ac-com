import React, { useEffect, useReducer, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { getError } from "../utils";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import { FaCopy, FaCheckCircle } from "react-icons/fa";

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
  const [sellerInfo, setSellerInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  // Filter state
  const [showFilters, setShowFilters] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState("");
  const [filterCustomer, setFilterCustomer] = React.useState("");
  const [filterDateFrom, setFilterDateFrom] = React.useState("");
  const [filterDateTo, setFilterDateTo] = React.useState("");

  // Filtered orders
  const getFilteredOrders = () => {
    if (!referredOrders) return [];
    return referredOrders.orders.filter((order) => {
      let statusMatch = true;
      let customerMatch = true;
      let dateMatch = true;
      if (filterStatus) {
        statusMatch = filterStatus === "Paid" ? order.isPaid : !order.isPaid;
      }
      if (filterCustomer) {
        customerMatch = order.user.name
          .toLowerCase()
          .includes(filterCustomer.toLowerCase());
      }
      if (filterDateFrom) {
        dateMatch = new Date(order.createdAt) >= new Date(filterDateFrom);
      }
      if (filterDateTo) {
        dateMatch =
          dateMatch && new Date(order.createdAt) <= new Date(filterDateTo);
      }
      return statusMatch && customerMatch && dateMatch;
    });
  };
  // Manual refresh handler
  const handleRefresh = () => {
    // Re-run the stats fetch
    dispatch({ type: "FETCH_REQUEST" });
    axios
      .get(`/api/sellers/${id}/dashboard`)
      .then(({ data }) => {
        dispatch({ type: "FETCH_SUCCESS", payload: data.stats });
        dispatch({
          type: "ORDERS_SUCCESS",
          payload: {
            totalCount: data.referredOrders.length,
            totalSales: data.referredOrders.reduce(
              (sum, o) => sum + Number(o.totalPrice || 0),
              0
            ),
            orders: data.referredOrders,
          },
        });
      })
      .catch((err) => {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      });
  };
  const { id } = useParams();

  const [
    {
      loading,
      error,
      stats,
      loadingUsers,
      referredUsers,
      errorUsers,
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
        const { data } = await axios.get(`/api/sellers/${id}/dashboard`);
        setSellerInfo(data.seller);
        // Set stats and referredOrders from the dashboard response
        dispatch({ type: "FETCH_SUCCESS", payload: data.stats });
        dispatch({
          type: "ORDERS_SUCCESS",
          payload: {
            totalCount: data.referredOrders.length,
            totalSales: data.referredOrders.reduce(
              (sum, o) => sum + Number(o.totalPrice || 0),
              0
            ),
            orders: data.referredOrders,
          },
        });
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

  const copyReferralLink = () => {
    const link = `${window.location.origin}/products?ref=${sellerInfo.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Remove fetchReferredOrders, as orders are loaded with stats

  return (
    <div className="container mt-4">
      <h1 className="page-title">Seller Referral Dashboard</h1>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        stats && (
          <>
            {/* Referral Link Card */}
            {sellerInfo && (
              <Card className="mb-4 border-primary">
                <Card.Header className="bg-primary text-white">
                  <strong>Your Referral Link</strong>
                </Card.Header>
                <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
                  <code className="flex-grow-1 p-2 bg-light rounded" style={{ wordBreak: "break-all" }}>
                    {`${window.location.origin}/products?ref=${sellerInfo.referralCode}`}
                  </code>
                  <Button
                    variant={copied ? "success" : "outline-primary"}
                    onClick={copyReferralLink}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {copied ? <><FaCheckCircle className="me-1" />Copied!</> : <><FaCopy className="me-1" />Copy Link</>}
                  </Button>
                </Card.Body>
                <Card.Footer className="text-muted small">
                  Share this link — users who sign up through it will be tracked as your referrals.
                </Card.Footer>
              </Card>
            )}
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
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title style={{ color: '#8b5cf6' }}>
                      {stats.outboundClicks || 0}
                    </Card.Title>
                    <Card.Text>Website Clicks</Card.Text>
                    {stats.lastClickAt && (
                      <small className="text-muted">
                        Last: {new Date(stats.lastClickAt).toLocaleString()}
                      </small>
                    )}
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
                  variant="outline-secondary"
                  onClick={handleRefresh}
                  className="me-2"
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
                {/* Removed 'View Referred Orders' button as orders are loaded with stats */}
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
                    Referred Orders ({getFilteredOrders().length}) - Total
                    Sales: $
                    {getFilteredOrders()
                      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0)
                      .toFixed(2)}
                  </h5>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="ms-2"
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                </Card.Header>
                {showFilters && (
                  <div className="p-3 border-bottom bg-light">
                    <Row className="g-2">
                      <Col md={3}>
                        <label>Status</label>
                        <select
                          className="form-select"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">All</option>
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </Col>
                      <Col md={3}>
                        <label>Customer</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Customer name"
                          value={filterCustomer}
                          onChange={(e) => setFilterCustomer(e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label>Date From</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                        />
                      </Col>
                      <Col md={3}>
                        <label>Date To</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
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
                      {getFilteredOrders().map((order) => (
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
