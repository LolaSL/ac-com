import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from "react";
import { Link } from "react-router-dom";
import { FaRulerCombined } from "react-icons/fa";
import { Store } from "../Store";
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
  <div className="ms-tool-item">{children}</div>
);

const Measurement = () => {
  const { state } = useContext(Store);
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [roomData, setRoomDataState] = useState([]);
  const [acAnnotations, setAcAnnotations] = useState([]);
  const [error, setError] = useState(null);
  const [showStoredCalculation, setShowStoredCalculation] = useState(false);
  const btuCalculatorRef = useRef(null);

  // Check if there's stored BTU data from a previous calculation
  const storedBtuProject = state?.btuData?.currentProject;

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

  // Check for stored calculation on mount
  useEffect(() => {
    if (storedBtuProject && storedBtuProject.rooms && storedBtuProject.rooms.length > 0) {
      setShowStoredCalculation(true);
      // Scroll to calculator after a brief delay
      setTimeout(() => {
        if (btuCalculatorRef.current) {
          btuCalculatorRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 500);
    }
  }, [storedBtuProject]);

  // Wrapper for setRoomData that also accepts annotations
  const setRoomData = (rooms, annotations = []) => {
    setRoomDataState(rooms);
    if (annotations && annotations.length > 0) {
      setAcAnnotations(annotations);
    }
    // Clear stored calculation when new annotation data is set
    if (rooms && rooms.length > 0) {
      setShowStoredCalculation(false);
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
        // Don't set error for rate limit - just log it
        if (response.status === 429) {
          console.warn("Rate limit reached. Please wait before fetching again.");
          return;
        }
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
    // Only fetch once on mount if token is available
    if (token) {
      fetchSavedPdfs();
    }
  }, [fetchSavedPdfs, token]); // Removed fetchSavedPdfs from dependencies to prevent re-fetching

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
    <div className="ms-page">
      {/* Hero */}
      <div className="ms-hero">
        <div className="ms-hero__inner">
          <div className="ms-hero__icon"><FaRulerCombined /></div>
          <h1 className="ms-hero__title">Measurement Service System</h1>
          <p className="ms-hero__sub">Upload your floor plan, annotate rooms and export to BTU calculator.</p>
          {storedBtuProject && !roomData?.length && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(102, 126, 234, 0.15)',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#667eea',
              fontWeight: '600'
            }}>
              📋 Your previous BTU calculation is loaded below
            </div>
          )}
        </div>
      </div>

      <div className="ms-inner">
        {error && <div className="ms-alert">{error}</div>}

        {/* Tool buttons grid */}
        <div className="ms-tools-grid">
          <GridItem><ModalLegend /></GridItem>
          <GridItem><PdfHelpVideo /></GridItem>
          <GridItem><ArchSymbolsModal /></GridItem>
          <GridItem><Sidebar savedPdfs={savedPdfs} fetchSavedPdfs={fetchSavedPdfs} /></GridItem>
        </div>

        <AnnotatorErrorBoundary>
          <Annotator
            fetchSavedPdfs={fetchSavedPdfs}
            setRoomData={setRoomData}
            onExportToBtuCalculator={handleScrollToBtuCalculator}
          />
        </AnnotatorErrorBoundary>

        {/* Show BTU Calculator if either fresh annotation data OR stored calculation exists */}
        {((roomData && roomData.length > 0) || (showStoredCalculation && storedBtuProject)) && (
          <div ref={btuCalculatorRef}>
            {showStoredCalculation && storedBtuProject && !(roomData && roomData.length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <strong>📊 Previous Calculation Loaded</strong>
                  <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                    Showing your last BTU calculation. Start a new annotation above to create a fresh calculation.
                  </p>
                </div>
                <button
                  onClick={() => setShowStoredCalculation(false)}
                  className="ms-clear-calc-btn"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                    minHeight: '44px',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            <BtuCalculator 
              roomData={roomData && roomData.length > 0 ? roomData : storedBtuProject?.rooms || []} 
              acAnnotations={acAnnotations} 
            />
          </div>
        )}

        <div className="ms-home-row">
          <Link to="/" className="home-btn">🏠 Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Measurement;
