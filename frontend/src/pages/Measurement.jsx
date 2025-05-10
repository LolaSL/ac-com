import React, {useState, useEffect} from "react";
import BtuCalculator from "../components/BtuCalculator.jsx";
import Annotator from "../components/Annotator.jsx";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";

const Measurement = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const fetchSavedPdfs = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = userInfo?.token;

    try {
      const response = await fetch('/api/user-annotations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSavedPdfs(data);
      } else {
        console.error('Failed to fetch saved PDFs:', response.status);
      }
    } catch (error) {
      console.error('Error fetching saved PDFs:', error);
    }
  };

  useEffect(() => {
    fetchSavedPdfs();
  }, []);

  return (
    <div>
      <Container>
        <Annotator fetchSavedPdfs={fetchSavedPdfs}/>
        <Sidebar savedPdfs={savedPdfs} fetchSavedPdfs={fetchSavedPdfs}/>
        <BtuCalculator />
        <div className=" mt-4 mb-4">
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </div>
      </Container>
    </div>
  );
};

export default Measurement;
