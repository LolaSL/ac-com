import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { Spinner, Alert, Button } from "react-bootstrap";
import { Store } from "../Store.js";
import { PDFDocument } from "pdf-lib";
import { overlayVRFSystem, overlayHVAC, overlayAnnotations, hvacSymbols } from "../utils/annotationUtils.js";
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
  const [addMode, setAddMode] = useState(null); // 'duct' | 'diffuser' | 'indoor' | 'outdoor' | null
  const [acType, setAcType] = useState("vrf-ducted"); // 'vrf-ducted' | 'vrf-ductless'
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const pdfContainerRef = useRef(null);

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
        setAcType(data.acType || "ducted");
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
      const scale = 1.5;
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
      overlayAnnotations(overlayContext, annotation.annotations, acType);
      if (showHVAC && annotation.annotations.hvac && (acType === "ducted" || acType === "vrf-ducted")) {
        overlayHVAC(
          overlayContext,
          annotation.annotations.hvac,
          hvacSymbols,
          annotation.annotations.comments,
          acType
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
      // Add click handler for interactive placement
      overlayCanvas.onclick = (e) => {
        if (!addMode) {
          e.stopPropagation();
          return;
        }

        const rect = overlayCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / overlayCanvas.width;
        const y = (e.clientY - rect.top) / overlayCanvas.height;

        if (addMode === "duct") {
          const newDuct = {
            id: `duct-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            width: 0.08,
            height: 0.025,
            fill: "rgba(0,120,255,0.3)",
            stroke: "blue",
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [] }),
                ducts: [...(prev.annotations?.hvac?.ducts || []), newDuct],
                diffusers: prev.annotations?.hvac?.diffusers || [],
              },
            },
          }));
        }

        if (addMode === "diffuser") {
          const newDiffuser = {
            id: `diffuser-${Date.now()}`,
            xPercent: x,
            yPercent: y,
            sizePercent: 0.08,
            shape: "circle",
            airflow: 100,
          };

          setAnnotation((prev) => ({
            ...prev,
            annotations: {
              ...(prev.annotations || {}),
              hvac: {
                ...(prev.annotations?.hvac || { ducts: [], diffusers: [] }),
                ducts: prev.annotations?.hvac?.ducts || [],
                diffusers: [
                  ...(prev.annotations?.hvac?.diffusers || []),
                  newDiffuser,
                ],
              },
            },
          }));
        }

        if (addMode === "comment") {
          const text = prompt("Enter comment text:");
          if (text) {
            const newComment = {
              id: `comment-${Date.now()}`,
              xPercent: x,
              yPercent: y,
              text: text,
              fill: "rgba(252, 252, 243, 0.2)",
              textColor: "#FF1493",
              acType: acType, // Store which mode this comment was created in
            };

            setAnnotation((prev) => ({
              ...prev,
              annotations: {
                ...(prev.annotations || {}),
                comments: [...(prev.annotations?.comments || []), newComment],
              },
            }));
          }
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
            alert(
              "No rectangle near click — try clicking closer to a rectangle."
            );
          }
        }

        setAddMode(null);
      };
    };
    renderOverlays();
  }, [pdfFile, annotation, showHVAC, addMode, acType]);

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
    alert("Annotation (including HVAC) saved!");
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
      <div
        className="mb-4 p-3 border rounded"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <strong className="d-block mb-2">
          📋 Refrigerant Line Types (Current Mode:{" "}
          {acType === "vrf-ducted"
            ? "VRF System - Ducted"
            : "VRF System - Ductless"}
          )
        </strong>
        {acType === "ducted" && (
          <div className="d-flex flex-wrap gap-3 flex-column">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  backgroundColor: "blue",
                  position: "relative",
                  top: "2px",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Blue Dashed: Refrigerant Lines (Star Topology - Each AC unit
                directly to Condenser)
              </span>
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  position: "relative",
                  top: "2px",
                  borderTop: "2px dashed grey",
                  backgroundColor: "transparent",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Grey Dashed: Ducts & Diffusers
              </span>
            </span>
          </div>
        )}
        {acType === "ductless" && (
          <div className="d-flex flex-wrap gap-3">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  position: "relative",
                  top: "2px",
                  borderTop: "2px dotted blue",
                  backgroundColor: "transparent",
                }}
              />
              <span style={{ marginLeft: "8px" }}>
                Blue Dotted: Refrigerant Lines (Star Topology - Each AC unit to
                nearest Condenser)
              </span>
            </span>
          </div>
        )}
        {acType === "vrf-ducted" && (
          <div>
            <div className="d-flex flex-wrap gap-3 mb-2">
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: "40px",
                    height: "2px",
                    backgroundColor: "red",
                    position: "relative",
                    top: "2px",
                    borderTop: "2px dashed red",
                  }}
                />
                <span style={{ marginLeft: "8px", color: "red" }}>
                  Red Dashed: Supply Line (Sequential Chain)
                </span>
              </span>
            </div>
            <div className="d-flex flex-wrap gap-3">
              <span>
                <span
                  style={{
                    display: "inline-block",
                    width: "40px",
                    height: "2px",
                    backgroundColor: "#0066FF",
                    position: "relative",
                    top: "2px",
                    borderTop: "2px dashed #0066FF",
                  }}
                />
                <span style={{ marginLeft: "8px", color: "#0066FF" }}>
                  Blue Dashed: Return Line (Sequential Chain)
                </span>
              </span>
            </div>
          </div>
        )}
        {acType === "vrf-ductless" && (
          <div className="d-flex flex-wrap gap-3">
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: "40px",
                  height: "2px",
                  backgroundColor: "#008B8B",
                  position: "relative",
                  top: "2px",
                }}
              />
              <span style={{ marginLeft: "8px", color: "#008B8B" }}>
                Teal Solid: Refrigerant Lines (Star Topology - Each AC unit to
                Condenser)
              </span>
            </span>
          </div>
        )}
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
            {showHVAC && acType === "ducted" && (
              <div className="mb-2">
                <strong>Legend (Minisplit HVAC):</strong>
                <span className="ms-2" style={{ color: "blue" }}>
                  ■ Ducts (Blue)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
              </div>
            )}
            {showHVAC && acType === "vrf-ducted" && (
              <div className="mb-2">
                <strong>Legend (VRF HVAC):</strong>
                <span className="ms-2" style={{ color: "blue" }}>
                  ■ Ducts (Blue)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
              </div>
            )}
          </>
        )}
        {acType === "vrf-ductless" && (
          <div className="mb-2">
            <strong>Legend (VRF Ductless):</strong>
            <span className="ms-2" style={{ color: "#008B8B" }}>
              — Teal Lines: Refrigerant Connections
            </span>
          </div>
        )}
      </div>
      <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          {(acType === "ducted" || acType === "vrf-ducted") && (
            <>
              <Button
                onClick={() => setAddMode("duct")}
                variant="info"
                className="me-2"
              >
                Add Duct
              </Button>
              <Button
                onClick={() => setAddMode("diffuser")}
                variant="success"
                className="me-2"
              >
                Add Diffuser
              </Button>
              <Button
                onClick={() => setAddMode("comment")}
                variant="warning"
                className="me-2"
              >
                Add Comment
              </Button>
            </>
          )}
          {acType === "vrf-ductless" && (
            <>
              <Button
                onClick={() => setAddMode("comment")}
                variant="warning"
                className="me-2"
              >
                Add Comment
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAnnotation((prev) => {
                    let allItems = [];

                    // Handle VRF units
                    if (prev?.annotations?.vrf) {
                      const outdoorUnits = [
                        ...(prev.annotations.vrf.outdoorUnits || []),
                      ];
                      const indoorUnits = [
                        ...(prev.annotations.vrf.indoorUnits || []),
                      ];
                      allItems.push(
                        ...outdoorUnits.map((d) => ({
                          ...d,
                          type: "outdoor",
                          subType: "vrf",
                        })),
                        ...indoorUnits.map((d) => ({
                          ...d,
                          type: "indoor",
                          subType: "vrf",
                        }))
                      );
                    }

                    // Handle comments
                    if (prev?.annotations?.comments) {
                      const comments = [...(prev.annotations.comments || [])];
                      allItems.push(
                        ...comments.map((c) => ({
                          ...c,
                          type: "comment",
                          subType: "annotation",
                        }))
                      );
                    }

                    if (allItems.length === 0) return prev;

                    const mostRecent = allItems.reduce((max, item) => {
                      const maxTime = parseInt(max.id.split("-")[1]);
                      const itemTime = parseInt(item.id.split("-")[1]);
                      return itemTime > maxTime ? item : max;
                    });

                    // Remove comments
                    if (mostRecent.subType === "annotation") {
                      return {
                        ...prev,
                        annotations: {
                          ...(prev.annotations || {}),
                          comments: (prev.annotations?.comments || []).filter(
                            (c) => c.id !== mostRecent.id
                          ),
                        },
                      };
                    }

                    // Remove VRF units
                    if (mostRecent.subType === "vrf") {
                      const vrf = { ...prev.annotations.vrf };
                      if (mostRecent.type === "outdoor") {
                        vrf.outdoorUnits = vrf.outdoorUnits.filter(
                          (d) => d.id !== mostRecent.id
                        );
                      }
                      if (mostRecent.type === "indoor") {
                        vrf.indoorUnits = vrf.indoorUnits.filter(
                          (d) => d.id !== mostRecent.id
                        );
                      }
                      return {
                        ...prev,
                        annotations: {
                          ...(prev.annotations || {}),
                          vrf,
                        },
                      };
                    }

                    return prev;
                  });

                  setAddMode(null);
                }}
              >
                Undo Last
              </Button>
            </>
          )}
          {acType === "ductless" && (
            <p className="text-muted">
              Ductless system: No ducts or diffusers needed. Use separate units
              per room.
            </p>
          )}
          {(acType === "ducted" || acType === "vrf-ducted") && (
            <Button
              variant="secondary"
              onClick={() => {
                setAnnotation((prev) => {
                  let allItems = [];

                  // Handle VRF ducts and diffusers
                  if (prev?.annotations?.hvac) {
                    const ducts = [...(prev.annotations.hvac.ducts || [])];
                    const diffusers = [
                      ...(prev.annotations.hvac.diffusers || []),
                    ];
                    allItems.push(
                      ...ducts.map((d) => ({
                        ...d,
                        type: "duct",
                        subType: "hvac",
                      })),
                      ...diffusers.map((d) => ({
                        ...d,
                        type: "diffuser",
                        subType: "hvac",
                      }))
                    );
                  }

                  // Handle VRF units
                  if (prev?.annotations?.vrf && acType.startsWith("vrf")) {
                    const outdoorUnits = [
                      ...(prev.annotations.vrf.outdoorUnits || []),
                    ];
                    const indoorUnits = [
                      ...(prev.annotations.vrf.indoorUnits || []),
                    ];
                    allItems.push(
                      ...outdoorUnits.map((d) => ({
                        ...d,
                        type: "outdoor",
                        subType: "vrf",
                      })),
                      ...indoorUnits.map((d) => ({
                        ...d,
                        type: "indoor",
                        subType: "vrf",
                      }))
                    );
                  }

                  // Handle comments
                  if (prev?.annotations?.comments) {
                    const comments = [...(prev.annotations.comments || [])];
                    allItems.push(
                      ...comments.map((c) => ({
                        ...c,
                        type: "comment",
                        subType: "annotation",
                      }))
                    );
                  }

                  if (allItems.length === 0) return prev;

                  const mostRecent = allItems.reduce((max, item) => {
                    const maxTime = parseInt(max.id.split("-")[1]);
                    const itemTime = parseInt(item.id.split("-")[1]);
                    return itemTime > maxTime ? item : max;
                  });

                  // Remove comments
                  if (mostRecent.subType === "annotation") {
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        comments: (prev.annotations?.comments || []).filter(
                          (c) => c.id !== mostRecent.id
                        ),
                      },
                    };
                  }

                  // Remove minisplit ducts/diffusers
                  if (mostRecent.subType === "hvac") {
                    const hvac = { ...prev.annotations.hvac };
                    if (mostRecent.type === "duct") {
                      hvac.ducts = hvac.ducts.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    if (mostRecent.type === "diffuser") {
                      hvac.diffusers = hvac.diffusers.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        hvac,
                      },
                    };
                  }

                  // Remove VRF units
                  if (mostRecent.subType === "vrf") {
                    const vrf = { ...prev.annotations.vrf };
                    if (mostRecent.type === "outdoor") {
                      vrf.outdoorUnits = vrf.outdoorUnits.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    if (mostRecent.type === "indoor") {
                      vrf.indoorUnits = vrf.indoorUnits.filter(
                        (d) => d.id !== mostRecent.id
                      );
                    }
                    return {
                      ...prev,
                      annotations: {
                        ...(prev.annotations || {}),
                        vrf,
                      },
                    };
                  }

                  return prev;
                });

                setAddMode(null);
              }}
            >
              Undo Last
            </Button>
          )}

          <Button onClick={handleSave} variant="primary" className="me-2">
            Save HVAC Items
          </Button>
        </div>

        <div className="pdf-scroll-wrapper">
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
      </div>
    </div>
  );
};

export default EngineerViewPage;
