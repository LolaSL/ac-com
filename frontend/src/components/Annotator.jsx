import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import { Button, Form } from "react-bootstrap";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import ArchSymbols from "./ArchSymbolsModal.jsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const Annotator = () => {
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
          width: 50,
          height: 17,
          fill: "rgba(20, 205, 230)",
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

    const drawGlobe = (x, y, radius) => {
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.strokeStyle = "#00008B";
      context.lineWidth = 1.5;
      context.stroke();

      context.strokeStyle = "#808080";
      context.lineWidth = 0.5;
      const numParallels = 2;
      for (let i = 1; i <= numParallels; i++) {
        const yOffset = (i / (numParallels + 1)) * radius * 0.7;
        context.beginPath();
        context.arc(x, y, radius - yOffset, 0, 2 * Math.PI);
        context.stroke();
        context.beginPath();
        context.arc(x, y, radius + yOffset, 0, 2 * Math.PI);
        context.stroke();
      }

      const numMeridians = 4;
      for (let i = 0; i < numMeridians; i++) {
        const angle = (i / numMeridians) * 2 * Math.PI;
        context.beginPath();
        context.ellipse(x, y, radius * 0.35, radius * 0.7, angle, 0, Math.PI);
        context.stroke();
        context.beginPath();
        context.ellipse(
          x,
          y,
          radius * 0.35,
          radius * 0.7,
          angle + Math.PI,
          0,
          Math.PI
        );
        context.stroke();
      }

      context.beginPath();
      context.arc(x, y, radius * 0.7, 0, 2 * Math.PI);
      context.stroke();
      context.beginPath();
      context.moveTo(x - radius * 0.5, y);
      context.lineTo(x + radius * 0.5, y);
      context.stroke();
    };

    const renderSignature = () => {
      if (isSaved) {
        const text = "APPROVED";
        const subText = "AC-COMMERCE";
        const padding = 12;
        const fontSize = 17;
        const subFontSize = 13;
        const globeRadius = 20;
        const globeMarginRight = 20;
        const outerLineWidth = 2;

        context.font = `bold ${fontSize}px Arial`;
        const textMetrics = context.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        context.font = `normal ${subFontSize}px Arial`;
        const subTextMetrics = context.measureText(subText);
        const subTextWidth = subTextMetrics.width;
        const subTextHeight = subFontSize;

        const totalTextWidth = Math.max(textWidth, subTextWidth);
        const totalContentWidth =
          globeRadius * 2 + globeMarginRight + totalTextWidth;
        const totalHeight = Math.max(
          globeRadius * 2,
          textHeight + subTextHeight
        );
        const outerWidth = totalContentWidth + 2 * padding;
        const outerHeight = totalHeight + 2 * padding;

        const rectX = context.canvas.width - outerWidth - 40;
        const rectY = 80;

        const globeX = rectX + padding + globeRadius;
        const globeY = rectY + padding + globeRadius;

        const textX = globeX + globeRadius + globeMarginRight;
        const textY = rectY + padding + textHeight;
        const subTextX = textX;
        const subTextY = textY + subFontSize;

        context.strokeStyle = "#00008B";
        context.lineWidth = outerLineWidth;
        context.strokeRect(rectX, rectY, outerWidth, outerHeight);

        context.fillStyle = "rgba(252, 252, 243, 0.2)";
        context.fillRect(rectX, rectY, outerWidth, outerHeight);

        drawGlobe(globeX, globeY, globeRadius);

        context.fillStyle = "#00008B";
        context.font = `bold ${fontSize}px Arial`;
        context.fillText(text, textX, textY);

        context.fillStyle = "#00008B";
        context.font = `normal ${subFontSize}px Arial`;
        context.fillText(subText, subTextX, subTextY + 5);

        context.setLineDash([]);
      }
    };

    renderSignature();
  }, [isSaved]);

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
      const viewport = page.getViewport({ scale: 1.5 });
      setPdfSize({ width: viewport.width, height: viewport.height });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      iconPositions.forEach((icon) => {
        const rectWidth = 45;
        const rectHeight = 11;
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

  const saveAsPDF = async () => {
    if (file && file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      const pdfCanvas = canvasRef.current;
      const stage = stageRef.current;

      if (pdfCanvas && stage) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempContext = tempCanvas.getContext("2d");
        tempContext.drawImage(pdfCanvas, 0, 0, width, height);
        stage.draw();

        const layer = stage.getChildren()[0];

        if (layer) {
          tempContext.drawImage(layer.getCanvas()._canvas, 0, 0, width, height);
        }

        const imageData = tempCanvas.toDataURL();
        const pngImage = await pdfDoc.embedPng(imageData);

        page.drawImage(pngImage, { x: 0, y: 0, width, height });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "annotated-pdf.pdf";
        link.click();
        setIsSaved(true);
      }
    } else {
      alert("The selected file is not a PDF.");
    }
  };

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
      <ArchSymbols />
      <Form className="btu-calculation-measure mt-4">
        <Form.Label className="mb-4 label-upload fw-bold">
          Upload file sample.
        </Form.Label>
        <p className="text-primary fw-bold upload-paragraph">
          *Supported: High Resolution PDFs files (.pdf). Recommended to place
          air conditioner (rectangle) above door in drawing.
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *Add rectangle: <kbd>Click On Empty Area</kbd>
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *Enter to appeared prompt window relevant to air conditioner comment.
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *Rotate rectangle: <kbd>Click</kbd>
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *Delete rectangle for small screens: <kbd>Tap And Hold</kbd>
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *Delete rectangle for large screens: <kbd>Right Click</kbd>
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *For saving approved drawing:{" "}
          <kbd>Double Click on the button "Save as PDF"</kbd>
        </p>
        <p className="text-primary fw-bold upload-paragraph">
          *For removing approved drawing/.pdf file:{" "}
          <kbd>Click on the button "Clear"</kbd>
        </p>
        <Form.Control
          className="mt-4"
          type="file"
          onChange={handleChange}
          accept="application/pdf"
        />
      </Form>
      <h2 className="mt-4 mb-4">Preview of selected file:</h2>
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
                  variant="secondary"
                  onClick={saveAsPDF}
                  className="mt-2 me-2 rounded mb-3"
                >
                  Save as PDF
                </Button>
                <Button
                  variant="secondary"
                  className="mt-2 rounded mb-3"
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
