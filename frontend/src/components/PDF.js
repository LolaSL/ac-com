// import { pdfjs } from 'react-pdf';

// const renderAnnotations = (pdfIframe, annotations) => {
//   const canvas = document.createElement('canvas');
//   const context = canvas.getContext('2d');

//   // Loop through the annotations and render them onto the canvas
//   annotations.forEach(annotation => {
//     // Assuming annotations have properties like x, y, width, height, type (e.g., 'rectangle', 'line', 'text')
//     context.beginPath();
//     if (annotation.type === 'rectangle') {
//       context.rect(annotation.x, annotation.y, annotation.width, annotation.height);
//     }
//     // Add more cases for different annotation types (lines, text, etc.)

//     context.lineWidth = 2;
//     context.strokeStyle = 'rgba(0, 0, 255, 0.5)';
//     context.stroke();
//   });

//   // Overlay the annotations canvas over the PDF iframe
//   pdfIframe.appendChild(canvas);
// };
