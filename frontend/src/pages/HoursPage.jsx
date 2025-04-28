import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Container, Table } from "react-bootstrap";


const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, earnings: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const HoursPage = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [{ loading, error, earnings }, dispatch] = useReducer(reducer, {
    earnings: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchEarnings = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const token = serviceProviderInfo?.token;

        if (!token) {
          throw new Error("Not authenticated, please log in");
        }

        const { data } = await axios.get("/api/service-providers/earnings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (error) {
        dispatch({ type: "FETCH_FAIL", payload: getError(error) });
      }
    };

    fetchEarnings();
  }, [serviceProviderInfo?.token]);

  if (loading) return <p>Loading earnings...</p>;
  if (error) return <p>Error loading earnings: {error}</p>;

  return (
    <Container className="provider-container">
      <h1 className="mt-4 mb-4 fw-bold">Work Duration</h1>
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Project Name</th>
              <th>Time On Project</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {earnings.length > 0 ? (
              earnings.map((earning, index) => (
                <tr key={earning._id}>
                  <td data-label="ID">{index + 1}</td>
                  <td data-label="Project Name">{earning.projectName.name}</td>{" "}
                  <td data-label="Time On Project">
                    {earning.projectName.hoursWorked}
                  </td>{" "}
                  <td data-label="Date">
                    {new Date(earning.date).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No earnings data found</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </Container>
  );
};

export default HoursPage;
