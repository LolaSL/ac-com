import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Line, Text } from "react-konva";
import { Button, Form } from "react-bootstrap";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

let Tesseract;

/**
 * Defines regex patterns for various room types.
 * Patterns are refined to be more precise and flexible to handle OCR variations.
 */

const roomPatterns = {
  // Outdoor
  terrace:
    /\b(terrace|deck|patio|open\s*deck|cov(?:ered)?\s*deck|cov(?:ered)?\s*entry|cov\.?\s*entry)\b/i,

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
  bedroom:
    /\bbed(?:room|rm)?\b|b[eoia]d[\s._#-]*?(?:room|rm|#?\d)?\b|bdrm\.?#?\d?\b/i,

  secondBedroom: /\b(?:sec(?:ond)?\s*)?bed(?:room)?\b|bed\s*2|br\s*2\b/i,

  masterBedroom: /\b(master|mstr|mst)[\s._-]*(?:bed(?:room)?|suite)?\b/i,

  primaryBedroom: /\b(primary|main)[\s._-]*bed(?:room)?\b/i,

  // Work/study/office
  office: /\boffice|home\s*office|workspace\b/i,
  desk: /\bdesk(\s*(area|room))?\b/i,
  study: /\bstudy\b/i,
  drawingRoom: /\bdrawing\s*room|pooja\b/i,

  // Wellness
  gym: /\b(home\s*)?(gym|fitness|workout)(\s*room)?\b/i,

  // Other
  garage: /\bgarage\b/i,
};

const roomTypePriorities = [
  "kitchen",
  "livingroom",
  "diningroom",
  "office",
  "greatroom",
  "familyroom",
  "masterbedroom",
  "primarybedroom",
  "bedroom",
  "secondbedroom",
  "terrace",
  "sittingroom",
  "desk",
  "gym",
  "drawingroom",
  "breakfastroom",
  "lounge",
  "hall",
  "commonroom",
  "study",
  "garage",
];

const dimensionPatterns = [
  /\b(\d{1,2})['’′]?\s*(\d{1,2})?["”]?\s*[xX×]\s*(\d{1,3})['’′]?\s*(\d{0,2})?["”]?\b/g, // 16'6 x 10'4
  /\b(\d+(?:\.\d+)?)\s*ft\s*[xX×]\s*(\d+(?:\.\d+)?)\s*ft\b/g, // 16 ft x 10 ft
  /\b(\d{1,3})[-](\d{1,3})\s*[xX×]\s*(\d{1,3})[-](\d{1,3})\b/g, // 16-6 x 10-4
  /\b(\d{1,3})\s*[xX×]\s*(\d{1,3})\b/g, // 20 x 10 (assume feet)
  /\b(\d{1,2})[’']\s*(\d{1,2})["”]?\s*[xX×]\s*(\d{1,2})[’']\s*(\d{1,2})["”]?\b/g, // additional: 13'6" x 13'
  /\b(\d{1,2})['’′]?\s*[xX×]\s*(\d{1,2})(\d{1,2})\b/g, // matches: 16'x104 (-> 10'4)
];

const apartmentTypePattern =
  /\b(\d+\s*(?:bedroom|studio|loft|bath)\s*apartment\s*-?\s*model\s*[A-Z\d]+)\b/i;

const totalSfPattern = /\b(\d{3,5})\s*(?:sq\s*ft|sf)\b/i;

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
    .replace(
      /\b(\d{2})(\d{2})['"]?\s*[xX×]\s*(\d{1,2})['"]?(\d{1,2})?\b/,
      "$1'$2\" x $3'$4\""
    )
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Normalizes a raw room type string (e.g., "livingRoom" to "Living Room").
 * @param {string} raw - The raw room type string.
 * @returns {string} The normalized room type string.
 */
const normalizeRoomType = (raw) =>
  raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
  const apartmentType = apartmentTypeMatch
    ? apartmentTypeMatch[1].trim()
    : null;
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
      return (
        aScore - bScore ||
        roomTypePriorities.indexOf(a.type) - roomTypePriorities.indexOf(b.type)
      );
    });
    return roomCandidates[0]?.type || null;
  };

  lines.forEach((line, index) => {
    const cleanLine = fixAreaUnit(line);

    const areaMatches = [...cleanLine.matchAll(areaValuePattern)];
    if (areaMatches.length > 0) {
      let roomCandidates = [];

      for (
        let offset = -searchWindowSize;
        offset <= searchWindowSize;
        offset++
      ) {
        const nearbyIndex = index + offset;
        if (nearbyIndex >= 0 && nearbyIndex < lines.length) {
          const nearbyLine = normalizeLineForRoomMatch(lines[nearbyIndex]);
          for (const [key, pattern] of Object.entries(extendedRoomPatterns)) {
            if (pattern.test(nearbyLine)) {
              console.log(
                `Matched room type '${key}' on line: "${nearbyLine}"`
              );
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
        const normalizedType = normalizeRoomType(
          foundRoomType || `Room ${index}-${i}`
        );
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
    const matches = dimensionPatterns.flatMap((pattern) => [
      ...line.matchAll(pattern),
    ]);
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
    if (
      foundRoomType === "secondBedroom" &&
      !table.some((r) => r.roomType === "Primary Bedroom")
    ) {
      foundRoomType = "primaryBedroom";
    } else if (
      foundRoomType === "secondBedroom" &&
      table.filter((r) => r.roomType === "Second Bedroom").length > 1
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
        isNaN(width) ||
        isNaN(height) ||
        width <= 3 ||
        height <= 3 ||
        width > 50 ||
        height > 50 ||
        sqft < 30 ||
        sqft > 1000;

      if (isBroken) {
        return;
      }

      const roomKey = `${normalizedRoomType}-${width.toFixed(
        1
      )}x${height.toFixed(1)}`;
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

  if (
    table.length === 0 &&
    text.match(/\d{1,2}['’′]?\s*(\d{1,2})?["”°]?\s*[xX×]\s*\d{1,2}/)
  ) {
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

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [images, setImages] = useState([]);


  const clearResults = () => {
  setResults([]);
};

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

  const handleChange = async (event) => {
    const files = event.target.files;
    if (!files?.length || !scriptsLoaded) return;

    setLoading(true);
    setImages([]);
    setResults([]);
    setError(null);
    setIconPositions([]);
    setComments([]);

    const output = [];

    for (const file of files) {
      if (file.type !== "application/pdf") {
        output.push({
          fileName: file.name,
          error: "Only PDF files are allowed.",
        });
        continue;
      }

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

        if (!previewUrl) {
          setPreviewUrl(URL.createObjectURL(file));
          setFile(file);
        }
      } catch (err) {
        console.error("Error processing file:", file.name, err);
        output.push({ fileName: file.name, error: err.message });
      }
    }

    setResults(output);
    setLoading(false);

    if (output.length === 0) {
      setFile(null);
      setPreviewUrl(null);
      setError("No valid PDF files selected.");
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
        clearResults(); 
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
      const TITLE_BLOCK_HEIGHT_RATIO = 0.15;

      const titleBlockCutoffY = originalImageHeight * TITLE_BLOCK_HEIGHT_RATIO;

      const EXCLUDE_REGIONS = [
        {
          x: 0,
          y: 0,
          width: 800,
          height: 150,
        },
      ];

      const isWithinExcludedRegion = (x, y, width, height) => {
        for (const region of EXCLUDE_REGIONS) {
          if (
            x < region.x + region.width + 10 &&
            x + width > region.x - 10 &&
            y < region.y + region.height + 10 &&
            y + height > region.y - 10
          ) {
            return true;
          }
        }
        return false;
      };

      ocrWords.forEach((word) => {
        const { x0, y0, x1, y1 } = word.bbox;
        const width = x1 - x0;
        const height = y1 - y0;

        if (!isWithinExcludedRegion(x0, y0, width, height)) {
          context.fillStyle = "rgba(0, 255, 0, 0.3)";
          context.fillRect(x0, y0, width, height);
        }
      });

      const roomsSorted = classifiedRooms.slice().sort((a, b) => {
        const getArea = (roomType) => {
          const regex = new RegExp(`\\b${roomType.toLowerCase()}\\b`);
          const words = ocrWords.filter((word) =>
            regex.test(word.text.toLowerCase())
          );
          if (!words.length) return 0;
          const x0 = Math.min(...words.map((w) => w.bbox.x0));
          const y0 = Math.min(...words.map((w) => w.bbox.y0));
          const x1 = Math.max(...words.map((w) => w.bbox.x1));
          const y1 = Math.max(...words.map((w) => w.bbox.y1));
          return (x1 - x0) * (y1 - y0);
        };
        return getArea(b.roomType) - getArea(a.roomType);
      });

      roomsSorted.forEach(({ roomType }) => {
        const regex = new RegExp(`\\b${roomType.toLowerCase()}\\b`);
        const matches = ocrWords.filter((word) =>
          regex.test(word.text.toLowerCase())
        );
        if (!matches.length) return;

        const x0s = matches.map((w) => w.bbox.x0);
        const y0s = matches.map((w) => w.bbox.y0);
        const x1s = matches.map((w) => w.bbox.x1);
        const y1s = matches.map((w) => w.bbox.y1);

        const avgHeight =
          y1s.reduce((a, b) => a + b, 0) / y1s.length -
          y0s.reduce((a, b) => a + b, 0) / y0s.length;
        const padding = avgHeight * PADDING_RATIO;

        const rectX1 = Math.max(0, Math.min(...x0s) - padding);
        const rectY1 = Math.max(0, Math.min(...y0s) - padding);
        const rectX2 = Math.min(originalImageWidth, Math.max(...x1s) + padding);
        const rectY2 = Math.min(
          originalImageHeight,
          Math.max(...y1s) + padding
        );

        if (rectY2 < titleBlockCutoffY) return;

        const rectX = rectX1 * scaleX;
        const rectY = rectY1 * scaleY;
        const rectW = (rectX2 - rectX1) * scaleX;
        const rectH = (rectY2 - rectY1) * scaleY;
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
  }, [results, images]);

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
  if (canvas) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  setIconPositions([]);
  setPreviewUrl(null);
  setIsSaved(false);
  setRectangles([]);
  setComments([]);
  setFile(null);            
  setResults([]);         
  setError(null);           
  console.log("Canvas and table data cleared.");
};


  return (
    <div>
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
          id="file-upload"
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleChange}
          accept="application/pdf"
          disabled={!scriptsLoaded || loading}
        />
      </Form>
      <h2 className="mt-4 mb-4 text-secondary">Preview of selected file:</h2>
      {(loading || !scriptsLoaded) && (
        <div className="d-flex align-items-center justify-content-center text-primary my-3">
          <div
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></div>
          {scriptsLoaded ? "Processing..." : "Loading libraries..."}
        </div>
      )}

      {scriptsLoaded &&
        results.map((result, i) => (
          <div key={i} className="mt-4 p-4 bg-white rounded shadow-sm border">
            <h5 className="mb-3">File Name: {result.fileName}</h5>

            {result.error ? (
              <div className="text-danger fw-semibold">
                Error: {result.error}
              </div>
            ) : (
              <>
                {result.apartmentType && (
                  <p className="mt-3 fw-semibold">
                    Apartment Type:{" "}
                    <span className="text-primary">{result.apartmentType}</span>
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
                  <p className="fst-italic text-secondary">
                    No classified room data found.
                  </p>
                )}
              </>
            )}
          </div>
        ))}

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
