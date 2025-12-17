
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


  // Advanced image preprocessing for better OCR
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Step 1: Convert to grayscale with weighted luminance (better for text)
  for (let i = 0; i < data.length; i += 4) {
    // Use luminance formula instead of simple average
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  // Step 2: Apply noise reduction (median filter approximation)
  const tempData = new Uint8ClampedArray(data);
  const width = canvas.width;
  const height = canvas.height;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get 3x3 neighborhood
      const neighbors = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(tempData[nIdx]);
        }
      }
      
      // Sort and take median
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4]; // middle value of 9 elements
      
      data[idx] = data[idx + 1] = data[idx + 2] = median;
    }
  }
  
  // Step 3: Adaptive contrast enhancement (preserves gray tones)
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    
    // Softer contrast boost that preserves mid-tones
    let enhanced;
    if (gray < 128) {
      // Darken darker areas
      enhanced = Math.pow(gray / 128, 1.2) * 128;
    } else {
      // Brighten lighter areas
      enhanced = 128 + Math.pow((gray - 128) / 127, 0.8) * 127;
    }
    
    // Apply sharpening
    enhanced = Math.min(255, Math.max(0, enhanced * 1.1));
    
    data[i] = data[i + 1] = data[i + 2] = enhanced;
  }
  
  context.putImageData(imageData, 0, 0);

  return canvas;
}
