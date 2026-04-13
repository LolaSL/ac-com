import { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "./SaveAsPDF.css";

// This component now receives the 'annotations' object as a prop
function SaveAsPDF({
  file,
  pdfId,
  token,
  annotationType = "user",
}) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Helper: trigger a browser file download
  const triggerDownload = (bytes, filename) => {
    const downloadBlob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const saveAsPDF = async () => {
    setError(null);
    setIsSaved(false);

    if (annotationType !== "user" && annotationType !== "engineer") {
      setError("Only user or engineer annotations can be saved.");
      return;
    }

    if (!pdfId || !token) {
      setError("Missing PDF ID or authentication token.");
      return;
    }

    if (!file || file.type !== "application/pdf") {
      setError("The selected file is not a PDF.");
      return;
    }

    try {
      // ── ENGINEER: use backend-rendered PDF to preserve watermark/stamp and credentials ──
      if (annotationType === "engineer") {
        const response = await fetch(`/api/engineer-annotations/annotated-pdf/${pdfId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch engineer review PDF");
        const pdfBytes = await (await response.blob()).arrayBuffer();
        triggerDownload(pdfBytes, file.name || "engineer-review.pdf");
        setIsSaved(true);
        return;
      }

      // ── USER: single-page PDF with only the user's manual annotations ────
      // Fetch the base PDF from the server
      const baseResponse = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!baseResponse.ok) {
        const body = await baseResponse.json().catch(() => ({}));
        throw new Error(
          body.message || `Failed to fetch PDF: ${baseResponse.statusText}`
        );
      }
      const baseBuffer = await (await baseResponse.blob()).arrayBuffer();

      // Fetch user-only annotations from backend
      const annRes = await fetch(`/api/annotations/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!annRes.ok) {
        const body = await annRes.json().catch(() => ({}));
        throw new Error(
          body.message || `Failed to fetch annotations: ${annRes.statusText}`
        );
      }
      const annData = await annRes.json();
      const userAnnotations = annData.annotations || annData;

      // Render the first page of the base PDF to a canvas
      const loadingTask = pdfjsLib.getDocument(baseBuffer);
      const pdfJsDoc = await loadingTask.promise;
      const pdfJsPage = await pdfJsDoc.getPage(1);
      const scale = 1.5;
      const viewport = pdfJsPage.getViewport({ scale });

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      const ctx = renderCanvas.getContext("2d");
      await pdfJsPage.render({ canvasContext: ctx, viewport }).promise;

      // Overlay only manual user annotations: rectangles, lines, comments
      const cw = renderCanvas.width;
      const ch = renderCanvas.height;

      // Rectangles
      userAnnotations?.rectangles?.forEach((rect) => {
        const x = rect.xPercent * cw;
        const y = rect.yPercent * ch;
        const w = rect.widthPercent * cw;
        const h = rect.heightPercent * ch;
        const angle = (rect.rotation || 0) * (Math.PI / 180);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.fillStyle = rect.fill || "rgba(20, 205, 230, 0.4)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = rect.stroke || "black";
        ctx.stroke();
        ctx.restore();
      });

      // Lines
      userAnnotations?.lines?.forEach((line) => {
        ctx.beginPath();
        const pts = line.points.map((val, idx) =>
          idx % 2 === 0 ? val * cw * 0.985 : val * ch * 0.985
        );
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.lineWidth = line.strokeWidth || 2;
        ctx.strokeStyle = line.stroke || "black";
        ctx.stroke();
      });

      // Comments - Match Annotator dimensions for consistency
      userAnnotations?.comments?.forEach((comment) => {
        const x = comment.xPercent * cw;
        const y = comment.yPercent * ch;
        const padding = 4;
        const fontSize = 11; // Match Annotator font size
        const maxWidth = 106 * 1.5; // Match Annotator width at scale 1.5
        const text = comment.text;
        
        ctx.font = `bold ${fontSize}px Arial`;
        const textWidth = Math.min(ctx.measureText(text).width, maxWidth);
        const boxWidth = textWidth + padding * 2;
        const boxHeight = fontSize + padding * 2;
        
        // Draw background box
        ctx.fillStyle = comment.fill || "rgba(226, 218, 228, 0.3)";
        ctx.fillRect(x - padding, y - fontSize - padding, boxWidth, boxHeight);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - padding, y - fontSize - padding, boxWidth, boxHeight);
        
        // Draw text
        ctx.fillStyle = comment.textColor || "#FF1493";
        ctx.fillText(text, x, y);
      });

      // Embed the canvas image into a new PDF page
      const imageData = renderCanvas.toDataURL("image/png");
      if (!imageData || imageData === "data:," || imageData.length < 100) {
        throw new Error("Failed to render PDF to canvas");
      }

      const pdfDoc = await PDFDocument.load(baseBuffer);
      const pngImage = await pdfDoc.embedPng(imageData);
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      firstPage.drawImage(pngImage, { x: 0, y: 0, width, height });

      const pdfBytes = await pdfDoc.save();
      triggerDownload(pdfBytes, file.name || "my-drawing.pdf");
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setError("Failed to save PDF. Please try again.");
    }
  };

  return (
    <div className="save-as-pdf">
      <canvas ref={canvasRef}></canvas>
      <Button
        className="go-to-btn btn-text w-auto p-1 save-button"
        variant="btn-outline"
        size="sm"
        onClick={saveAsPDF}
      >
        💾 Save as PDF
      </Button>
      {error && <p className="error-message">{error}</p>}
      {isSaved && <p className="success-message">PDF saved successfully!</p>}
    </div>
  );
}

export default SaveAsPDF;
