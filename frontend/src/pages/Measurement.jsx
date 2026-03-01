import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import AnnotatorErrorBoundary from "../components/AnnotatorErrorBoundary.js";
import Annotator from "../components/Annotator.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ModalLegend from "../components/ModalLegend_new.jsx";
import PdfHelpVideo from "../components/PdfHelpVideo.jsx";
import ArchSymbolsModal from "../components/ArchSymbolsModal.jsx";
import BtuCalculator from "../components/BtuCalculator.jsx";
import "./Measurement.css";

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
  const [roomData, setRoomDataState] = useState([]);
  const [acAnnotations, setAcAnnotations] = useState([]);
  const [error, setError] = useState(null);
  const btuCalculatorRef = useRef(null);

  // Clean up any Bootstrap modal state left behind when navigating away
  useEffect(() => {
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      document
        .querySelectorAll(".modal-backdrop")
        .forEach((el) => el.remove());
    };
  }, []);

  // Wrapper for setRoomData that also accepts annotations
  const setRoomData = (rooms, annotations = []) => {
    setRoomDataState(rooms);
    if (annotations && annotations.length > 0) {
      setAcAnnotations(annotations);
    }
  };

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
    console.log("AC ANNOTATIONS:", acAnnotations);
  }, [roomData, acAnnotations]);

  const handleScrollToBtuCalculator = () => {
    if (btuCalculatorRef.current) {
      setTimeout(() => {
        btuCalculatorRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  };

  return (
    <Container>
      {error && <div className="alert alert-danger">{error}</div>}
      <h1 className="page-title">
        Measurement Service System
      </h1>
      <div className="row row-cols-2 row-cols-md-4 g-3 pt-4 mt-4">
        <GridItem>
          <ModalLegend />
        </GridItem>
        <GridItem>
          <PdfHelpVideo />
        </GridItem>
        <GridItem>
          <ArchSymbolsModal />
        </GridItem>
        <GridItem>
          <Sidebar savedPdfs={savedPdfs} fetchSavedPdfs={fetchSavedPdfs} />
        </GridItem>
        <br />
      </div>

      <AnnotatorErrorBoundary>
        <Annotator
          fetchSavedPdfs={fetchSavedPdfs}
          setRoomData={setRoomData}
          onExportToBtuCalculator={handleScrollToBtuCalculator}
        />
      </AnnotatorErrorBoundary>
      {roomData && roomData.length > 0 && (
        <div ref={btuCalculatorRef}>
          <BtuCalculator roomData={roomData} acAnnotations={acAnnotations} />
        </div>
      )}

      <div className="mt-4 mb-4">
        <Link to="/" className="home-btn">
          🏠 Home
        </Link>
      </div>
    </Container>
  );
};

export default Measurement;
