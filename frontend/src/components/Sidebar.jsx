import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";
import { Store } from "../Store.js";
import SaveAsPDF from "./SaveAsPDF.jsx";
import { overlayAnnotations, overlayHVAC, overlayVRFSystem, drawCanvasLegend, hvacSymbols } from "../utils/annotationUtils.js";
import "./Sidebar.css";
import { Button } from "react-bootstrap";

// SVG icons
const FaFilePdf = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    width="20"
    height="20"
    fill="currentColor"
    className="me-2 text-primary"
  >
    <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z" />
  </svg>
);

const FaLock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    width="20"
    height="20"
    fill="currentColor"
    className="ms-2 text-danger"
  >
    <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z" />
  </svg>
);

const FaTrash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 448 512"
    width="20"
    height="20"
    fill="currentColor"
  >
    <path d="M135.2 17.7C140.9 6.8 152.6 0 165.2 0H282.8c12.6 0 24.3 6.8 30 17.7L384 80H448c6.9 0 12.5 5.6 12.5 12.5s-5.6 12.5-12.5 12.5H0C-6.9 105-12.5 99.4-12.5 92.5S-6.9 80 0 80H64L135.2 17.7zM192 256c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zm-64 0c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zm192 0c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v160c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8V256zM56.8 208.5c-.3-4.5-4.1-7.8-8.6-7.8H8.6C3.9 200.7 0 204.6 0 209.3s3.9 8.6 8.6 8.6H48.2c4.5 0 8.3-3.3 8.6-7.8z" />
  </svg>
);

const FaTimes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="14" height="14" fill="currentColor">
    <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.3-105.4z"/>
  </svg>
);

/**
 * Draws HVAC elements (ducts and diffusers) on the canvas context.
 * @param {CanvasRenderingContext2D} context - Canvas 2D context to draw on.
 * @param {Object} hvacAnnotations - Object with ducts and diffusers arrays.
 */

const statusConfig = {
  approved: { label: 'Approved', color: '#16a34a', bg: '#dcfce7' },
  reviewed: { label: 'Reviewed', color: '#2563eb', bg: '#dbeafe' },
  pending:  { label: 'Pending',  color: '#d97706', bg: '#fef3c7' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
};

const Sidebar = ({ deepLinkAnnotationId, deepLinkEngineerReviewId } = {}) => {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;
  const [savedPdfs, setSavedPdfs] = useState([]);
  const [savedPdfsLoading, setSavedPdfsLoading] = useState(false);
  const [engineerAnnotations, setEngineerAnnotations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);
  const [selectedAnnotations, setSelectedAnnotations] = useState(null);
  const [selectedAcType, setSelectedAcType] = useState("ducted"); // Track acType for current PDF
  const [showHVAC, setShowHVAC] = useState(false);
  const [activeTab, setActiveTab] = useState("my-annotations"); // "my-annotations" or "engineer-reviews"
  // eslint-disable-next-line no-unused-vars
  const [currentPdfType, setCurrentPdfType] = useState(null); // "user" or "engineer"
  const [engineerAnnotationsLoading, setEngineerAnnotationsLoading] =
    useState(false);

  // Mobile-friendly delete confirmation state (replaces window.confirm)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, pdfId: null, filename: '', isEngineerReview: false, deleteAll: false });

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [myDrawingsPage, setMyDrawingsPage]         = useState(1);
  const [engineerReviewsPage, setEngineerReviewsPage] = useState(1);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'reviewed' | 'rejected'

  // Track whether the deep-link has already been handled (avoid repeated triggers)
  const deepLinkHandled = useRef(false);

  // PDF zoom scale
  const [pdfScale, setPdfScale] = useState(1.5);

  // Determine user role
  const isAdmin = !!state?.adminInfo && !!state?.adminInfo.token;
  const userId = state?.userInfo?._id || state?.adminInfo?._id;

  // Filter & sort helper
  const filterAndSort = (list) => {
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = list.filter(
        (item) =>
          (item.filename || '').toLowerCase().includes(q) ||
          (item.engineerId?.name || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (item) => (item.status || 'pending').toLowerCase() === statusFilter
      );
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return (a.filename || '').localeCompare(b.filename || '');
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });
  };

  const handleShareLink = (id, isEngineer = false) => {
    const base = window.location.origin;
    const url = isEngineer
      ? `${base}/measurement?engineerReview=${id}`
      : `${base}/measurement?annotation=${id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard!'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Link copied to clipboard!');
    }
  };

  // Reset pagination when search/sort/filter changes
  useEffect(() => {
    setMyDrawingsPage(1);
    setEngineerReviewsPage(1);
  }, [searchQuery, sortBy, statusFilter]);

  // const isUser = !!state?.userInfo && !!state?.userInfo.token;

  const fetchSavedPdfs = useCallback(async () => {
    if (!token) {
      setError("User not authenticated.");
      return;
    }

    try {
      setSavedPdfsLoading(true);
      setError(null);
      let response;
      response = await fetch("/api/user-annotations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch saved PDFs");
      }
      const data = await response.json();
      const enhancedData = data.map((item) => ({
        ...item,
        pdfUrl: `/annotated-pdf/${item._id}`,
        isPaid: item.isPaid ?? false,
      }));
      setSavedPdfs(enhancedData);
      console.log("Saved PDFs:", enhancedData);
      setSavedPdfsLoading(false);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
      setError(err.message || "Error fetching saved PDFs. Please try again.");
      setSavedPdfsLoading(false);
    }
  }, [token]);

  const fetchEngineerAnnotations = useCallback(async () => {
    if (!token || !userId) {
      console.log("Missing token or userId for engineer annotations fetch");
      return;
    }

    try {
      setEngineerAnnotationsLoading(true);
      console.log(`Fetching engineer annotations for user: ${userId}`);
      const response = await fetch(`/api/engineer-annotations/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log(
          `Engineer annotations fetch failed: ${response.status}`,
          errorData
        );
        setEngineerAnnotations([]);
        setEngineerAnnotationsLoading(false);
        // Fallback: if a specific user annotation is selected, try fetching by userAnnotationId
        if (selectedPdf?._id) {
          try {
            const fallbackRes = await fetch(
              `/api/engineer-annotations/by-user-annotation/${selectedPdf._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              console.log(
                "Fallback engineer annotations by userAnnotationId:",
                fallbackData
              );
              setEngineerAnnotations(fallbackData || []);
            }
          } catch (e) {
            console.log("Fallback engineer annotations fetch error:", e);
          }
        }
        return;
      }
      const data = await response.json();
      console.log("Engineer annotations fetched successfully:", data);
      setEngineerAnnotations(data || []);
      setEngineerAnnotationsLoading(false);
    } catch (err) {
      console.error("Error fetching engineer annotations:", err);
      setEngineerAnnotations([]);
      setEngineerAnnotationsLoading(false);
    }
  }, [token, userId, selectedPdf]);
  useEffect(() => {
    if (isOpen) {
      fetchSavedPdfs();
      fetchEngineerAnnotations();
    } else {
      // reset selected PDF and errors when sidebar is closed
      setSelectedPdf(null);
      setSelectedPdfFile(null);
      setSelectedAnnotations(null);
      setError(null);
    }
  }, [isOpen, fetchSavedPdfs, fetchEngineerAnnotations]);

  // Auto-open sidebar and switch to the correct tab when a deep-link param is present
  useEffect(() => {
    if ((deepLinkAnnotationId || deepLinkEngineerReviewId) && !deepLinkHandled.current) {
      setIsOpen(true);
      if (deepLinkEngineerReviewId) setActiveTab('engineer-reviews');
      else setActiveTab('my-annotations');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once my-annotations data loads, auto-select the linked item
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkAnnotationId || savedPdfs.length === 0) return;
    const item = savedPdfs.find((p) => p._id === deepLinkAnnotationId);
    if (item) {
      deepLinkHandled.current = true;
      viewPdfWithAnnotations(item);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPdfs, deepLinkAnnotationId]);

  // Once engineer-reviews data loads, auto-select the linked item
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkEngineerReviewId || engineerAnnotations.length === 0) return;
    const item = engineerAnnotations.find((a) => a._id === deepLinkEngineerReviewId);
    if (item) {
      deepLinkHandled.current = true;
      viewEngineerAnnotationPdf(item);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineerAnnotations, deepLinkEngineerReviewId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Ensure engineer reviews refresh if needed, but data is fetched on open
  // Removed separate useEffect for activeTab to avoid redundant fetches

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  // Redraw overlays when HVAC toggle or annotations change
  useEffect(() => {
    if (!selectedAnnotations || !selectedPdfFile) return;

    const container = document.getElementById("pdf-container");
    if (!container) return;

    // For engineer reviews, there are two wrapper divs (ducted + ductless)
    if (currentPdfType === "engineer") {
      const wrappers = container.querySelectorAll("div");
      const modes = ["vrf-ducted", "vrf-ductless"];
      wrappers.forEach((wrapper, idx) => {
        const overlayCanvas = wrapper.querySelector("canvas:nth-child(2)");
        if (!overlayCanvas) return;
        const ctx = overlayCanvas.getContext("2d");
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        const mode = modes[idx] || "vrf-ducted";

        overlayAnnotations(ctx, selectedAnnotations, mode, { pdfScale: 1 });

        if (showHVAC && selectedAnnotations.hvac && (mode === "ducted" || mode === "vrf-ducted")) {
          overlayHVAC(ctx, selectedAnnotations.hvac, hvacSymbols, selectedAnnotations.comments, mode, 1);
        }

        if (selectedAnnotations.vrf && mode.startsWith("vrf")) {
          overlayVRFSystem(ctx, selectedAnnotations.vrf, hvacSymbols, mode);
        }

        drawCanvasLegend(ctx, mode, { pdfScale: 1 });

        // Mode label
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.font = "bold 14px Arial";
        ctx.fillText(
          mode === "vrf-ducted"
            ? "VRF System \u2014 Ducted Indoor Units"
            : "VRF System \u2014 Ductless Indoor Units",
          10, 20
        );
        ctx.restore();
      });
      return;
    }

    // For user annotations: single overlay canvas
    const overlayCanvas = container.querySelector("canvas:nth-child(2)");
    if (!overlayCanvas) return;

    const context = overlayCanvas.getContext("2d");
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const acType = selectedAcType;

    // redraw normal annotations
    overlayAnnotations(context, selectedAnnotations, acType, { skipRefrigerantLines: true, pdfScale: 1 });

    // draw HVAC layer if toggled
    if (showHVAC && (acType === "ducted" || acType === "vrf-ducted")) {
      overlayHVAC(
        context,
        selectedAnnotations.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] },
        hvacSymbols,
        selectedAnnotations.comments,
        acType,
        1
      );
    }

    // draw VRF system if applicable
    if (selectedAnnotations.vrf && acType && acType.startsWith("vrf")) {
      overlayVRFSystem(
        context,
        selectedAnnotations.vrf,
        hvacSymbols,
        acType
      );
    }

    // draw legend
    drawCanvasLegend(context, acType, { pdfScale: 1 });
  }, [showHVAC, selectedAnnotations, selectedPdfFile, currentPdfType, selectedAcType, pdfScale]);

  // Re-render PDF at new scale when zoom changes
  useEffect(() => {
    if (!selectedPdf) return;
    if (currentPdfType === "user") {
      viewPdfWithAnnotations(selectedPdf);
    } else if (currentPdfType === "engineer") {
      viewEngineerAnnotationPdf(selectedPdf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfScale]);

  const viewPdfWithAnnotations = async (pdf) => {
    console.log("Viewing PDF:", pdf);
    if (!token) return setError("User not authenticated.");
    try {
      if (pdf.isPaid) {
        alert("You need to pay to view this PDF with annotations.");
        return;
      }

      setCurrentPdfType("user");
      setSelectedPdf(pdf);
      const pdfResponse = await fetch(`/api/annotated-pdf/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!pdfResponse.ok)
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File([pdfBlob], pdf.filename || "untitled.pdf", {
        type: "application/pdf",
      });
      setSelectedPdfFile(pdfFile);

      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const annotationsResponse = await fetch(`/api/annotations/${pdf._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!annotationsResponse.ok)
        throw new Error(
          `Failed to fetch annotations: ${annotationsResponse.status}`
        );
      const annotationsData = await annotationsResponse.json();
      // Backend may return either the annotations object directly or a wrapper
      // like { annotations, isPaid, acType }. Normalize to annotations object.
      const normalizedAnnotations =
        annotationsData && annotationsData.annotations
          ? annotationsData.annotations
          : annotationsData;
      const acType = annotationsData?.acType || "ducted"; // Get acType from backend response
      setSelectedAcType(acType); // Store for use in overlay rendering
      console.log("Fetched annotations for", pdf._id, normalizedAnnotations);
      console.log("Fetched rectangles (should be in %%):", normalizedAnnotations?.rectangles);
      console.log("Fetched comments (should be in %%):", normalizedAnnotations?.comments);
      setSelectedAnnotations(normalizedAnnotations); // Store normalized annotations (rectangles, comments, etc.)

      const container = document.getElementById("pdf-container");
      if (!container) return;
      container.innerHTML = "";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      // Use scale=1 to match Annotator's rendering scale
      const scale = 1;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      const context = canvas.getContext("2d");
      container.appendChild(canvas);

      console.log('Sidebar rendering PDF with scale=1, dimensions:', { 
        width: viewport.width, 
        height: viewport.height 
      });

      await page.render({ canvasContext: context, viewport }).promise;

      // overlay annotations (use normalizedAnnotations so we always pass
      // the actual annotations object — not a wrapper returned by backend)
      if (normalizedAnnotations) {
        const overlayCanvas = document.createElement("canvas");
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;
        overlayCanvas.style.position = "absolute";
        overlayCanvas.style.top = "0";
        overlayCanvas.style.left = "0";
        overlayCanvas.style.pointerEvents = "none";
        // Explicit CSS sizing to prevent responsive shrinking on small screens
        overlayCanvas.style.width = viewport.width + "px";
        overlayCanvas.style.height = viewport.height + "px";
        container.style.position = "relative";
        container.appendChild(overlayCanvas);

        const overlayContext = overlayCanvas.getContext("2d");
        
        console.log('Sidebar overlaying annotations on canvas:', {
          canvasWidth: overlayCanvas.width,
          canvasHeight: overlayCanvas.height,
          rectangles: normalizedAnnotations.rectangles
        });
        
        // draw the normalized annotations immediately - use pdfScale: 1 to match PDF rendering scale
        overlayAnnotations(overlayContext, normalizedAnnotations, acType, { skipRefrigerantLines: true, pdfScale: 1 });
        // HVAC overlay if enabled
        if (showHVAC) {
          overlayHVAC(
            overlayContext,
            normalizedAnnotations.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] },
            hvacSymbols,
            normalizedAnnotations.comments,
            acType,
            1
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. See console for details.");
    }
  };

  const viewEngineerAnnotationPdf = async (engineerAnnotation) => {
    console.log("Viewing engineer annotation:", engineerAnnotation);
    if (!token) return setError("User not authenticated.");
    try {
      setCurrentPdfType("engineer");
      setSelectedPdf(engineerAnnotation);

      // Fetch the engineer annotation data (includes annotations JSON + userAnnotationId)
      const annotationsResponse = await fetch(
        `/api/engineer-annotations/${engineerAnnotation._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!annotationsResponse.ok)
        throw new Error(`Failed to fetch engineer annotations: ${annotationsResponse.status}`);
      const annotationsData = await annotationsResponse.json();
      const normalizedAnnotations =
        annotationsData && annotationsData.annotations
          ? annotationsData.annotations
          : annotationsData;

      // Extract acType from systemConfig
      const acType = annotationsData.systemConfig?.systemType || "vrf-ducted";
      setSelectedAcType(acType);
      setSelectedAnnotations(normalizedAnnotations);

      // Auto-enable HVAC layer when engineer review contains HVAC data
      const hasHvac = normalizedAnnotations.hvac && (normalizedAnnotations.hvac.ducts?.length || normalizedAnnotations.hvac.diffusers?.length);
      if (hasHvac) setShowHVAC(true);

      // Fetch the ORIGINAL base PDF (from user annotation) — clean, no baked overlays
      const userAnnotationId = annotationsData.userAnnotationId;
      let pdfBlob;
      if (userAnnotationId) {
        const pdfResponse = await fetch(`/api/annotated-pdf/${userAnnotationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pdfResponse.ok) {
          pdfBlob = await pdfResponse.blob();
        }
      }
      // Fallback: use baked engineer PDF if original is unavailable
      if (!pdfBlob) {
        const pdfResponse = await fetch(
          `/api/engineer-annotations/annotated-pdf/${engineerAnnotation._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!pdfResponse.ok)
          throw new Error(`Failed to fetch engineer PDF: ${pdfResponse.status}`);
        pdfBlob = await pdfResponse.blob();
      }

      const pdfFile = new File(
        [pdfBlob],
        engineerAnnotation.filename || "untitled.pdf",
        { type: "application/pdf" }
      );
      setSelectedPdfFile(pdfFile);

      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const container = document.getElementById("pdf-container");
      if (!container) return;
      container.innerHTML = "";
      container.style.position = "relative";

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const scale = 1;
      const viewport = page.getViewport({ scale });

      // Helper: render one page with a given mode
      const renderPage = async (mode) => {
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.marginBottom = "12px";
        container.appendChild(wrapper);

        // Base PDF canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";
        const ctx = canvas.getContext("2d");
        wrapper.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (normalizedAnnotations) {
          const overlayCanvas = document.createElement("canvas");
          overlayCanvas.width = viewport.width;
          overlayCanvas.height = viewport.height;
          overlayCanvas.style.position = "absolute";
          overlayCanvas.style.top = "0";
          overlayCanvas.style.left = "0";
          overlayCanvas.style.pointerEvents = "none";
          // Explicit CSS sizing to prevent responsive shrinking on small screens
          overlayCanvas.style.width = viewport.width + "px";
          overlayCanvas.style.height = viewport.height + "px";
          wrapper.appendChild(overlayCanvas);

          const overlayCtx = overlayCanvas.getContext("2d");
          overlayAnnotations(overlayCtx, normalizedAnnotations, mode, { pdfScale: 1 });

          if (normalizedAnnotations.hvac && (mode === "ducted" || mode === "vrf-ducted")) {
            overlayHVAC(
              overlayCtx,
              normalizedAnnotations.hvac,
              hvacSymbols,
              normalizedAnnotations.comments,
              mode,
              1
            );
          }

          if (normalizedAnnotations.vrf && mode.startsWith("vrf")) {
            overlayVRFSystem(overlayCtx, normalizedAnnotations.vrf, hvacSymbols, mode);
          }

          drawCanvasLegend(overlayCtx, mode, { pdfScale: 1 });

          // Mode label
          let modeLabel = "System";
          if (mode.startsWith("vrf")) {
            modeLabel = mode === "vrf-ducted"
              ? "VRF System \u2014 Ducted Indoor Units"
              : "VRF System \u2014 Ductless Indoor Units";
          } else if (mode.startsWith("minisplit")) {
            modeLabel = mode === "minisplit-ducted"
              ? "Minisplit \u2014 Ducted Indoor Units"
              : "Minisplit \u2014 Ductless Indoor Units";
          }
          overlayCtx.save();
          overlayCtx.fillStyle = "rgba(0,0,0,0.75)";
          overlayCtx.font = "bold 14px Arial";
          overlayCtx.fillText(modeLabel, 10, 20);
          overlayCtx.restore();

          // ========== USER CREDENTIALS WATERMARK (diagonal) ==========
          const userEmail = annotationsData.userId?.email || engineerAnnotation.userId?.email || "";
          const reviewDate = new Date(engineerAnnotation.createdAt).toLocaleDateString();
          const watermarkText = `AC-Commerce | ${userEmail} | Reviewed: ${reviewDate}`;

          overlayCtx.save();
          overlayCtx.translate(viewport.width / 2, viewport.height / 2);
          overlayCtx.rotate(-Math.PI / 6); // ~30 degrees
          overlayCtx.font = "10px Arial";
          overlayCtx.fillStyle = "rgba(100, 100, 100, 0.28)";
          overlayCtx.textAlign = "center";
          overlayCtx.fillText(watermarkText, 0, 0);
          overlayCtx.restore();

          // ========== ENGINEER REVIEW SEAL STAMP ==========
          const stampStatus = (engineerAnnotation.status || 'reviewed').toLowerCase();
          const stampConfig = {
            reviewed:  { label: 'REVIEWED',  iconColor: 'rgba(20, 70, 180, 0.75)',  ringColor: 'rgba(20, 70, 180, 0.7)',  textColor: 'rgba(20, 70, 180, 0.8)' },
            approved:  { label: 'APPROVED',  iconColor: 'rgba(20, 130, 50, 0.75)',  ringColor: 'rgba(20, 130, 50, 0.7)',  textColor: 'rgba(20, 130, 50, 0.85)' },
            rejected:  { label: 'REJECTED',  iconColor: 'rgba(200, 30, 30, 0.75)',  ringColor: 'rgba(200, 30, 30, 0.7)',  textColor: 'rgba(200, 30, 30, 0.85)' },
            pending:   { label: 'PENDING',   iconColor: 'rgba(180, 120, 0, 0.75)',  ringColor: 'rgba(180, 120, 0, 0.7)',  textColor: 'rgba(180, 120, 0, 0.85)' },
          };
          const sc = stampConfig[stampStatus] || stampConfig.reviewed;
          const cx = viewport.width - 80;
          const cy = viewport.height - 80;
          const outerR = 52;
          const innerR = 44;
          const coreR = 28;

          overlayCtx.save();

          // Outer ring — bold border
          overlayCtx.strokeStyle = sc.ringColor;
          overlayCtx.lineWidth = 3;
          overlayCtx.beginPath();
          overlayCtx.arc(cx, cy, outerR, 0, 2 * Math.PI);
          overlayCtx.stroke();

          // Inner ring — thinner
          overlayCtx.strokeStyle = sc.ringColor.replace('0.7', '0.45');
          overlayCtx.lineWidth = 1.5;
          overlayCtx.beginPath();
          overlayCtx.arc(cx, cy, innerR, 0, 2 * Math.PI);
          overlayCtx.stroke();

          // Ring fill between outer and inner
          overlayCtx.fillStyle = "rgba(220, 235, 255, 0.18)";
          overlayCtx.beginPath();
          overlayCtx.arc(cx, cy, outerR, 0, 2 * Math.PI);
          overlayCtx.arc(cx, cy, innerR, 0, 2 * Math.PI, true);
          overlayCtx.fill();

          // Curved text — "AC-COMMERCE" along top arc
          const topText = "AC-COMMERCE";
          overlayCtx.font = "bold 8px Arial";
          overlayCtx.fillStyle = sc.ringColor;
          overlayCtx.textAlign = "center";
          overlayCtx.textBaseline = "middle";
          const topArcR = (outerR + innerR) / 2;
          const topStartAngle = -Math.PI / 2 - (topText.length * 0.09);
          for (let i = 0; i < topText.length; i++) {
            const angle = topStartAngle + i * 0.18;
            const x = cx + topArcR * Math.cos(angle);
            const y = cy + topArcR * Math.sin(angle);
            overlayCtx.save();
            overlayCtx.translate(x, y);
            overlayCtx.rotate(angle + Math.PI / 2);
            overlayCtx.fillText(topText[i], 0, 0);
            overlayCtx.restore();
          }

          // Curved text — "ENGINEER REVIEW" along bottom arc
          const bottomText = "ENGINEER REVIEW";
          overlayCtx.fillStyle = sc.ringColor;
          overlayCtx.font = "bold 7px Arial";
          const botArcR = (outerR + innerR) / 2;
          const botStartAngle = Math.PI / 2 + (bottomText.length * 0.08);
          for (let i = 0; i < bottomText.length; i++) {
            const angle = botStartAngle - i * 0.16;
            const x = cx + botArcR * Math.cos(angle);
            const y = cy + botArcR * Math.sin(angle);
            overlayCtx.save();
            overlayCtx.translate(x, y);
            overlayCtx.rotate(angle - Math.PI / 2);
            overlayCtx.fillText(bottomText[i], 0, 0);
            overlayCtx.restore();
          }

          // Small stars separating top/bottom text
          overlayCtx.font = "8px Arial";
          overlayCtx.fillStyle = sc.ringColor;
          const starAngleL = -Math.PI / 2 - (topText.length * 0.09) - 0.2;
          const starAngleR = -Math.PI / 2 + (topText.length * 0.09) + 0.2;
          [starAngleL, starAngleR].forEach(a => {
            overlayCtx.fillText("★", cx + topArcR * Math.cos(a) - 4, cy + topArcR * Math.sin(a) + 3);
          });

          // Core circle — light fill
          overlayCtx.fillStyle = "rgba(230, 242, 255, 0.22)";
          overlayCtx.beginPath();
          overlayCtx.arc(cx, cy, coreR, 0, 2 * Math.PI);
          overlayCtx.fill();

          // Center icon — varies by status
          overlayCtx.strokeStyle = sc.iconColor;
          overlayCtx.lineWidth = 3;
          overlayCtx.lineCap = "round";
          overlayCtx.lineJoin = "round";
          overlayCtx.beginPath();
          if (stampStatus === 'approved') {
            // Checkmark
            overlayCtx.moveTo(cx - 10, cy - 8);
            overlayCtx.lineTo(cx - 3, cy);
            overlayCtx.lineTo(cx + 12, cy - 14);
          } else if (stampStatus === 'rejected') {
            // X mark
            overlayCtx.moveTo(cx - 9, cy - 9);
            overlayCtx.lineTo(cx + 9, cy + 9);
            overlayCtx.moveTo(cx + 9, cy - 9);
            overlayCtx.lineTo(cx - 9, cy + 9);
          } else if (stampStatus === 'pending') {
            // Clock-like arc
            overlayCtx.arc(cx, cy - 4, 10, -Math.PI / 2, Math.PI * 0.8);
            overlayCtx.moveTo(cx, cy - 4);
            overlayCtx.lineTo(cx, cy - 12);
            overlayCtx.moveTo(cx, cy - 4);
            overlayCtx.lineTo(cx + 6, cy - 4);
          } else {
            // Reviewed — clipboard tick
            overlayCtx.moveTo(cx - 10, cy - 8);
            overlayCtx.lineTo(cx - 3, cy);
            overlayCtx.lineTo(cx + 12, cy - 14);
          }
          overlayCtx.stroke();

          // Status label below icon
          overlayCtx.fillStyle = sc.textColor;
          overlayCtx.font = "bold 9px Arial";
          overlayCtx.textAlign = "center";
          overlayCtx.fillText(sc.label, cx, cy + 14);

          // Date inside stamp, below status label
          overlayCtx.font = "7px Arial";
          overlayCtx.fillStyle = "rgba(60, 60, 60, 0.65)";
          overlayCtx.fillText(reviewDate, cx, cy + 24);

          // Short explanation note for Rejected / Pending (rendered left of stamp)
          if (stampStatus === 'rejected' || stampStatus === 'pending') {
            const noteLines = stampStatus === 'rejected'
              ? ["Revisions required.", "Contact engineer for details."]
              : ["Awaiting engineer review.", "Check back later."];
            const noteX = cx - outerR - 8;
            overlayCtx.font = "bold 7.5px Arial";
            overlayCtx.fillStyle = sc.textColor;
            overlayCtx.textAlign = "right";
            overlayCtx.textBaseline = "middle";
            overlayCtx.fillText(noteLines[0], noteX, cy - 6);
            overlayCtx.font = "7px Arial";
            overlayCtx.fillStyle = sc.textColor.replace(/[\d.]+\)$/, '0.65)');
            overlayCtx.fillText(noteLines[1], noteX, cy + 7);
          }

          overlayCtx.restore();
        }
      };

      // Render both modes based on system type
      const systemPrefix = acType?.split('-')[0] || 'vrf'; // Extract 'vrf' or 'minisplit' from acType
      const ducted = `${systemPrefix}-ducted`;
      const ductless = `${systemPrefix}-ductless`;
      
      await renderPage(ducted);
      await renderPage(ductless);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load engineer annotation PDF. See console for details."
      );
    }
  };

  const handleDeletePdf = (pdfId, filename, isEngineerReview = false) => {
    // Show mobile-friendly confirmation modal instead of window.confirm
    setDeleteConfirm({ show: true, pdfId, filename, isEngineerReview, deleteAll: false });
  };

  const handleDeleteAllMyDrawings = () => {
    if (savedPdfs.length === 0) {
      toast.warning('No drawings to delete.');
      return;
    }
    setDeleteConfirm({ 
      show: true, 
      pdfId: null, 
      filename: `all ${savedPdfs.length} drawings`,
      isEngineerReview: false, 
      deleteAll: true 
    });
  };

  const handleDeleteAllEngineerReviews = () => {
    if (engineerAnnotations.length === 0) {
      toast.warning('No engineer reviews to delete.');
      return;
    }
    setDeleteConfirm({ 
      show: true, 
      pdfId: null, 
      filename: `all ${engineerAnnotations.length} reviews`,
      isEngineerReview: true, 
      deleteAll: true 
    });
  };

  const confirmDeletePdf = async () => {
    const { pdfId, isEngineerReview, deleteAll } = deleteConfirm;
    setDeleteConfirm({ show: false, pdfId: null, filename: '', isEngineerReview: false, deleteAll: false });
    if (!token) return setError("User not authenticated.");

    try {
      if (deleteAll) {
        // Delete all PDFs in the current tab — fire all requests in parallel
        const pdfList = isEngineerReview ? engineerAnnotations : savedPdfs;

        const results = await Promise.allSettled(
          pdfList.map((pdf) => {
            const endpoint = isEngineerReview
              ? `/api/engineer-annotations/${pdf._id}`
              : `/api/annotations/${pdf._id}`;
            return fetch(endpoint, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          })
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled" && r.value.ok
        ).length;
        const failureCount = results.length - successCount;

        if (isEngineerReview) {
          setEngineerAnnotations([]);
        } else {
          setSavedPdfs([]);
        }

        const container = document.getElementById("pdf-container");
        if (container) container.innerHTML = "";
        setSelectedPdf(null);
        setSelectedPdfFile(null);
        setSelectedAnnotations(null);

        const message = isEngineerReview ? "engineer reviews" : "drawings";
        if (successCount > 0 && failureCount === 0) {
          toast.success(`Successfully deleted all ${successCount} ${message}!`);
        } else if (successCount > 0) {
          toast.success(`Deleted ${successCount} ${message}. ${failureCount} failed.`);
        } else {
          toast.error(`Failed to delete ${message}.`);
        }
      } else {
        // Delete single PDF
        const endpoint = isEngineerReview 
          ? `/api/engineer-annotations/${pdfId}`
          : `/api/annotations/${pdfId}`;
        
        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to delete PDF.");
        }
        toast.success(isEngineerReview ? "Engineer review deleted!" : "PDF deleted successfully!");
        
        if (isEngineerReview) {
          setEngineerAnnotations((prev) => prev.filter((a) => a._id !== pdfId));
        } else {
          setSavedPdfs((prev) => prev.filter((pdf) => pdf._id !== pdfId));
        }
        
        const container = document.getElementById("pdf-container");
        if (container) container.innerHTML = "";
        setSelectedPdf(null);
        setSelectedPdfFile(null);
        setSelectedAnnotations(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      toast.error(err.message || "Failed to delete PDF.");
    }
  };

  return (
    <>
      <button className="phv-trigger" onClick={toggleSidebar}>
        <FaFilePdf /> {isOpen ? "Close Saved PDFs" : "Open Saved PDFs"}
      </button>

      {isOpen && (
        <div className="sb-overlay" onClick={toggleSidebar}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sb-header">
              <div className="sb-header__left">
                <FaFilePdf />
                <h2 className="sb-header__title">Saved PDFs</h2>
              </div>
              <button className="phv-close" onClick={toggleSidebar} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="sb-body">
              {error && <div className="sb-error">{error}</div>}

              {/* Tab navigation */}
              <div className="sb-tabs">
                <button
                  className={`sb-tab${activeTab === "my-annotations" ? " sb-tab--active" : ""}`}
                  onClick={() => {
                    setActiveTab("my-annotations");
                    setSelectedPdf(null);
                    setSelectedPdfFile(null);
                    setSelectedAnnotations(null);
                    setCurrentPdfType(null);
                    const container = document.getElementById("pdf-container");
                    if (container) container.innerHTML = "";
                  }}
                >
                  My Drawings
                </button>
                <button
                  className={`sb-tab${activeTab === "engineer-reviews" ? " sb-tab--active" : ""}`}
                  onClick={() => {
                    setActiveTab("engineer-reviews");
                    setSelectedPdf(null);
                    setSelectedPdfFile(null);
                    setSelectedAnnotations(null);
                    setCurrentPdfType(null);
                    const container = document.getElementById("pdf-container");
                    if (container) container.innerHTML = "";
                  }}
                >
                  Engineer Reviews
                </button>
              </div>

              {/* Content area */}
              <div className="sb-content">

                {/* ── Search & Sort bar ── */}
                {!selectedPdf && (
                  <div className="sb-toolbar">
                    <input
                      type="text"
                      className="sb-search"
                      placeholder="Search files…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                      className="sb-sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="name">Name</option>
                    </select>
                    {activeTab === 'engineer-reviews' && (
                      <select
                        className="sb-sort"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        title="Filter by status"
                      >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    )}
                  </div>
                )}

                {/* ── LIST VIEW ── */}
                {!selectedPdf && (
                  <>
                    {activeTab === "my-annotations" && (
                      savedPdfsLoading ? (
                        <p className="sb-empty">Loading your drawings…</p>
                      ) : savedPdfs.length > 0 ? ((() => {
                        const filtered = filterAndSort(savedPdfs);
                        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                        const page = Math.min(myDrawingsPage, totalPages || 1);
                        const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
                        return filtered.length > 0 ? (
                        <>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={handleDeleteAllMyDrawings}
                              title="Delete all drawings"
                            >
                              <FaTrash /> Delete All
                            </button>
                          </div>
                          <ul className="sb-list">
                          {paged.map((pdf) => (
                            <li key={pdf._id} className="sb-item">
                              <button
                                className="sb-item__open"
                                onClick={() => viewPdfWithAnnotations(pdf)}
                                disabled={pdf.isPaid}
                              >
                                <FaFilePdf />
                                <span>{pdf.filename || "Untitled Document"}</span>
                                {pdf.isPaid && <FaLock />}
                              </button>
                              <small className="sb-item__date">
                                {new Date(pdf.createdAt).toLocaleString()}
                              </small>
                              <button
                                className="sb-item__delete"
                                onClick={() => handleDeletePdf(pdf._id, pdf.filename)}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                              <button
                                className="sb-item__share"
                                onClick={() => handleShareLink(pdf._id, false)}
                                title="Copy shareable link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6c757d' }}
                              >
                                🔗
                              </button>
                            </li>
                          ))}
                          </ul>
                          {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setMyDrawingsPage(p => Math.max(1, p - 1))}>◀</button>
                              <span style={{ fontSize: '0.8rem' }}>Page {page} of {totalPages}</span>
                              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setMyDrawingsPage(p => Math.min(totalPages, p + 1))}>▶</button>
                            </div>
                          )}
                        </>
                        ) : (
                          <p className="sb-empty">No matches found.</p>
                        );
                      })()) : (
                        <p className="sb-empty sb-empty--danger">No saved documents yet.</p>
                      )
                    )}

                    {activeTab === "engineer-reviews" && (
                      engineerAnnotationsLoading ? (
                        <p className="sb-empty">Loading engineer reviews…</p>
                      ) : engineerAnnotations.length > 0 ? ((() => {
                        const filtered = filterAndSort(engineerAnnotations);
                        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                        const page = Math.min(engineerReviewsPage, totalPages || 1);
                        const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
                        return filtered.length > 0 ? (
                        <>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={handleDeleteAllEngineerReviews}
                              title="Delete all engineer reviews"
                            >
                              <FaTrash /> Delete All
                            </button>
                          </div>
                          <ul className="sb-list">
                          {paged.map((annotation) => (
                            <li key={annotation._id} className="sb-item">
                              <button
                                className="sb-item__open"
                                onClick={() => viewEngineerAnnotationPdf(annotation)}
                              >
                                <FaFilePdf />
                                <span>{annotation.filename || "Untitled Document"}</span>
                              </button>
                              <small className="sb-item__meta">
                                Engineer: {annotation.engineerId?.name || "Unknown"} | {new Date(annotation.createdAt).toLocaleString()}
                                {annotation.status && (
                                  <span
                                    className="sb-status-badge"
                                    style={{
                                      color: (statusConfig[annotation.status] || statusConfig.pending).color,
                                      background: (statusConfig[annotation.status] || statusConfig.pending).bg,
                                    }}
                                  >
                                    {(statusConfig[annotation.status] || statusConfig.pending).label}
                                  </span>
                                )}
                              </small>
                              <button
                                className="sb-item__delete"
                                onClick={() => handleDeletePdf(annotation._id, annotation.filename, true)}
                                title="Delete Engineer Review"
                              >
                                <FaTrash />
                              </button>
                              <button
                                className="sb-item__share"
                                onClick={() => handleShareLink(annotation._id, true)}
                                title="Copy shareable link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6c757d' }}
                              >
                                🔗
                              </button>
                            </li>
                          ))}
                          </ul>
                          {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setEngineerReviewsPage(p => Math.max(1, p - 1))}>◀</button>
                              <span style={{ fontSize: '0.8rem' }}>Page {page} of {totalPages}</span>
                              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setEngineerReviewsPage(p => Math.min(totalPages, p + 1))}>▶</button>
                            </div>
                          )}
                        </>
                        ) : (
                          <p className="sb-empty">No matches found.</p>
                        );
                      })()) : (
                        <p className="sb-empty sb-empty--info">No engineer reviews yet.</p>
                      )
                    )}
                  </>
                )}

                {/* ── PDF VIEW ── */}
                {selectedPdf && (
                  <>
                    <div className="sb-pdfbar">
                      <button
                        className="sb-back"
                        onClick={() => {
                          setSelectedPdf(null);
                          setSelectedPdfFile(null);
                          setSelectedAnnotations(null);
                          setCurrentPdfType(null);
                          const container = document.getElementById("pdf-container");
                          if (container) container.innerHTML = "";
                        }}
                      >
                        ← Back
                      </button>
                      <FaFilePdf />
                      <span className="sb-pdfbar__name">
                        {selectedPdf.filename || "Untitled Document"}
                      </span>
                      {activeTab === "my-annotations" && currentPdfType === "user" && (
                        <button
                          className="sb-item__delete sb-pdfbar__delete"
                          onClick={() => handleDeletePdf(selectedPdf._id, selectedPdf.filename)}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {activeTab === "my-annotations" && currentPdfType === "user" && (
                        <button
                          onClick={() => handleShareLink(selectedPdf._id, false)}
                          title="Copy shareable link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6c757d', fontSize: '1.1rem' }}
                        >🔗</button>
                      )}
                      {activeTab === "engineer-reviews" && currentPdfType === "engineer" && (
                        <button
                          className="sb-item__delete sb-pdfbar__delete"
                          onClick={() => handleDeletePdf(selectedPdf._id, selectedPdf.filename, true)}
                          title="Delete Engineer Review"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {activeTab === "engineer-reviews" && currentPdfType === "engineer" && (
                        <button
                          onClick={() => handleShareLink(selectedPdf._id, true)}
                          title="Copy shareable link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#6c757d', fontSize: '1.1rem' }}
                        >🔗</button>
                      )}
                    </div>

                    {activeTab === "my-annotations" && currentPdfType === "user" && (
                      <SaveAsPDF
                        file={selectedPdfFile}
                        isPaid={selectedPdf?.isPaid}
                        pdfId={selectedPdf?._id}
                        token={token}
                        annotations={selectedAnnotations}
                        annotationType="user"
                      />
                    )}
                    {activeTab === "engineer-reviews" && currentPdfType === "engineer" && (
                      <div className="sb-engineer-actions">
                        <SaveAsPDF
                          file={selectedPdfFile}
                          isPaid={false}
                          pdfId={selectedPdf?._id}
                          token={token}
                          annotations={selectedAnnotations}
                          acType={selectedAcType}
                          annotationType="engineer"
                        />
                        {(selectedPdf?.status === "approved" || selectedPdf?.status === "reviewed") && (
                          <Button
                            className="sb-buy-btn"
                            onClick={() => {
                              setIsOpen(false);
                              navigate('/search?category=AC%20Products');
                            }}
                          >
                            🛒 Buy Equipment
                          </Button>
                        )}
                      </div>
                    )}

                    {isAdmin && selectedPdfFile && (
                      <button
                        className="sb-hvac-btn"
                        onClick={() => setShowHVAC((prev) => !prev)}
                      >
                        {showHVAC ? "Hide HVAC Layer" : "Show HVAC Layer"}
                      </button>
                    )}
                    {isAdmin && selectedPdfFile && (
                      <div className="sb-legend">
                        <strong>Legend:</strong>
                        <span className="sb-legend__ducts">■ Ducts</span>
                        <span className="sb-legend__diff">● Diffusers</span>
                        <span className="sb-legend__refrig">— Refrigerant Lines</span>
                      </div>
                    )}

                    <div className="sb-pdf-canvas">
                      <div className="sb-zoom-controls">
                        <button
                          className="sb-zoom-btn"
                          onClick={() => setPdfScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                          title="Zoom out"
                        >
                          −
                        </button>
                        <span className="sb-zoom-level">{Math.round(pdfScale * 100)}%</span>
                        <button
                          className="sb-zoom-btn"
                          onClick={() => setPdfScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
                          title="Zoom in"
                        >
                          +
                        </button>
                      </div>
                      <div id="pdf-container" style={{ position: "relative", transform: pdfScale !== 1.5 ? `scale(${pdfScale / 1.5})` : "none", transformOrigin: "top left", transition: "transform 0.2s ease" }}></div>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="sb-footer">
              <button className="phv-close-btn" onClick={toggleSidebar}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* Mobile-friendly delete confirmation modal */}
      {deleteConfirm.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setDeleteConfirm({ show: false, pdfId: null, filename: '', isEngineerReview: false, deleteAll: false })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '280px',
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: '12px' }}>
              {deleteConfirm.deleteAll 
                ? (deleteConfirm.isEngineerReview ? 'Delete All Engineer Reviews' : 'Delete All Drawings')
                : (deleteConfirm.isEngineerReview ? 'Delete Engineer Review' : 'Delete PDF')
              }
            </h5>
            <p>
              {deleteConfirm.deleteAll 
                ? `Are you sure you want to permanently delete ${deleteConfirm.filename}? This action cannot be undone.`
                : `Are you sure you want to delete "${deleteConfirm.filename}"?`
              }
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirm({ show: false, pdfId: null, filename: '', isEngineerReview: false, deleteAll: false })}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={confirmDeletePdf}
              >
                {deleteConfirm.deleteAll ? 'Delete All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;