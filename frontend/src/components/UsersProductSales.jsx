import React, {
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useState,
} from "react";
import Chart from "react-google-charts";
import axios from "axios";
import { Store } from "../Store.js";
import { getError } from "../utils.js";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { FaShoppingCart, FaUsers, FaBox, FaChartLine, FaMoneyBillWave, FaHardHat, FaTasks, FaEnvelope, FaBell } from "react-icons/fa";
import "./UsersProductSales.css";

const initialState = {
  loading: true,
  summary: {},
  error: "",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true, error: "" };
    case "FETCH_SUCCESS":
      return {
        ...state,
        summary: action.payload,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function UsersProductSales() {
  const [{ loading, summary, error }, dispatch] = useReducer(
    reducer,
    initialState
  );

  const { state } = useContext(Store);

  const { adminInfo } = state;
  const token = adminInfo?.token;

  const [chartPage, setChartPage] = useState(0);

  const totalSales = summary?.orders?.[0]?.totalSales || 0;
  const totalUsers = summary?.users?.[0]?.numUsers || 0;
  const totalProducts =
    summary?.productCategories?.reduce((sum, x) => sum + x.count, 0) || 0;
  const totalOrders = summary?.orders?.[0]?.numOrders || 0;
  const totalEarnings = summary?.totalEarnings?.[0]?.totalEarnings || 0;
  const totalSPs = summary?.totalServiceProviders || 0;
  const totalProjects = summary?.totalProjects?.[0]?.numProjects || 0;
  const totalMessages = summary?.totalMessages || 0;
  const totalNotifications = summary?.totalNotifications?.[0]?.numNotifications || 0;

  const fetchData = useCallback(
    async (page = 1) => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get(`/api/orders/summary?page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    },
    [token]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderChart = (title, data, chartType, options = {}) => {
    const hasData = data && data.length > 1;
    return (
      <div className="chart-col my-4">
        <h3 className="text-center">{title}</h3>
        {!hasData ? (
          <MessageBox>No Data Available</MessageBox>
        ) : (
          <Chart
            width="100%"
            height="400px"
            chartType={chartType}
            loader={<div>Loading Chart...</div>}
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              ...options,
            }}
          />
        )}
      </div>
    );
  };

  const chartGroups = [
    [
      renderChart(
        "Sales Orders",
        [
          ["Date", "Sales"],
          ...(summary.dailyOrders?.map((x) => [new Date(x._id), x.sales]) ||
            []),
        ],
        "AreaChart"
      ),
      renderChart(
        "Product Categories",
        [
          ["Category", "Products"],
          ...(summary.productCategories?.map((x) => [x._id, x.count]) || []),
        ],
        "PieChart"
      ),
    ],
    [
      renderChart(
        "Product Discount",
        [
          ["Category", "Discount"],
          ...(summary.productDiscount?.map((x) => [
            x._id || "Unknown",
            x.discount || 0,
          ]) || []),
        ],
        "PieChart"
      ),
      renderChart(
        "Top Orders by Sales",
        [
          ["Order", "Sales"],
          ...(summary.dailyOrders?.map((x) => [
            `Paid Orders (${x._id})`,
            x.sales,
          ]) || []),
        ],
        "BarChart",
        {
          title: "Top Orders by Sales",
          hAxis: { title: "Orders", minValue: 0 },
          vAxis: { title: "Sales ($)", minValue: 0 },
          colors: ["#4285F4"],
          legend: { position: "none" },
        }
      ),
    ],
    [
      renderChart(
        "Daily Order Count",
        [
          ["Date", "Orders"],
          ...(summary.dailyOrders?.map((x) => [x._id, x.orders]) || []),
        ],
        "ColumnChart",
        {
          title: "Orders per Day",
          hAxis: { title: "Date" },
          vAxis: { title: "# Orders", minValue: 0 },
          colors: ["#7c3aed"],
          legend: { position: "none" },
        }
      ),
      renderChart(
        "Paid vs Unpaid Over Time",
        [
          ["Date", "Paid", "Unpaid"],
          ...(summary.dailyOrders?.map((x) => [x._id, x.paidOrders, x.notPaidOrders]) || []),
        ],
        "BarChart",
        {
          isStacked: true,
          hAxis: { title: "Orders", minValue: 0 },
          vAxis: { title: "Date" },
          colors: ["#2e7d32", "#d32f2f"],
        }
      ),
    ],
    [
      renderChart(
        "Delivered vs Undelivered Over Time",
        [
          ["Date", "Delivered", "Not Delivered"],
          ...(summary.dailyOrders?.map((x) => [x._id, x.deliveredOrders || 0, x.notDeliveredOrders || 0]) || []),
        ],
        "BarChart",
        {
          isStacked: true,
          hAxis: { title: "Count", minValue: 0 },
          vAxis: { title: "Date" },
          colors: ["#1976d2", "#f59e0b"],
        }
      ),
      renderChart(
        "Earnings by SP Project",
        [
          ["Category", "Earnings ($)"],
          ...(summary.totalEarnings?.length
            ? [["Total SP Earnings", totalEarnings]]
            : []),
        ],
        "BarChart",
        {
          hAxis: { title: "Amount ($)", minValue: 0 },
          vAxis: { title: "" },
          colors: ["#0f766e"],
          legend: { position: "none" },
        }
      ),
    ],
    [
      renderChart(
        "Orders Status",
        [
          ["Status", "Count"],
          [
            "Paid",
            summary.dailyOrders?.reduce((sum, x) => sum + x.paidOrders, 0) || 0,
          ],
          [
            "Not Paid",
            summary.dailyOrders?.reduce((sum, x) => sum + x.notPaidOrders, 0) ||
              0,
          ],
        ],
        "PieChart"
      ),
      renderChart(
        "Product Status Distribution",
        [
          ["Status", "Number of Orders"],
          [
            "Delivered",
            summary.dailyOrders?.reduce(
              (sum, x) => sum + (x.deliveredOrders || 0),
              0
            ) || 0,
          ],
          [
            "Not Delivered",
            summary.dailyOrders?.reduce(
              (sum, x) => sum + (x.notDeliveredOrders || 0),
              0
            ) || 0,
          ],
        ],
        "PieChart"
      ),
    ],
  ];

  return (
    <div className="users-product-sales">
      <div className="dashboard-header d-flex justify-content-between align-items-center mb-4 mt-4">
        <div>
          <h1 className="dashboard-title mb-0">Admin Sales Dashboard</h1>
          <p className="dashboard-subtitle text-muted mb-0">
            Monitor platform performance and analytics
          </p>
        </div>
        <Button
          className="refresh-button details"
          onClick={() => fetchData()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : !adminInfo ? (
        <MessageBox variant="warning">
          Admin access required to view this dashboard.
        </MessageBox>
      ) : (
        <>
          <h3 className="overview-title mb-4 mt-4">Overview</h3>
          <Row className="overview-section">
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaShoppingCart /></div>
                  <h5 className="card-title">Total Sales</h5>
                  <h3 className="card-value">${totalSales?.toFixed(2) || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaUsers /></div>
                  <h5 className="card-title">Total Users</h5>
                  <h3 className="card-value">{totalUsers || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaBox /></div>
                  <h5 className="card-title">Total Products</h5>
                  <h3 className="card-value">{totalProducts || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaChartLine /></div>
                  <h5 className="card-title">Total Orders</h5>
                  <h3 className="card-value">{totalOrders || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaMoneyBillWave /></div>
                  <h5 className="card-title">SP Earnings</h5>
                  <h3 className="card-value">${totalEarnings?.toFixed(2) || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaHardHat /></div>
                  <h5 className="card-title">Service Providers</h5>
                  <h3 className="card-value">{totalSPs || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaTasks /></div>
                  <h5 className="card-title">Projects</h5>
                  <h3 className="card-value">{totalProjects || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaEnvelope /></div>
                  <h5 className="card-title">Messages</h5>
                  <h3 className="card-value">{totalMessages || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-3">
              <Card className="overview-card">
                <Card.Body>
                  <div className="card-icon"><FaBell /></div>
                  <h5 className="card-title">Notifications</h5>
                  <h3 className="card-value">{totalNotifications || 0}</h3>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="charts-row">{chartGroups[chartPage]}</div>
          <div className="pagination-controls d-flex justify-content-center align-items-center my-4 gap-3">
            <Button
              className="details"
              onClick={() => setChartPage((prev) => Math.max(prev - 1, 0))}
              disabled={chartPage === 0}
            >
              ← Previous
            </Button>
            <span className="fw-bold">
              Page {chartPage + 1} of {chartGroups.length}
            </span>
            <Button
              className="details"
              onClick={() =>
                setChartPage((prev) =>
                  Math.min(prev + 1, chartGroups.length - 1)
                )
              }
              disabled={chartPage === chartGroups.length - 1}
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
