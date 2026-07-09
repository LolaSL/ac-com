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
  const [reviewStatus, setReviewStatus] = useState("reviewed");
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
  // Mirror selectedZoneIndex in a ref so renderOverlays reads the latest value
  // without needing it in the dependency array (avoids full canvas rebuild on every zone click)
  const selectedZoneIndexRef = useRef(null);
  useEffect(() => { selectedZoneIndexRef.current = selectedZoneIndex; }, [selectedZoneIndex]);

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
    // isDrawingZone is guaranteed true here by the guard above
    e.preventDefault();
    
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

  // Helper: find the topmost zone whose bounds contain the given normalised coords (0-1)
  const findZoneAtCoords = (coords, zones) => {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      if (
        coords.x >= z.xPercent &&
        coords.x <= z.xPercent + z.widthPercent &&
        coords.y >= z.yPercent &&
        coords.y <= z.yPercent + z.heightPercent
      ) return i;
    }
    return -1;
  };

  // Handle zone click for selection (like HvacZoneDesignerPage)
  const handleZoneClickInternal = (e) => {
    if (isDrawingZone || addMode) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const coords = screenToCanvasPercent(e.clientX, e.clientY, rect, canvas);
    const zones = annotation?.annotations?.hvac?.zones || [];
    setSelectedZoneIndex(findZoneAtCoords(coords, zones));
  };

  // Save manually drawn zone (simplified, like HvacZoneDesignerPage saveZone)
  const saveDrawnZone = (zoneData) => {
    const zoneNumber = (annotation?.annotations?.hvac?.zones?.length || 0) + 1;
    const colorIndex = (zoneNumber - 1) % zoneColorPalette.length;
    const colors = zoneColorPalette[colorIndex];

    // Derive zone label based on AC naming convention:
    //   - Single-flat drawing (ac-N):       label = "N"
    //   - Multi-flat drawing  (ac-N.M):     label = "N.M"
    // M = next available zone index within flat N.
    const zoneX1 = zoneData.x;
    const zoneY1 = zoneData.y;
    const zoneX2 = zoneData.x + zoneData.width;
    const zoneY2 = zoneData.y + zoneData.height;
    const zoneCenterX = zoneData.x + zoneData.width / 2;
    const zoneCenterY = zoneData.y + zoneData.height / 2;
    const rects = annotation?.annotations?.rectangles || [];
    const comments = annotation?.annotations?.comments || [];
    const existingZones = annotation?.annotations?.hvac?.zones || [];

    // Scan all AC comments project-wide to detect whether this is a multi-flat drawing
    // (any ac-N.M present) vs single-flat (only ac-N).
    let isMultiFlat = false;
    const insideFlats = [];
    let nearestFlat = null;
    let nearestDist = Infinity;
    rects.forEach((r) => {
      const comment = comments.find((c) => String(c.rectId) === String(r.id));
      if (!comment) return;
      const acMatch = comment.text.match(/^ac-(\d+)(?:\.(\d+))?/i);
      if (!acMatch) return;
      if (acMatch[2] !== undefined) isMultiFlat = true;
      const flatNum = acMatch[1];
      const rx = (r.xPercent || 0) + (r.widthPercent || 0) / 2;
      const ry = (r.yPercent || 0) + (r.heightPercent || 0) / 2;
      const inside =
        rx >= zoneX1 && rx <= zoneX2 && ry >= zoneY1 && ry <= zoneY2;
      if (inside) insideFlats.push(flatNum);
      const dist = Math.hypot(rx - zoneCenterX, ry - zoneCenterY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestFlat = flatNum;
      }
    });

    // Pick the flat number: most common flat among inside ACs, else nearest, else zone counter.
    let flatNumber = null;
    if (insideFlats.length > 0) {
      const counts = insideFlats.reduce((acc, f) => {
        acc[f] = (acc[f] || 0) + 1;
        return acc;
      }, {});
      flatNumber = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    } else if (nearestFlat) {
      flatNumber = nearestFlat;
    } else {
      flatNumber = String(zoneNumber);
    }

    let bestLabel;
    if (isMultiFlat) {
      // M = next zone index within this flat
      const sameFlatCount = existingZones.filter((z) => {
        const lbl = String(z.zoneLabel || '');
        return lbl.startsWith(`${flatNumber}.`);
      }).length;
      bestLabel = `${flatNumber}.${sameFlatCount + 1}`;
    } else {
      bestLabel = String(flatNumber);
    }

    const newZone = {
      id: `zone-manual-${Date.now()}`,
      xPercent: zoneData.x,
      yPercent: zoneData.y,
      widthPercent: zoneData.width,
      heightPercent: zoneData.height,
      fill: colors.fill,
      stroke: colors.stroke,
      zoneNumber: zoneNumber,
      zoneLabel: bestLabel,
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
    
    toast.success(`Zone ${newZone.zoneLabel} created`);
  };

  // Redraw overlays whenever annotation, showHVAC, or addMode changes
  useEffect(() => {
    const renderOverlays = async () => {
      if (!pdfFile || !annotation) return;
      const pdfUrl = window.URL.createObjectURL(pdfFile);
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDoc = await loadingTask.promise;
      URL.revokeObjectURL(pdfUrl); // Revoke immediately — pdf.js has loaded the document
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

      // Always render zones (fill + stroke + "Zone N" label) regardless of
      // showHVAC — so the engineer sees their zones as soon as they draw them.
      // overlayHVAC below also draws zones, but only when showHVAC is on; we
      // skip its zone pass to avoid double-drawing when both are active.
      const zones = annotation?.annotations?.hvac?.zones || [];
      if (zones.length > 0) {
        const cw = overlayCanvas.width;
        const ch = overlayCanvas.height;
        const scaleFactor = pdfScale / 1.5;
        zones.forEach((zone) => {
          const zx = (zone.xPercent || 0) * cw;
          const zy = (zone.yPercent || 0) * ch;
          const zw = (zone.widthPercent || 0.15) * cw;
          const zh = (zone.heightPercent || 0.12) * ch;
          overlayContext.save();
          overlayContext.beginPath();
          overlayContext.rect(zx, zy, zw, zh);
          overlayContext.fillStyle = zone.fill || 'rgba(0,150,255,0.12)';
          overlayContext.fill();
          overlayContext.lineWidth = 1 * scaleFactor;
          overlayContext.strokeStyle = zone.stroke || 'rgba(0,100,200,0.5)';
          overlayContext.stroke();

          const hasZoneNumber = zone.zoneNumber !== undefined && zone.zoneNumber !== null && zone.zoneNumber !== "";
          const hasZoneLabel = zone.zoneLabel !== undefined && zone.zoneLabel !== null && String(zone.zoneLabel).trim() !== "";
          if (hasZoneNumber || hasZoneLabel) {
            const label = hasZoneLabel ? String(zone.zoneLabel) : String(zone.zoneNumber);
            // Font is sized in canvas pixels (canvas is rendered at pdfScale),
            // so a larger min ensures it survives CSS-downscaling on small screens.
            const fontSize = Math.max(16, 18 * scaleFactor);
            overlayContext.font = `bold ${fontSize}px Arial`;
            overlayContext.fillStyle = 'rgba(0,80,160,0.95)';
            overlayContext.textAlign = 'left';
            overlayContext.textBaseline = 'top';
            overlayContext.fillText(`Zone ${label}`, zx + 6 * scaleFactor, zy + 6 * scaleFactor);
          }
          overlayContext.restore();
        });
      }

      if (showHVAC && annotation.annotations.hvac && (acType === "ducted" || acType === "vrf-ducted")) {
        // Skip zones inside overlayHVAC — we already drew them above
        const hvacNoZones = { ...(annotation.annotations.hvac || {}), zones: [] };
        overlayHVAC(
          overlayContext,
          hvacNoZones,
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
            setSelectedZoneIndex(findZoneAtCoords(coords, zones));
          }
        };
      }

      // Highlight selected zone on a dedicated canvas layer (so zone selection doesn't
      // trigger a full canvas rebuild — handled by the lightweight effect below)
      const currentSelIdx = selectedZoneIndexRef.current;
      if (currentSelIdx !== null && currentSelIdx !== -1) {
        const zones = annotation?.annotations?.hvac?.zones || [];
        const selectedZone = zones[currentSelIdx];
        if (selectedZone) {
          const hlCanvas = document.createElement('canvas');
          hlCanvas.className = 'zone-highlight-canvas';
          hlCanvas.style.position = 'absolute';
          hlCanvas.style.top = '0';
          hlCanvas.style.left = '0';
          hlCanvas.style.pointerEvents = 'none';
          hlCanvas.style.zIndex = '998';
          hlCanvas.width = overlayCanvas.width;
          hlCanvas.height = overlayCanvas.height;
          container.appendChild(hlCanvas);
          const hlCtx = hlCanvas.getContext('2d');
          hlCtx.strokeStyle = '#FF6B00';
          hlCtx.lineWidth = 3;
          hlCtx.strokeRect(
            selectedZone.xPercent * hlCanvas.width,
            selectedZone.yPercent * hlCanvas.height,
            selectedZone.widthPercent * hlCanvas.width,
            selectedZone.heightPercent * hlCanvas.height
          );
        }
      }
    }; // Close renderOverlays function
    
    renderOverlays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, annotation, showHVAC, addMode, acType, pdfScale, isDrawingZone]);

  // Lightweight effect: update zone selection highlight without a full canvas rebuild.
  // Runs only when selectedZoneIndex or annotation changes.
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;
    // Remove existing highlight canvas (will recreate below if needed)
    const existing = container.querySelector('.zone-highlight-canvas');
    if (existing) existing.remove();
    if (selectedZoneIndex === null || selectedZoneIndex === -1) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const zones = annotation?.annotations?.hvac?.zones || [];
    const zone = zones[selectedZoneIndex];
    if (!zone) return;
    const hlCanvas = document.createElement('canvas');
    hlCanvas.className = 'zone-highlight-canvas';
    hlCanvas.style.position = 'absolute';
    hlCanvas.style.top = '0';
    hlCanvas.style.left = '0';
    hlCanvas.style.pointerEvents = 'none';
    hlCanvas.style.zIndex = '998';
    hlCanvas.width = canvas.width;
    hlCanvas.height = canvas.height;
    container.appendChild(hlCanvas);
    const hlCtx = hlCanvas.getContext('2d');
    hlCtx.strokeStyle = '#FF6B00';
    hlCtx.lineWidth = 3;
    hlCtx.strokeRect(
      zone.xPercent * hlCanvas.width,
      zone.yPercent * hlCanvas.height,
      zone.widthPercent * hlCanvas.width,
      zone.heightPercent * hlCanvas.height
    );
    return () => {
      const hl = container.querySelector('.zone-highlight-canvas');
      if (hl) hl.remove();
    };
  }, [selectedZoneIndex, annotation]);

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
    try {
      const res = await fetch(`/api/annotations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...annotation, acType }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || "Failed to save HVAC items.");
        return;
      }
      toast.success("Annotation (including HVAC) saved!");
    } catch (err) {
      toast.error(err.message || "Failed to save. Please try again.");
    }
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

  // Toggle manual zone drawing mode with guard: user must have annotated at
  // least one rectangle first (same pre-condition as Auto-Place HVAC).
  const handleToggleDrawZone = () => {
    if (!isDrawingZone) {
      const rects = annotation?.annotations?.rectangles || [];
      if (rects.length === 0) {
        toast.warn('No user annotations found. User must draw rectangles first before zones can be added.');
        return;
      }
    }
    setIsDrawingZone((v) => !v);
  };

  // Delete a specific zone by index
  const handleDeleteZone = (zoneIndex) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p style={{ margin: '0 0 8px' }}>Delete this zone?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => {
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
              closeToast();
            }}>Delete</button>
            <button className="btn btn-secondary btn-sm" onClick={closeToast}>Cancel</button>
          </div>
        </div>
      ),
      { autoClose: false, closeButton: false }
    );
  };

  // Delete all zones (non-blocking toast confirmation)
  const handleDeleteAllZones = () => {
    const zoneCount = (annotation?.annotations?.hvac?.zones || []).length;
    if (zoneCount === 0) { toast.info('No zones to delete'); return; }
    toast(
      ({ closeToast }) => (
        <div>
          <p style={{ margin: '0 0 8px' }}>Delete all {zoneCount} zones?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => {
              setAnnotation((prev) => ({
                ...prev,
                annotations: { ...(prev.annotations || {}), hvac: { ...(prev.annotations?.hvac || {}), zones: [] } }
              }));
              setSelectedZoneIndex(null);
              toast.success('All zones deleted');
              closeToast();
            }}>Delete All</button>
            <button className="btn btn-secondary btn-sm" onClick={closeToast}>Cancel</button>
          </div>
        </div>
      ),
      { autoClose: false, closeButton: false }
    );
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

    // Ductless mode: no ducts/diffusers/dampers — only indoor/outdoor units are drawn
    if (acType === 'vrf-ductless') {
      toast.info('Ductless mode: HVAC items are drawn as indoor/outdoor units on the canvas. No duct layout is generated.');
      return;
    }

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

    // Compute visual centre and visual bounding dimensions for a rectangle
    // (Konva rotates around the stored top-left corner, so the centre shifts)
    const getVisuals = (r) => {
      const px = r.xPercent;
      const py = r.yPercent;
      const sw = r.widthPercent  || 0.06; // stored width
      const sh = r.heightPercent || 0.04; // stored height
      const angle = (r.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // Visual centre = top-left + rotate(half-size vector)
      const vcx = px + (sw / 2) * cos - (sh / 2) * sin;
      const vcy = py + (sw / 2) * sin + (sh / 2) * cos;
      // For 90°/270° the stored w and h swap visually
      const rot90 = r.rotation === 90 || r.rotation === 270 || r.rotation === -90;
      const vw = rot90 ? sh : sw;
      const vh = rot90 ? sw : sh;
      return { vcx, vcy, vw, vh };
    };

    // Compute actual bounding box extents for a rotated rectangle
    // Returns the physical left/right/top/bottom bounds after rotation
    const getBoundingBox = (r) => {
      const px = r.xPercent;
      const py = r.yPercent;
      const sw = r.widthPercent  || 0.06;
      const sh = r.heightPercent || 0.04;
      const angle = (r.rotation || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Compute all 4 corners after rotation around top-left origin (px, py)
      const corners = [
        { x: 0, y: 0 },              // top-left (origin)
        { x: sw, y: 0 },             // top-right
        { x: sw, y: sh },            // bottom-right
        { x: 0, y: sh },             // bottom-left
      ];
      
      const rotatedCorners = corners.map(corner => ({
        x: px + corner.x * cos - corner.y * sin,
        y: py + corner.x * sin + corner.y * cos,
      }));
      
      const minX = Math.min(...rotatedCorners.map(c => c.x));
      const maxX = Math.max(...rotatedCorners.map(c => c.x));
      const minY = Math.min(...rotatedCorners.map(c => c.y));
      const maxY = Math.max(...rotatedCorners.map(c => c.y));
      
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    };

    // Helper to compute avgX of visual centres for a group
    const computeAvgX = (rectGroup) => {
      if (rectGroup.length === 0) return 0.5;
      return rectGroup.reduce((s, r) => s + getVisuals(r).vcx, 0) / rectGroup.length;
    };

    // Helper to compute avgY of visual centres for a group
    const computeAvgY = (rectGroup) => {
      if (rectGroup.length === 0) return 0.5;
      return rectGroup.reduce((s, r) => s + getVisuals(r).vcy, 0) / rectGroup.length;
    };

    // Scale HVAC item sizes proportionally to the average rectangle size.
    // Keep multi-flat items readable while still avoiding excessive overlap.
    // Baseline (scale = 1) is tuned for indoor-unit rects ~0.05 of canvas.
    const allRectVisuals = rects.map((r) => getVisuals(r));
    const avgRectDim = allRectVisuals.length
      ? allRectVisuals.reduce((s, v) => s + Math.min(v.vw, v.vh), 0) / allRectVisuals.length
      : 0.05;
    // Multi-flat drawings use a lighter shrink than before so symbols stay readable.
    const isMultiFlat = flatGroups.size > 1;
    const multiFlatShrink = isMultiFlat ? 0.85 : 1;
    const sizeScale =
      Math.max(0.55, Math.min(1.35, avgRectDim / 0.05)) * multiFlatShrink * 1.15;

    // Build deterministic lane offsets so nearby indoor units don't stack HVAC
    // symbols on top of each other.
    const buildLaneOffsets = (rectGroup) => {
      const LANE_THRESHOLD_X = 0.14;
      const LANE_THRESHOLD_Y = 0.12;
      const laneSpacing = Math.max(0.004, 0.009 * sizeScale);

      const sorted = rectGroup
        .map((r) => {
          const v = getVisuals(r);
          return { rect: r, ...v };
        })
        .sort((a, b) => a.vcy - b.vcy || a.vcx - b.vcx);

      const assigned = [];
      const offsets = new Map();

      sorted.forEach((current) => {
        const blockedLanes = new Set();

        assigned.forEach((prev) => {
          const closeX = Math.abs(prev.vcx - current.vcx) <= LANE_THRESHOLD_X;
          const closeY = Math.abs(prev.vcy - current.vcy) <= LANE_THRESHOLD_Y;
          if (closeX && closeY) {
            blockedLanes.add(prev.lane);
          }
        });

        let lane = 0;
        while (blockedLanes.has(lane)) lane += 1;

        const dir = lane % 2 === 1 ? 1 : -1;
        const step = Math.ceil(lane / 2);
        const offset = lane === 0 ? 0 : dir * step * laneSpacing;

        assigned.push({ ...current, lane });
        offsets.set(String(current.rect.id), offset);
      });

      return offsets;
    };

    // Process each flat group separately (each flat has its own center)
    const processRectGroup = (rectGroup, groupAvgX, groupAvgY) => {
      const laneOffsets = buildLaneOffsets(rectGroup);

      // Duct sizing constants (normalised 0-1), scaled to rect size
      const baseLen = (rectGroup.length > 2 ? 0.045 : 0.065) * sizeScale;
      const DUCT_LEN   = baseLen;
      const DUCT_H     = (rectGroup.length > 2 ? 0.013 : 0.016) * sizeScale;
      const GAP        = 0.004 * sizeScale;
      const FLEX_LEN   = (rectGroup.length > 2 ? 0.015 : 0.02) * sizeScale;
      const FLEX_H     = 0.012 * sizeScale;
      const DIFF_SIZE  = (rectGroup.length > 2 ? 0.02 : 0.025) * sizeScale;
      const DAMP_SIZE  = 0.014 * sizeScale;
      const THERM_SIZE = 0.016 * sizeScale;

      // Detect wet rooms from comments for exhaust grille placement
      const WET_ROOM_RE = /\b(bath|wc|toilet|shower|laundry|kitchen|kitc?hen|ktcn|restroom|powder)\b/i;

      rectGroup.forEach((rect, i) => {
        // Use the visual centre and visual dimensions (accounts for Konva rotation)
        const { vcx: rawCx, vcy: rawCy, vw: rw, vh: rh } = getVisuals(rect);
        // Portrait-oriented unit: use vertical HVAC layout
        const isVertical = rh > rw;
        const laneShift = laneOffsets.get(String(rect.id)) || 0;
        const cx = rawCx + (isVertical ? laneShift : 0);
        const cy = rawCy + (!isVertical ? laneShift : 0);

        // Keep each unit's auto-placed items within its containing zone when possible.
        const allZones = ann?.hvac?.zones || [];
        const containingZone = allZones.find((z) => (
          cx >= (z.xPercent || 0) &&
          cx <= (z.xPercent || 0) + (z.widthPercent || 0) &&
          cy >= (z.yPercent || 0) &&
          cy <= (z.yPercent || 0) + (z.heightPercent || 0)
        ));
        const zonePad = 0.008;
        const localMinX = containingZone
          ? (containingZone.xPercent || 0) + zonePad
          : 0.01;
        const localMaxX = containingZone
          ? (containingZone.xPercent || 0) + (containingZone.widthPercent || 0) - zonePad
          : 0.98;
        const localMinY = containingZone
          ? (containingZone.yPercent || 0) + zonePad
          : 0.01;
        const localMaxY = containingZone
          ? (containingZone.yPercent || 0) + (containingZone.heightPercent || 0) - zonePad
          : 0.98;
        const clampLocalX = (v) => Math.max(localMinX, Math.min(localMaxX, v));
        const clampLocalY = (v) => Math.max(localMinY, Math.min(localMaxY, v));

        if (!isVertical) {
        // Pick horizontal direction by available in-zone space first.
        const chainReach = GAP + DUCT_LEN + GAP + FLEX_LEN + GAP + DIFF_SIZE / 2;
        const roomSpaceRight = localMaxX - (cx + rw / 2);
        const roomSpaceLeft = (cx - rw / 2) - localMinX;
        let toRight;
        if (roomSpaceRight < chainReach && roomSpaceLeft >= roomSpaceRight) {
          toRight = false;
        } else if (roomSpaceLeft < chainReach && roomSpaceRight >= roomSpaceLeft) {
          toRight = true;
        } else {
          toRight = roomSpaceRight >= roomSpaceLeft ? true : cx <= groupAvgX;
        }

        // --- Supply duct: offset from unit in chosen direction ---
        // Place supply above or below depending on which side has more space
        const hSpaceAbove = (cy - rh / 2) - localMinY;
        const hSpaceBelow = localMaxY - (cy + rh / 2);
        const supplyAbove = hSpaceAbove >= hSpaceBelow;
        const sDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
        const sDuctY = supplyAbove
          ? cy - rh / 2 - GAP - DUCT_H
          : cy + rh / 2 + GAP;
        newDucts.push({
          id: `duct-auto-s-${ts}-${rect.id}`,
          xPercent: clampLocalX(sDuctX),
          yPercent: clampLocalY(sDuctY),
          width: DUCT_LEN,
          height: DUCT_H,
          ductType: 'supply',
          fill: 'rgba(0,120,255,0.45)',
          stroke: '#0055CC',
        });

        // --- Return duct: same direction, stacked on the same side as supply when near a wall ---
        const rDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
        const rDuctY = supplyAbove
          ? cy + rh / 2 + GAP                      // traditional: supply above, return below
          : cy - rh / 2;                            // near top wall: return aligned with top edge of unit
        newDucts.push({
          id: `duct-auto-r-${ts}-${rect.id}`,
          xPercent: clampLocalX(rDuctX),
          yPercent: clampLocalY(rDuctY),
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
          xPercent: clampLocalX(sFlexX),
          yPercent: clampLocalY(sDuctY + (DUCT_H - FLEX_H) / 2),
          width: FLEX_LEN,
          height: FLEX_H,
          ductType: 'flex',
          fill: 'rgba(150,150,150,0.35)',
          stroke: '#888',
        });

        const rFlexX = toRight ? rDuctX + DUCT_LEN + GAP : rDuctX - GAP - FLEX_LEN;
        newDucts.push({
          id: `duct-auto-rf-${ts}-${rect.id}`,
          xPercent: clampLocalX(rFlexX),
          yPercent: clampLocalY(rDuctY + (DUCT_H - FLEX_H) / 2),
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
          xPercent: clampLocalX(sdX),
          yPercent: clampLocalY(sDuctY + DUCT_H / 2),
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
          xPercent: clampLocalX(rgX),
          yPercent: clampLocalY(rDuctY + DUCT_H / 2),
          sizePercent: DIFF_SIZE,
          shape: 'square',
          diffuserType: 'return-grille',
          airflow: 350,
        });

        // --- Volume damper near the branch origin of the supply duct ---
        const vdX = toRight ? sDuctX + DUCT_LEN * 0.4 : sDuctX + DUCT_LEN * 0.6;
        newDampers.push({
          id: `damper-auto-vd-${ts}-${rect.id}`,
          xPercent: clampLocalX(vdX),
          yPercent: clampLocalY(sDuctY + DUCT_H / 2),
          sizePercent: DAMP_SIZE,
          damperType: 'volume',
        });

        // --- Fire damper at duct origin (where duct exits the unit / crosses wall) ---
        const fdX = toRight ? sDuctX + 0.002 : sDuctX + DUCT_LEN - 0.002;
        newDampers.push({
          id: `damper-auto-fd-${ts}-${rect.id}`,
          xPercent: clampLocalX(fdX),
          yPercent: clampLocalY(sDuctY + DUCT_H / 2),
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
          xPercent: clampLocalX(thermX),
          yPercent: clampLocalY(cy),
          sizePercent: THERM_SIZE,
          label: thermLabel,
        });

        // --- Drain point: placed below the indoor unit for condensate collection ---
        const drainX = cx;
        const drainY = cy + rh / 2 + GAP * 2;
        newDiffusers.push({
          id: `diffuser-auto-drain-${ts}-${rect.id}`,
          xPercent: clampLocalX(drainX),
          yPercent: clampLocalY(drainY),
          sizePercent: DIFF_SIZE * 0.7,
          shape: 'drain',
          diffuserType: 'drain-point',
          airflow: 0,
        });

        // --- JET Diffuser ---
        const jetX = toRight ? cx + rw + GAP * 8 : cx - rw - GAP * 8;
        const jetY = supplyAbove ? cy - rh / 2 - GAP * 4 : cy + rh / 2 + GAP * 4;
        newDiffusers.push({
          id: `diffuser-auto-jet-${ts}-${rect.id}`,
          xPercent: clampLocalX(jetX),
          yPercent: clampLocalY(jetY),
          sizePercent: DIFF_SIZE * 0.85,
          shape: 'jet',
          diffuserType: 'jet',
          airflow: 500,
        });

        // --- Wall Diffuser: side-wall mounted supply ---
        const wallDiffX = toRight ? cx - rw / 2 - GAP * 6 : cx + rw / 2 + GAP * 6;
        const wallDiffY = supplyAbove ? cy - rh / 2 : cy + rh / 2;
        newDiffusers.push({
          id: `diffuser-auto-wall-${ts}-${rect.id}`,
          xPercent: clampLocalX(wallDiffX),
          yPercent: clampLocalY(wallDiffY),
          sizePercent: DIFF_SIZE * 0.9,
          shape: 'wall',
          diffuserType: 'wall-diffuser',
          airflow: 300,
        });

        // --- Insulated Duct: trunk duct on the supply side ---
        const insDuctWidth = DUCT_LEN * 0.5;
        const insDuctHeight = DUCT_H * 0.6;
        const insDuctX = cx - insDuctWidth / 2;
        const insDuctY = supplyAbove
          ? cy - rh / 2 - GAP - DUCT_H * 1.5
          : cy + rh / 2 + GAP + DUCT_H * 1.0;
        newDucts.push({
          id: `duct-auto-ins-${ts}-${rect.id}`,
          xPercent: clampLocalX(insDuctX),
          yPercent: clampLocalY(insDuctY),
          width: insDuctWidth,
          height: insDuctHeight,
          ductType: 'insulated',
          fill: 'rgba(255,180,50,0.45)',
          stroke: '#CC9900',
        });

        // --- Exhaust grille: if nearest comment suggests a wet room ---
        // Use the comment linked to THIS rectangle (by rectId), not the spatially nearest one
        const linkedComment = comments.find((c) => String(c.rectId) === String(rect.id));
        if (linkedComment && WET_ROOM_RE.test(linkedComment.text)) {
          // --- Exhaust Duct: connects to exhaust grille in wet rooms ---
          const exhDuctX = toRight ? cx - rw / 2 - GAP - DUCT_LEN : cx + rw / 2 + GAP;
          const exhDuctY = cy + rh / 2 + GAP;
          newDucts.push({
            id: `duct-auto-exh-${ts}-${rect.id}`,
            xPercent: clampLocalX(exhDuctX),
            yPercent: clampLocalY(exhDuctY),
            width: DUCT_LEN * 0.7,
            height: DUCT_H,
            ductType: 'exhaust',
            fill: 'rgba(34,180,34,0.40)',
            stroke: '#228B22',
          });

          const exhY = cy + rh / 2 + GAP + DIFF_SIZE;
          newDiffusers.push({
            id: `diffuser-auto-exh-${ts}-${rect.id}`,
            xPercent: clampLocalX(cx),
            yPercent: clampLocalY(exhY),
            sizePercent: DIFF_SIZE,
            shape: 'square',
            diffuserType: 'exhaust',
            airflow: 200,
          });

          // --- Transfer grille: for pressure balancing in wet rooms ---
          const transferX = toRight ? cx - rw / 2 - GAP * 3 : cx + rw / 2 + GAP * 3;
          newDiffusers.push({
            id: `diffuser-auto-tg-${ts}-${rect.id}`,
            xPercent: clampLocalX(transferX),
            yPercent: clampLocalY(cy),
            sizePercent: DIFF_SIZE * 0.9,
            shape: 'square',
            diffuserType: 'transfer-grille',
            airflow: 150,
          });
        } // end wet-room exhaust (horizontal)
        } // end !isVertical

        else { // isVertical: portrait unit — ducts and HVAC items run vertically
          // Units in the lower half of the canvas extend downward (into the room space);
          // units in the upper half extend upward — avoids pushing into already-occupied areas.
          const spaceDown = 0.97 - (cy + rh / 2);
          const spaceUp   = (cy - rh / 2) - 0.03;
          const toDown = cy >= 0.5 ? spaceDown >= spaceUp * 0.4 : spaceDown >= spaceUp;

          // Shorter duct/flex for vertical to keep chain compact
          const vDUCT_LEN = DUCT_LEN * 0.75;
          const vFLEX_LEN = FLEX_LEN * 0.75;

          // Put the vertical chain inside the containing zone (if available) to
          // avoid crossing room walls in multi-flat layouts.
          const allZones = ann?.hvac?.zones || [];
          const containingZone = allZones.find((z) => (
            cx >= (z.xPercent || 0) &&
            cx <= (z.xPercent || 0) + (z.widthPercent || 0) &&
            cy >= (z.yPercent || 0) &&
            cy <= (z.yPercent || 0) + (z.heightPercent || 0)
          ));

          const zonePad = 0.01;
          const localLeft = containingZone
            ? (containingZone.xPercent || 0) + zonePad
            : 0.02;
          const localRight = containingZone
            ? (containingZone.xPercent || 0) + (containingZone.widthPercent || 0) - zonePad
            : 0.98;

          // CRITICAL FIX: Use actual bounding box for rotated rectangles
          // to prevent overflow into adjacent flats
          const bbox = getBoundingBox(rect);
          const actualLeft = bbox.minX;
          const actualRight = bbox.maxX;
          const actualHalfWidth = bbox.width / 2;

          // Put the vertical duct chain on the side with more local room, and keep
          // labels/secondary accessories on the opposite side to reduce crowding.
          // Use ACTUAL bounds instead of visual dimensions for rotated rects
          const spaceRight = localRight - actualRight;
          const spaceLeft  = actualLeft - localLeft;
          const chainSide = spaceLeft >= spaceRight ? -1 : 1; // -1=left, +1=right
          const openSide = -chainSide;
          const columnGap = Math.max(DIFF_SIZE * 1.15, DUCT_H * 2 + GAP * 6);
          
          // Use actual half-width for proper clearance of rotated rectangles
          const chainClearance = Math.max(actualHalfWidth + GAP * 6, columnGap * 0.7);
          const preferredChainCenterX = cx + chainSide * chainClearance;
          const minCenterX = localLeft + columnGap / 2;
          const maxCenterX = localRight - columnGap / 2;
          const chainCenterX = minCenterX <= maxCenterX
            ? Math.max(minCenterX, Math.min(maxCenterX, preferredChainCenterX))
            : Math.max(0.08, Math.min(0.92, preferredChainCenterX));
          const supplyColumnX = chainCenterX - columnGap / 2;
          const returnColumnX = chainCenterX + columnGap / 2;

          // Supply duct: vertical, narrow, centered on unit
          const sDuctWv = DUCT_H;
          const sDuctHv = vDUCT_LEN;
          const sDuctXv = supplyColumnX - sDuctWv / 2;
          const sDuctYv = toDown ? cy + rh / 2 + GAP : cy - rh / 2 - GAP - sDuctHv;
          newDucts.push({
            id: `duct-auto-s-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.92, sDuctXv)),
            yPercent: Math.max(0.02, Math.min(0.93, sDuctYv)),
            width: sDuctWv,
            height: sDuctHv,
            ductType: 'supply',
            fill: 'rgba(0,120,255,0.45)',
            stroke: '#0055CC',
          });

          // Return duct: vertical, offset to the right of supply
          const rDuctWv = DUCT_H;
          const rDuctHv = vDUCT_LEN;
          const rDuctXv = returnColumnX - rDuctWv / 2;
          const rDuctYv = sDuctYv;
          newDucts.push({
            id: `duct-auto-r-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.92, rDuctXv)),
            yPercent: Math.max(0.02, Math.min(0.93, rDuctYv)),
            width: rDuctWv,
            height: rDuctHv,
            ductType: 'return',
            fill: 'rgba(255,120,50,0.40)',
            stroke: '#CC4400',
          });

          // Flex supply: continues vertically beyond supply duct
          const sFlexWv = FLEX_H;
          const sFlexHv = vFLEX_LEN;
          const sFlexXv = sDuctXv + (sDuctWv - sFlexWv) / 2;
          const sFlexYv = toDown ? sDuctYv + sDuctHv + GAP : sDuctYv - GAP - sFlexHv;
          newDucts.push({
            id: `duct-auto-sf-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.93, sFlexXv)),
            yPercent: Math.max(0.02, Math.min(0.95, sFlexYv)),
            width: sFlexWv,
            height: sFlexHv,
            ductType: 'flex',
            fill: 'rgba(150,150,150,0.35)',
            stroke: '#888',
          });

          // Flex return: alongside supply flex
          const rFlexWv = FLEX_H;
          const rFlexHv = vFLEX_LEN;
          const rFlexXv = rDuctXv + (rDuctWv - rFlexWv) / 2;
          const rFlexYv = sFlexYv;
          newDucts.push({
            id: `duct-auto-rf-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.93, rFlexXv)),
            yPercent: Math.max(0.02, Math.min(0.95, rFlexYv)),
            width: rFlexWv,
            height: rFlexHv,
            ductType: 'flex',
            fill: 'rgba(150,150,150,0.35)',
            stroke: '#888',
          });

          // Supply diffuser (4-way): at far end of supply flex
          const sdYv = toDown
            ? sFlexYv + sFlexHv + GAP + DIFF_SIZE / 2
            : sFlexYv - GAP - DIFF_SIZE / 2;
          newDiffusers.push({
            id: `diffuser-auto-sd-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.98, supplyColumnX)),
            yPercent: Math.max(0.02, Math.min(0.98, sdYv)),
            sizePercent: DIFF_SIZE,
            shape: 'square',
            diffuserType: 'supply-4way',
            airflow: 400,
          });

          // Return grille: keep a clear margin from SD so RG/SD never combine
          // visually for rotated vertical units.
          const rgGapY = (toDown ? 1 : -1) * (DIFF_SIZE * 0.35 + GAP);
          const rgXv = returnColumnX;
          const rgYv = sdYv + rgGapY;
          newDiffusers.push({
            id: `diffuser-auto-rg-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.98, rgXv)),
            yPercent: Math.max(0.02, Math.min(0.98, rgYv)),
            sizePercent: DIFF_SIZE,
            shape: 'square',
            diffuserType: 'return-grille',
            airflow: 350,
          });

          // Volume damper: on supply duct midway
          newDampers.push({
            id: `damper-auto-vd-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.96, supplyColumnX)),
            yPercent: toDown ? sDuctYv + sDuctHv * 0.4 : sDuctYv + sDuctHv * 0.6,
            sizePercent: DAMP_SIZE,
            damperType: 'volume',
          });

          // Fire damper: at duct origin closest to unit
          newDampers.push({
            id: `damper-auto-fd-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.96, supplyColumnX)),
            yPercent: toDown ? sDuctYv + 0.002 : sDuctYv + sDuctHv - 0.002,
            sizePercent: DAMP_SIZE,
            damperType: 'fire',
          });

          // Thermostat: place on the open side (reuses openSide computed above)
          // Use actual bounds to avoid crossing into adjacent flats
          const thermXv = openSide === 1
            ? actualRight + GAP + THERM_SIZE
            : actualLeft - GAP - THERM_SIZE;
          const rectCommentV = comments.find((c) => String(c.rectId) === String(rect.id));
          let thermLabelV = 'T';
          if (rectCommentV) {
            const acMatchV = rectCommentV.text.match(/ac-(\d+(?:\.\d+)?)/i);
            if (acMatchV) thermLabelV = `T${acMatchV[1]}`;
          }
          newThermostats.push({
            id: `thermo-auto-${ts}-${rect.id}`,
            xPercent: Math.max(0.04, Math.min(0.94, thermXv)),
            yPercent: cy,
            sizePercent: THERM_SIZE,
            label: thermLabelV,
          });

          // Drain: on the open horizontal side of the unit, use actual bounds
          newDiffusers.push({
            id: `diffuser-auto-drain-${ts}-${rect.id}`,
            xPercent: Math.max(0.03, Math.min(0.95, cx + openSide * (actualHalfWidth + GAP * 3))),
            yPercent: Math.max(0.03, Math.min(0.95, cy)),
            sizePercent: DIFF_SIZE * 0.7,
            shape: 'drain',
            diffuserType: 'drain-point',
            airflow: 0,
          });

          // Jet diffuser: along the duct axis beyond the diffuser, not sideways
          const jetY = toDown
            ? sdYv + DIFF_SIZE + GAP * 3
            : sdYv - DIFF_SIZE - GAP * 3;
          newDiffusers.push({
            id: `diffuser-auto-jet-${ts}-${rect.id}`,
            xPercent: Math.max(0.03, Math.min(0.95, chainCenterX)),
            yPercent: Math.max(0.03, Math.min(0.95, jetY)),
            sizePercent: DIFF_SIZE * 0.85,
            shape: 'jet',
            diffuserType: 'jet',
            airflow: 500,
          });

          // Wall diffuser: on the open horizontal side, use actual bounds
          newDiffusers.push({
            id: `diffuser-auto-wall-${ts}-${rect.id}`,
            xPercent: Math.max(0.03, Math.min(0.95, cx + openSide * (actualHalfWidth + GAP * 5))),
            yPercent: Math.max(0.03, Math.min(0.95, cy + (toDown ? rh / 4 : -rh / 4))),
            sizePercent: DIFF_SIZE * 0.9,
            shape: 'wall',
            diffuserType: 'wall-diffuser',
            airflow: 300,
          });

          // Insulated duct: vertical stub — placed on whichever side has more canvas space
          const insDuctWv = DUCT_H * 0.6;
          const insDuctHv = DUCT_LEN * 0.5;
          const insSpaceLeft  = chainCenterX - actualHalfWidth;
          const insSpaceRight = 1 - (chainCenterX + actualHalfWidth);
          const insOnRight = insSpaceRight > insSpaceLeft;
          const insDuctXv = insOnRight
            ? chainCenterX + actualHalfWidth + GAP
            : chainCenterX - actualHalfWidth - GAP - insDuctWv;
          newDucts.push({
            id: `duct-auto-ins-${ts}-${rect.id}`,
            xPercent: Math.max(0.02, Math.min(0.92, insDuctXv)),
            yPercent: Math.max(0.02, Math.min(0.92, cy - insDuctHv / 2)),
            width: insDuctWv,
            height: insDuctHv,
            ductType: 'insulated',
            fill: 'rgba(255,180,50,0.45)',
            stroke: '#CC9900',
          });

          // Exhaust grille: if linked comment suggests a wet room
          const linkedCommentV = comments.find((c) => String(c.rectId) === String(rect.id));
          if (linkedCommentV && WET_ROOM_RE.test(linkedCommentV.text)) {
            const exhDuctX2 = actualLeft - GAP - DUCT_LEN * 0.7;
            const exhDuctY2 = toDown ? cy + rh / 2 + GAP : cy - rh / 2 - GAP - DUCT_H;
            newDucts.push({
              id: `duct-auto-exh-${ts}-${rect.id}`,
              xPercent: Math.max(0.01, Math.min(0.89, exhDuctX2)),
              yPercent: Math.max(0.01, Math.min(0.95, exhDuctY2)),
              width: DUCT_LEN * 0.7,
              height: DUCT_H,
              ductType: 'exhaust',
              fill: 'rgba(34,180,34,0.40)',
              stroke: '#228B22',
            });
            const exhY2 = toDown
              ? exhDuctY2 + DUCT_H + GAP + DIFF_SIZE
              : exhDuctY2 - GAP - DIFF_SIZE;
            newDiffusers.push({
              id: `diffuser-auto-exh-${ts}-${rect.id}`,
              xPercent: Math.max(0.02, Math.min(0.98, exhDuctX2 + DUCT_LEN * 0.35)),
              yPercent: Math.max(0.02, Math.min(0.98, exhY2)),
              sizePercent: DIFF_SIZE,
              shape: 'square',
              diffuserType: 'exhaust',
              airflow: 200,
            });
            newDiffusers.push({
              id: `diffuser-auto-tg-${ts}-${rect.id}`,
              xPercent: Math.max(0.02, Math.min(0.98, actualLeft - GAP * 3)),
              yPercent: cy,
              sizePercent: DIFF_SIZE * 0.9,
              shape: 'square',
              diffuserType: 'transfer-grille',
              airflow: 150,
            });
          }
        } // end isVertical
      });
    };

    // Process grouped flats (each flat has its own center)
    flatGroups.forEach((rectGroup, flatNum) => {
      const groupAvgX = computeAvgX(rectGroup);
      const groupAvgY = computeAvgY(rectGroup);
      processRectGroup(rectGroup, groupAvgX, groupAvgY);
    });

    // Process ungrouped rectangles (fallback: use their own center)
    if (ungroupedRects.length > 0) {
      const ungroupedAvgX = computeAvgX(ungroupedRects);
      const ungroupedAvgY = computeAvgY(ungroupedRects);
      processRectGroup(ungroupedRects, ungroupedAvgX, ungroupedAvgY);
    }

    // Preserve all existing zones and normalize styling/labels so they always
    // render with visible color and title after Auto Place.
    const existingZones = (annotation?.annotations?.hvac?.zones || []).map((zone, idx) => {
      const fallbackZoneNumber = zone?.zoneNumber ?? (idx + 1);
      const paletteIndex = (Number(fallbackZoneNumber) - 1 + zoneColorPalette.length) % zoneColorPalette.length;
      const fallbackColors = zoneColorPalette[Number.isFinite(paletteIndex) ? paletteIndex : 0];
      const label =
        zone?.zoneLabel !== undefined && zone?.zoneLabel !== null && String(zone.zoneLabel).trim() !== ""
          ? String(zone.zoneLabel)
          : String(fallbackZoneNumber);

      return {
        ...zone,
        zoneNumber: fallbackZoneNumber,
        zoneLabel: label,
        fill: zone?.fill || fallbackColors.fill,
        stroke: zone?.stroke || fallbackColors.stroke,
      };
    });

    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ...(prev.annotations?.hvac || {}),
          zones: [...existingZones],
          ducts: [...newDucts],
          diffusers: [...newDiffusers],
          dampers: [...newDampers],
          thermostats: [...newThermostats],
        },
      },
    }));
    setShowHVAC(true);
    toast.success(
      `Auto-placed: ${newDucts.length} ducts, ${newDiffusers.length} diffusers,\n${newDampers.length} dampers, ${newThermostats.length} thermostats`,
      { autoClose: 5000 }
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
        overlayAnnotations(overlayCtx, annotation.annotations, mode, { pdfScale: scale });
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
            mode,
            scale
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
        drawCanvasLegend(overlayCtx, mode, { pdfScale: scale });

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
      formData.append("status", reviewStatus);
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
              style={{ color: '#fff' }}
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
                  <Dropdown.Item onClick={handleToggleDrawZone}>
                    {isDrawingZone ? '🔲 Stop Drawing' : '🖊 Draw Zone'}
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => {handleDeleteAllZones();}} className="text-danger">
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
                  onClick={handleToggleDrawZone}
                  title="Draw HVAC zones manually by dragging on the canvas"
                >
                  {isDrawingZone ? '🔲 Stop Drawing' : '🖊 Draw Zone'}
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={handleDeleteAllZones}
                  title="Delete all manually drawn zones"
                >
                  🗑 Delete All Zones ({(annotation?.annotations?.hvac?.zones || []).length})
                </Button>
                {selectedZoneIndex !== null && selectedZoneIndex !== -1 && (
                  <>
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
                {addMode === 'comment' ? 'Comment' : 'Add'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item active={addMode === "comment"} onClick={() => setAddMode(addMode === "comment" ? null : "comment")}>
                  Add Comment
                </Dropdown.Item>
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Form.Select
                size="sm"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                <option value="reviewed">📋 Reviewed</option>
                <option value="approved">✅ Approved</option>
                <option value="rejected">❌ Rejected</option>
                <option value="pending">⏳ Pending</option>
              </Form.Select>
              <Button
                variant="success"
                size="sm"
                className="w-auto"
                onClick={handleSaveToMongoDB}
                disabled={saveLoading || loading || !pdfFile || !annotation}
              >
                {saveLoading ? "Saving..." : loading ? "Loading PDF..." : "💾 Save Engineer Review"}
              </Button>
            </div>
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