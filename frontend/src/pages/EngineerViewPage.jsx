import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { Spinner, Alert, Button, Form } from "react-bootstrap";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import { PDFDocument } from "pdf-lib";
import { overlayVRFSystem, overlayHVAC, overlayAnnotations, hvacSymbols, drawCanvasLegend } from "../utils/annotationUtils.js";
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

  // Mobile-friendly comment modal state (replaces window.prompt)
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [pendingCommentPos, setPendingCommentPos] = useState(null);

  // PDF zoom scale
  const [pdfScale, setPdfScale] = useState(1.5);

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
        console.log("Fetched annotation data:", data);
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
      overlayCanvas.style.pointerEvents = addMode ? "auto" : "none";
      container.style.position = "relative";
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
      drawCanvasLegend(overlayContext, acType);
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
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: prev.annotations?.hvac?.dampers || [],
              },
            },
          }));
        }

        if (addMode === "supply-duct" || addMode === "return-duct" || addMode === "flex-duct") {
          const ductTypeMap = {
            "supply-duct": { ductType: "supply", fill: "rgba(0,85,204,0.15)", stroke: "#0055CC" },
            "return-duct": { ductType: "return", fill: "rgba(204,68,0,0.15)", stroke: "#CC4400" },
            "flex-duct":   { ductType: "flex",   fill: "rgba(150,150,150,0.1)", stroke: "#888" },
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
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: prev.annotations?.hvac?.dampers || [],
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
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
                dampers: prev.annotations?.hvac?.dampers || [],
              },
            },
          }));
        }

        if (addMode === "supply-4way" || addMode === "round-diffuser" || addMode === "linear-slot" || addMode === "return-grille" || addMode === "exhaust-grille") {
          const diffuserMap = {
            "supply-4way":     { diffuserType: "supply-4way",   shape: "square", airflow: 400 },
            "round-diffuser":  { diffuserType: "round",         shape: "circle", airflow: 250 },
            "linear-slot":     { diffuserType: "linear-slot",   shape: "linear", airflow: 300 },
            "return-grille":   { diffuserType: "return-grille", shape: "square", airflow: 350 },
            "exhaust-grille":  { diffuserType: "exhaust",       shape: "square", airflow: 200 },
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
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
                dampers: prev.annotations?.hvac?.dampers || [],
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
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [], dampers: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: prev.annotations?.hvac?.diffusers || [],
                dampers: [...(prev.annotations?.hvac?.dampers || []), newDamper],
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
      overlayCanvas.onclick = handleOverlayInteraction;
      overlayCanvas.ontouchend = (e) => {
        e.preventDefault(); // Prevent ghost click
        handleOverlayInteraction(e);
      };
    };
    renderOverlays();
  }, [pdfFile, annotation, showHVAC, addMode, acType, pdfScale]);

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

  // Auto-place ducts, diffusers, accessories near every indoor unit rectangle
  const handleAutoPlaceDucts = () => {
    const ann = annotation?.annotations;
    if (!ann) return;

    // Gather indoor-unit rectangles (non-condenser user rects)
    const rects = (ann.rectangles || []).filter((r) => !r.isCondenser);
    if (rects.length === 0) {
      toast.warn('No indoor unit rectangles found. Draw blue rects first.');
      return;
    }

    const newDucts = [];
    const newDiffusers = [];
    const newDampers = [];
    const newThermostats = [];
    const ts = Date.now();

    // Compute floor-plan centre from all rects to decide duct direction
    const avgX = rects.reduce((s, r) => s + r.xPercent, 0) / rects.length;

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
    const comments = ann.comments || [];

    rects.forEach((rect, i) => {
      const cx = rect.xPercent;
      const cy = rect.yPercent;
      const rw = rect.widthPercent || 0.06;
      const rh = rect.heightPercent || 0.04;

      // Pick horizontal direction: extend ducts toward the centre of the layout
      const toRight = cx <= avgX;

      // --- Supply duct: offset from unit in chosen direction ---
      const sDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
      const sDuctY = cy - DUCT_H - 0.003;
      newDucts.push({
        id: `duct-auto-s-${ts}-${i}`,
        xPercent: Math.max(0.01, Math.min(0.89, sDuctX)),
        yPercent: Math.max(0.01, Math.min(0.95, sDuctY)),
        width: DUCT_LEN,
        height: DUCT_H,
        ductType: 'supply',
        fill: 'rgba(0,85,204,0.15)',
        stroke: '#0055CC',
      });

      // --- Return duct: same direction, stacked below the unit ---
      const rDuctX = toRight ? cx + rw / 2 + GAP : cx - rw / 2 - GAP - DUCT_LEN;
      const rDuctY = cy + 0.003;
      newDucts.push({
        id: `duct-auto-r-${ts}-${i}`,
        xPercent: Math.max(0.01, Math.min(0.89, rDuctX)),
        yPercent: Math.max(0.01, Math.min(0.95, rDuctY)),
        width: DUCT_LEN,
        height: DUCT_H,
        ductType: 'return',
        fill: 'rgba(204,68,0,0.15)',
        stroke: '#CC4400',
      });

      // --- Flex duct connectors (between main duct end and diffuser) ---
      const sFlexX = toRight ? sDuctX + DUCT_LEN + GAP : sDuctX - GAP - FLEX_LEN;
      newDucts.push({
        id: `duct-auto-sf-${ts}-${i}`,
        xPercent: Math.max(0.01, Math.min(0.92, sFlexX)),
        yPercent: Math.max(0.01, Math.min(0.95, sDuctY + (DUCT_H - FLEX_H) / 2)),
        width: FLEX_LEN,
        height: FLEX_H,
        ductType: 'flex',
        fill: 'rgba(150,150,150,0.1)',
        stroke: '#888',
      });

      const rFlexX = toRight ? rDuctX + DUCT_LEN + GAP : rDuctX - GAP - FLEX_LEN;
      newDucts.push({
        id: `duct-auto-rf-${ts}-${i}`,
        xPercent: Math.max(0.01, Math.min(0.92, rFlexX)),
        yPercent: Math.max(0.01, Math.min(0.95, rDuctY + (DUCT_H - FLEX_H) / 2)),
        width: FLEX_LEN,
        height: FLEX_H,
        ductType: 'flex',
        fill: 'rgba(150,150,150,0.1)',
        stroke: '#888',
      });

      // --- Supply diffuser (4-way) at the far end of flex duct ---
      const sdX = toRight
        ? sFlexX + FLEX_LEN + GAP + DIFF_SIZE / 2
        : sFlexX - GAP - DIFF_SIZE / 2;
      newDiffusers.push({
        id: `diffuser-auto-sd-${ts}-${i}`,
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
        id: `diffuser-auto-rg-${ts}-${i}`,
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
        id: `damper-auto-vd-${ts}-${i}`,
        xPercent: vdX,
        yPercent: sDuctY - 0.012,
        sizePercent: DAMP_SIZE,
        damperType: 'volume',
      });

      // --- Fire damper at duct origin (where duct exits the unit / crosses wall) ---
      const fdX = toRight ? sDuctX + 0.002 : sDuctX + DUCT_LEN - 0.002;
      newDampers.push({
        id: `damper-auto-fd-${ts}-${i}`,
        xPercent: fdX,
        yPercent: sDuctY + DUCT_H / 2,
        sizePercent: DAMP_SIZE,
        damperType: 'fire',
      });

      // --- Thermostat: placed to the side of the indoor unit (opposite to ducts) ---
      const thermX = toRight
        ? cx - rw / 2 - GAP - THERM_SIZE
        : cx + rw / 2 + GAP + THERM_SIZE;
      newThermostats.push({
        id: `thermo-auto-${ts}-${i}`,
        xPercent: Math.max(0.02, Math.min(0.98, thermX)),
        yPercent: cy,
        sizePercent: THERM_SIZE,
        label: `T${i + 1}`,
      });

      // --- Exhaust grille: if nearest comment suggests a wet room ---
      const nearestComment = comments.reduce((best, c) => {
        const dist = Math.sqrt((c.xPercent - cx) ** 2 + (c.yPercent - cy) ** 2);
        return dist < (best.dist || Infinity) ? { ...c, dist } : best;
      }, {});
      if (nearestComment.text && WET_ROOM_RE.test(nearestComment.text)) {
        const exhY = cy + rh / 2 + GAP + DIFF_SIZE;
        newDiffusers.push({
          id: `diffuser-auto-exh-${ts}-${i}`,
          xPercent: cx,
          yPercent: Math.max(0.02, Math.min(0.98, exhY)),
          sizePercent: DIFF_SIZE,
          shape: 'square',
          diffuserType: 'exhaust',
          airflow: 200,
        });
      }
    });

    setAnnotation((prev) => ({
      ...prev,
      annotations: {
        ...(prev.annotations || {}),
        hvac: {
          ...(prev.annotations?.hvac || {}),
          ducts: [...(prev.annotations?.hvac?.ducts || []), ...newDucts],
          diffusers: [...(prev.annotations?.hvac?.diffusers || []), ...newDiffusers],
          dampers: [...(prev.annotations?.hvac?.dampers || []), ...newDampers],
          thermostats: [...(prev.annotations?.hvac?.thermostats || []), ...newThermostats],
        },
      },
    }));
    setShowHVAC(true);
    toast.success(
      `Auto-placed ${newDucts.length} ducts, ${newDiffusers.length} diffusers/grilles, ${newDampers.length} dampers & ${newThermostats.length} thermostats for ${rects.length} units`
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
            hvacSymbols,
            annotation.annotations.comments,
            mode
          );
        }
        if (annotation.annotations.vrf && mode.startsWith("vrf")) {
          overlayVRFSystem(
            overlayCtx,
            annotation.annotations.vrf,
            hvacSymbols,
            mode
          );
        }

        // Draw legend on the overlay
        drawCanvasLegend(overlayCtx, mode);

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

      {/* Refrigerant Lines Legend - Always Visible */}
      <div className="ev-legend-panel">
        <strong className="d-block mb-2">
          📋 Mechanical Drawing Legend — {acType === "vrf-ducted" ? "VRF Ducted" : "VRF Ductless"}
        </strong>

        {/* Ductwork Legend (ducted modes) */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-legend-section">
            <div className="ev-legend-title">Ductwork</div>
            <div className="ev-legend-items">
              <span className="ev-legend-item">
                <span className="ev-legend-line" style={{ borderTop: "3px solid #0055CC" }}></span>
                <span>Supply Duct (SA)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-line" style={{ borderTop: "3px dashed #CC4400" }}></span>
                <span>Return Duct (RA)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-line ev-legend-wavy" style={{ borderTop: "2px dotted #888" }}></span>
                <span>Flex Duct (FD)</span>
              </span>
            </div>
          </div>
        )}

        {/* Diffusers & Grilles Legend */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-legend-section">
            <div className="ev-legend-title">Diffusers & Grilles</div>
            <div className="ev-legend-items">
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #0055CC", width: 16, height: 16 }}>✕</span>
                <span>Supply Diffuser 4-Way (SD)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #0055CC", borderRadius: "50%", width: 16, height: 16 }}></span>
                <span>Round Diffuser (SD)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #0055CC", width: 28, height: 10, borderRadius: 0 }}></span>
                <span>Linear Slot Diffuser (LD)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #CC4400", width: 16, height: 16 }}>≡</span>
                <span>Return Grille (RG)</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #228B22", width: 16, height: 16, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(34,139,34,0.3) 2px, rgba(34,139,34,0.3) 4px)" }}></span>
                <span>Exhaust Grille (EG)</span>
              </span>
            </div>
          </div>
        )}

        {/* Dampers Legend */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-legend-section">
            <div className="ev-legend-title">Accessories</div>
            <div className="ev-legend-items">
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #CC0000", width: 16, height: 16, transform: "rotate(45deg)", fontSize: "7px", lineHeight: "12px" }}>FD</span>
                <span>Fire Damper</span>
              </span>
              <span className="ev-legend-item">
                <span className="ev-legend-symbol" style={{ border: "2px solid #555", width: 16, height: 16, borderRadius: "50%", fontSize: "7px", lineHeight: "12px" }}>VD</span>
                <span>Volume Damper</span>
              </span>
            </div>
          </div>
        )}

        {/* Refrigerant Lines */}
        <div className="ev-legend-section">
          <div className="ev-legend-title">Refrigerant Lines</div>
          <div className="ev-legend-items">
            {acType === "vrf-ducted" && (
              <>
                <span className="ev-legend-item">
                  <span className="ev-legend-line" style={{ borderTop: "2px dashed red" }}></span>
                  <span style={{ color: "red" }}>Supply Line (Sequential Chain)</span>
                </span>
                <span className="ev-legend-item">
                  <span className="ev-legend-line" style={{ borderTop: "2px dashed #0066FF" }}></span>
                  <span style={{ color: "#0066FF" }}>Return Line (Sequential Chain)</span>
                </span>
              </>
            )}
            {acType === "vrf-ductless" && (
              <span className="ev-legend-item">
                <span className="ev-legend-line" style={{ borderTop: "2.5px solid #008B8B" }}></span>
                <span style={{ color: "#008B8B" }}>Refrigerant Lines (Star Topology)</span>
              </span>
            )}
            {acType === "ducted" && (
              <>
                <span className="ev-legend-item">
                  <span className="ev-legend-line" style={{ borderTop: "2px dashed blue" }}></span>
                  <span>Refrigerant Lines (Star Topology)</span>
                </span>
                <span className="ev-legend-item">
                  <span className="ev-legend-line" style={{ borderTop: "2px dashed grey" }}></span>
                  <span>Duct Branches</span>
                </span>
              </>
            )}
          </div>
        </div>
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
              </div>
            </div>

            {/* Diffusers & Grilles Section */}
            <div className="ev-toolbar-group">
              <span className="ev-toolbar-label">Diffusers & Grilles</span>
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
                  variant={addMode === "return-grille" ? "warning" : "outline-warning"}
                  onClick={() => setAddMode(addMode === "return-grille" ? null : "return-grille")}
                  title="Return Air Grille"
                >
                  Return Grille
                </Button>
                <Button
                  size="sm"
                  variant={addMode === "exhaust-grille" ? "success" : "outline-success"}
                  onClick={() => setAddMode(addMode === "exhaust-grille" ? null : "exhaust-grille")}
                  title="Exhaust Air Grille"
                >
                  Exhaust
                </Button>
              </div>
            </div>

            {/* Accessories Section */}
            <div className="ev-toolbar-group">
              <span className="ev-toolbar-label">Accessories</span>
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
            </div>
          </>
        )}

        {/* Auto-placement */}
        {(acType === "ducted" || acType === "vrf-ducted") && (
          <div className="ev-toolbar-group">
            <span className="ev-toolbar-label">Auto Layout</span>
            <div className="ev-toolbar-btns">
              <Button
                size="sm"
                variant="outline-info"
                onClick={handleAutoPlaceDucts}
                title="Auto-generate ducts, diffusers, grilles, dampers & thermostats for every indoor unit"
              >
                🔧 Auto-Place HVAC
              </Button>
            </div>
          </div>
        )}

        {/* Comment (all modes) */}
        <div className="ev-toolbar-group">
          <span className="ev-toolbar-label">Annotations</span>
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
