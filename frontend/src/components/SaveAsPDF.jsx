import { useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions, version as pdfjsVersion } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

// This component now receives the 'annotations' object as a prop
function SaveAsPDF({ file, isPaid, pdfId, token, annotations, acType }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Filter annotations based on payment status
  const filteredAnnotations = isPaid
    ? annotations
    : {
        ...annotations,
        hvac: null, // Exclude engineer/admin HVAC annotations for non-paid users
      };

  const drawAnnotations = (context, annotations, viewport, acType) => {
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

    // For ductless systems, draw refrigerant lines connecting all rectangles to the condenser
    if (
      acType === "ductless" &&
      annotations?.rectangles &&
      annotations.rectangles.length > 1
    ) {
      // Find the condenser: first, check for comments containing "condenser" or "outdoor"
      let condenser = null;
      if (annotations.comments) {
        for (const comment of annotations.comments) {
          if (
            comment.text.toLowerCase().includes("condenser") ||
            comment.text.toLowerCase().includes("outdoor")
          ) {
            // Find the closest rectangle to this comment
            let closestRect = null;
            let minDist = Infinity;
            annotations.rectangles.forEach((rect) => {
              const rectCenterX =
                rect.xPercent * canvasWidth +
                (rect.widthPercent * canvasWidth) / 2;
              const rectCenterY =
                rect.yPercent * canvasHeight +
                (rect.heightPercent * canvasHeight) / 2;
              const dist = Math.sqrt(
                (comment.xPercent * canvasWidth - rectCenterX) ** 2 +
                  (comment.yPercent * canvasHeight - rectCenterY) ** 2
              );
              if (dist < minDist) {
                minDist = dist;
                closestRect = rect;
              }
            });
            if (closestRect) {
              condenser = closestRect;
              break;
            }
          }
        }
      }
      // If no labeled condenser, assume the largest area
      if (!condenser) {
        let maxArea = -Infinity;
        annotations.rectangles.forEach((rect) => {
          const area = rect.widthPercent * rect.heightPercent;
          if (area > maxArea) {
            maxArea = area;
            condenser = rect;
          }
        });
      }
      if (condenser) {
        const cx =
          condenser.xPercent * canvasWidth +
          (condenser.widthPercent * canvasWidth) / 2;
        const cy =
          condenser.yPercent * canvasHeight +
          (condenser.heightPercent * canvasHeight) / 2;
        annotations.rectangles.forEach((rect) => {
          if (rect !== condenser) {
            const rx =
              rect.xPercent * canvasWidth +
              (rect.widthPercent * canvasWidth) / 2;
            const ry =
              rect.yPercent * canvasHeight +
              (rect.heightPercent * canvasHeight) / 2;
            context.save();
            context.setLineDash([5, 5]);
            context.lineWidth = 2;
            context.strokeStyle = "blue"; // refrigerant line color
            context.beginPath();
            context.moveTo(rx, ry);
            context.lineTo(cx, cy);
            context.stroke();
            context.restore();
          }
        });
      }
    }

    // Draw HVAC annotations
    if (annotations?.hvac?.ducts) {
      annotations.hvac.ducts.forEach((duct) => {
        const x = duct.xPercent * canvasWidth;
        const y = duct.yPercent * canvasHeight;
        const width = (duct.width || 0.2) * canvasWidth;
        const height = (duct.height || 0.04) * canvasHeight;
        context.save();
        context.translate(x, y);
        context.beginPath();
        context.rect(0, 0, width, height);
        context.fillStyle = duct.fill || "rgba(0,120,255,0.3)";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = duct.stroke || "blue";
        context.stroke();
        context.restore();
      });
    }

    if (annotations?.hvac?.diffusers) {
      annotations.hvac.diffusers.forEach((diffuser) => {
        const x = diffuser.xPercent * canvasWidth;
        const y = diffuser.yPercent * canvasHeight;
        const size = (diffuser.sizePercent || 0.08) * canvasWidth;
        context.beginPath();
        if (diffuser.shape === "square") {
          context.rect(x - size / 2, y - size / 2, size, size);
        } else {
          context.arc(x, y, size / 2, 0, 2 * Math.PI);
        }
        context.fillStyle = "rgba(0, 255, 0, 0.5)";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "lime";
        context.stroke();
      });
    }

    // Draw dotted connection lines from diffusers to nearest ducts
    if (annotations?.hvac?.ducts && annotations?.hvac?.diffusers) {
      annotations.hvac.diffusers.forEach((diffuser) => {
        const dx = diffuser.xPercent * canvasWidth;
        const dy = diffuser.yPercent * canvasHeight;
        let nearestDuct = null;
        let minDist = Infinity;
        annotations.hvac.ducts.forEach((duct) => {
          const ductCenterX =
            duct.xPercent * canvasWidth +
            ((duct.width || 0.2) * canvasWidth) / 2;
          const ductCenterY =
            duct.yPercent * canvasHeight +
            ((duct.height || 0.04) * canvasHeight) / 2;
          const dist = Math.sqrt(
            (dx - ductCenterX) ** 2 + (dy - ductCenterY) ** 2
          );
          if (dist < minDist) {
            minDist = dist;
            nearestDuct = { x: ductCenterX, y: ductCenterY };
          }
        });
        if (nearestDuct) {
          context.save();
          context.setLineDash([5, 5]); // dotted line
          context.lineWidth = 2;
          context.strokeStyle = "gray"; // relevant color for routes
          context.beginPath();
          context.moveTo(dx, dy);
          context.lineTo(nearestDuct.x, nearestDuct.y);
          context.stroke();
          context.restore();
        }
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
      const scale = 1.0; // Reduced scale to avoid large canvas issues
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
        drawAnnotations(context, filteredAnnotations, viewport, acType);
      }

      const imageData = canvas.toDataURL("image/png");
      if (!imageData || imageData === "data:," || imageData.length < 100) {
        throw new Error("Failed to generate image from canvas");
      }

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
      const url = URL.createObjectURL(downloadBlob);

      // Generate filename based on payment status
      const baseName = file?.name?.replace(/\.[^/.]+$/, "") || "annotated_pdf";
      const filename = isPaid
        ? `${baseName}_with_engineer.pdf`
        : `${baseName}.pdf`;

      // Create a temporary link to trigger download with filename
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);

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
      variant="primary" className="ms-3"
        size="md"
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
