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
      return { ...state, projects: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const Projects = () => {
  const { state } = useContext(Store);
  const { serviceProviderInfo } = state;

  const [{ loading, error, projects }, dispatch] = useReducer(reducer, {
    projects: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchProjects = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const token = serviceProviderInfo?.token; 

        if (!token) {
          throw new Error("Not authenticated, please log in");
        }

        const { data } = await axios.get("/api/service-providers/projects", {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        });

        dispatch({ type: "FETCH_SUCCESS", payload: data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: getError(err) });
      }
    };

    fetchProjects();
  }, [serviceProviderInfo]);

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p>Error loading projects: {error}</p>;

  return (
<Container classname="provider-container">
  <h2 className="mt-4 mb-4 fw-bold">Projects</h2>
  <div className="table-responsive">
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>ID</th>
          <th>Project Name</th>
          <th>Status</th>
          <th>Time On Project</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project, index) => (
          <tr key={index}>
            <td data-label="ID">{index + 1}</td>
            <td data-label="Project Name">{project.name}</td>
            <td data-label="Status">{project.status}</td>
            <td data-label="Time On Project">{project.hoursWorked}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
</Container>

  );
};

export default Projects;
