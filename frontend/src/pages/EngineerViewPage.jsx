import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { Spinner, Alert, Button, Form, Dropdown } from "react-bootstrap";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import { PDFDocument } from "pdf-lib";
import { overlayVRFSystem, overlayHVAC, overlayAnnotations, hvacSymbols, drawCanvasLegend, preloadSymbolImages } from "../utils/annotationUtils.js";
import * as pdfjsLib from "pdfjs-dist";
import { FaDraftingCompass } from "react-icons/fa";
import "./EngineerViewPage.css";
import "./AdminHero.css";


const EngineerViewPage = () => {
  const { id } = useParams();
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const [annotation, setAnnotation] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHVAC, setShowHVAC] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'supply-duct' | 'return-duct' | 'flex-duct' | 'supply-4way' | 'round-diffuser' | 'linear-slot' | 'return-grille' | 'exhaust-grille' | 'fire-damper' | 'volume-damper' | 'comment' | null
  const [acType, setAcType] = useState("vrf-ducted"); // 'vrf-ducted' | 'vrf-ductless'
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const pdfContainerRef = useRef(null);

  // Mobile responsive toolbar dropdown state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile-friendly comment modal state (replaces window.prompt)
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState(null);

  // PDF zoom scale
  const [pdfScale, setPdfScale] = useState(1.5);

  // Zone color palette (cycles through these colors)
  const zoneColorPalette = [
    { fill: 'rgba(0,150,255,0.12)', stroke: 'rgba(0,100,200,0.5)', name: 'Blue' },
    { fill: 'rgba(255,100,100,0.12)', stroke: 'rgba(200,50,50,0.5)', name: 'Red' },
    { fill: 'rgba(100,200,100,0.12)', stroke: 'rgba(50,150,50,0.5)', name: 'Green' },
    { fill: 'rgba(255,200,0,0.12)', stroke: 'rgba(200,150,0,0.5)', name: 'Yellow' },
    { fill: 'rgba(200,100,255,0.12)', stroke: 'rgba(150,50,200,0.5)', name: 'Purple' },
    { fill: 'rgba(255,150,100,0.12)', stroke: 'rgba(200,100,50,0.5)', name: 'Orange' },
    { fill: 'rgba(100,200,200,0.12)', stroke: 'rgba(50,150,150,0.5)', name: 'Cyan' },
    { fill: 'rgba(255,100,200,0.12)', stroke: 'rgba(200,50,150,0.5)', name: 'Pink' },
    { fill: 'rgba(150,100,50,0.12)', stroke: 'rgba(120,70,30,0.5)', name: 'Brown' },
    { fill: 'rgba(180,255,100,0.12)', stroke: 'rgba(140,200,50,0.5)', name: 'Lime' },
    { fill: 'rgba(0,180,180,0.12)', stroke: 'rgba(0,130,130,0.5)', name: 'Teal' },
  ];

  // Zone drawing state (manual zone creation)
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const zoneStartPointRef = useRef(null); // Use ref instead of state for immediate updates
  const [currentZonePreview, setCurrentZonePreview] = useState(null);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  
  // Ref to store overlay canvas for handlers
  const overlayCanvasRef = useRef(null);

  // Debug: Log when selectedZoneIndex changes
  useEffect(() => {
    console.log('🎯 selectedZoneIndex changed to:', selectedZoneIndex);
  }, [selectedZoneIndex]);

  // Fetch and render PDF + annotations
  // Fetch annotation and PDF only once (on mount or id/token change)
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError("Admin not authenticated.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch annotation data
        const response = await fetch(`/api/annotations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          let body = null;
          try {
            body = await response.json();
          } catch (e) {
            try {
              body = await response.text();
            } catch (e2) {
              body = null;
            }
          }
          const serverMsg =
            body && body.message ? body.message : body || response.statusText;
          throw new Error(`Failed to fetch annotation: ${serverMsg}`);
        }
        const data = await response.json();
        setAnnotation(data);
        // Engineer view always uses VRF modes; map basic acTypes to their VRF equivalents
        const fetchedAcType = data.acType || "ducted";
        if (fetchedAcType === "vrf-ducted" || fetchedAcType === "vrf-ductless") {
          setAcType(fetchedAcType);
        } else if (fetchedAcType === "ductless") {
          setAcType("vrf-ductless");
        } else {
          setAcType("vrf-ducted");
        }
        // Fetch PDF file
        const pdfResponse = await fetch(`/api/annotated-pdf/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!pdfResponse.ok) {
          let body = null;
          try {
            body = await pdfResponse.json();
          } catch (e) {
            try {
              body = await pdfResponse.text();
            } catch (e2) {
              body = null;
            }
          }
          const serverMsg =
            body && body.message
              ? body.message
              : body || pdfResponse.statusText;
          throw new Error(`Failed to fetch PDF: ${serverMsg}`);
        }
        let pdfBlob;
        try {
          pdfBlob = await pdfResponse.blob();
        } catch (e) {
          console.error("Error reading PDF blob:", e);
          throw new Error("Failed to read PDF data from response");
        }
        setPdfFile(
          new File([pdfBlob], data.filename || "untitled.pdf", {
            type: "application/pdf",
          })
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  // Helper: Convert screen coordinates to canvas percent coordinates (0-1)
  // (Same pattern as screenToCanvas in HvacZoneDesignerPage but returns percent)
  const screenToCanvasPercent = (screenX, screenY, rect, canvas) => {
    if (!canvas) return { x: 0, y: 0 };
    
    // Account for CSS scaling (canvas actual size vs displayed size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Transform screen coordinates to canvas pixel coordinates
    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top) * scaleY;
    
    // Convert to percent (0-1)
    const x = canvasX / canvas.width;
    const y = canvasY / canvas.height;
    
    return { x, y };
  };

  // Canvas mouse handlers for zone drawing (at component level, like HvacZoneDesignerPage)
  const handleCanvasMouseDown = (e) => {
    if (!overlayCanvasRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const coords = screenToCanvasPercent(e.clientX, e.clientY, rect, overlayCanvasRef.current);
    zoneStartPointRef.current = coords;
  };

  const handleCanvasMouseMove = (e) => {
    if (!zoneStartPointRef.current || !overlayCanvasRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const coords = screenToCanvasPercent(e.clientX, e.clientY, rect, overlayCanvasRef.current);
    const startPoint = zoneStartPointRef.current;

    setCurrentZonePreview({
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(coords.x - startPoint.x),
      height: Math.abs(coords.y - startPoint.y),
    });
  };

  const handleCanvasMouseUp = (e) => {
    if (zoneStartPointRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const coords = screenToCanvasPercent(e.clientX, e.clientY, rect, overlayCanvasRef.current);
      const startPoint = zoneStartPointRef.current;

      const newZone = {
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(coords.x - startPoint.x),
        height: Math.abs(coords.y - startPoint.y),
      };

      // Only save if zone is reasonably sized (at least 5% of canvas)
      if (newZone.width > 0.05 && newZone.height > 0.05) {
        saveDrawnZone(newZone);
      } else {
        toast.info('Zone too small - drag a larger area');
      }
    }

    // Always clean up drawing state
    zoneStartPointRef.current = null;
    setCurrentZonePreview(null);
    setIsDrawingZone(false);
  };

  // Touch event handlers for mobile zone drawing (like HvacZoneDesignerPage)
  const handleCanvasTouchStart = (e) => {
    if (!overlayCanvasRef.current) return;
    
    // Only prevent default when in drawing mode to allow scrolling otherwise
    if (isDrawingZone) {
      e.preventDefault();
    }
    
    if (e.touches.length === 1 && isDrawingZone) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const coords = screenToCanvasPercent(touch.clientX, touch.clientY, rect, overlayCanvasRef.current);
      zoneStartPointRef.current = coords;
    }
  };

  const handleCanvasTouchMove = (e) => {
    if (!zoneStartPointRef.current || !overlayCanvasRef.current || !isDrawingZone) return;
    
    // Only prevent default when in drawing mode to allow scrolling otherwise
    if (isDrawingZone) {
      e.preventDefault();
    }
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const coords = screenToCanvasPercent(touch.clientX, touch.clientY, rect, overlayCanvasRef.current);
      const startPoint = zoneStartPointRef.current;

      setCurrentZonePreview({
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(coords.x - startPoint.x),
        height: Math.abs(coords.y - startPoint.y),
      });
    }
  };

  const handleCanvasTouchEnd = (e) => {
    // Only prevent default when in drawing mode to allow scrolling otherwise
    if (isDrawingZone) {
      e.preventDefault();
    }
    
    // If we completed a touch gesture, try to create the zone
    if (e.touches.length === 0 && zoneStartPointRef.current && isDrawingZone) {
      // Get the last touch position from changedTouches (since touches is now empty)
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = screenToCanvasPercent(touch.clientX, touch.clientY, rect, overlayCanvasRef.current);
        const startPoint = zoneStartPointRef.current;

        const newZone = {
          x: Math.min(startPoint.x, coords.x),
          y: Math.min(startPoint.y, coords.y),
          width: Math.abs(coords.x - startPoint.x),
          height: Math.abs(coords.y - startPoint.y),
        };

        // Only save if zone is reasonably sized (at least 5% of canvas)
        if (newZone.width > 0.05 && newZone.height > 0.05) {
          saveDrawnZone(newZone);
        } else {
          toast.info('Zone too small - drag a larger area');
        }
      }
    }
    
    // Always clean up drawing state after touch ends
    zoneStartPointRef.current = null;
    setCurrentZonePreview(null);
    setIsDrawingZone(false);
  };

  // Handle zone click for selection (like HvacZoneDesignerPage)
  const handleZoneClickInternal = (e) => {
    console.log('🖱️ handleZoneClickInternal called. isDrawingZone:', isDrawingZone, 'addMode:', addMode);
    if (isDrawingZone || addMode) {
      console.log('Exiting - drawing mode or addMode active');
      return;
    }
    
    const canvas = overlayCanvasRef.current;
    if (!canvas) {
      console.log('No canvas ref!');
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const coords = screenToCanvasPercent(e.clientX, e.clientY, rect, canvas);
    console.log('Click coords:', coords);
    
    const zones = annotation?.annotations?.hvac?.zones || [];
    let clickedIndex = -1;
    
    for (let i = zones.length - 1; i >= 0; i--) {
      const zone = zones[i];
      console.log(`Checking zone ${i}:`, {
        zoneX: zone.xPercent,
        zoneY: zone.yPercent,
        zoneWidth: zone.widthPercent,
        zoneHeight: zone.heightPercent,
        clickX: coords.x,
        clickY: coords.y
      });
      if (
        coords.x >= zone.xPercent &&
        coords.x <= zone.xPercent + zone.widthPercent &&
        coords.y >= zone.yPercent &&
        coords.y <= zone.yPercent + zone.heightPercent
      ) {
        clickedIndex = i;
        console.log('✅ Zone hit! Index:', i);
        break;
      }
    }
    
    console.log('Final clicked index:', clickedIndex, 'Total zones:', zones.length);
    setSelectedZoneIndex(clickedIndex);
  };

  // Save manually drawn zone (simplified, like HvacZoneDesignerPage saveZone)
  const saveDrawnZone = (zoneData) => {
    const zoneNumber = (annotation?.annotations?.hvac?.zones?.length || 0) + 1;
    const colorIndex = (zoneNumber - 1) % zoneColorPalette.length;
    const colors = zoneColorPalette[colorIndex];

    const newZone = {
      id: `zone-manual-${Date.now()}`,
      xPercent: zoneData.x,
      yPercent: zoneData.y,
      widthPercent: zoneData.width,
      heightPercent: zoneData.height,
      fill: colors.fill,
      stroke: colors.stroke,
      zoneNumber: zoneNumber,
    };

    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ducts: prev.annotations?.hvac?.ducts || [],
          diffusers: prev.annotations?.hvac?.diffusers || [],
          dampers: prev.annotations?.hvac?.dampers || [],
          thermostats: prev.annotations?.hvac?.thermostats || [],
          zones: [...(prev.annotations?.hvac?.zones || []), newZone],
        }
      }
    }));
    
    // Auto-select the newly created zone to show color palette
    setSelectedZoneIndex((annotation?.annotations?.hvac?.zones?.length || 0));
    
    toast.success(`Zone ${newZone.zoneNumber} created`);
  };

  // Redraw overlays whenever annotation, showHVAC, or addMode changes
  useEffect(() => {
    const renderOverlays = async () => {
      if (!pdfFile || !annotation) return;
      const pdfUrl = window.URL.createObjectURL(pdfFile);
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const scale = pdfScale;
      const viewport = page.getViewport({ scale });
      const container = pdfContainerRef.current;
      if (!container) return;
      container.innerHTML = "";
      // Main PDF canvas
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      container.appendChild(canvas);
      await page.render({ canvasContext: context, viewport }).promise;
      // Overlay canvas for annotations and HVAC
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;
      overlayCanvas.style.position = "absolute";
      overlayCanvas.style.top = "0";
      overlayCanvas.style.left = "0";
      
      // Enable pointer events if: drawing zones, in addMode, or zones exist (for clicking)
      const hasZones = (annotation?.annotations?.hvac?.zones || []).length > 0;
      overlayCanvas.style.pointerEvents = (addMode || isDrawingZone || hasZones) ? "auto" : "none";
      overlayCanvas.style.touchAction = isDrawingZone ? "none" : "auto"; // Prevent PDF scroll when drawing
      container.style.position = "relative";
      if (isDrawingZone) {
        container.style.overflow = "hidden"; // Prevent scroll while drawing zones
      }
      container.appendChild(overlayCanvas);
      const overlayContext = overlayCanvas.getContext("2d");
      overlayAnnotations(overlayContext, annotation.annotations, acType, { pdfScale });
      if (showHVAC && annotation.annotations.hvac && (acType === "ducted" || acType === "vrf-ducted")) {
        overlayHVAC(
          overlayContext,
          annotation.annotations.hvac,
          hvacSymbols,
          annotation.annotations.comments,
          acType,
          pdfScale
        );
      }
      if (annotation.annotations.vrf && acType.startsWith("vrf")) {
        overlayVRFSystem(
          overlayContext,
          annotation.annotations.vrf,
          hvacSymbols,
          acType
        );
      }
      // Draw professional legend on the canvas
      drawCanvasLegend(overlayContext, acType, { pdfScale });
      
      // Note: Zones are rendered by overlayHVAC() above, no need to render them again here
      
      // Add click handler for interactive placement
      // Unified handler for both click and touch on overlay canvas
      const handleOverlayInteraction = (e) => {
        if (!addMode) {
          e.stopPropagation();
          return;
        }

        const rect = overlayCanvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
          clientX = e.changedTouches[0].clientX;
          clientY = e.changedTouches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
        const x = (clientX - rect.left) / overlayCanvas.width;
        const y = (clientY - rect.top) / overlayCanvas.height;

        if (addMode === "duct") {
          const newDuct = {
            id: `duct-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            width: 0.08,
            height: 0.025,
            ductType: "supply",
            fill: "rgba(0,85,204,0.15)",
            stroke: "#0055CC",
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: prev.annotations?.hvac?.dampers || [],
                thermostats: prev.annotations?.hvac?.thermostats || [],
              },
            },
          }));
        }

        if (addMode === "supply-duct" || addMode === "return-duct" || addMode === "flex-duct" || addMode === "exhaust-duct" || addMode === "insulated-duct") {
          const ductTypeMap = {
            "supply-duct":    { ductType: "supply",    fill: "rgba(0,85,204,0.15)",   stroke: "#0055CC" },
            "return-duct":    { ductType: "return",    fill: "rgba(204,68,0,0.15)",   stroke: "#CC4400" },
            "flex-duct":      { ductType: "flex",      fill: "rgba(150,150,150,0.1)", stroke: "#888" },
            "exhaust-duct":   { ductType: "exhaust",   fill: "rgba(34,139,34,0.15)",  stroke: "#228B22" },
            "insulated-duct": { ductType: "insulated", fill: "rgba(255,200,100,0.2)", stroke: "#CC9900" },
          };
          const cfg = ductTypeMap[addMode];
          const newDuct = {
            id: `duct-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            width: addMode === "flex-duct" ? 0.06 : 0.08,
            height: 0.025,
            ductType: cfg.ductType,
            fill: cfg.fill,
            stroke: cfg.stroke,
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: prev.annotations?.hvac?.dampers || [],
                thermostats: prev.annotations?.hvac?.thermostats || [],
              },
            },
          }));
        }

        if (addMode === "diffuser") {
          const newDiffuser = {
            id: `diffuser-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            sizePercent: 0.04,
            shape: "circle",
            diffuserType: "round",
            airflow: 250,
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
                dampers: prev.annotations?.hvac?.dampers || [],
                thermostats: prev.annotations?.hvac?.thermostats || [],
              },
            },
          }));
        }

        if (addMode === "supply-4way" || addMode === "round-diffuser" || addMode === "linear-slot" || addMode === "return-grille" || addMode === "exhaust-grille" || addMode === "jet-diffuser" || addMode === "wall-diffuser" || addMode === "transfer-grille" || addMode === "drain-point") {
          const diffuserMap = {
            "supply-4way":     { diffuserType: "supply-4way",     shape: "square", airflow: 400 },
            "round-diffuser":  { diffuserType: "round",           shape: "circle", airflow: 250 },
            "linear-slot":     { diffuserType: "linear-slot",     shape: "linear", airflow: 300 },
            "return-grille":   { diffuserType: "return-grille",   shape: "square", airflow: 350 },
            "exhaust-grille":  { diffuserType: "exhaust",         shape: "square", airflow: 200 },
            "jet-diffuser":    { diffuserType: "jet",             shape: "jet",    airflow: 500 },
            "wall-diffuser":   { diffuserType: "wall-diffuser",   shape: "wall",   airflow: 300 },
            "transfer-grille": { diffuserType: "transfer-grille", shape: "square", airflow: 150 },
            "drain-point":     { diffuserType: "drain-point",     shape: "drain",  airflow: 0   },
          };
          const cfg = diffuserMap[addMode];
          const newDiffuser = {
            id: `diffuser-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            sizePercent: addMode === "linear-slot" ? 0.03 : 0.04,
            shape: cfg.shape,
            diffuserType: cfg.diffuserType,
            airflow: cfg.airflow,
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
                dampers: prev.annotations?.hvac?.dampers || [],
                thermostats: prev.annotations?.hvac?.thermostats || [],
              },
            },
          }));
        }

        if (addMode === "fire-damper" || addMode === "volume-damper") {
          const newDamper = {
            id: `damper-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            sizePercent: 0.025,
            damperType: addMode === "fire-damper" ? "fire" : "volume",
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [], thermostats: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: [...(prev.annotations?.hvac?.dampers || []), newDamper],
                thermostats: prev.annotations?.hvac?.thermostats || [],
              },
            },
          }));
        }

        if (addMode === "comment") {
          // Use mobile-friendly modal instead of prompt()
          setPendingCommentPos({ x, y });
          setCommentInput('');
          setShowCommentModal(true);
          return; // Don't reset addMode yet — modal handles it
        }

        if (addMode === "markCondenser") {
          // Find nearest rectangle and toggle its isCondenser flag
          if (!annotation?.annotations?.rectangles) {
            setAddMode(null);
            return;
          }

          let nearest = null;
          let minDist = Infinity;
          annotation.annotations.rectangles.forEach((r) => {
            const rx = r.xPercent;
            const ry = r.yPercent;
            const dx = x - rx;
            const dy = y - ry;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              nearest = r;
            }
          });

          // threshold (in normalized coords) to avoid accidental picks
          if (nearest && minDist < 0.08) {
            setAnnotation((prev) => {
              if (!prev?.annotations?.rectangles) return prev;
              const rects = prev.annotations.rectangles.map((r) =>
                r.id === nearest.id ? { ...r, isCondenser: !r.isCondenser } : r
              );
              return {
                ...prev,
                annotations: {
                  ...(prev.annotations || {}),
                  rectangles: rects,
                },
              };
            });
          } else {
            toast.warn(
              "No rectangle near click — try clicking closer to a rectangle."
            );
          }
        }

        setAddMode(null);
      };

      // Store overlay canvas in ref for handlers
      overlayCanvasRef.current = overlayCanvas;

      // Attach event handlers based on mode
      if (isDrawingZone) {
        overlayCanvas.style.cursor = 'crosshair';
        overlayCanvas.onmousedown = handleCanvasMouseDown;
        overlayCanvas.onmousemove = handleCanvasMouseMove;
        overlayCanvas.onmouseup = handleCanvasMouseUp;
        overlayCanvas.ontouchstart = handleCanvasTouchStart;
        overlayCanvas.ontouchmove = handleCanvasTouchMove;
        overlayCanvas.ontouchend = handleCanvasTouchEnd;
        overlayCanvas.onclick = null;
      } else {
        overlayCanvas.style.cursor = 'default';
        overlayCanvas.onclick = (e) => {
          handleOverlayInteraction(e);
          handleZoneClickInternal(e);
        };
        overlayCanvas.onmousedown = null;
        overlayCanvas.onmousemove = null;
        overlayCanvas.onmouseup = null;
        overlayCanvas.ontouchstart = (e) => {
          // Don't prevent default - allow scrolling
          handleOverlayInteraction(e);
        };
        overlayCanvas.ontouchmove = null;
        overlayCanvas.ontouchend = (e) => {
          // Don't prevent default - allow scrolling
          handleOverlayInteraction(e);
          // Handle zone selection on touch devices
          if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const rect = e.currentTarget.getBoundingClientRect();
            const coords = screenToCanvasPercent(touch.clientX, touch.clientY, rect, overlayCanvasRef.current);
            
            const zones = annotation?.annotations?.hvac?.zones || [];
            let clickedIndex = -1;
            
            for (let i = zones.length - 1; i >= 0; i--) {
              const zone = zones[i];
              if (
                coords.x >= zone.xPercent &&
                coords.x <= zone.xPercent + zone.widthPercent &&
                coords.y >= zone.yPercent &&
                coords.y <= zone.yPercent + zone.heightPercent
              ) {
                clickedIndex = i;
                break;
              }
            }
            
            setSelectedZoneIndex(clickedIndex);
          }
        };
      }

      // Highlight selected zone
      if (selectedZoneIndex !== null && selectedZoneIndex !== -1) {
        const zones = annotation?.annotations?.hvac?.zones || [];
        const selectedZone = zones[selectedZoneIndex];
        if (selectedZone) {
          const x = selectedZone.xPercent * overlayCanvas.width;
          const y = selectedZone.yPercent * overlayCanvas.height;
          const w = selectedZone.widthPercent * overlayCanvas.width;
          const h = selectedZone.heightPercent * overlayCanvas.height;
          
          overlayContext.strokeStyle = '#FF6B00';
          overlayContext.lineWidth = 3;
          overlayContext.strokeRect(x, y, w, h);
        }
      }
    }; // Close renderOverlays function
    
    renderOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, annotation, showHVAC, addMode, acType, pdfScale, isDrawingZone, selectedZoneIndex]);

  // Separate effect for zone preview on dedicated canvas layer (prevents canvas shake)
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container || !isDrawingZone) {
      // Remove preview canvas if not drawing
      const existingPreview = container?.querySelector('.zone-preview-canvas');
      if (existingPreview) existingPreview.remove();
      return;
    }
    
    // Get or create preview canvas
    let previewCanvas = container.querySelector('.zone-preview-canvas');
    if (!previewCanvas) {
      previewCanvas = document.createElement('canvas');
      previewCanvas.className = 'zone-preview-canvas';
      previewCanvas.style.position = 'absolute';
      previewCanvas.style.top = '0';
      previewCanvas.style.left = '0';
      previewCanvas.style.pointerEvents = 'none';
      previewCanvas.style.zIndex = '1000';
      
      // Match overlay canvas size
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        previewCanvas.width = overlayCanvas.width;
        previewCanvas.height = overlayCanvas.height;
      }
      
      container.appendChild(previewCanvas);
    }
    
    // Clear and draw preview
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    if (currentZonePreview) {
      const x = currentZonePreview.x * previewCanvas.width;
      const y = currentZonePreview.y * previewCanvas.height;
      const w = currentZonePreview.width * previewCanvas.width;
      const h = currentZonePreview.height * previewCanvas.height;
      
      ctx.fillStyle = 'rgba(0,150,255,0.3)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(0,100,200,0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
    
    return () => {
      // Cleanup on unmount
      const preview = container?.querySelector('.zone-preview-canvas');
      if (preview && preview.parentNode) {
        preview.remove();
      }
    };
  }, [currentZonePreview, isDrawingZone]);

  // Save handler (save full annotation, not just hvac)
  const handleSave = async () => {
    if (!annotation) return;
    await fetch(`/api/annotations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...annotation, acType }),
    });
    toast.success("Annotation (including HVAC) saved!");
  };

  // Confirm comment from modal (replaces prompt() callback)
  const confirmComment = (text) => {
    if (!text || !pendingCommentPos) return;
    const newComment = {
      id: `comment-${Date.now()}`,
      xPercent: pendingCommentPos.x,
      yPercent: pendingCommentPos.y,
      text: text,
      fill: 'rgba(252, 252, 243, 0.2)',
      textColor: '#FF1493',
      acType: acType,
    };
    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        comments: [...(prev.annotations?.comments || []), newComment],
      },
    }));
    setAddMode(null);
  };

  // Clear all auto-placed HVAC elements (ducts, diffusers, dampers, thermostats) but keep zones
  const handleClearHvac = () => {
    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: { 
          ducts: [], 
          diffusers: [], 
          dampers: [], 
          thermostats: [], 
          zones: prev.annotations?.hvac?.zones || [] // Preserve zones
        },
      },
    }));
    toast.info('Cleared HVAC elements (zones preserved)');
  };

  // Delete a specific zone by index
  const handleDeleteZone = (zoneIndex) => {
    if (!window.confirm('Delete this zone?')) return;
    
    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ...(prev.annotations?.hvac || {}),
          zones: (prev.annotations?.hvac?.zones || []).filter((_, i) => i !== zoneIndex)
        }
      }
    }));
    setSelectedZoneIndex(null);
    toast.success('Zone deleted');
  };

  // Change color of a specific zone
  const handleChangeZoneColor = (zoneIndex, colorIndex) => {
    const zones = annotation?.annotations?.hvac?.zones || [];
    if (zoneIndex < 0 || zoneIndex >= zones.length) return;

    const colors = zoneColorPalette[colorIndex % zoneColorPalette.length];
    const updatedZones = zones.map((zone, idx) => 
      idx === zoneIndex 
        ? { ...zone, fill: colors.fill, stroke: colors.stroke }
        : zone
    );

    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ...(prev.annotations?.hvac || {}),
          zones: updatedZones,
        },
      },
    }));

    toast.success(`Zone #${zoneIndex + 1} color changed to ${colors.name}`);
  };

  // Auto-place ducts, diffusers, accessories near every indoor unit rectangle
  const handleAutoPlaceDucts = () => {
    const ann = annotation?.annotations;
    if (!ann) return;

    // Build a set of rectangle IDs that are condensers.
    // isCondenser is NOT persisted to MongoDB, so we reconstruct it from:
    //   1. Explicit isCondenser flag (in-memory toggle)
    //   2. Linked comment text starting with "condenser" / "outdoor" / "compressor"
    //   3. Orange fill color (set by Annotator when label starts with "condenser")
    const condenserSynonyms = /^(condenser|outdoor|compressor|heat\s*pump|outside\s*unit)/i;
    const condenserIds = new Set();
    (ann.rectangles || []).forEach((r) => {
      if (r.isCondenser) {
        condenserIds.add(String(r.id));
        return;
      }
      // Check linked comment label
      const comment = (ann.comments || []).find((c) => String(c.rectId) === String(r.id));
      if (comment && condenserSynonyms.test(comment.text.trim())) {
        condenserIds.add(String(r.id));
        return;
      }
      // Fallback: orange fill = condenser (rgba(255, 140, 50, …))
      if (r.fill && /rgba?\(\s*255\s*,\s*140\s*,\s*50/.test(r.fill)) {
        condenserIds.add(String(r.id));
      }
    });

    // Gather indoor-unit rectangles (non-condenser user rects)
    const rects = (ann.rectangles || []).filter((r) => !condenserIds.has(String(r.id)));
    if (rects.length === 0) {
      toast.warn('No indoor unit rectangles found. Draw blue rects first.');
      return;
    }

    const newDucts = [];
    const newDiffusers = [];
    const newDampers = [];
    const newThermostats = [];
    const ts = Date.now();

    // Group indoor units by flat number (ac-N.M → flat N)
    // This ensures HVAC equipment stays within each flat's area
    const comments = ann.comments || [];
    const flatGroups = new Map(); // flatNum -> [rects]
    const ungroupedRects = [];

    rects.forEach((rect) => {
      const comment = comments.find((c) => String(c.rectId) === String(rect.id));
      if (comment) {
        const match = comment.text.match(/ac-(\d+)/i);
        if (match) {
          const flatNum = match[1];
          if (!flatGroups.has(flatNum)) flatGroups.set(flatNum, []);
          flatGroups.get(flatNum).push(rect);
          return;
        }
      }
      ungroupedRects.push(rect);
    });

    // Helper to compute avgX for a group of rectangles
    const computeAvgX = (rectGroup) => {
      if (rectGroup.length === 0) return 0.5;
      return rectGroup.reduce((s, r) => s + r.xPercent, 0) / rectGroup.length;
    };

    // Process each flat group separately (each flat has its own center)
    const processRectGroup = (rectGroup, groupAvgX) => {
      // Duct sizing constants (normalised 0-1)
      const DUCT_LEN   = 0.08;
      const DUCT_H     = 0.02;
      const GAP        = 0.005;
      const FLEX_LEN   = 0.025;  // short flex connector
      const FLEX_H     = 0.015;
      const DIFF_SIZE  = 0.03;
      const DAMP_SIZE  = 0.018;
      const THERM_SIZE = 0.02;

      // Detect wet rooms from comments for exhaust grille placement
      const WET_ROOM_RE = /\b(bath|wc|toilet|shower|laundry|kitchen|kitc?hen|ktcn|restroom|powder)\b/i;

      rectGroup.forEach((rect, i) => {
        const cx = rect.xPercent;
        const cy = rect.yPercent;
        const rw = rect.widthPercent || 0.06;
        const rh = rect.heightPercent || 0.04;

        // Pick horizontal direction: extend ducts toward the centre of THIS flat's layout
        const toRight = cx <= groupAvgX;

        // --- Supply duct: offset from unit in chosen direction ---
        const sDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
        const sDuctY = cy - DUCT_H - 0.008;
        newDucts.push({
          id: `duct-auto-s-${ts}-${rect.id}`,
          xPercent: Math.max(0.01, Math.min(0.89, sDuctX)),
          yPercent: Math.max(0.01, Math.min(0.95, sDuctY)),
          width: DUCT_LEN,
          height: DUCT_H,
          ductType: 'supply',
          fill: 'rgba(0,120,255,0.45)',
          stroke: '#0055CC',
        });

        // --- Return duct: same direction, stacked below the unit ---
        const rDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
        const rDuctY = cy + 0.008;
        newDucts.push({
          id: `duct-auto-r-${ts}-${rect.id}`,
          xPercent: Math.max(0.01, Math.min(0.89, rDuctX)),
          yPercent: Math.max(0.01, Math.min(0.95, rDuctY)),
          width: DUCT_LEN,
          height: DUCT_H,
          ductType: 'return',
          fill: 'rgba(255,120,50,0.40)',
          stroke: '#CC4400',
        });

        // --- Flex duct connectors (between main duct end and diffuser) ---
        const sFlexX = toRight ? sDuctX + DUCT_LEN + GAP : sDuctX - GAP - FLEX_LEN;
        newDucts.push({
          id: `duct-auto-sf-${ts}-${rect.id}`,
          xPercent: Math.max(0.01, Math.min(0.92, sFlexX)),
          yPercent: Math.max(0.01, Math.min(0.95, sDuctY + (DUCT_H - FLEX_H) / 2)),
          width: FLEX_LEN,
          height: FLEX_H,
          ductType: 'flex',
          fill: 'rgba(150,150,150,0.35)',
          stroke: '#888',
        });

        const rFlexX = toRight ? rDuctX + DUCT_LEN + GAP : rDuctX - GAP - FLEX_LEN;
        newDucts.push({
          id: `duct-auto-rf-${ts}-${rect.id}`,
          xPercent: Math.max(0.01, Math.min(0.92, rFlexX)),
          yPercent: Math.max(0.01, Math.min(0.95, rDuctY + (DUCT_H - FLEX_H) / 2)),
          width: FLEX_LEN,
          height: FLEX_H,
          ductType: 'flex',
          fill: 'rgba(150,150,150,0.35)',
          stroke: '#888',
        });

        // --- Supply diffuser (4-way) at the far end of flex duct ---
        const sdX = toRight
          ? sFlexX + FLEX_LEN + GAP + DIFF_SIZE / 2
          : sFlexX - GAP - DIFF_SIZE / 2;
        newDiffusers.push({
          id: `diffuser-auto-sd-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, sdX)),
          yPercent: sDuctY + DUCT_H / 2,
          sizePercent: DIFF_SIZE,
          shape: 'square',
          diffuserType: 'supply-4way',
          airflow: 400,
        });

        // --- Return grille at the far end of flex duct ---
        const rgX = toRight
          ? rFlexX + FLEX_LEN + GAP + DIFF_SIZE / 2
          : rFlexX - GAP - DIFF_SIZE / 2;
        newDiffusers.push({
          id: `diffuser-auto-rg-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, rgX)),
          yPercent: rDuctY + DUCT_H / 2,
          sizePercent: DIFF_SIZE,
          shape: 'square',
          diffuserType: 'return-grille',
          airflow: 350,
        });

        // --- Volume damper near the branch origin of the supply duct ---
        const vdX = toRight ? sDuctX + DUCT_LEN * 0.4 : sDuctX + DUCT_LEN * 0.6;
        newDampers.push({
          id: `damper-auto-vd-${ts}-${rect.id}`,
          xPercent: vdX,
          yPercent: sDuctY - 0.012,
          sizePercent: DAMP_SIZE,
          damperType: 'volume',
        });

        // --- Fire damper at duct origin (where duct exits the unit / crosses wall) ---
        const fdX = toRight ? sDuctX + 0.002 : sDuctX + DUCT_LEN - 0.002;
        newDampers.push({
          id: `damper-auto-fd-${ts}-${rect.id}`,
          xPercent: fdX,
          yPercent: sDuctY + DUCT_H / 2,
          sizePercent: DAMP_SIZE,
          damperType: 'fire',
        });

        // --- Thermostat: placed to the side of the indoor unit (opposite to ducts) ---
        const thermX = toRight
          ? cx - rw / 2 - GAP - THERM_SIZE
          : cx + rw / 2 + GAP + THERM_SIZE;
        
        // Extract thermostat label from ac-N.M comment (e.g., ac-1.2 → T1.2)
        const rectComment = comments.find((c) => String(c.rectId) === String(rect.id));
        let thermLabel = 'T';
        if (rectComment) {
          const acMatch = rectComment.text.match(/ac-(\d+(?:\.\d+)?)/i);
          if (acMatch) {
            thermLabel = `T${acMatch[1]}`;
          }
        }
        
        newThermostats.push({
          id: `thermo-auto-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, thermX)),
          yPercent: cy,
          sizePercent: THERM_SIZE,
          label: thermLabel,
        });

        // --- Drain point: placed below the indoor unit for condensate collection ---
        const drainX = cx;
        const drainY = cy + rh / 2 + GAP * 2;
        newDiffusers.push({
          id: `diffuser-auto-drain-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, drainX)),
          yPercent: Math.max(0.02, Math.min(0.98, drainY)),
          sizePercent: DIFF_SIZE * 0.7,
          shape: 'drain',
          diffuserType: 'drain-point',
          airflow: 0,
        });

        // --- JET Diffuser: high-velocity nozzle for long throws (placed diagonally from unit) ---
        const jetX = toRight ? cx + rw + GAP * 8 : cx - rw - GAP * 8;
        const jetY = cy - rh / 2 - GAP * 4;
        newDiffusers.push({
          id: `diffuser-auto-jet-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, jetX)),
          yPercent: Math.max(0.02, Math.min(0.98, jetY)),
          sizePercent: DIFF_SIZE * 0.85,
          shape: 'jet',
          diffuserType: 'jet',
          airflow: 500,
        });

        // --- Wall Diffuser: side-wall mounted supply (placed on opposite side from ducts) ---
        const wallDiffX = toRight ? cx - rw / 2 - GAP * 6 : cx + rw / 2 + GAP * 6;
        const wallDiffY = cy - rh / 2;
        newDiffusers.push({
          id: `diffuser-auto-wall-${ts}-${rect.id}`,
          xPercent: Math.max(0.02, Math.min(0.98, wallDiffX)),
          yPercent: Math.max(0.02, Math.min(0.98, wallDiffY)),
          sizePercent: DIFF_SIZE * 0.9,
          shape: 'wall',
          diffuserType: 'wall-diffuser',
          airflow: 300,
        });

        // --- Insulated Duct: main trunk duct running vertically from unit ---
        const insDuctWidth = DUCT_LEN * 0.5;  // Smaller insulated duct
        const insDuctHeight = DUCT_H * 0.6;
        const insDuctX = cx - insDuctWidth / 2;
        const insDuctY = cy - rh / 2 - GAP - DUCT_H * 1.5;
        newDucts.push({
          id: `duct-auto-ins-${ts}-${rect.id}`,
          xPercent: Math.max(0.01, Math.min(0.89, insDuctX)),
          yPercent: Math.max(0.01, Math.min(0.95, insDuctY)),
          width: insDuctWidth,
          height: insDuctHeight,
          ductType: 'insulated',
          fill: 'rgba(255,180,50,0.45)',
          stroke: '#CC9900',
        });

        // --- Exhaust grille: if nearest comment suggests a wet room ---
        const nearestComment = comments.reduce((best, c) => {
          const dist = Math.sqrt((c.xPercent - cx) ** 2 + (c.yPercent - cy) ** 2);
          return dist < (best.dist || Infinity) ? { ...c, dist } : best;
        }, {});
        if (nearestComment.text && WET_ROOM_RE.test(nearestComment.text)) {
          // --- Exhaust Duct: connects to exhaust grille in wet rooms ---
          const exhDuctX = toRight ? cx - rw / 2 - GAP - DUCT_LEN : cx + rw / 2 + GAP;
          const exhDuctY = cy + rh / 2 + GAP;
          newDucts.push({
            id: `duct-auto-exh-${ts}-${rect.id}`,
            xPercent: Math.max(0.01, Math.min(0.89, exhDuctX)),
            yPercent: Math.max(0.01, Math.min(0.95, exhDuctY)),
            width: DUCT_LEN * 0.7,
            height: DUCT_H,
            ductType: 'exhaust',
            fill: 'rgba(34,180,34,0.40)',
            stroke: '#228B22',
          });

          const exhY = cy + rh / 2 + GAP + DIFF_SIZE;
          newDiffusers.push({
            id: `diffuser-auto-exh-${ts}-${rect.id}`,
            xPercent: cx,
            yPercent: Math.max(0.02, Math.min(0.98, exhY)),
            sizePercent: DIFF_SIZE,
            shape: 'square',
            diffuserType: 'exhaust',
            airflow: 200,
          });

          // --- Transfer grille: for pressure balancing in wet rooms ---
          const transferX = toRight ? cx - rw / 2 - GAP * 3 : cx + rw / 2 + GAP * 3;
          newDiffusers.push({
            id: `diffuser-auto-tg-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.98, transferX)),
            yPercent: cy,
            sizePercent: DIFF_SIZE * 0.9,
            shape: 'square',
            diffuserType: 'transfer-grille',
            airflow: 150,
          });
        }
      });
    };

    // Process grouped flats (each flat has its own center)
    flatGroups.forEach((rectGroup, flatNum) => {
      const groupAvgX = computeAvgX(rectGroup);
      processRectGroup(rectGroup, groupAvgX);
    });

    // Process ungrouped rectangles (fallback: use their own center)
    if (ungroupedRects.length > 0) {
      const ungroupedAvgX = computeAvgX(ungroupedRects);
      processRectGroup(ungroupedRects, ungroupedAvgX);
    }

    // Preserve manually-drawn zones (keep those with 'zone-manual-' prefix)
    const existingManualZones = (annotation?.annotations?.hvac?.zones || []).filter(
      zone => zone.id && zone.id.startsWith('zone-manual-')
    );

    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ...(prev.annotations?.hvac || {}),
          zones: [...existingManualZones],
          ducts: [...newDucts],
          diffusers: [...newDiffusers],
          dampers: [...newDampers],
          thermostats: [...newThermostats],
        },
      },
    }));
    setShowHVAC(true);
    toast.success(
      `Auto-placed ${newDucts.length} ducts, ${newDiffusers.length} diffusers, ${newDampers.length} dampers & ${newThermostats.length} thermostats`
    );
  };

  // Save engineer annotations to MongoDB so they appear in Sidebar > Engineer Reviews
  const handleSaveToMongoDB = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setSaveLoading(true);
    try {
      if (!pdfFile || !annotation) throw new Error("PDF not loaded yet. Please wait.");

      // Render the base PDF page off-screen for both modes
      const pdfArrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument(pdfArrayBuffer);
      const pdfJsDoc = await loadingTask.promise;
      const page = await pdfJsDoc.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const cw = viewport.width;
      const ch = viewport.height;

      // Preload all SVG symbol images so they render synchronously on the baked canvas
      const preloadedSymbols = await preloadSymbolImages(hvacSymbols);

      // Helper: render base page + overlays to an off-screen canvas, return PNG dataURL
      const renderMode = async (mode) => {
        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = cw;
        baseCanvas.height = ch;
        const baseCtx = baseCanvas.getContext("2d");
        await page.render({ canvasContext: baseCtx, viewport }).promise;

        const overlayCanvas = document.createElement("canvas");
        overlayCanvas.width = cw;
        overlayCanvas.height = ch;
        const overlayCtx = overlayCanvas.getContext("2d");

        // Render ALL annotations including rectangles, lines, comments, and VRF refrigerant lines
        overlayAnnotations(overlayCtx, annotation.annotations, mode);
        // Only bake HVAC overlay if the engineer had it enabled — matches live view behaviour
        if (
          showHVAC &&
          annotation.annotations.hvac &&
          (mode === "ducted" || mode === "vrf-ducted")
        ) {
          overlayHVAC(
            overlayCtx,
            annotation.annotations.hvac,
            preloadedSymbols,
            annotation.annotations.comments,
            mode
          );
        }
        if (annotation.annotations.vrf && mode.startsWith("vrf")) {
          overlayVRFSystem(
            overlayCtx,
            annotation.annotations.vrf,
            preloadedSymbols,
            mode
          );
        }

        // Draw legend on the overlay
        drawCanvasLegend(overlayCtx, mode, { pdfScale });

        // Composite base + overlay
        const composite = document.createElement("canvas");
        composite.width = cw;
        composite.height = ch;
        const ctx = composite.getContext("2d");
        ctx.drawImage(baseCanvas, 0, 0);
        ctx.drawImage(overlayCanvas, 0, 0);

        // Label the page
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.font = "bold 14px Arial";
        ctx.fillText(
          mode === "vrf-ducted"
            ? "VRF System — Ducted Indoor Units"
            : "VRF System — Ductless Indoor Units",
          10,
          20
        );
        ctx.restore();

        return composite.toDataURL("image/png");
      };

      const ductedImage   = await renderMode("vrf-ducted");
      const ductlessImage = await renderMode("vrf-ductless");

      if (!ductedImage || ductedImage === "data:," || ductedImage.length < 100)
        throw new Error("Failed to render ducted canvas.");
      if (!ductlessImage || ductlessImage === "data:," || ductlessImage.length < 100)
        throw new Error("Failed to render ductless canvas.");

      // Build a 2-page PDF: page 1 = ducted, page 2 = ductless
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const [pngDucted, pngDuctless] = await Promise.all([
        pdfDoc.embedPng(ductedImage),
        pdfDoc.embedPng(ductlessImage),
      ]);

      const firstPage = pdfDoc.getPages()[0];
      const { width: pageW, height: pageH } = firstPage.getSize();
      firstPage.drawImage(pngDucted, { x: 0, y: 0, width: pageW, height: pageH });

      const page2 = pdfDoc.addPage([pageW, pageH]);
      page2.drawImage(pngDuctless, { x: 0, y: 0, width: pageW, height: pageH });

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

      // Map percent-format annotations for the API
      const ann = annotation.annotations || {};
      const rects = (ann.rectangles || []).map((r) => ({
        id: r.id, x: r.xPercent, y: r.yPercent,
        width: r.widthPercent, height: r.heightPercent,
        fill: r.fill, stroke: r.stroke, rotation: r.rotation || 0,
      }));
      const comments = (ann.comments || []).map((c) => ({
        id: c.id, rectId: c.rectId, text: c.text,
        x: c.xPercent, y: c.yPercent, fill: c.fill, textColor: c.textColor,
      }));
      const lines = (ann.lines || []).map((l) => ({
        id: l.id, rectId: l.rectId, commentId: l.commentId,
        points: l.points, stroke: l.stroke, strokeWidth: l.strokeWidth,
      }));

      const userId =
        annotation.userId?._id?.toString() ||
        annotation.userId?.toString() ||
        null;
      if (!userId)
        throw new Error("Could not determine the owner userId. Please reload the page and try again.");

      const formData = new FormData();
      formData.append("pdfFile", pdfBlob, pdfFile.name || "engineer-review.pdf");
      formData.append("userId", userId);
      formData.append("userAnnotationId", id);
      formData.append("systemType", acType);
      formData.append("roomType", "living room");
      formData.append("areaSqft", "0");
      formData.append("btuRequired", "0");
      formData.append("rectangles", JSON.stringify(rects));
      formData.append("comments", JSON.stringify(comments));
      formData.append("lines", JSON.stringify(lines));
      formData.append("hvac", JSON.stringify(ann.hvac || {}));
      formData.append("vrf", JSON.stringify(ann.vrf || {}));
      formData.append("refrigerantLinesAuto", "false");
      formData.append("engineerNotes", "");
      formData.append("imageWidth", "1");
      formData.append("imageHeight", "1");

      const res = await fetch("/api/engineer-annotations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to save engineer annotation.");
      }
      setSaveSuccess(true);
    } catch (err) {
      console.error("Save to MongoDB error:", err);
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-hero">
        <div className="adm-hero__inner">
          <div className="adm-hero__icon"><FaDraftingCompass /></div>
          <h1 className="adm-hero__title">Engineer View: User Drawing</h1>
          <p className="adm-hero__sub">Review, annotate and export user HVAC drawing projects.</p>
        </div>
      </div>
      <div className="adm-inner">
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="mb-2 mt-4 d-flex align-items-center gap-2">
        <label className="me-2 mb-4">AC Type:</label>
        <select value={acType} onChange={(e) => setAcType(e.target.value)}>
          <option value="vrf-ducted">VRF System - Ducted</option>
          <option value="vrf-ductless">VRF System - Ductless</option>
        </select>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <>
            <Button
              className="btn btn-outline-primary me-2"
              onClick={() => setShowHVAC((prev) => !prev)}
            >
              {showHVAC ? "Hide HVAC Layer" : "Show HVAC Layer"}
            </Button>
          </>
        )}
      </div>

      {/* Professional Engineering Toolbar */}
      <div className="ev-toolbar">
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <>
            {/* Ductwork Section */}
            <div className="ev-toolbar-group">
              <span className="ev-toolbar-label">Ductwork</span>
              {isMobile ? (
                <Dropdown>
                  <Dropdown.Toggle size="sm" variant="outline-primary" className="ev-dropdown-toggle">
                    {addMode?.includes('duct') ? addMode.replace(/-/g, ' ') : 'Select Duct'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item active={addMode === "supply-duct"} onClick={() => setAddMode(addMode === "supply-duct" ? null : "supply-duct")}>
                      Supply Duct
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "return-duct"} onClick={() => setAddMode(addMode === "return-duct" ? null : "return-duct")}>
                      Return Duct
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "flex-duct"} onClick={() => setAddMode(addMode === "flex-duct" ? null : "flex-duct")}>
                      Flex Duct
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "exhaust-duct"} onClick={() => setAddMode(addMode === "exhaust-duct" ? null : "exhaust-duct")}>
                      Exhaust Duct
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "insulated-duct"} onClick={() => setAddMode(addMode === "insulated-duct" ? null : "insulated-duct")}>
                      Insulated
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <div className="ev-toolbar-btns">
                  <Button
                    size="sm"
                    variant={addMode === "supply-duct" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "supply-duct" ? null : "supply-duct")}
                    title="Supply Duct — solid blue parallel lines"
                  >
                    Supply Duct
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "return-duct" ? "warning" : "outline-warning"}
                    onClick={() => setAddMode(addMode === "return-duct" ? null : "return-duct")}
                    title="Return Duct — dashed orange parallel lines"
                  >
                    Return Duct
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "flex-duct" ? "secondary" : "outline-secondary"}
                    onClick={() => setAddMode(addMode === "flex-duct" ? null : "flex-duct")}
                    title="Flex Duct — wavy lines"
                  >
                    Flex Duct
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "exhaust-duct" ? "success" : "outline-success"}
                    onClick={() => setAddMode(addMode === "exhaust-duct" ? null : "exhaust-duct")}
                    title="Exhaust Duct — dashed green lines"
                  >
                    Exhaust Duct
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "insulated-duct" ? "info" : "outline-info"}
                    onClick={() => setAddMode(addMode === "insulated-duct" ? null : "insulated-duct")}
                    title="Insulated Duct — dash-dot amber lines"
                  >
                    Insulated
                  </Button>
                </div>
              )}
            </div>

            {/* Diffusers & Grilles Section */}
            <div className="ev-toolbar-group">
              <span className="ev-toolbar-label">Diffusers & Grilles</span>
              {isMobile ? (
                <Dropdown>
                  <Dropdown.Toggle size="sm" variant="outline-primary" className="ev-dropdown-toggle">
                    {['supply-4way', 'round-diffuser', 'linear-slot', 'jet-diffuser', 'wall-diffuser', 'return-grille', 'transfer-grille', 'exhaust-grille', 'drain-point'].includes(addMode) 
                      ? addMode.replace(/-/g, ' ') 
                      : 'Select Diffuser'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header>Supply Diffusers</Dropdown.Header>
                    <Dropdown.Item active={addMode === "supply-4way"} onClick={() => setAddMode(addMode === "supply-4way" ? null : "supply-4way")}>
                      4-Way SD
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "round-diffuser"} onClick={() => setAddMode(addMode === "round-diffuser" ? null : "round-diffuser")}>
                      Round SD
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "linear-slot"} onClick={() => setAddMode(addMode === "linear-slot" ? null : "linear-slot")}>
                      Linear Slot
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "jet-diffuser"} onClick={() => setAddMode(addMode === "jet-diffuser" ? null : "jet-diffuser")}>
                      JET
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "wall-diffuser"} onClick={() => setAddMode(addMode === "wall-diffuser" ? null : "wall-diffuser")}>
                      Wall SD
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Header>Return & Exhaust</Dropdown.Header>
                    <Dropdown.Item active={addMode === "return-grille"} onClick={() => setAddMode(addMode === "return-grille" ? null : "return-grille")}>
                      Return Grille
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "transfer-grille"} onClick={() => setAddMode(addMode === "transfer-grille" ? null : "transfer-grille")}>
                      Transfer
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "exhaust-grille"} onClick={() => setAddMode(addMode === "exhaust-grille" ? null : "exhaust-grille")}>
                      Exhaust
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item active={addMode === "drain-point"} onClick={() => setAddMode(addMode === "drain-point" ? null : "drain-point")}>
                      Drain Point
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <div className="ev-toolbar-btns">
                  <Button
                    size="sm"
                    variant={addMode === "supply-4way" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "supply-4way" ? null : "supply-4way")}
                    title="4-Way Supply Diffuser"
                  >
                    4-Way SD
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "round-diffuser" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "round-diffuser" ? null : "round-diffuser")}
                    title="Round Ceiling Diffuser"
                  >
                    Round SD
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "linear-slot" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "linear-slot" ? null : "linear-slot")}
                    title="Linear Slot Diffuser"
                  >
                    Linear Slot
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "jet-diffuser" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "jet-diffuser" ? null : "jet-diffuser")}
                    title="JET Diffuser (High Velocity)"
                  >
                    JET
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "wall-diffuser" ? "primary" : "outline-primary"}
                    onClick={() => setAddMode(addMode === "wall-diffuser" ? null : "wall-diffuser")}
                    title="Wall-Mounted Supply Diffuser"
                  >
                    Wall SD
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "return-grille" ? "warning" : "outline-warning"}
                    onClick={() => setAddMode(addMode === "return-grille" ? null : "return-grille")}
                    title="Return Air Grille"
                  >
                    Return Grille
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "transfer-grille" ? "warning" : "outline-warning"}
                    onClick={() => setAddMode(addMode === "transfer-grille" ? null : "transfer-grille")}
                    title="Transfer Grille (Pressure Balance)"
                  >
                    Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "exhaust-grille" ? "success" : "outline-success"}
                    onClick={() => setAddMode(addMode === "exhaust-grille" ? null : "exhaust-grille")}
                    title="Exhaust Air Grille"
                  >
                    Exhaust
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "drain-point" ? "info" : "outline-info"}
                    onClick={() => setAddMode(addMode === "drain-point" ? null : "drain-point")}
                    title="Condensate Drain Point"
                  >
                    Drain
                  </Button>
                </div>
              )}
            </div>

            {/* Accessories Section */}
            <div className="ev-toolbar-group">
              <span className="ev-toolbar-label">Accessories</span>
              {isMobile ? (
                <Dropdown>
                  <Dropdown.Toggle size="sm" variant="outline-secondary" className="ev-dropdown-toggle">
                    {['fire-damper', 'volume-damper'].includes(addMode) ? addMode.replace(/-/g, ' ') : 'Select'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item active={addMode === "fire-damper"} onClick={() => setAddMode(addMode === "fire-damper" ? null : "fire-damper")}>
                      Fire Damper
                    </Dropdown.Item>
                    <Dropdown.Item active={addMode === "volume-damper"} onClick={() => setAddMode(addMode === "volume-damper" ? null : "volume-damper")}>
                      Vol. Damper
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <div className="ev-toolbar-btns">
                  <Button
                    size="sm"
                    variant={addMode === "fire-damper" ? "danger" : "outline-danger"}
                    onClick={() => setAddMode(addMode === "fire-damper" ? null : "fire-damper")}
                    title="Fire Damper"
                  >
                    Fire Damper
                  </Button>
                  <Button
                    size="sm"
                    variant={addMode === "volume-damper" ? "secondary" : "outline-secondary"}
                    onClick={() => setAddMode(addMode === "volume-damper" ? null : "volume-damper")}
                    title="Volume Damper"
                  >
                    Vol. Damper
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Auto-placement */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-toolbar-group">
            <span className="ev-toolbar-label">Auto Layout</span>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-info" className="ev-dropdown-toggle">
                  🔧 Auto
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={handleAutoPlaceDucts}>
                    🔧 Auto-Place HVAC
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleClearHvac} className="text-danger">
                    🗑 Clear HVAC
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="ev-toolbar-btns">
                <Button
                  size="sm"
                  variant="outline-info"
                  onClick={handleAutoPlaceDucts}
                  title="Auto-generate ducts, diffusers, grilles, dampers & thermostats for every indoor unit"
                >
                  🔧 Auto-Place HVAC
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={handleClearHvac}
                  title="Remove all auto-placed HVAC elements (zones will be preserved)"
                >
                  🗑 Clear HVAC
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Zone Management */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-toolbar-group">
            <span className="ev-toolbar-label">
              Zone Management {annotation?.annotations?.hvac?.zones?.length > 0 && `(${annotation.annotations.hvac.zones.length})`}
            </span>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-primary" className="ev-dropdown-toggle">
                  🖊 Zones
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setIsDrawingZone(!isDrawingZone)}>
                    {isDrawingZone ? '🔲 Stop Drawing' : '🖊 Draw Zone'}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => {
                    const zoneCount = (annotation?.annotations?.hvac?.zones || []).length;
                    if (zoneCount === 0) {
                      toast.info('No zones to delete');
                      return;
                    }
                    if (window.confirm(`Delete all ${zoneCount} zones?`)) {
                      setAnnotation((prev) => ({
                        ...prev,
                        annotations: {
                          ...(prev.annotations || {}),
                          hvac: {
                            ...(prev.annotations?.hvac || {}),
                            zones: []
                          }
                        }
                      }));
                      setSelectedZoneIndex(null);
                      toast.success('All zones deleted');
                    }
                  }} className="text-danger">
                    🗑 Delete All Zones ({(annotation?.annotations?.hvac?.zones || []).length})
                  </Dropdown.Item>
                  {selectedZoneIndex !== null && selectedZoneIndex !== -1 && (
                    <>
                      <Dropdown.Divider />
                      <Dropdown.Header>Change Zone #{selectedZoneIndex + 1} Color</Dropdown.Header>
                      {zoneColorPalette.map((color, idx) => (
                        <Dropdown.Item
                          key={idx}
                          onClick={() => handleChangeZoneColor(selectedZoneIndex, idx)}
                          style={{
                            background: `linear-gradient(to right, ${color.fill} 0%, ${color.stroke} 100%)`,
                            borderLeft: `4px solid ${color.stroke}`,
                          }}
                        >
                          🎨 {color.name}
                        </Dropdown.Item>
                      ))}
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={() => handleDeleteZone(selectedZoneIndex)} className="text-danger">
                        🗑 Delete Selected Zone ({selectedZoneIndex + 1})
                      </Dropdown.Item>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <div className="ev-toolbar-btns">
                <Button
                  size="sm"
                  variant={isDrawingZone ? "primary" : "outline-primary"}
                  onClick={() => setIsDrawingZone(!isDrawingZone)}
                  title="Draw HVAC zones manually by dragging on the canvas"
                >
                  {isDrawingZone ? '🔲 Stop Drawing' : '🖊 Draw Zone'}
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => {
                    const zoneCount = (annotation?.annotations?.hvac?.zones || []).length;
                    if (zoneCount === 0) {
                      toast.info('No zones to delete');
                      return;
                    }
                    if (window.confirm(`Delete all ${zoneCount} zones?`)) {
                      setAnnotation((prev) => ({
                        ...prev,
                        annotations: {
                          ...(prev.annotations || {}),
                          hvac: {
                            ...(prev.annotations?.hvac || {}),
                            zones: []
                          }
                        }
                      }));
                      setSelectedZoneIndex(null);
                      toast.success('All zones deleted');
                    }
                  }}
                  title="Delete all manually drawn zones"
                >
                  🗑 Delete All Zones ({(annotation?.annotations?.hvac?.zones || []).length})
                </Button>
                {console.log('Rendering toolbar. selectedZoneIndex:', selectedZoneIndex, 'Type:', typeof selectedZoneIndex)}
                {selectedZoneIndex !== null && selectedZoneIndex !== -1 && (
                  <>
                    {console.log('✅ Showing color picker for zone:', selectedZoneIndex)}
                    <Dropdown>
                      <Dropdown.Toggle size="sm" variant="outline-info" title="Change zone color">
                        🎨 Zone #{selectedZoneIndex + 1} Color
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        {zoneColorPalette.map((color, idx) => (
                          <Dropdown.Item
                            key={idx}
                            onClick={() => handleChangeZoneColor(selectedZoneIndex, idx)}
                            style={{
                              background: `linear-gradient(to right, ${color.fill} 0%, ${color.stroke} 100%)`,
                              borderLeft: `4px solid ${color.stroke}`,
                            }}
                          >
                            {color.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => handleDeleteZone(selectedZoneIndex)}
                      title="Delete the currently selected zone"
                    >
                      🗑 Delete Zone #{selectedZoneIndex + 1}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comment (all modes) */}
        <div className="ev-toolbar-group">
          <span className="ev-toolbar-label">Annotations</span>
          {isMobile ? (
            <Dropdown>
              <Dropdown.Toggle size="sm" variant="outline-warning" className="ev-dropdown-toggle">
                {addMode === 'comment' ? 'Comment' : addMode === 'markCondenser' ? 'Condenser' : 'Add'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item active={addMode === "comment"} onClick={() => setAddMode(addMode === "comment" ? null : "comment")}>
                  Add Comment
                </Dropdown.Item>
                {acType === "vrf-ductless" && (
                  <Dropdown.Item onClick={() => setAddMode("markCondenser")}>
                    Mark Condenser
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            <div className="ev-toolbar-btns">
              <Button
                size="sm"
                variant={addMode === "comment" ? "warning" : "outline-warning"}
                onClick={() => setAddMode(addMode === "comment" ? null : "comment")}
              >
                Add Comment
              </Button>
              {acType === "vrf-ductless" && (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => setAddMode("markCondenser")}
                >
                  Mark Condenser
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Active mode indicator */}
        {addMode && (
          <div className="ev-active-mode">
            <span>Placing: <strong>{addMode.replace(/-/g, ' ')}</strong></span>
            <Button size="sm" variant="light" onClick={() => setAddMode(null)}>Cancel</Button>
          </div>
        )}
      </div>

      {/* Undo & Save Actions */}
      <div className="ev-actions-bar">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => {
              setAnnotation((prev) => {
                let allItems = [];

                // Collect HVAC items (ducts, diffusers, dampers)
                if (prev?.annotations?.hvac) {
                  allItems.push(
                    ...(prev.annotations.hvac.ducts || []).map((d) => ({ ...d, type: "duct", subType: "hvac" })),
                    ...(prev.annotations.hvac.diffusers || []).map((d) => ({ ...d, type: "diffuser", subType: "hvac" })),
                    ...(prev.annotations.hvac.dampers || []).map((d) => ({ ...d, type: "damper", subType: "hvac" }))
                  );
                }

                // Collect VRF units
                if (prev?.annotations?.vrf && acType.startsWith("vrf")) {
                  allItems.push(
                    ...(prev.annotations.vrf.outdoorUnits || []).map((d) => ({ ...d, type: "outdoor", subType: "vrf" })),
                    ...(prev.annotations.vrf.indoorUnits || []).map((d) => ({ ...d, type: "indoor", subType: "vrf" }))
                  );
                }

                // Collect comments
                if (prev?.annotations?.comments) {
                  allItems.push(
                    ...(prev.annotations.comments || []).map((c) => ({ ...c, type: "comment", subType: "annotation" }))
                  );
                }

                if (allItems.length === 0) return prev;

                const mostRecent = allItems.reduce((max, item) => {
                  const maxTime = parseInt(max.id.split("-")[1]);
                  const itemTime = parseInt(item.id.split("-")[1]);
                  return itemTime > maxTime ? item : max;
                });

                if (mostRecent.subType === "annotation") {
                  return { ...prev, annotations: { ...(prev.annotations || {}), comments: (prev.annotations?.comments || []).filter((c) => c.id !== mostRecent.id) } };
                }
                if (mostRecent.subType === "hvac") {
                  const hvac = { ...(prev.annotations?.hvac || {}) };
                  if (mostRecent.type === "duct") hvac.ducts = (hvac.ducts || []).filter((d) => d.id !== mostRecent.id);
                  if (mostRecent.type === "diffuser") hvac.diffusers = (hvac.diffusers || []).filter((d) => d.id !== mostRecent.id);
                  if (mostRecent.type === "damper") hvac.dampers = (hvac.dampers || []).filter((d) => d.id !== mostRecent.id);
                  return { ...prev, annotations: { ...(prev.annotations || {}), hvac } };
                }
                if (mostRecent.subType === "vrf") {
                  const vrf = { ...(prev.annotations?.vrf || {}) };
                  if (mostRecent.type === "outdoor") vrf.outdoorUnits = (vrf.outdoorUnits || []).filter((d) => d.id !== mostRecent.id);
                  if (mostRecent.type === "indoor") vrf.indoorUnits = (vrf.indoorUnits || []).filter((d) => d.id !== mostRecent.id);
                  return { ...prev, annotations: { ...(prev.annotations || {}), vrf } };
                }
                return prev;
              });
              setAddMode(null);
            }}
          >
            Undo Last
          </Button>

          <Button onClick={handleSave} variant="primary" size="sm">
            Save HVAC Items
          </Button>
      </div>

        <div className="pdf-scroll-wrapper">
          <div className="sb-zoom-controls">
            <button
              className="sb-zoom-btn"
              type="button"
              onClick={() => setPdfScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
              title="Zoom out"
            >
              −
            </button>
            <span className="sb-zoom-level">{Math.round(pdfScale * 100)}%</span>
            <button
              className="sb-zoom-btn"
              type="button"
              onClick={() => setPdfScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
              title="Zoom in"
            >
              +
            </button>
          </div>
          <div
            ref={pdfContainerRef}
            id="pdf-container"
            style={{ minHeight: 400, margin: "2rem 0", position: "relative" }}
          ></div>
        </div>
        {annotation && pdfFile && (
          <div className="mt-2">
            <Button
              variant="success"
              size="sm"
              className="w-auto"
              onClick={handleSaveToMongoDB}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "💾 Save Engineer Review"}
            </Button>
            {saveSuccess && (
              <p className="text-success mt-1" style={{ fontSize: "0.875rem" }}>
                ✅ Saved! The review is now visible in the user's Engineer Reviews tab.
              </p>
            )}
            {saveError && (
              <p className="text-danger mt-1" style={{ fontSize: "0.875rem" }}>
                {saveError}
              </p>
            )}
          </div>
        )}
      </div>

      {showCommentModal && (
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
            zIndex: 9999,
          }}
          onClick={() => { setShowCommentModal(false); setAddMode(null); }}
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
            <h5 style={{ marginBottom: '12px' }}>Enter comment text</h5>
            <Form.Control
              type="text"
              placeholder="Comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmComment(commentInput.trim());
                  setShowCommentModal(false);
                }
              }}
              autoFocus
              style={{ marginBottom: '16px', fontSize: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  confirmComment(commentInput.trim());
                  setShowCommentModal(false);
                }}
                disabled={!commentInput.trim()}
              >
                Add
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowCommentModal(false); setAddMode(null); }}
              >
                Cancel
              </Button>
            
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngineerViewPage;