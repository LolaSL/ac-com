import React, { useContext, useEffect, useReducer } from "react";
import axios from "axios";
import { Store } from "../Store";
import { getError } from "../utils";
import { Badge } from "react-bootstrap";
import { FaFolderOpen, FaBoxOpen } from "react-icons/fa";
import LoadingBox from "../components/LoadingBox.jsx";
import MessageBox from "../components/MessageBox.jsx";
import "./ProjectsPage.css";

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

  if (loading) return <LoadingBox />;
  if (error) return <MessageBox variant="danger">{error}</MessageBox>;

  const statusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>;
    const s = status.toLowerCase();
    if (s === "completed") return <Badge bg="success">Completed</Badge>;
    if (s === "in progress" || s === "in-progress") return <Badge bg="warning" text="dark">In Progress</Badge>;
    if (s === "pending") return <Badge bg="info" text="dark">Pending</Badge>;
    return <Badge bg="secondary">{status}</Badge>;
  };

  return (
    <div className="prj-page">
      <div className="prj-hero">
        <div className="prj-hero__inner">
          <div className="prj-hero__icon"><FaFolderOpen /></div>
          <h1 className="prj-hero__title">My Projects</h1>
          <p className="prj-hero__sub">Overview of all assigned projects and their current status.</p>
        </div>
      </div>

      <div className="prj-body">
        {projects && projects.length > 0 ? (
          <div className="table-responsive">
            <table className="prj-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Hours on Project</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, index) => (
                  <tr key={project._id || index}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Project Name">{project.name}</td>
                    <td data-label="Status">{statusBadge(project.status)}</td>
                    <td data-label="Hours on Project">{project.hoursWorked ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="prj-empty">
            <FaBoxOpen className="prj-empty__icon" />
            <p>No projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
