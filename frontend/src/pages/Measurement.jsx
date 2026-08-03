import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const location = useLocation();
  const navigate = useNavigate();
  const _searchParams = new URLSearchParams(location.search);
  const deepLinkAnnotationId = _searchParams.get('annotation');
  const deepLinkEngineerReviewId = _searchParams.get('engineerReview');
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [roomData, setRoomDataState] = useState([]);
  const [acAnnotations, setAcAnnotations] = useState([]);
  const [annotatorActive, setAnnotatorActive] = useState(false);
  const [measurementMode, setMeasurementMode] = useState("withAnnotator");
  const [error, setError] = useState(null);
  const [showStoredCalculation, setShowStoredCalculation] = useState(false);
  const btuCalculatorRef = useRef(null);
  const isWithAnnotator = measurementMode === "withAnnotator";

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

  // Check for stored calculation on mount or when returning from another page
  useEffect(() => {
    if (storedBtuProject && storedBtuProject.rooms && storedBtuProject.rooms.length > 0) {
      setShowStoredCalculation(true);
      // Only auto-scroll when navigating directly from the BTU Calculator
      if (location.state?.fromBtu) {
        setTimeout(() => {
          if (btuCalculatorRef.current) {
            btuCalculatorRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }, 500);
      }
    }
  }, [location.state?.fromBtu, storedBtuProject]);

  // Wrapper for setRoomData that also accepts annotations
  const setRoomData = (rooms, annotations = []) => {
    setRoomDataState(rooms);
    setAnnotatorActive(true); // File has been loaded — keep BTU Calculator visible
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

  const hasBtuResult = Boolean(state?.btuData?.currentProject?.totalBTU);

  const wizardState = useMemo(() => {
    if (isWithAnnotator) {
      const steps = [
        { label: t("measurement.page.wizard.uploadPdf"), icon: '📤' },
        { label: t("measurement.page.wizard.reviewRooms"), icon: '📋' },
        { label: t("measurement.page.wizard.annotate"), icon: '📌' },
        { label: t("measurement.page.wizard.calculateBtu"), icon: '🧮' },
        { label: t("measurement.page.wizard.viewResults"), icon: '✅' },
      ];

      let currentStep = 1;
      if (hasBtuResult) currentStep = 5;
      else if (annotatorActive && roomData?.length > 0) currentStep = 3;
      else if (roomData?.length > 0) currentStep = 2;
      else if (annotatorActive) currentStep = 2;

      return { steps, currentStep };
    }

    const steps = [
      { label: t("measurement.page.wizard.selectMode"), icon: '⚙️' },
      { label: t("measurement.page.wizard.manualRooms"), icon: '📝' },
      { label: t("measurement.page.wizard.viewResults"), icon: '✅' },
    ];

    return {
      steps,
      currentStep: hasBtuResult ? 3 : 2,
    };
  }, [isWithAnnotator, hasBtuResult, annotatorActive, roomData, t]);

  const handleModeChange = (mode) => {
    setMeasurementMode(mode);
    if (mode === "withoutAnnotator") {
      setRoomDataState([]);
      setAcAnnotations([]);
      setAnnotatorActive(false);
    }
  };

  return (
    <div className="ms-page">
      {/* Hero */}
      <div className="ms-hero">
        <div className="ms-hero__inner">
          <div className="ms-hero__icon"><FaRulerCombined /></div>
          <h1 className="ms-hero__title">{t("measurement.page.hero.title")}</h1>
          <p className="ms-hero__sub">{t("measurement.page.hero.subtitle")}</p>

          {/* Step-by-step progress wizard */}
          <div className="ms-wizard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0, marginTop: '1.5rem',
          }}>
            {wizardState.steps.map((step, idx) => {
              const stepNum = idx + 1;
              const isDone    = wizardState.currentStep > stepNum;
              const isActive  = wizardState.currentStep === stepNum;
              const isViewResults = stepNum === wizardState.steps.length;
              const clickable = isViewResults && (isDone || isActive);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    className="ms-wizard__step"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '4px', minWidth: '64px', cursor: clickable ? 'pointer' : 'default' }}
                    onClick={clickable ? () => navigate('/recommendations') : undefined}
                    title={clickable ? t("measurement.page.wizard.viewResultsTooltip") : undefined}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700,
                      background: isDone ? '#10b981' : isActive ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                      border: `2px solid ${isDone ? '#10b981' : isActive ? '#f59e0b' : 'rgba(255,255,255,0.3)'}`,
                      color: '#fff', transition: 'all 0.3s',
                    }}>
                      {isDone ? '✓' : step.icon}
                    </div>
                    <span style={{
                      fontSize: '0.65rem', color: isActive ? '#f59e0b' : isDone ? '#10b981' : '#94a3b8',
                      fontWeight: isActive ? 700 : 400, textAlign: 'center', lineHeight: 1.2,
                      textDecoration: clickable ? 'underline' : 'none',
                    }}>{step.label}</span>
                  </div>
                  {idx < wizardState.steps.length - 1 && (
                    <div className="ms-wizard__connector" style={{
                      width: '28px', height: '2px', marginBottom: '18px',
                      background: isDone ? '#10b981' : 'rgba(255,255,255,0.2)',
                      transition: 'background 0.3s',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          {showStoredCalculation && storedBtuProject && !roomData?.length && (
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
              {t("measurement.page.storedCalcBanner")}
            </div>
          )}
        </div>
      </div>

      <div className="ms-inner">
        {error && <div className="ms-alert">{error}</div>}

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t("measurement.page.calculationMode.label")}</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleModeChange("withAnnotator")}
              className="ms-clear-calc-btn"
              style={{
                background: isWithAnnotator ? "#667eea" : "#e9ecef",
                border: "1px solid rgba(0,0,0,0.12)",
                color: isWithAnnotator ? "#fff" : "#212529",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                minHeight: "42px",
              }}
            >
              {t("measurement.page.calculationMode.withAnnotator")}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("withoutAnnotator")}
              className="ms-clear-calc-btn"
              style={{
                background: !isWithAnnotator ? "#667eea" : "#e9ecef",
                border: "1px solid rgba(0,0,0,0.12)",
                color: !isWithAnnotator ? "#fff" : "#212529",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                minHeight: "42px",
              }}
            >
              {t("measurement.page.calculationMode.withoutAnnotator")}
            </button>
          </div>
        </div>

        {isWithAnnotator ? (
          <>
            {/* Tool buttons grid */}
            <div className="ms-tools-grid">
              <GridItem><ModalLegend /></GridItem>
              <GridItem><PdfHelpVideo /></GridItem>
              <GridItem><ArchSymbolsModal /></GridItem>
              <GridItem><Sidebar savedPdfs={savedPdfs} fetchSavedPdfs={fetchSavedPdfs} deepLinkAnnotationId={deepLinkAnnotationId} deepLinkEngineerReviewId={deepLinkEngineerReviewId} /></GridItem>
            </div>

            <AnnotatorErrorBoundary>
              <Annotator
                fetchSavedPdfs={fetchSavedPdfs}
                setRoomData={setRoomData}
                onExportToBtuCalculator={handleScrollToBtuCalculator}
              />
            </AnnotatorErrorBoundary>
          </>
        ) : (
          <div
            style={{
              background: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
              color: "#495057",
            }}
          >
            {t("measurement.page.annotatorDisabled")}
          </div>
        )}

        {/* Always show BTU Calculator: user can calculate from PDF rooms or manual room entry */}
        <div ref={btuCalculatorRef}>
            {showStoredCalculation && storedBtuProject && !(roomData && roomData.length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <strong>{t("measurement.page.prevCalc.title")}</strong>
                  <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                    {t("measurement.page.prevCalc.text")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowStoredCalculation(false);
                    ctxDispatch({ type: 'BTU_CLEAR' });
                  }}
                  className="ms-clear-calc-btn"
                  style={{
                    alignSelf: 'flex-end',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s',
                    minHeight: '44px',
                  }}
                >
                  {t("measurement.page.prevCalc.clear")}
                </button>
              </div>
            )}
            <BtuCalculator 
              roomData={
                isWithAnnotator
                  ? (roomData && roomData.length > 0 ? roomData : storedBtuProject?.rooms || [])
                  : (storedBtuProject?.rooms || [])
              }
              acAnnotations={isWithAnnotator ? acAnnotations : []} 
              forceCondenserForRecommendations={!isWithAnnotator}
            />
        </div>

        <div className="ms-home-row">
          <Link to="/" className="home-btn">🏠 {t("auth.home")}</Link>
        </div>
      </div>
    </div>
  );
};

export default Measurement;
