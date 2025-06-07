import React, { useState } from "react";
import { Form } from "react-bootstrap";
import { Helmet } from "react-helmet-async";
import Tesseract from "tesseract.js";
import { getDocument } from "pdfjs-dist/webpack.mjs";
import * as pdfjsLib from "pdfjs-dist";


pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

const ExtractPdf = () => {

  const [extractedText, setExtractedText] = useState("");
  const [classifiedData, setClassifiedData] = useState([]);
  const [error, setError] = useState("");
 
  // Function to process PDF files
  const extractText = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        const typedarray = new Uint8Array(reader.result);

        getDocument(typedarray)
          .promise.then((pdf) => {
            const numPages = pdf.numPages;
            let extractedText = "";

            // Process all pages in the PDF
            const processPage = (pageNum) => {
              pdf.getPage(pageNum).then((page) => {
                const scale = 5; // Increase scale for better OCR accuracy
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                  canvasContext: context,
                  viewport: viewport,
                };

                page.render(renderContext).promise.then(() => {
                  Tesseract.recognize(canvas.toDataURL(), "eng", {
                    logger: (m) => console.log(m),
                  })
                    .then(({ data: { text } }) => {
                      extractedText += text;

                      if (pageNum === numPages) {
                        // Process text after the last page
                        setExtractedText(extractedText);
                        const classifiedTable =
                          classifyAndExtractData(extractedText);
                        setClassifiedData(classifiedTable);
                      } else {
                        processPage(pageNum + 1); // Process the next page
                      }
                    })
                    .catch((err) => {
                      console.error("Error extracting text with OCR:", err);
                      setError("Failed to extract text using OCR.");
                    });
                });
              });
            };

            processPage(1); // Start with the first page
          })
          .catch((err) => {
            console.error("Error loading PDF:", err);
            setError("Failed to load PDF.");
          });
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("No file uploaded.");
    }
  };

  // Updated roomPatterns to include necessary patterns
  const roomPatterns = {
    bedroom: /bed\s?room|br|bdrm|master\s?bedroom|primary\s?bedroom/i,
    livingRoom: /living\s?(room|&\s?dining\s?area)|lr|outdoor\s?living/i,
    kitchen: /kitchen|kit/i,
    toilet: /toilet|bath\s?room|wc/i,
    diningRoom: /dining\s?room|dr/i,
    drawingRoom: /drawing\s?room|study|studyroom|pooja/i,
    breakfastRoom: /breakfast\s?room|brkfst/i,
    familyRoom: /family\s?room/i,
    lounge: /lounge|l|mstr\s?suite/i,
    hall: /hall|living\s?hall|parking/i,
    masterBed: /master\s?bed\s?room|mstr\s?bed|primary\s?bedroom/i,
    terrace: /terrace/i,
    office: /office|home\s?office|study|workspace/i,
  };

  // Updated dimension pattern to handle feet and inches, area in sqft and sqm
  const dimensionPattern =
    /(\d{1,3})\s*[°'’"]?\s*[xX]\s*(\d{1,3})\s*[°'’"]?|(\d+(\.\d+)?)\s*sqft|(\d+(\.\d+)?)\s*sqm/g;

  // Function to classify and extract room data and dimensions
  const classifyAndExtractData = (text) => {
    const cleanedText = text
      .replace(/[^\w\s.'"\dXx-°]/g, "") // Clean special characters
      .replace(/\s{2,}/g, " ") // Replace multiple spaces
      .trim()
      .toLowerCase();

    const lines = cleanedText.split("\n");
    let table = [];

    lines.forEach((line) => {
      let roomType = null;

      // Find room type
      for (const [key, pattern] of Object.entries(roomPatterns)) {
        if (pattern.test(line)) {
          roomType = key;
          break;
        }
      }

      // Extract dimensions (including area in sqft and sqm)
      const dimensions = line.match(dimensionPattern);

      if (roomType) {
        if (dimensions) {
          dimensions.forEach((dim) => {
            let width = 0;
            let height = 0;
            let areaSqFt = 0;
            let areaSqM = 0;

            // Check if the dimension is in sqm
            if (dim.toLowerCase().includes("sqm")) {
              areaSqM = parseFloat(dim); // Get area in sqm directly
              areaSqFt = areaSqM / 0.092903; // Convert to sqft
              // Set width and height as empty strings
              width = "";
              height = "";
            }
            // Check if the dimension is in sqft
            else if (dim.toLowerCase().includes("sqft")) {
              areaSqFt = parseFloat(dim); // Get area in sqft directly
              areaSqM = areaSqFt * 0.092903; // Convert to sqm
              // Set width and height as empty strings
              width = "";
              height = "";
            }
            // Handle dimensions provided in the format of width x height
            else {
              const dimParts = dim.split(/[xX]/);
              if (dimParts.length === 2) {
                width = convertToFeet(dimParts[0].trim());
                height = convertToFeet(dimParts[1].trim());
                areaSqFt = width * height; // Calculate area in sqft
                areaSqM = areaSqFt * 0.092903; // Convert area to sqm
              }
            }

            // Add the room data to the table
            if (width <= 100 && height <= 100) {
              table.push({
                roomType,
                width: width ? `${width.toFixed(2)} ft` : "",
                height: height ? `${height.toFixed(2)} ft` : "",
                areaSqFt: areaSqFt ? `${areaSqFt.toFixed(2)} sqft` : "",
                areaSqM: areaSqM ? `${areaSqM.toFixed(2)} sqm` : "",
              });
            }
          });
        }
      }
    });

    return table;
  };

  // Function to convert measurements to feet
  const convertToFeet = (measure) => {
    const parts = measure.match(/(\d+)\s*['’]?\s*-?\s*(\d+)?["”]?/); // For patterns like 12'-4"
    if (parts) {
      const feet = parseInt(parts[1], 10);
      const inches = parts[2] ? parseInt(parts[2], 10) : 0;
      return feet + inches / 12;
    }
    return 0; // Default case if no pattern matches
  };

  const downloadJson = () => {
    const jsonContent = JSON.stringify(classifiedData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "extracted_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
  <div>
      <Helmet>
        <title>UploadPDF</title>
      </Helmet>
      <Form>
        <h1 className="measure-header text-center fw-bold mb-4">
          Measurement System
        </h1>
        <Form.Group controlId="input">
          <Form.Label className="mb-4">
            Upload PDF file sample.{" "}
            <strong>*Please, use higher image resolution</strong>
          </Form.Label>
          <Form.Control
            type="file"
            accept="application/pdf"
            onChange={extractText}
            className="form-control mb-3"
          />
        </Form.Group>
      </Form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div>
        <h2>Extracted Text:</h2>
        <pre>{extractedText}</pre>
      </div>
      <div>
        <h2>Classified Data:</h2>
        <table className="table table-bordered">
          <thead>
            <tr>
              <td>N/N</td>
              <th>Room Type</th>
              <th>Width (ft)</th>
              <th>Height (ft)</th>
              <th>Area (sqft)</th>
              <th>Area (sqm)</th>
            </tr>
          </thead>
          <tbody>
            {classifiedData.map((item, index) => (
              <tr key={index}>
                <td>{index}</td>
                <td>{item.roomType}</td>
                <td>{item.width}</td>
                <td>{item.height}</td>
                <td>{item.areaSqFt}</td>
                <td>{item.areaSqM}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="my-3">
        <button onClick={downloadJson} className="btn btn-primary">
          Download JSON
              </button>
          </div>
      </div>
)
}
export default ExtractPdf;