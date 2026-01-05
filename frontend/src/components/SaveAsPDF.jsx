import  { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

// This component now receives the 'annotations' object as a prop
function SaveAsPDF({ file, isPaid, pdfId, token, annotations }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const drawAnnotations = (context, annotations, viewport) => {
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;

    if (annotations?.rectangles) {
      annotations.rectangles.forEach((rect) => {
        const x = rect.xPercent * canvasWidth;
        const y = rect.yPercent * canvasHeight;
        const width = rect.widthPercent * canvasWidth;
        const height = rect.heightPercent * canvasHeight;

        context.save();
        context.translate(x, y);
        context.rotate((rect.rotation || 0) * (Math.PI / 180));
        context.beginPath();
        context.rect(0, 0, width, height);
        context.fillStyle = rect.fill || "rgba(20, 205, 230, 0.4)";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = rect.stroke || "black";
        context.stroke();
        context.restore();
      });
    }

    if (annotations?.lines) {
      const lineReductionFactor = 0.985;
      annotations.lines.forEach((line) => {
        context.beginPath();
        const points = line.points.map((val, idx) =>
          idx % 2 === 0
            ? val * canvasWidth * lineReductionFactor
            : val * canvasHeight * lineReductionFactor
        );
        context.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          context.lineTo(points[i], points[i + 1]);
        }
        context.lineWidth = line.strokeWidth || 2;
        context.strokeStyle = line.stroke || "black";
        context.stroke();
      });
    }

    if (annotations?.comments) {
      annotations.comments.forEach((comment) => {
        const x = comment.xPercent * canvasWidth;
        const y = comment.yPercent * canvasHeight;
        const padding = 10;
        const fontSize = 17;
        const text = comment.text;

        context.font = `bold ${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;
        const textHeight = fontSize;

        context.fillStyle = comment.fill || "rgba(226, 218, 228, 0.3)";
        context.fillRect(
          x - padding,
          y - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );

        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.strokeRect(
          x - padding,
          y - textHeight - padding,
          textWidth + padding * 2,
          textHeight + padding * 2
        );

        context.fillStyle = comment.textColor || "#FF1493";
        context.fillText(text, x, y);
      });
    }
  };

  const saveAsPDF = async () => {
    setError(null);
    setIsSaved(false);

    if (!pdfId || !token) {
      setError("Missing PDF ID or authentication token.");
      return;
    }

    if (!file || file.type !== "application/pdf") {
      setError("The selected file is not a PDF.");
      return;
    }

    try {
      setError(null);
      setIsSaved(false);

      const response = await fetch(`/api/annotated-pdf/${pdfId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch PDF from server");
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      if (annotations) {
        drawAnnotations(context, annotations, viewport);
      }

      const imageData = canvas.toDataURL("image/png");
      const pngImage = await pdfDoc.embedPng(imageData);

      const newPdfPage = pdfDoc.getPages()[0];
      const { width, height } = newPdfPage.getSize();

      newPdfPage.drawImage(pngImage, { x: 0, y: 0, width, height });

      if (isPaid) {
        const { width } = newPdfPage.getSize();
        const font = await pdfDoc.embedFont(pdfDoc.DefaultFont);
        const signatureText = "AC Commerce — User: admin_unique1@example.com";
        const watermarkText = "APPROVED\nAC COMMERCE";

        newPdfPage.drawText(signatureText, {
          x: width - font.widthOfTextAtSize(signatureText, 10) - 10,
          y: 20,
          size: 10,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });

        const watermarkBox = {
          x: 20,
          y: 20,
          width: 150,
          height: 50,
        };
        newPdfPage.drawRectangle({
          ...watermarkBox,
          borderColor: rgb(0, 1, 0),
          borderWidth: 2,
        });

        newPdfPage.drawText(watermarkText, {
          x: watermarkBox.x + 10,
          y: watermarkBox.y + 15,
          size: 12,
          font: font,
          color: rgb(0, 1, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const downloadBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(downloadBlob);
      link.download = file?.name || "annotated-pdf.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save PDF:", err);
      setError("Failed to save PDF. Please try again.");
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      <Button
        className="go-to-btn btn-text w-auto p-1"
        variant="btn-outline"
        size="sm"
        onClick={saveAsPDF}
      >
        💾 Save as PDF
      </Button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {isSaved && <p style={{ color: "green" }}>PDF saved successfully!</p>}
    </div>
  );
}

export default SaveAsPDF;
