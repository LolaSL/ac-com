import { useEffect, useState, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { Spinner, Alert, Button } from "react-bootstrap";
import { Store } from "../Store.js";
import SaveAsPDF from "../components/SaveAsPDF.jsx";
import { overlayVRFSystem, overlayHVAC, overlayAnnotations, hvacSymbols } from "../utils/annotationUtils.js";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";
import "./EngineerViewPage.css";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;


const EngineerViewPage = () => {
  // { type: "duct" | "diffuser" | "indoor" | "outdoor", id: string }
  const { id } = useParams();
  const { state } = useContext(Store);
  const token = state?.adminInfo?.token;
  const [annotation, setAnnotation] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHVAC, setShowHVAC] = useState(false);
  const [addMode, setAddMode] = useState(null); // 'duct' | 'diffuser' | 'indoor' | 'outdoor' | null
  const [acType, setAcType] = useState("ducted"); // 'ducted' | 'ductless' | 'vrf-ducted' | 'vrf-ductless'
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
      if (showHVAC && annotation.annotations.hvac && acType === "ducted") {
        overlayHVAC(
          overlayContext,
          annotation.annotations.hvac,
          hvacSymbols,
          annotation.annotations.comments
        );
      }
      if (showHVAC && annotation.annotations.vrf && acType.startsWith("vrf")) {
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
            width: 0.2,
            height: 0.04,
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

  return (
    <div className="container mt-4">
      <h2 className="mt-4 mb-4">Engineer View: Annotated Drawing</h2>
      {loading && <Spinner animation="border" />}
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="mb-2 mt-4 d-flex align-items-center gap-2">
        <label className="me-2 mb-4">AC Type:</label>
        <select value={acType} onChange={(e) => setAcType(e.target.value)}>
          <option value="ducted">Minisplit - Ducted</option>
          <option value="ductless">Minisplit - Ductless</option>
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
          {acType === "ducted"
            ? "Minisplit - Ducted"
            : acType === "ductless"
            ? "Minisplit - Ductless"
            : acType === "vrf-ducted"
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
                <span className="ms-2" style={{ color: "orange" }}>
                  ■ Ducts (Yellow/Orange)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
              </div>
            )}
            {showHVAC && acType === "vrf-ducted" && (
              <div className="mb-2">
                <strong>Legend (VRF Ducted HVAC):</strong>
                <span className="ms-2" style={{ color: "orange" }}>
                  ■ Ducts (Yellow/Orange)
                </span>
                <span className="ms-3" style={{ color: "lime" }}>
                  ● Diffusers (Green/Lime)
                </span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="mb-2 d-flex flex-wrap align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          {acType === "ducted" && (
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
          {acType === "vrf-ducted" && (
            <>
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

                  // Handle minisplit ducts and diffusers
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
          {/* <Button
            onClick={() => setAddMode("markCondenser")}
            variant="dark"
            className="me-2"
          >
            Mark/Unmark Condenser
          </Button> */}
        </div>

        <div
          ref={pdfContainerRef}
          id="pdf-container"
          style={{ width: "100%", minHeight: 400, margin: "2rem 0", position: "relative" }}
        ></div>
        {annotation && pdfFile && (
          <SaveAsPDF
            file={pdfFile}
            isPaid={annotation.isPaid}
            pdfId={id}
            token={token}
            annotations={annotation.annotations}
            acType={acType}
            annotationType="engineer"
            userId={annotation.userId}
          />
        )}
      </div>
    </div>
  );
};

export default EngineerViewPage;
