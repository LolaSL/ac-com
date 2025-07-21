import React, { useState, useEffect, useMemo, useRef } from "react";

let Tesseract;
let pdfjsLib;

/**
 * Defines regex patterns for various room types.
 * Patterns are refined to be more precise and flexible to handle OCR variations.
 */

const roomPatterns = {
  // Outdoor
  terrace: /\b(terrace|deck|patio|open\s*deck|cov(?:ered)?\s*deck|cov(?:ered)?\s*entry|cov\.?\s*entry)\b/i,

  // Dining & Living
  diningRoom: /\b(dining|dining\s*(room|area)?|dr)\b/i,
  livingRoom: /\b(living|living\s*(room|area)?|lr)\b/i,
  sittingRoom: /\bsitting\s*(room|area)?\b/i,
  lounge: /\b(lounge|mstr\s*suite)\b/i,
  hall: /\b(hall|living\s*hall|parking)\b/i,
  greatRoom: /\bgreat\s*rm\.?|great\s*room\b/i,
  commonRoom: /\bcommon\s*room\b/i,
  familyRoom: /\bfamily\s*room\b/i,

  // Kitchen
  kitchen: /\b(kitchen|kitc?hen|ktcn|ktch?n)\b/i,
  breakfastRoom: /\b(breakfast\s*room|brkfst)\b/i,

  // Bedrooms
  bedroom: /\bbed(room|rm)?\b|\bb(?:e|o|a|d)?d[\s._#]*(room|rm|#?\d)?\b|\bbdrm\.?#?\d?\b/i,
  secondBedroom: /\b(sec(?:ond)?\s*)?bedroom|bed\s*2|br\s*2\b/i,
  masterBedroom: /\b(master|mstr|mst)\s*(bed(room)?|suite)?\b/i,
  primaryBedroom: /\b(primary|main)\s*bed(room)?\b/i,

  // Work/study/office
  office: /\boffice|home\s*office|workspace\b/i,
  desk: /\bdesk(\s*(area|room))?\b/i,
  study: /\bstudy\b/i,
  drawingRoom: /\bdrawing\s*room|pooja\b/i,

  // Wellness
  gym: /\b(home\s*)?(gym|fitness|workout)(\s*room)?\b/i,

  // Other
  garage: /\bgarage\b/i
};



const roomTypePriorities = [
  'kitchen', 'livingroom', 'diningroom', 'office', 'greatroom', 'familyroom',
  'masterbedroom', 'primarybedroom', 'bedroom', 'secondbedroom', 'terrace',
  'sittingroom', 'desk', 'gym', 'drawingroom', 'breakfastroom', 'lounge', 'hall', 'commonroom', 'study', 'garage'
];


const dimensionPatterns = [
  /\b(\d{1,2})['’′]?\s*(\d{1,2})?["”]?\s*[xX×]\s*(\d{1,3})['’′]?\s*(\d{0,2})?["”]?\b/g,       // 16'6 x 10'4
  /\b(\d+(?:\.\d+)?)\s*ft\s*[xX×]\s*(\d+(?:\.\d+)?)\s*ft\b/g,                                 // 16 ft x 10 ft
  /\b(\d{1,3})[-](\d{1,3})\s*[xX×]\s*(\d{1,3})[-](\d{1,3})\b/g,                               // 16-6 x 10-4
  /\b(\d{1,3})\s*[xX×]\s*(\d{1,3})\b/g,                                                       // 20 x 10 (assume feet)
  /\b(\d{1,2})[’']\s*(\d{1,2})["”]?\s*[xX×]\s*(\d{1,2})[’']\s*(\d{1,2})["”]?\b/g,             // additional: 13'6" x 13'
  /\b(\d{1,2})['’′]?\s*[xX×]\s*(\d{1,2})(\d{1,2})\b/g                                           // matches: 16'x104 (-> 10'4)

];

const apartmentTypePattern = /\b(\d+\s*(?:bedroom|studio|loft|bath)\s*apartment\s*-?\s*model\s*[A-Z\d]+)\b/i

const totalSfPattern = /\b(\d{3,5})\s*(?:sq\s*ft|sf)\b/i



/**
 * Cleans a single line of text by removing unwanted characters and normalizing spaces.
 * @param {string} line - The input text line.
 * @returns {string} The cleaned text line.
 */
const cleanTextLine = (line) =>
  line
    .replace(/[^\w\s.'"\dXx-°’”]/g, "")
    .replace(/\b0A\b/gi, "04")
    .replace(/\bOA\b/gi, "04")
    .replace(/\bl0\b/gi, "10")
    .replace(/\b(\d{2})(\d{2})['"]?\s*[xX×]\s*(\d{1,2})['"]?(\d{1,2})?\b/, "$1'$2\" x $3'$4\"")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Normalizes a raw room type string (e.g., "livingRoom" to "Living Room").
 * @param {string} raw - The raw room type string.
 * @returns {string} The normalized room type string.
 */
const normalizeRoomType = (raw) =>
  raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Extracts images from a PDF file using pdfjs-dist.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string[]>} An array of image data URLs.
 */
const extractImagesFromPdf = async (file) => {
  if (!pdfjsLib || !pdfjsLib.getDocument) {
    throw new Error("PDF.js library not available.");
  }
  const typedArray = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument(typedArray).promise;
  const images = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const dpi = 144;
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg"));
  }
  return images;
};

/**
 * Runs OCR on image data URLs using Tesseract.js.
 * @param {string[]} images - An array of image data URLs.
 * @returns {Promise<string>} The combined extracted text.
 */
const runOcrOnImages = async (images) => {
  if (!Tesseract?.recognize) {
    throw new Error("Tesseract.js not available.");
  }

  let fullText = "";
  let allWords = [];

  for (const image of images) {
    const {
      data: { text, words },
    } = await Tesseract.recognize(image, "eng");

    const cleanedText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, "")
      .replace(/ﬁ/g, "fi")
      .replace(/(\d+)\s*(?:sq\.?ft|ft²)/gi, "$1 sqft");

    fullText += cleanedText + "\n";

    const cleanedWords = words.map((word) => ({
      text: word.text,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
    }));

    allWords = [...allWords, ...cleanedWords];
  }

  return {
    text: fullText,
    ocrWords: allWords,
  };
};


/**
 * Parses room data, apartment type, and total square footage from the extracted text.
 * Implements a more robust logic for associating dimensions with the correct room types,
 * and now includes refined duplicate entry prevention.
 * @param {string} text - The full extracted text from the PDF.
 * @returns {{apartmentType: string|null, totalSf: string|null, rooms: Array<Object>}}
 */
const parseRoomDataFromText = (text) => {
  const lines = text.split("\n").map(cleanTextLine).filter(Boolean);
  const table = [];
  const addedRoomKeys = new Set();
  const apartmentTypeMatch = text.match(apartmentTypePattern);
  const apartmentType = apartmentTypeMatch ? apartmentTypeMatch[1].trim() : null;
  const totalSfMatch = text.match(totalSfPattern);
  const totalSf = totalSfMatch ? totalSfMatch[1].trim() : null;
  const searchWindowSize = 5;
  const extendedRoomPatterns = { ...roomPatterns };

  const normalizeLineForRoomMatch = (line) =>
    line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const fixAreaUnit = (s) =>
    s.replace(/m[?®*]/gi, "m²").replace(/nv[?]/gi, "m²");

  const areaValuePattern = /(\d+(?:[.,]\d{1,2})?)\s*m(?:²|[?®*])?/gi;

  const getNearestRoomType = (roomCandidates) => {
    roomCandidates.sort((a, b) => {
      const aScore = a.distance <= 1 ? -10 : a.distance;
      const bScore = b.distance <= 1 ? -10 : b.distance;
      return aScore - bScore || roomTypePriorities.indexOf(a.type) - roomTypePriorities.indexOf(b.type);
    });
    return roomCandidates[0]?.type || null;
  };

  lines.forEach((line, index) => {
    const cleanLine = fixAreaUnit(line);

    const areaMatches = [...cleanLine.matchAll(areaValuePattern)];
    if (areaMatches.length > 0) {
      let roomCandidates = [];

      for (let offset = -searchWindowSize; offset <= searchWindowSize; offset++) {
        const nearbyIndex = index + offset;
        if (nearbyIndex >= 0 && nearbyIndex < lines.length) {
          const nearbyLine = normalizeLineForRoomMatch(lines[nearbyIndex]);
          for (const [key, pattern] of Object.entries(extendedRoomPatterns)) {
            if (pattern.test(nearbyLine)) {
              console.log(`Matched room type '${key}' on line: "${nearbyLine}"`);
              roomCandidates.push({ type: key, distance: Math.abs(offset) });
            }
          }

        }
      }

      const foundRoomType = getNearestRoomType(roomCandidates);

      areaMatches.forEach((match, i) => {
        const areaSqM = parseFloat(match[1].replace(",", "."));
        if (!areaSqM || isNaN(areaSqM)) return;
        const areaSqFt = areaSqM / 0.092903;
        const normalizedType = normalizeRoomType(foundRoomType || `Room ${index}-${i}`);
        const roomKey = `${normalizedType}-${areaSqM.toFixed(2)}`;
        if (!addedRoomKeys.has(roomKey)) {
          table.push({
            roomType: normalizedType,
            width: "N/A",
            height: "N/A",
            areaSqFt: `${areaSqFt.toFixed(2)} sqft`,
            areaSqM: `${areaSqM.toFixed(2)} sqm`,
          });
          addedRoomKeys.add(roomKey);
        }
      });
    }
  });

  lines.forEach((line, index) => {
    const matches = dimensionPatterns.flatMap((pattern) => [...line.matchAll(pattern)]);
    if (!matches.length) return;

    let roomCandidates = [];

    for (let offset = -searchWindowSize; offset <= searchWindowSize; offset++) {
      const checkIndex = index + offset;
      if (checkIndex >= 0 && checkIndex < lines.length) {
        const nearbyLine = normalizeLineForRoomMatch(lines[checkIndex]);
        for (const [key, pattern] of Object.entries(extendedRoomPatterns)) {
          if (pattern.test(nearbyLine)) {
            roomCandidates.push({ type: key, distance: Math.abs(offset) });
          }
        }
      }
    }

    if (!roomCandidates.length) return;

    let foundRoomType = getNearestRoomType(roomCandidates);
    if (foundRoomType === "secondBedroom" && !table.some(r => r.roomType === "Primary Bedroom")) {
      foundRoomType = "primaryBedroom";
    } else if (
      foundRoomType === "secondBedroom" &&
      table.filter(r => r.roomType === "Second Bedroom").length > 1
    ) {
      foundRoomType = "bedroom";
    }

    const normalizedRoomType = normalizeRoomType(foundRoomType);

    matches.forEach((match) => {
      const parseFeetInches = (feetStr, inchStr) => {
        let feet = parseInt(feetStr || "0", 10);
        let inches = parseInt(inchStr || "0", 10);

        if (isNaN(inches)) {
          const raw = (inchStr || "").toLowerCase();
          if (/^\d{3}$/.test(raw)) {
            const parts = raw.match(/^(\d)(\d{2})$/);
            if (parts) {
              feet += parseInt(parts[1]);
              inches = parseInt(parts[2]);
            }
          } else if (["0a", "oa"].includes(raw)) {
            inches = 4;
          } else if (["l0", "lo", "io"].includes(raw)) {
            inches = 10;
          } else {
            inches = 0;
          }
        }

        return feet + inches / 12;
      };

      let width = 0;
      let height = 0;

      if (match.input.match(dimensionPatterns[0])) {
        width = parseFeetInches(match[1], match[2]);
        height = parseFeetInches(match[3], match[4]);
      } else if (match.input.match(dimensionPatterns[1])) {
        width = parseFloat(match[1]);
        height = parseFloat(match[2]);
      } else if (match.input.match(dimensionPatterns[2])) {
        width = parseFeetInches(match[1], match[2]);
        height = parseFeetInches(match[3], match[4]);
      } else if (match.input.match(dimensionPatterns[3])) {
        width = parseFloat(match[1]);
        height = parseFloat(match[2]);
      }

      const sqft = width * height;
      const sqm = sqft * 0.092903;

      const isBroken =
        isNaN(width) || isNaN(height) ||
        width <= 3 || height <= 3 ||
        width > 50 || height > 50 ||
        sqft < 30 || sqft > 1000;

      if (isBroken) {
        return; 
      }

      const roomKey = `${normalizedRoomType}-${width.toFixed(1)}x${height.toFixed(1)}`;
      if (!addedRoomKeys.has(roomKey)) {
        table.push({
          roomType: normalizedRoomType,
          width: `${width.toFixed(2)} ft`,
          height: `${height.toFixed(2)} ft`,
          areaSqFt: `${sqft.toFixed(2)} sqft`,
          areaSqM: `${sqm.toFixed(2)} sqm`,
        });
        addedRoomKeys.add(roomKey);
      }
    });
  });


  // lines.forEach((line, index) => {
  //   const normLine = normalizeLineForRoomMatch(line);
  //   for (const [key, pattern] of Object.entries(roomPatterns)) {
  //     if (pattern.test(normLine)) {
  //       const normalizedType = normalizeRoomType(key);
  //       const roomKey = `${normalizedType}-NODIM-${index}`;
  //       if (!addedRoomKeys.has(roomKey)) {
  //         table.push({
  //           roomType: normalizedType,
  //           width: "N/A",
  //           height: "N/A",
  //           areaSqFt: "N/A",
  //           areaSqM: "N/A",
  //         });
  //         addedRoomKeys.add(roomKey);
  //       }
  //     }
  //   }
  // });


  if (table.length === 0 && text.match(/\d{1,2}['’′]?\s*(\d{1,2})?["”°]?\s*[xX×]\s*\d{1,2}/)) {
    table.push({
      roomType: "Unlabeled Room",
      width: "N/A",
      height: "N/A",
      areaSqFt: "N/A",
      areaSqM: "N/A",
    });
  }

  return { apartmentType, totalSf, rooms: table };
};





export default function UniversalPdfExtractor() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [images, setImages] = useState([]);
  const canvasRef = useRef(null);
  const ROOM_TYPE_COLORS = useMemo(
    () => ({
      kitchen: "rgba(255, 165, 0, 0.3)",
      bedroom: "rgba(0, 0, 255, 0.3)",
      bathroom: "rgba(0, 255, 255, 0.3)",
      living: "rgba(0, 255, 0, 0.3)",
      dining: "rgba(255, 0, 0, 0.3)",
      garage: "rgba(128, 0, 128, 0.3)",
    }),
    []
  );

  useEffect(() => {
    const loadScript = (src, id, onloadCallback) => {
      if (document.getElementById(id)) {
        onloadCallback();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.id = id;
      script.onload = onloadCallback;
      script.onerror = () => console.error(`Failed to load script: ${src}`);
      document.head.appendChild(script);
    };

    let tesseractLoaded = false;
    let pdfjsLoaded = false;

    const checkAllScriptsLoaded = () => {
      if (tesseractLoaded && pdfjsLoaded) {
        Tesseract = window.Tesseract;
        pdfjsLib = window.pdfjsLib || window.pdfjs;
        if (pdfjsLib?.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";
        }
        setScriptsLoaded(true);
      }
    };

    loadScript(
      "https://unpkg.com/tesseract.js@2.1.0/dist/tesseract.min.js",
      "tesseract-script",
      () => {
        tesseractLoaded = true;
        checkAllScriptsLoaded();
      }
    );

    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js",
      "pdfjs-script",
      () => {
        pdfjsLoaded = true;
        checkAllScriptsLoaded();
      }
    );
  }, []);

  const handleFiles = async (event) => {
    const files = event.target.files;
    if (!files?.length || !scriptsLoaded) return;

    setLoading(true);
    setImages([]);
    setResults([]);

    const output = [];

    for (const file of files) {
      try {
        const extractedImages = await extractImagesFromPdf(file);
        setImages(extractedImages);

        const { text, ocrWords } = await runOcrOnImages(extractedImages);

        const { apartmentType, totalSf, rooms } = parseRoomDataFromText(text);

        output.push({
          fileName: file.name,
          text,
          ocrWords,
          apartmentType,
          totalSf,
          rooms,
        });
      } catch (err) {
        console.error("Error processing file:", file.name, err);
        output.push({ fileName: file.name, error: err.message });
      }
    }

    setResults(output);
    setLoading(false);
  };


 useEffect(() => {
  if (!results.length || !images.length) return;

  const canvas = document.getElementById("pdfCanvas");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const img = new Image();
  img.src = images[0];


  function renderClassifiedRoomsByOcr(
    canvas,
    context,
    classifiedRooms,
    ocrWords,
    canvasWidth,
    canvasHeight,
    originalImageWidth,
    originalImageHeight
  ) {
    const scaleX = canvasWidth / originalImageWidth;
    const scaleY = canvasHeight / originalImageHeight;
    const PADDING_RATIO = 0.4; 

    const roomsSorted = classifiedRooms.slice().sort((a, b) => {
      const getArea = (roomType) => {
        const regex = new RegExp(`\\b${roomType.toLowerCase()}\\b`);
        const words = ocrWords.filter(word => regex.test(word.text.toLowerCase()));
        if (!words.length) return 0;
        const x0 = Math.min(...words.map(w => w.bbox.x0));
        const y0 = Math.min(...words.map(w => w.bbox.y0));
        const x1 = Math.max(...words.map(w => w.bbox.x1));
        const y1 = Math.max(...words.map(w => w.bbox.y1));
        return (x1 - x0) * (y1 - y0);
      };
      return getArea(b.roomType) - getArea(a.roomType);
    });

    roomsSorted.forEach(({ roomType }) => {
      const regex = new RegExp(`\\b${roomType.toLowerCase()}\\b`);
      const matches = ocrWords.filter(word => regex.test(word.text.toLowerCase()));
      if (!matches.length) return;

      const x0s = matches.map(w => w.bbox.x0);
      const y0s = matches.map(w => w.bbox.y0);
      const x1s = matches.map(w => w.bbox.x1);
      const y1s = matches.map(w => w.bbox.y1);

      const avgHeight =
        y1s.reduce((a, b) => a + b, 0) / y1s.length -
        y0s.reduce((a, b) => a + b, 0) / y0s.length;
      const padding = avgHeight * PADDING_RATIO;

      const rectX1 = Math.max(0, Math.min(...x0s) - padding);
      const rectY1 = Math.max(0, Math.min(...y0s) - padding);
      const rectX2 = Math.min(originalImageWidth, Math.max(...x1s) + padding);
      const rectY2 = Math.min(originalImageHeight, Math.max(...y1s) + padding);

      const rectX = rectX1 * scaleX;
      const rectY = rectY1 * scaleY;
      const rectW = (rectX2 - rectX1) * scaleX;
      const rectH = (rectY2 - rectY1) * scaleY;

      const color = ROOM_TYPE_COLORS[roomType.toLowerCase()] || "rgba(100, 100, 100, 0.3)";
      context.fillStyle = color;
      context.fillRect(rectX, rectY, rectW, rectH);

      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.strokeRect(rectX, rectY, rectW, rectH);

      context.fillStyle = "black";
      context.font = "12px Arial";
      context.fillText(roomType, rectX + 5, rectY + 15);
    });
  }

  img.onload = () => {
    const originalImageWidth = img.width;
    const originalImageHeight = img.height;

    canvas.width = originalImageWidth;
    canvas.height = originalImageHeight;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    const lines = results[0]?.text?.split("\n") || [];
    lines.forEach((line, index) => {
      for (const [room, color] of Object.entries(ROOM_TYPE_COLORS)) {
        if (line.toLowerCase().includes(room)) {
          const x = 40;
          const y = 30 + index * 20;
          const width = 200;
          const height = 20;

          context.fillStyle = color;
          context.fillRect(x, y, width, height);

          context.font = "16px Arial";
          context.fillStyle = "black";
          context.fillText(line.trim(), x + 5, y + 16);
        }
      }
    });

 
    renderClassifiedRoomsByOcr(
      canvas,
      context,
      results[0].rooms,
      results[0].ocrWords,
      canvas.width,
      canvas.height,
      originalImageWidth,
      originalImageHeight
    );
  };
}, [results, images, ROOM_TYPE_COLORS]);

  return (
    <div className="bg-light d-flex flex-column align-items-center py-4 font-sans">
      <div className="bg-white p-4 rounded shadow w-100" style={{ maxWidth: "64rem" }}>
        <h4 className="text-center fw-bold mb-4">Batch PDF Room Extractor</h4>

        <div className="mb-3">
          <label htmlFor="file-upload" className="form-label fw-bold">
            Upload PDF Files:
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="application/pdf"
            onChange={handleFiles}
            className="form-control"
            disabled={!scriptsLoaded || loading}
          />
        </div>

        <canvas id="pdfCanvas" ref={canvasRef} className="mb-4 border rounded shadow-sm" style={{ width: "100%", maxWidth: "100%" }} />

        {(loading || !scriptsLoaded) && (
          <div className="d-flex align-items-center justify-content-center text-primary my-3">
            <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
            {scriptsLoaded ? "Processing..." : "Loading libraries..."}
          </div>
        )}

        {scriptsLoaded &&
          results.map((result, i) => (
            <div key={i} className="mt-4 p-4 bg-white rounded shadow-sm border">
              <h5 className="mb-3">{result.fileName}</h5>

              {result.error ? (
                <div className="text-danger fw-semibold">Error: {result.error}</div>
              ) : (
                <>
                  <h6 className="fw-semibold mb-2">Extracted Text</h6>
                  <pre
                    className="bg-light p-3 rounded border text-wrap"
                    style={{
                      height: "16rem",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {result.text}
                  </pre>

                  {result.apartmentType && (
                    <p className="mt-3 fw-semibold">
                      Apartment Type: <span className="text-primary">{result.apartmentType}</span>
                    </p>
                  )}

                  <h6 className="fw-semibold mt-4 mb-3">Classified Room Data</h6>
                  {result.rooms?.length ? (
                    <div className="table-responsive rounded border shadow-sm">
                      <table className="table table-striped mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Room Type</th>
                            <th>Width</th>
                            <th>Height</th>
                            <th>Area (sqft)</th>
                            <th>Area (sqm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.rooms.map((room, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{room.roomType || "Unknown"}</td>
                              <td>{room.width}</td>
                              <td>{room.height}</td>
                              <td>{room.areaSqFt}</td>
                              <td>{room.areaSqM}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="fst-italic text-secondary">No classified room data found.</p>
                  )}
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}


