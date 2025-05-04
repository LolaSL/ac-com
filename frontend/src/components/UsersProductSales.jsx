import React, { useContext, useEffect, useReducer, useCallback, useState } from "react";
import Chart from "react-google-charts";
import axios from "axios";
import { Store } from "../Store.js";
import { getError } from "../utils.js";
import LoadingBox from "./LoadingBox.jsx";
import MessageBox from "./MessageBox.jsx";
import Row from "react-bootstrap/Row";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

const initialState = {
  loading: true,
  summary: {},
  totalPages: 1,
  currentPage: 1,
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
        currentPage: action.payload.currentPage || 1,
        totalPages: action.payload.totalPages || 1,
        loading: false,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function UsersProductSales() {
  const [{ loading, summary,  error }, dispatch] =
    useReducer(reducer, initialState);

  const { state } = useContext(Store);
  const { userInfo } = state;

  const [chartPage, setChartPage] = useState(0);

  const fetchData = useCallback(
    async (page = 1) => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const { data } = await axios.get(`/api/orders/summary?page=${page}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    },
    [userInfo]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const renderCard = (title, value) => (
    <Card className="mb-3 chart-card me-2">
      <Card.Body>
        <Card.Title className="chart-card-title">{value || 0}</Card.Title>
        <Card.Text>{title}</Card.Text>
      </Card.Body>
    </Card>
  );

  const renderChart = (title, data, chartType, options = {}) => (
    <div className="chart-col my-4">
      <h3 className="text-center">{title}</h3>
      {data.length === 0 ? (
        <MessageBox>No Data Available</MessageBox>
      ) : (
        <Chart
          width="100%"
          height="400px"
          chartType={chartType}
          loader={<div>Loading Chart...</div>}
          data={data}
          options={options}
        />
      )}
    </div>
  );

  const chartGroups = [
    [
      renderChart(
        "Sales Orders",
        [
          ["Date", "Sales"],
          ...(summary.dailyOrders?.map((x) => [new Date(x._id), x.sales]) || []),
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
          ...(summary.productDiscount?.map((x) => [x._id || "Unknown", x.discount || 0]) || []),
        ],
        "PieChart"
      ),
      renderChart(
        "Top Orders by Sales",
        [
          ["Order", "Sales"],
          ...(summary.dailyOrders?.map((x) => [`Paid Orders (${x._id})`, x.sales]) || []),
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
        "Orders Status",
        [
          ["Status", "Count"],
          [
            "Paid",
            summary.dailyOrders?.reduce((sum, x) => sum + x.paidOrders, 0) || 0,
          ],
          [
            "Not Paid",
            summary.dailyOrders?.reduce((sum, x) => sum + x.notPaidOrders, 0) || 0,
          ],
        ],
        "PieChart"
      ),
      renderChart(
        "Product Status Distribution",
        [
          ["Status", "Number of Orders"],
          ...(summary.dailyOrders?.flatMap((x) => [
            ["Delivered", x.deliveredOrders],
            ["Not Delivered", x.notDeliveredOrders],
          ]) || []),
        ],
        "PieChart"
      ),
    ],
  ];

  return (
    <div>
      <h1 className="mb-4 mt-4">Users Product Sales Dashboard</h1>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          <h3 className="mb-4 mt-4">Users</h3>
          <Row>
            {renderCard("Users", summary?.users?.[0]?.numUsers)}
            {renderCard("Orders", summary?.orders?.[0]?.numOrders)}
            {renderCard("Sales", summary?.orders?.[0]?.totalSales?.toFixed(2))}
          </Row>

          <div className="charts-row">{chartGroups[chartPage]}</div>
          <div className="text-center my-3">
            <Button
              className="btn btn-secondary mx-2"
              onClick={() => setChartPage((prev) => Math.max(prev - 1, 0))}
              disabled={chartPage === 0}
            >
              Previous 
            </Button>
            <span>
              Chart Page {chartPage + 1} of {chartGroups.length}
            </span>
            <Button
              className="btn btn-secondary mx-2"
              onClick={() => setChartPage((prev) => Math.min(prev + 1, chartGroups.length - 1))}
              disabled={chartPage === chartGroups.length - 1}
            >
              Next 
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
