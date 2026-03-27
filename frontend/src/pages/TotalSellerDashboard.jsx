import React, { useContext, useEffect, useReducer, useState } from "react";
import axios from "axios";
import { getError } from "../utils";
import { Store } from "../Store.js";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import { FaEye, FaChartLine, FaCopy, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./TotalSellerDashboard.css";
import "./AdminHero.css";

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
    data: { totalSellers: 0, sellers: [] },
  });
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo, adminInfo } = state;
  const token = adminInfo?.token || userInfo?.token;
  const [copiedId, setCopiedId] = useState(null);

  const copyLink = (referralCode, sellerId) => {
    const link = `${window.location.origin}/products?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(sellerId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: "FETCH_REQUEST" });
        const { data: statsData } = await axios.get(
          "/api/sellers/all-referral-stats",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        dispatch({ type: "FETCH_SUCCESS", payload: statsData });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };
    fetchData();
  }, [token]);

  // Safely calculate totals
  const totalReferredUsers = data.sellers?.reduce(
    (sum, item) => sum + (item.stats?.referredUsersCount || 0),
    0
  );
  const totalReferralSales = data.sellers?.reduce(
    (sum, item) => sum + (item.stats?.totalReferredSales || 0),
    0
  );
  const totalCommissions = data.sellers?.reduce(
    (sum, item) => sum + (item.stats?.totalCommission || 0),
    0
  );

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaChartLine /></div>
          <h1 className="adm-hero__title">Total Seller Referral Dashboard</h1>
          <p className="adm-hero__sub">Overview of all seller referral performance and commissions.</p>
        </div>
      </div>
      <div className="adm-inner">
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
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
                    {totalReferredUsers}
                  </Card.Title>
                  <Card.Text>Total Referred Users</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-info">
                    ${totalReferralSales?.toFixed(2) || "0.00"}
                  </Card.Title>
                  <Card.Text>Total Referral Sales</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title className="text-warning">
                    ${totalCommissions?.toFixed(2) || "0.00"}
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
                    <th>Clicks</th>
                    <th>Last Click</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sellers?.map((item) => {
                    return (
                      <tr data-label="ID" key={item.seller._id}>
                        <td data-label="Seller">
                          <strong>{item.seller.name}</strong>
                        </td>
                        <td data-label="Brand">{item.seller.brand}</td>
                        <td data-label="Referral Code">
                          <Badge bg="secondary">
                            {item.seller.referralCode}
                          </Badge>
                        </td>
                        <td data-label="Referred Users" className="text-center">
                          <Badge bg="primary">
                            {item.stats?.referredUsersCount || 0}
                          </Badge>
                        </td>
                        <td data-label="Referred Orders" className="text-center">
                          <Badge bg="success">
                            {item.stats?.totalReferredOrders || 0}
                          </Badge>
                        </td>
                        <td data-label="Total Sales" className="text-end">
                          <strong>
                            $
                            {item.stats?.totalReferredSales?.toFixed(2) ||
                              "0.00"}
                          </strong>
                        </td>
                        <td data-label="Commission" className="text-end">
                          <strong className="text-warning">
                            ${item.stats?.totalCommission?.toFixed(2) || "0.00"}
                          </strong>
                        </td>
                        <td data-label="Clicks" className="text-center">
                          <Badge bg="secondary" style={{ background: '#8b5cf6' }}>
                            {item.seller?.outboundClicks || 0}
                          </Badge>
                        </td>
                        <td data-label="Last Click" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {item.seller?.lastClickAt
                            ? new Date(item.seller.lastClickAt).toLocaleString()
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <Button
                            type="button"
                            className={`btn-copy-link me-2${copiedId === item.seller._id ? ' copied' : ''}`}
                            title={copiedId === item.seller._id ? 'Copied!' : 'Copy referral link'}
                            onClick={() => copyLink(item.seller.referralCode, item.seller._id)}
                          >
                            {copiedId === item.seller._id
                              ? <FaCheckCircle />
                              : <FaCopy />}
                          </Button>
                          <Button
                            type="button"
                            className="btn-admin-edit"
                            title="View Details"
                            onClick={() =>
                              navigate(`/seller/dashboard/${item.seller._id}`)
                            }
                          >
                            <FaEye />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
