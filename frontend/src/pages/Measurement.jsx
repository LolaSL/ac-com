import React, { useState, useEffect, useCallback } from "react";
import BtuCalculator from "../components/BtuCalculator.jsx";
import Annotator from "../components/Annotator.jsx";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import BtuModalWindow from "../components/BtuModalWindow.jsx";

const Measurement = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const getToken = () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      return userInfo?.token || null;
    } catch {
      return null;
    }
  };

const fetchSavedPdfs = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("You must be logged in to fetch saved PDFs.");
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/user-annotations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSavedPdfs(data);
      } else {
        setError(`Failed to fetch saved PDFs: ${response.statusText}`);
        console.error("Failed to fetch saved PDFs:", response.status);
      }
    } catch (error) {
      setError("Error fetching saved PDFs.");
      console.error("Error fetching saved PDFs:", error);
    }
  }, []); 

  useEffect(() => {
    fetchSavedPdfs();
  }, [fetchSavedPdfs]);


  useEffect(() => {
    fetchSavedPdfs();
  }, [fetchSavedPdfs]);

  return (
    <div>
      <Container>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <Annotator fetchSavedPdfs={fetchSavedPdfs} setRoomData={setRoomData} />
        <Sidebar
          savedPdfs={savedPdfs}
          fetchSavedPdfs={fetchSavedPdfs}
          roomData={roomData}
          setRoomData={setRoomData}
        />
        <BtuModalWindow />
        <BtuCalculator roomData={roomData} />
        <div className="mt-4 mb-4">
          <Link to="/" className="go-to-btn btn-text">
            Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default Measurement;
