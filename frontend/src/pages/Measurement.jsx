import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import AnnotatorErrorBoundary from "../components/AnnotatorErrorBoundary.js";
import Annotator from "../components/Annotator.jsx";
import Sidebar from "../components/Sidebar.jsx";
import BtuModalWindow from "../components/BtuModalWindow.jsx";
import PdfHelpVideo from "../components/PdfHelpVideo.jsx";
import ArchSymbolsModal from "../components/ArchSymbolsModal.jsx";
import BtuCalculator from "../components/BtuCalculator.jsx";

const getToken = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo?.token || null;
  } catch {
    return null;
  }
};

const GridItem = ({ children }) => (
  <div className="col d-flex">
    <div className="w-100 h-100 d-flex align-items-stretch">{children}</div>
  </div>
);

const Measurement = () => {
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [roomData, setRoomData] = useState([]);
  const [error, setError] = useState(null);

  const token = useMemo(() => getToken(), []);

  const fetchSavedPdfs = useCallback(async () => {
    if (!token) {
      setError("You must be logged in to fetch saved PDFs.");
      return;
    }
    setError(null);

    try {
      const response = await fetch("/api/user-annotations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setError(`Failed to fetch saved PDFs: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      setSavedPdfs(data);
    } catch (err) {
      console.error("Error fetching saved PDFs:", err);
      setError("Error fetching saved PDFs.");
    }
  }, [token]);

  useEffect(() => {
    fetchSavedPdfs();
  }, [fetchSavedPdfs]);

  useEffect(() => {
    console.log("ROOM DATA UPDATED:", roomData);
  }, [roomData]);

  return (
    <Container>
      {error && <div className="alert alert-danger">{error}</div>}
      <h1 className="mt-4 mb-4 title-measurement">Measurement Service System</h1>
      <div className="row row-cols-2 row-cols-md-4 g-3 pt-4 mt-4">
        <GridItem><PdfHelpVideo /></GridItem>
        <GridItem><ArchSymbolsModal /></GridItem>
        <GridItem>
          <Sidebar
            savedPdfs={savedPdfs}
            fetchSavedPdfs={fetchSavedPdfs}
          />
        </GridItem>
        <br/>
     
        <GridItem><BtuModalWindow /></GridItem>
      </div>
     
      <AnnotatorErrorBoundary>
        <Annotator 
          fetchSavedPdfs={fetchSavedPdfs} 
          setRoomData={setRoomData}
        />
      </AnnotatorErrorBoundary>
         {roomData && roomData.length > 0 && (
        <BtuCalculator roomData={roomData} />
      )}

      <div className="mt-4 mb-4">
        <Link to="/" className="go-to-btn btn-text w-auto">
          Back to Home
        </Link>
      </div>
    </Container>
  );
};

export default Measurement;