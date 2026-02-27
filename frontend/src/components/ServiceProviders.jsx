import React, { useContext, useEffect, useReducer, useCallback } from "react";
import axios from "axios";
import { Chart } from "react-google-charts";
import { Store } from "../Store";
import { getError } from "../utils";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import { Container, Table, Button } from "react-bootstrap";
import "./ServiceProviders.css";

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return {
        ...state,
        serviceProviders: action.payload.serviceProviders || [],
        loading: false,
        currentPage: action.payload.currentPage,
        totalPages: action.payload.totalPages,
        totalServiceProviders: action.payload.totalServiceProviders,
      };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const ServiceProviders = () => {
  const [
    { loading, serviceProviders, error, currentPage, totalPages },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    serviceProviders: [],
    error: "",
    currentPage: 1,
    totalPages: 1,
  });

  const { state } = useContext(Store);
  const { adminInfo } = state;
  const token = adminInfo?.token;

  const fetchData = useCallback(async () => {
    dispatch({ type: "FETCH_REQUEST" });
    try {
      const { data } = await axios.get("/api/service-providers/summary", {
        params: { page: currentPage, pageSize: 10 },
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({
        type: "FETCH_FAIL",
        payload: getError(err),
      });
    }
  }, [currentPage, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const barChartData = [
    ["Provider", "Earnings"],
    ...serviceProviders.map((provider) => [
      provider.name,
      provider.totalEarnings || 0,
    ]),
  ];

  const barChartOptions = {
    title: "Provider vs Earnings",
    chartArea: { width: "70%" },
    hAxis: { title: "Earnings (USD)", minValue: 0 },
    vAxis: { title: "Provider" },
    legend: "none",
    colors: ["#10b2ad"],
  };

  const pieChartData = [
    ["Status", "Number of Projects"],
    [
      "Completed Projects",
      serviceProviders.reduce(
        (sum, provider) => sum + (provider.completedProjects || 0),
        0
      ),
    ],
    [
      "In Progress Projects",
      serviceProviders.reduce(
        (sum, provider) => sum + (provider.inProgressProjects || 0),
        0
      ),
    ],
  ];

  const pieChartOptions = {
    title: "Project Distribution",
    pieHole: 0.4,
    is3D: false,
    legend: { position: "bottom" },
    colors: ["#0ac22f", "#cd17ee"],
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    dispatch({ type: "FETCH_REQUEST" });

    axios
      .get("/api/service-providers", {
        params: { page: newPage, pageSize: 10 },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        dispatch({ type: "FETCH_SUCCESS", payload: response.data });
      })
      .catch((err) => {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      });
  };

  return (
    <Container className="provider-container">
      <div className="provider-header">
        <div>
          <h1 className="page-title">Admin Service Providers Sales</h1>
          <p className="text-muted mb-0">
            Monitor service provider performance and earnings
          </p>
        </div>
        <Button
          className="details"
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
        <div className="table-responsive">
          <Table striped bordered hover responsive className="table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Company</th>
                <th>Specialty</th>
                <th>Experience</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Completed Projects</th>
                <th>In Progress Projects</th>
                <th>Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {serviceProviders.length > 0 ? (
                serviceProviders.map((serviceProvider, index) => (
                  <tr key={index}>
                    <td data-label="ID">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td data-label="Name">{serviceProvider.name}</td>
                    <td data-label="Company">{serviceProvider.company}</td>
                    <td data-label="Specialty">
                      {serviceProvider.typeOfProvider}
                    </td>
                    <td data-label="Experience">
                      {serviceProvider.experience} years
                    </td>
                    <td data-label="Email">{serviceProvider.email}</td>
                    <td data-label="Phone">{serviceProvider.phone}</td>
                    <td data-label="Completed Projects" className="text-center">
                      {serviceProvider.completedProjects}
                    </td>
                    <td data-label="In Progress Projects">
                      {serviceProvider.inProgressProjects}
                    </td>
                    <td data-label="Total Earnings">
                      ${serviceProvider.totalEarnings?.toFixed(2) || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center">
                    No service providers found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <div className="chart-container">
            <h3>Project Distribution</h3>
            <Chart
              chartType="PieChart"
              width="100%"
              height="300px"
              data={pieChartData}
              options={pieChartOptions}
            />
          </div>
          <div className="chart-container">
            <h3>Provider vs Earnings</h3>
            <Chart
              chartType="BarChart"
              width="100%"
              height="300px"
              data={barChartData}
              options={barChartOptions}
            />
          </div>
          <div className="pagination-container">
            <button
              className="details"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <button
              className="details"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ServiceProviders;
