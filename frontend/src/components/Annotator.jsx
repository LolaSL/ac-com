import React, { useState, useRef, useEffect, useContext,  useCallback } from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import { Button, Form } from "react-bootstrap";
import { Store } from '../Store.js';
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";

import PdfHelpVideo from "./PdfHelpVideo.jsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const Annotator = ({ setRoomData }) => {
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;
  const [iconPositions, setIconPositions] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const canvasRef = useRef(null);
  const [file, setFile] = useState(null);
  const stageRef = useRef(null);
  const [pdfSize, setPdfSize] = useState({ width: "100%", height: "100%" });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [isRotating, setIsRotating] = useState(false);
  const [lines, setLines] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfId] = useState("unique-pdf-identifier-" + Date.now());


  const handleChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      if (fileType === "application/pdf") {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setError(null);
        setIconPositions([]);
        setComments([]);
      } else {
        setFile(null);
        setPreviewUrl(null);
        setError("Only PDF files are allowed.");
      }
    } else {
      setFile(null);
      setPreviewUrl(null);
      setError("No file selected.");
    }
  };

  const handleStageClick = (event) => {
    if (event.target === event.target.getStage() && !isRotating) {
      const pointerPosition = stageRef.current.getPointerPosition();
      if (!pointerPosition) return;
      const commentText = prompt("Enter your ac unit number (ac1, ac2, ...):");

      if (commentText) {
        const newRectId = Date.now();
        const newRect = {
          id: newRectId,
          x: pointerPosition.x,
          y: pointerPosition.y,
          width: 48,
          height: 16,
          fill: "rgba(20, 205, 230, 0.7)",
          rotation: 0,
        };
        setRectangles((prevRects) => [...prevRects, newRect]);

        const newCommentId = `comment-${Date.now()}`;
        const newComment = {
          id: newCommentId,
          rectId: newRectId,
          text: commentText,
          x: pointerPosition.x + 60,
          y: pointerPosition.y - 10,
          fill: "rgba(226, 218, 228, 0.3)",
        };
        setComments((prevComments) => [...prevComments, newComment]);
        const newLine = {
          id: `line-${Date.now()}`,
          rectId: newRectId,
          commentId: newCommentId,
          points: [
            newRect.x + newRect.width / 2,
            newRect.y + newRect.height / 2,
            newComment.x,
            newComment.y,
          ],
          stroke: "black",
          strokeWidth: 1,
        };
        setLines((prevLines) => [...prevLines, newLine]);
      }
    }
  };

  const handleTouchStart = (e) => {
    console.log("Touch started!", e.target.attrs.id);
    const clickedRectId = e.target.attrs.id;

    const handleTouchEnd = () => {
      const touchDuration = Date.now() - touchStartTime;
      if (touchDuration >= 800) {
        console.log("Tap-and-hold detected for:", clickedRectId);
        setRectangles((prevRects) =>
          prevRects.filter((r) => r.id !== clickedRectId)
        );

        setComments((prevComments) =>
          prevComments.filter((comment) => comment.rectId !== clickedRectId)
        );

        setLines((prevLines) =>
          prevLines.filter((line) => line.rectId !== clickedRectId)
        );
      }
    };

    const touchStartTime = Date.now();
    window.addEventListener("touchend", handleTouchEnd, { once: true });
  };

  const handleRectangleRightClick = (event) => {
    event.evt.preventDefault();
    const clickedRectId = event.target.attrs.id;
    setRectangles((prevRects) =>
      prevRects.filter((r) => r.id !== clickedRectId)
    );
    setComments((prevComments) =>
      prevComments.filter((comment) => comment.rectId !== clickedRectId)
    );
    setLines((prevLines) =>
      prevLines.filter((line) => line.rectId !== clickedRectId)
    );
  };

  const handleCanvasEvent = (e) => {
    if (window.innerWidth > 268) {
      handleStageClick(e);
    }
  };

  const handleDragMove = (e) => {
    const draggedNode = e.target;
    const layer = draggedNode.getLayer();
    if (layer) {
      layer.batchDraw();
    }
  };

  const handleDragEnd = (e) => {
    const draggedNode = e.target;
    const draggedId = draggedNode.id();

    setRectangles((prevRects) =>
      prevRects.map((rect) =>
        rect.id === draggedId
          ? { ...rect, x: draggedNode.x(), y: draggedNode.y() }
          : rect
      )
    );

    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.rectId === draggedId) {
          const newCommentPos = {
            x: draggedNode.x() + 60,
            y: draggedNode.y() - 10,
          };
          return { ...comment, ...newCommentPos };
        }
        return comment;
      })
    );

    setLines((prevLines) =>
      prevLines.map((line) => {
        const isRect = line.rectId === draggedId;
        const isComment = line.commentId === draggedId;
        let rect = null;
        let comment = null;

        if (isRect || isComment) {
          rect = isRect
            ? {
                x: draggedNode.x(),
                y: draggedNode.y(),
                width: draggedNode.width(),
                height: draggedNode.height(),
              }
            : rectangles.find((r) => r.id === line.rectId);

          comment = isComment
            ? { x: draggedNode.x(), y: draggedNode.y() }
            : comments.find((c) => c.rectId === draggedId);

          if (rect && comment) {
            return {
              ...line,
              points: [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
                comment.x,
                comment.y,
              ],
            };
          }
        }

        return line;
      })
    );
  };
  const rotateRectangle = useCallback((rectId) => {
    console.log("rotateRectangle called for:", rectId);

    console.trace();
    setRectangles((prevRects) =>
      prevRects.map((rect) =>
        rect.id === rectId ? { ...rect, rotation: rect.rotation + 90 } : rect
      )
    );
  }, []);

  const renderComments = useCallback(
    (context) => {
      context.font = "bold 17px Arial";
      context.lineWidth = 2;
      context.shadowColor = "grey";
      context.shadowBlur = 1;
      const canvasWidth = context.canvas.width;
      const canvasHeight = context.canvas.height;
      comments.forEach((comment) => {
        const padding = 10;
        const lineHeight = 20;
        const maxWidth = 200;
        const words = comment.text.split(" ");
        let line = "";
        let lines = [];
        let yOffset = comment.y;
        words.forEach((word) => {
          const testLine = line + word + " ";
          const testWidth = context.measureText(testLine).width;
          if (testWidth > maxWidth) {
            lines.push(line);
            line = word + " ";
          } else {
            line = testLine;
          }
        });
        lines.push(line);

        const longestLineWidth = Math.max(
          ...lines.map((line) => context.measureText(line).width)
        );
        const frameWidth = Math.min(longestLineWidth + padding * 2, maxWidth);
        const textBlockHeight = lines.length * lineHeight;
        const frameHeight = textBlockHeight + padding;

        let adjustedX = comment.x;
        let adjustedY = yOffset - textBlockHeight;

        if (adjustedX + frameWidth > canvasWidth) {
          adjustedX = canvasWidth - frameWidth - padding;
        }

        if (adjustedY + frameHeight > canvasHeight) {
          adjustedY = canvasHeight - frameHeight - padding;
        }

        context.fillStyle = "rgba(252, 252, 243, 0.2)";
        context.fillRect(adjustedX, adjustedY, frameWidth, frameHeight);

        context.strokeStyle = "grey";
        context.strokeRect(adjustedX, adjustedY, frameWidth, frameHeight);

        context.fillStyle = "deeppink";
        lines.forEach((line, index) => {
          context.fillText(
            line,
            adjustedX + padding,
            adjustedY + (index + 1) * lineHeight
          );
        });
      });
    },
    [comments]
  );

  const memoizedCallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
  }, []);

  const drawRotatedRectangle = useCallback(
    (context, x, y, width, height, angle) => {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.fillRect(-width / 2, -height / 2, width, height);
      context.restore();
    },
    []
  );

  const renderPDFOnCanvas = useCallback(
    async (pdfData) => {
      const canvas = canvasRef.current;
      if (!canvas || !file) return;
      const context = canvas.getContext("2d");

      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const scale = 1;
      const viewport = page.getViewport({ scale });
      setPdfSize({ width: viewport.width, height: viewport.height });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      const scaleX = scale;
      const scaleY = scale;

      iconPositions.forEach((icon) => {
        const scaledX = icon.x * scaleX;
        const scaledY = icon.y * scaleY;
        const rectWidth = 45 * scaleX;
        const rectHeight = 11 * scaleY;
        drawRotatedRectangle(
          context,
          scaledX,
          scaledY,
          rectWidth,
          rectHeight,
          icon.angle
        );
      });

      renderComments(context, scaleX, scaleY);

      memoizedCallback(context);
    },
    [
      drawRotatedRectangle,
      file,
      iconPositions,
      memoizedCallback,
      renderComments,
      setPdfSize,
    ]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (previewUrl) {
      const img = new Image();
      img.src = previewUrl;
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        iconPositions.forEach((icon) => {
          const rectWidth = 65;
          const rectHeight = 15;
          drawRotatedRectangle(
            context,
            icon.x,
            icon.y,
            rectWidth,
            rectHeight,
            icon.angle
          );
        });
        renderComments(context);
      };
    }

    if (file?.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        await renderPDFOnCanvas(pdfData);
      };
      reader.readAsArrayBuffer(file);
    }
  }, [
    drawRotatedRectangle,
    file,
    iconPositions,
    previewUrl,
    renderComments,
    renderPDFOnCanvas,
  ]);

  const fileInputRef = useRef();

  const saveToBackend = async () => {
    if (!file) {
      alert("Please select a PDF file to save.");
      return;
    }
    setIsSaved(false);
    const formData = new FormData();
    formData.append("pdfFile", file);
    formData.append("rectangles", JSON.stringify(rectangles));
    formData.append("comments", JSON.stringify(comments));
    formData.append("lines", JSON.stringify(lines));
    formData.append("pdfId", pdfId);

    const canvas = document.getElementById("my-canvas");
    const imageWidth = canvas?.width;
    const imageHeight = canvas?.height;

    formData.append("imageWidth", imageWidth);
    formData.append("imageHeight", imageHeight);

    
    if (!token) {
      alert("You must be signed in to save.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/upload-annotate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Data saved to backend:", data);
        alert("PDF and annotations saved successfully!");

        setIsSaved(true);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = null;
        }

        setPreviewUrl(null);
        setRectangles([]);
        setComments([]);
        setLines([]);
      } else {
        const errorData = await response.json();
        console.error("Error saving data:", errorData);
        alert(`Failed to save data: ${errorData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Network error while saving:", error);
      alert("Network error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    if (isSaved) {
      toast.success("Saved successfully!", {
        duration: 3000,
        position: "bottom-center",
      });
    }
  }, [isSaved]);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    setIconPositions([]);
    setPreviewUrl(null);
    setIsSaved(false);
    setRectangles([]);
    setComments([]);
  };

  return (
    <div>
      <h1 className="mt-4 mb-4 title-measurement">
        Measurement Service System
      </h1>
      <PdfHelpVideo />
      <Form className="btu-calculation-measure mt-4">
        <Form.Label className=" label-upload fw-bold text-secondary fs-5"></Form.Label>
        <p className="text-secondary fw-bold upload-paragraph">
          *Supported: High Resolution PDFs files (.pdf). Recommended to place
          air conditioner (rectangle) above door in drawing.
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          * PDFs files (.pdf) should be flat/appartment drawing and without any
          modifications.
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *Add rectangle: <kbd>Click On Empty Area</kbd>
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *Enter to appeared prompt window relevant to air conditioner comment.
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *Rotate rectangle: <kbd>Click</kbd>
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *Delete rectangle for small screens: <kbd>Tap And Hold</kbd>
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *Delete rectangle for large screens: <kbd>Right Click</kbd>
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          *For saving approved drawing:{" "}
          <kbd>Click on the button "Save PDF File"</kbd>{" "}
        </p>
        <p className="text-secondary fw-bold upload-paragraph">
          <span className="me-1"></span>
          *To remove unnecessary drawing, simply click the <kbd>Clear</kbd>{" "}
          button.
        </p>

        <Form.Control
          className="mt-4 form-control"
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="application/pdf"
        />
      </Form>
      <h2 className="mt-4 mb-4 text-secondary">Preview of selected file:</h2>
      {previewUrl && (
        <div className="text-center">
          {previewUrl && (
            <div
              style={{ position: "relative", display: "inline-block" }}
              className="container-main"
            >
              <canvas
                id="my-canvas"
                ref={canvasRef}
                style={{ border: "1px solid black" }}
                width={pdfSize.width}
                height={pdfSize.height}
                onClick={handleCanvasEvent}
              />

              <Stage
                ref={stageRef}
                width={pdfSize.width}
                height={pdfSize.height}
                onClick={handleStageClick}
                onContextMenu={handleRectangleRightClick}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <Layer>
                  {lines.map((line) => (
                    <Line
                      key={line.id}
                      points={line.points}
                      stroke={line.stroke}
                      strokeWidth={line.strokeWidth}
                    />
                  ))}
                  {rectangles.map((rect) => (
                    <React.Fragment key={rect.id}>
                      <Rect
                        key={rect.id}
                        id={rect.id}
                        name="rect"
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        fill={rect.fill}
                        draggable={true}
                        rotation={rect.rotation}
                        onContextMenu={(event) => {
                          event.evt.preventDefault();
                          event.cancelBubble = true;
                          const clickedRectId = event.target.attrs.id;
                          console.log(
                            "Rectangle right-clicked (removing)",
                            clickedRectId
                          );

                          setRectangles((prevRects) =>
                            prevRects.filter((r) => r.id !== clickedRectId)
                          );

                          setComments((prevComments) =>
                            prevComments.filter(
                              (comment) => comment.rectId !== clickedRectId
                            )
                          );
                          setLines((prevLines) =>
                            prevLines.filter(
                              (line) => line.rectId !== clickedRectId
                            )
                          );
                        }}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onClick={(event) => {
                          console.log(
                            "Rectangle clicked",
                            event.target.attrs.id
                          );
                          event.cancelBubble = true;
                          const clickedRectId = event.target.attrs.id;
                          setIsRotating(true);
                          rotateRectangle(clickedRectId);
                          setTimeout(() => setIsRotating(false), 100);
                        }}
                        onTouchStart={handleTouchStart}
                      />
                    </React.Fragment>
                  ))}
                  {comments.map((comment) => (
                    <Text
                      key={comment.id}
                      id={comment.id}
                      x={comment.x}
                      y={comment.y}
                      text={""}
                      fill={comment.fill}
                      draggable={true}
                      onDragMove={handleDragMove}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}

          <div className="d-flex">
            {file && file.type === "application/pdf" && (
              <>
                <Button
                  variant="btn-outline"
                  onClick={saveToBackend}
                  disabled={isSaving}
                  className="mt-2 me-2 go-to-btn btn-text mb-3"
                >
                  {isSaving ? "Saving..." : "Save PDF File"}{" "}
                </Button>
                <Button
                  variant="btn-outline"
                  className="mt-2 mb-3 go-to-btn btn-text"
                  onClick={clearCanvas}
                >
                  Clear
                </Button>
              </>
            )}
          </div>
          {error && <p className="error-message mt-4">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Annotator;