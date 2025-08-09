
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

export async function preprocessPdfPage(file, pageNumber = 1, cropTop = 150) {
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  const page = await pdf.getPage(pageNumber);

  // Target DPI
  const scale = 300 / 72; // PDF units are 72 DPI
  const viewport = page.getViewport({ scale });
console.log("Viewport rotation:", viewport.rotation);

  // Create canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Render PDF page to canvas
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  // Optional crop to remove title block
// Optional crop to remove title block
if (cropTop > 0) {
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = canvas.width;
  croppedCanvas.height = canvas.height - cropTop;

  const croppedCtx = croppedCanvas.getContext("2d");

  croppedCtx.save();
  croppedCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transforms
  croppedCtx.drawImage(canvas, 0, -cropTop);
  croppedCtx.restore();

  // Overwrite with cropped version
  canvas.width = croppedCanvas.width;
  canvas.height = croppedCanvas.height;

  const context = canvas.getContext("2d");
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0); // Reset transforms before drawImage
  context.drawImage(croppedCanvas, 0, 0);
  context.restore();
}


  // Convert to grayscale & boost contrast
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // grayscale
    const contrast = avg > 128 ? 255 : 0; // high contrast threshold
    data[i] = data[i + 1] = data[i + 2] = contrast;
  }
  context.putImageData(imageData, 0, 0);

  return canvas;
}
