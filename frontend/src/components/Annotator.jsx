import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";
import {
  Button,
  Form,
  Table,
  ButtonToolbar,
  ButtonGroup,
} from "react-bootstrap";
import { Store } from "../Store.js";
import { toast } from "react-toastify";
import TableBody from "./TableBody";
import ExcelJS from "exceljs";
import "./Annotator.css";

import * as pdfjsLib from "pdfjs-dist";
import { FaFileExcel, FaFileCode, FaDownload, FaSpinner, FaTimes } from "react-icons/fa";
// Always use a worker URL that matches the actually-loaded pdfjs API version,
// otherwise the worker throws: 'The API version "X" does not match the Worker version "Y"'.
const PDFJS_VERSION = pdfjsLib.version || "2.10.377";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

let Tesseract;

/**
 * @fileoverview This file contains functions for parsing room data from text,
 * including OCR-extracted text from floor plan images.
 */

// Global configuration objects.
const roomPatterns = {
  // Outdoor
  terrace:
    /\b(terrace|deck|patio|open\s*deck|cov(?:ered)?\s*deck|cov\.?\s*entry)\b/i,
  patioDeck: /\b(?:patio|deck|balcony|veranda)\b/i,
  bonusRoom: /b[o0]nus[\s-]*room/i,
  covEnrty: /\bCOV\.?\s*ENTRY\b/i,

  // Dining & Living
  formalDining: /\bFORMAL\s*DINING\b/i,
  dining:
    /\b(din(?:ing|n+g|ng|inette)|dn(?:ing|n+g)|dr|dining\s*room|dining\s*area)\b/i,
  livingRoom: /\b(living|living\s*(room|area)?|lr)\b/i,
  living: /\bliving\b/i,
  livingDining:
    /\b(?:living\s*\/\s*din(?:ing|n?g|lng)|living[-\s]?\/?din(?:ing|n?g|lng)|living\s*room|dining\s*room)(?:\s*(room|area))?\b/i,
  livingDiningRoom:
    /\b(?:living\s*\/?\s*din(?:ing|n?g|lng)|living\s*dining|living\s*room|dining\s*room)(?:\s*(room|area))?\b/i,
  sittingRoom: /\bsitting\s*(room|area)?\b/i,
  lounge: /\b(lounge|mstr\s*suite)\b/i,
  hall: /\b(hall|living\s*hall|parking)\b/i,
  greatRoom: /\bgreat\s*rm\.?|great\s*room\b/i,
  commonRoom: /\bcommon\s*room\b/i,
  familyRoom: /\b(family\s*room|owner'?s?\s*suite)\b/i,
  sunRoom: /\bsunroom\b/i,
  chambre: /\bchambre\b/i,

  // Kitchen
  kitchen: /\b(kitchen|kitc?hen|ktcn|ktch?n)\b/i,
  breakfastRoom: /\b(breakfast\s*room|brkfst)\b/i,
  eatingRoom: /\b(?:EAT(?:ING)?\.?\s*(?:ROOM|RM))\b/i,

  // Bedrooms
  bedroom:
    /\b(?:primary\s+bed\s+room|master\s+bed\s+room|bed\s*rm|bd\s*rm|bed\s*room|bedrm|bdrm|bdr|borm|br)(?:\s*#?\s*\d+)?(?:\s*D)?\b/i,
  masterBedroom: /\b(master|mstr|mst)[\s._-]*(?:bed(?:room)?|suite)?\b/i,
  primaryBedroom: /\b(primary|main)[\s._-]*bed(?:room)?\b/i,
  bedroomPattern: /\b(BEDROOM\s*\d*)\b/i,
  // Work/study/office
  office: /\b(?:office|home\s*office|workspace)\b/i,
  desk: /\bdesk(\s*(area|room))?\b/i,
  study: /\bstudy\b/i,
  drawingRoom: /\bdrawing\s*room|pooja\b/i,
  landing: /\b(landing)\b/i,
  den: /\b(den|study)\b/i,
  entryway: /\b(entryway|entry|foyer)\b/i,

  // Wellness
  gym: /\b(gym|fitness|workout)(\s*room)?\b/i,
  // Other
  garage: /\bgarage\b/i,
  foyer: /\b(foyer|entry|entryway)\b/i,
  porch: /\bporch\b/i,
  corridor: /\bcorridor\b/i,
  laundry: /\blaundry\b/i,
  masterBathroom: /\b(master|mstr|mst)[\s._-]*(?:bath(?:room)?|dush)?\b/i,
  bathroom: /\bbathroom|bath\b/i,
};

const roomTypePriorities = [
  "primaryBedroom",
  "masterBedroom",
  "secondBedroom",
  "bedroom",
  "livingRoom",
  "livingDiningRoom",
  "greatRoom",
  "familyRoom",
  "dining",
  "kitchen",
  "breakfastRoom",
  "sittingRoom",
  "lounge",
  "hall",
  "office",
  "desk",
  "study",
  "drawingRoom",
  "gym",
  "terrace",
  "patioDeck",
  "commonRoom",
  "landing",
  "garage",
  "entryway",
  "den",
  "bonusRoom",
  "sunRoom",
  "foyer",
  "porch",
  "laundry",
  "masterBathroom",
  "bathroom",
  "covEntry",
  "formalDining",
  "living",
  "bedroomPattern",
  "eatingRoom",
];

const dimensionPatterns = [
  // Most robust OCR-friendly: allows optional inches, messy quotes, missing spaces
  /\b(\d{1,2})['’′]?\s*(\d{0,2})?["”%]?\s*[xX×]\s*(\d{1,2})['’′]?\s*(\d{0,2})?["”%]?\b/g,

  // Decimal feet with "ft" units: 16 ft x 10 ft
  /\b(\d+(?:\.\d+)?)\s*ft\s*[xX×]\s*(\d+(?:\.\d+)?)\s*ft\b/g,

  // Hyphenated feet-inches: 16-6 x 10-4
  /\b(\d{1,3})-(\d{1,2})\s*[xX×]\s*(\d{1,3})-(\d{1,2})\b/g,

  // Simple numbers separated by x, assume feet: 20 x 10
  /\b(\d{1,3})\s*[xX×]\s*(\d{1,3})\b/g,

  // OCR like "16'x104" → interpret as 16' x 10'4"
  /\b(\d{1,2})['’′]?\s*[xX×]\s*(\d{1,2})(\d{1,2})\b/g,

  // Extra forgiving: "9' x 10", "9 x 10'", "9 x10"
  /\b(\d{1,2})\s*['’′]?\s*[xX×]\s*(\d{1,2})\s*['’′"]?\b/g,
];

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
    .replace(/\bMstr\s*(Bath|Bathroom|Bth|Bthrm|Dush)?\b/i, "Master Bathroom")
    .replace(/\b(Bath|Bth|Bthrm|Dush)(?:\s*a)?\b/i, "Bathroom")
    .replace(/\bPrim(?:ary)?\s*Br\b/i, "Primary Bedroom")
    .replace(/\bSecond\s*Br\b/i, "Second Bedroom")
    .replace(/\bBr\b/i, "Bedroom")
    .replace(/\bBdrm\b/i, "Bedroom")
    .replace(/\bBedrm\b/i, "Bedroom")
    .replace(/\bHall\b/i, "Hall")
    .replace(/\bOffice\b/i, "Office")
    .replace(/\bKitchen\b/i, "Kitchen")
    .replace(/\bDining\b/i, "Dining Room")
    .replace(/\bLiving\b/i, "Living Room")
    .replace(/\bFamily\b/i, "Family Room")
    .replace(/\bPatio\b/i, "Patio/Deck")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeRoomData = (room) => {
  const widthFt = parseToFeet(room.width);
  const heightFt = parseToFeet(room.length);

  const areaSqFt = widthFt * heightFt;
  const areaSqM = areaSqFt * 0.092903;

  return {
    ...room,
    width: widthFt ? widthFt.toFixed(2) : "",
    length: heightFt ? heightFt.toFixed(2) : "",
    areaSqFt: areaSqFt ? areaSqFt.toFixed(2) : "",
    areaSqM: areaSqM ? areaSqM.toFixed(2) : "",
  };
};

const parseToFeet = (val) => {
  if (!val) return 0;
  val = val.trim();
  const feetInchFraction = val.match(/^(\d+)'\s*(\d+)?(?:\s+(\d+)\/(\d+))?"?$/);
  if (feetInchFraction) {
    const feet = parseInt(feetInchFraction[1], 10) || 0;
    const inches = parseInt(feetInchFraction[2], 10) || 0;
    const numerator = parseInt(feetInchFraction[3], 10) || 0;
    const denominator = parseInt(feetInchFraction[4], 10) || 1;
    const frac = numerator && denominator ? numerator / denominator : 0;
    return feet + (inches + frac) / 12;
  }

  const feetInchDecimal = val.match(/^(\d+)'\s*(\d+(?:\.\d+)?)"?$/);
  if (feetInchDecimal) {
    const feet = parseInt(feetInchDecimal[1], 10) || 0;
    const inches = parseFloat(feetInchDecimal[2]) || 0;
    return feet + inches / 12;
  }

  const num = parseFloat(val);
  if (!isNaN(num)) return num;

  return 0;
};
/**
 * Extracts images from a PDF file using pdfjs-dist.
 * @param {File} file - The PDF file object.
 * @returns {Promise<string[]>}
 */
const extractImagesFromPdf = async (file) => {
  if (!pdfjsLib || !pdfjsLib.getDocument) {
    throw new Error("PDF.js library not available.");
  }
  
  // Use FileReader as fallback for better browser compatibility
  let typedArray;
  if (file.arrayBuffer) {
    typedArray = new Uint8Array(await file.arrayBuffer());
  } else {
    // Fallback: use FileReader for older browsers
    typedArray = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
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
 * @returns {Promise<string>}
 */
const runOcrOnImages = async (images, setRoomData) => {
  if (!Tesseract?.recognize) {
    throw new Error("Tesseract.js not available.");
  }

  let fullText = "";
  let allWords = [];
  let allParsedResults = [];

  for (const image of images) {
    const {
      data: { text, words },
    } = await Tesseract.recognize(image, "eng", {
      // Pin paths explicitly: Tesseract.js otherwise tries to auto-derive a worker
      // URL (e.g. unpkg.com/tesseract.js@vX.Y.Z/...) which has historically been
      // broken on unpkg for some versions. Pinning avoids the
      // "Failed to execute 'importScripts' on 'WorkerGlobalScope'" error.
      workerPath: "https://unpkg.com/tesseract.js@5.0.4/dist/worker.min.js",
      corePath: "https://unpkg.com/tesseract.js-core@5.0.0",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
    });

    const parsedData = parseRoomDataFromText(text);

    if (parsedData?.rooms?.length) {
      allParsedResults.push(...parsedData.rooms);
    }

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

    allWords.push(...cleanedWords);
  }

  if (typeof setRoomData === "function") {
    setRoomData(allParsedResults);
  }

  return {
    text: fullText,
    ocrWords: allWords,
    parsedRoomData: allParsedResults,
  };
};

/**
 * Parses room data, apartment type, and total square footage from the extracted text.
 * Implements a more robust logic for associating dimensions with the correct room types,
 * and now includes refined duplicate entry prevention.
 * @param {string} text - The full extracted text from the PDF.
 * @returns {{apartmentType: string|null, totalSf: string|null, rooms: Array<Object>}}
 */
const parseRoomDataFromText = (rawText, fileName) => {
  let text = rawText
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .replace(/ﬁ/g, "fi")
    .replace(/(\d+)\s*(?:sq\.?ft|ft²)/gi, "$1 sqft")
    .replace(
      /(\b(BATH|BATHROOM|BTH|BTHRM|DUSH|BEDROOM|KITCHEN|LIVING|DINING|FOYER|PATIO)\b)[\r\n]+([^\r\n]+)/gi,
      "$1 $3"
    )
    .replace(/\s+/g, " ")
    .replace(/[”“]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–|—/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();

  const result = {
    apartmentType: null,
    rooms: null,
    fileName: fileName,
    error: null,
    totalSf: null,
  };

  const splitMultiRoomLines = (rawLines) => {
    const splitLines = [];
    if (!Array.isArray(rawLines)) return splitLines;

    const roomMatches = Object.values(roomPatterns)
      .map((pat) => pat.source)
      .join("|");
    const roomRegex = new RegExp(`(?=${roomMatches})`, "i");

    rawLines.forEach((line) => {
      if (!line || typeof line !== "string") return;

      line = line
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!line) return;

      const parts = line.split(roomRegex);
      parts.forEach((p) => {
        if (p && typeof p === "string" && p.trim()) splitLines.push(p.trim());
      });
    });

    return splitLines;
  };
  const getApartmentTypes = (cleanedText) => {
    const apartmentTypePattern =
      /\b(\d+\s+(?:bedroom|bed)\s*(?:[^\n]*?apartment|suite)?(?:\s*-\s*model\s*[A-Z\d]+)?|studio\s*apartment|loft\s*apartment)\b/gi;
    const matches = [...cleanedText.matchAll(apartmentTypePattern)];
    return matches.map((m) => m[1].trim());
  };

  const apartmentTypes = getApartmentTypes(text);
  const apartmentType = apartmentTypes[0] || null;


  const lines = splitMultiRoomLines(
    text.split("\n").map(cleanTextLine).filter(Boolean)
  );

  const table = [];
  result.rooms = table;
  const addedRoomKeys = new Set();

  const totalSfPattern = /\b(\d{3,5})\s*(?:sq\s*ft|sf)\b/i;
  const totalSfMatch = text.match(totalSfPattern);
  const totalSf = totalSfMatch ? totalSfMatch[1].trim() : null;
  result.totalSf = totalSf;

  const searchWindowSize = 5;
  const extendedRoomPatterns = { ...roomPatterns };

  const normalizeLineForRoomMatch = (line) => {
    if (!line) {
      return "";
    }

    let normalized = String(line).toLowerCase();

    normalized = normalized.replace(/[“”„]/g, '"');
    normalized = normalized.replace(/[‘’`´]/g, "'");

    normalized = normalized.replace(/[|()[\]:;={}]/g, " ");

    normalized = normalized.replace(/[^a-z0-9\s#'"x/.]/g, " ");

    normalized = normalized.replace(/\s+/g, " ");

    return normalized.trim();
  };
  const fixAreaUnit = (s) =>
    s.replace(/m[?®*]/gi, "m²").replace(/nv[?]/gi, "m²");

  const areaValuePattern = /(\d+(?:[.,]\d{1,2})?)\s*m(?:²|[?®*])?/gi;

  const getNearestRoomType = (roomCandidates) => {
    roomCandidates.sort((a, b) => {
      const aScore = a.distance === 0 ? -100 : a.distance;
      const bScore = b.distance === 0 ? -100 : b.distance;

      if (aScore !== bScore) {
        return aScore - bScore;
      }
      return (
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
            length: "N/A",
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

    const normalizedLine = normalizeLineForRoomMatch(
      line
        .replace(/\//g, " / ")
        .replace(/[^a-z0-9\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    for (const [key, pattern] of Object.entries(extendedRoomPatterns)) {
      if (pattern.test(normalizedLine)) {
        roomCandidates.push({ type: key, distance: 0 });
      }
    }

    for (let offset = -searchWindowSize; offset <= searchWindowSize; offset++) {
      const checkIndex = index + offset;
      if (checkIndex >= 0 && checkIndex < lines.length) {
        const nearbyLine = normalizeLineForRoomMatch(lines[checkIndex]);
        for (const [key, pattern] of Object.entries(extendedRoomPatterns)) {
          if (
            pattern.test(nearbyLine) &&
            !roomCandidates.some(
              (rc) => rc.type === key && rc.distance <= Math.abs(offset)
            )
          ) {
            roomCandidates.push({ type: key, distance: Math.abs(offset) });
          }
        }
      }
    }

    if (!roomCandidates.length) {
      for (let offset = -2; offset <= 2; offset++) {
        if (offset === 0) continue;
        const neighbor = lines[index + offset];
        if (!neighbor) continue;

        const cleanedNeighbor = normalizeRoomType(neighbor);

        if (
          /\b(bed\s*room|bdrm|borm|br|bed\s*rm)\b/i.test(cleanedNeighbor) ||
          /\b(mstr|master)\s*(bed(room)?|bdrm|br)\b/i.test(cleanedNeighbor) ||
          /\b(prim(?:ary)?)\s*(bed(room)?|bdrm|br)\b/i.test(cleanedNeighbor)
        ) {
          let type = "bedroom";
          if (/\b(mstr|master)/i.test(cleanedNeighbor)) type = "masterBedroom";
          else if (/\bprim/i.test(cleanedNeighbor)) type = "primaryBedroom";

          roomCandidates.push({ type, distance: Math.abs(offset) });
          break;
        }
      }
    }

    if (!roomCandidates.length) return;

    let foundRoomType = getNearestRoomType(roomCandidates);
    const sameLine = normalizeLineForRoomMatch(line);

    // 1️⃣ Explicit room type detection
    if (/kitchen/i.test(sameLine)) {
      foundRoomType = "kitchen";
    } else if (
      /living\s*\/?\s*din(?:ing|n?g|lng)?/i.test(sameLine) ||
      /\bdining\s*(room|area)?\b/i.test(sameLine) ||
      /\bdr\b/i.test(sameLine)
    ) {
      foundRoomType = "livingDiningRoom";
    } else if (/living\s*room/i.test(sameLine)) {
      foundRoomType = "livingRoom";
    } else if (/\b(patio|deck|balcony)\b/i.test(sameLine)) {
      foundRoomType = "patioDeck";
    }

    if (
      !foundRoomType &&
      /\b(mstr|master)\s*(bed|bdrm|br)?\b/i.test(sameLine)
    ) {
      foundRoomType = !table.some((r) => r.roomType === "Primary Bedroom")
        ? "primaryBedroom"
        : !table.some((r) => r.roomType === "Second Bedroom")
        ? "secondBedroom"
        : "bedroom";
    } else if (
      !foundRoomType &&
      /\b(prim|primary)\s*(bed|bdrm|br)?\b/i.test(sameLine)
    ) {
      foundRoomType = !table.some((r) => r.roomType === "Primary Bedroom")
        ? "primaryBedroom"
        : !table.some((r) => r.roomType === "Second Bedroom")
        ? "secondBedroom"
        : "bedroom";
    } else if (!foundRoomType && /\b(bed(room)?|bdrm|br)\b/i.test(sameLine)) {
      foundRoomType = !table.some((r) => r.roomType === "Primary Bedroom")
        ? "primaryBedroom"
        : !table.some((r) => r.roomType === "Second Bedroom")
        ? "secondBedroom"
        : "bedroom";
    }

    const hasKitchenHint = normalizedLine.includes("kitchen");
    const hasBedroomHint =
      normalizedLine.includes("bed") || normalizedLine.includes("edroom");
    const hasDiningHint =
      normalizedLine.includes("dining") || normalizedLine.includes("ining");

    if (hasKitchenHint && !hasBedroomHint && !hasDiningHint) {
      const nearbyBedroomCandidate = roomCandidates.find(
        (c) => c.type === "bedroom" && c.distance > 0 && c.distance <= 2
      );
      if (nearbyBedroomCandidate) {
        foundRoomType = "bedroom";
      }
    } else if (hasBedroomHint && (hasKitchenHint || hasDiningHint)) {
      foundRoomType = "bedroom";
    } else if (foundRoomType === "kitchen" && hasDiningHint) {
      foundRoomType = "diningRoom";
    }

    if (normalizedLine.includes("patio") || normalizedLine.includes("deck")) {
      foundRoomType = "patioDeck";
    }

    if (foundRoomType === "livingDining") {
      foundRoomType = "livingDiningRoom";
    }

    if (
      foundRoomType === "bedroom" ||
      foundRoomType === "secondBedroom" ||
      foundRoomType === "masterBedroom" ||
      foundRoomType === "primaryBedroom"
    ) {
      if (/bed(room)?|bdrm|br/i.test(normalizedLine)) {
        if (!table.some((r) => r.roomType === "Primary Bedroom")) {
          foundRoomType = "primaryBedroom";
        } else if (!table.some((r) => r.roomType === "Second Bedroom")) {
          foundRoomType = "secondBedroom";
        } else {
          foundRoomType = "bedroom";
        }
      }
    }

    let normalizedRoomType = normalizeRoomType(foundRoomType);

    normalizedRoomType = normalizedRoomType.replace(
      /\b(Bath|Bth|Bthrm|Dush)(?:\s*a)?\b/i,
      "Bathroom"
    );
    if (!normalizedRoomType) return;

    matches.forEach((match) => {
      const parseFeetInches = (feetStr, inchStr) => {
        let feet = parseInt(feetStr || "0", 10);
        let inches = parseInt(inchStr || "0", 10);

        if (isNaN(inches) && inchStr) {
          const raw = inchStr.replace(/[^0-9]/g, "");
          if (raw.length === 3) {
            feet += parseInt(raw[0]);
            inches = parseInt(raw.slice(1));
          } else if (raw.length === 2) {
            inches = parseInt(raw);
          } else {
            inches = 0;
          }
        }

        return feet + inches / 12;
      };

      let width = parseFeetInches(match[1], match[2]);
      let height = parseFeetInches(match[3], match[4]);

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
      } else if (match.input.match(dimensionPatterns[4])) {
        width = parseFeetInches(match[1], match[2]);
        height = parseFeetInches(match[3], match[4]);
      } else if (match.input.match(dimensionPatterns[5])) {
        width = parseFeetInches(match[1], "0");
        height = parseFeetInches(match[2], match[3]);
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

      if (isBroken) return;

      const roomKey = `${normalizedRoomType}-${width.toFixed(
        1
      )}x${height.toFixed(1)}`;
      if (!addedRoomKeys.has(roomKey)) {
        table.push({
          roomType: normalizedRoomType,
          width: `${width.toFixed(2)} ft`,
          length: `${height.toFixed(2)} ft`,
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
      length: "N/A",
      areaSqFt: "N/A",
      areaSqM: "N/A",
    });
  }

  return { apartmentType, rooms: table, totalSf, fileName };
};

const Annotator = ({
  fetchSavedPdfs,
  setRoomData,
  onExportToBtuCalculator,
}) => {
  const { state } = useContext(Store);
  const token = state?.userInfo?.token || state?.adminInfo?.token;
  const [iconPositions, setIconPositions] = useState([]);
  const [, setIsSaved] = useState(false);
  const canvasRef = useRef(null);
  const pdfDataRef = useRef(null); // Store PDF data for responsive re-rendering
  const [file, setFile] = useState(null);
  const stageRef = useRef(null);
  const [pdfSize, setPdfSize] = useState({
    width: 0,
    height: 0,
  });
  const [allRooms, setAllRooms] = useState([]);
  const [exportStatus, setExportStatus] = useState("idle");
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
  const [sortKey, setSortKey] = useState("roomType");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [pdfInfo, setPdfInfo] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomData, setEditingRoomData] = useState(null);
  const [editingFileIdx, setEditingFileIdx] = useState(null);
  const [editingRoomIdx, setEditingRoomIdx] = useState(null);
  const filteredRoomsRef = useRef([]);
  const [filteredRoomsTrigger, setFilteredRoomsTrigger] = useState(0);
  const [newRoom, setNewRoom] = useState({
    roomType: "",
    width: "",
    length: "",
    areaSqFt: "",
    areaSqM: "",
  });

  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [pdfRotation, setPdfRotation] = useState(0); // Store rotation in degrees
  const [pdfZoom, setPdfZoom] = useState(1); // Store pinch zoom level for small screens

  // Mobile-friendly prompt modal state (replaces window.prompt)
  const [acUnitInput, setAcUnitInput] = useState('');
  // Default to annotation mode (true) so users can create rectangles immediately
  // Ref mirrors for rectangles, comments, and lines — always up-to-date regardless of closure age.
  // Fixes a Safari stale-closure bug in confirmAcUnitAnnotation where deleting then
  // immediately re-creating the same label would incorrectly trigger "already exists".
  // linesRef is also used by the pagehide flush so deleted annotations don't reappear on
  // iOS Safari back-navigation when the 500 ms debounce hasn't fired yet.
  const rectanglesRef = useRef(rectangles);
  const commentsRef   = useRef(comments);
  const linesRef      = useRef(lines);

  // Mobile stable annotation bar (small screens only — replaces popup modal for touch)
  const [, setMobileAnnotationLabel] = useState('');
  const [mobileAnnotationActive, setMobileAnnotationActive] = useState(false);

  // ── Undo / Redo history ──────────────────────────────────────────────────────────
  const historyStack = useRef([]);       // array of { rectangles, comments, lines } snapshots
  const historyPointer = useRef(-1);     // points at current snapshot
  const isRestoringHistory = useRef(false); // prevents pushHistory during undo/redo

  const pushHistory = useCallback((rects, cmts, lns) => {
    if (isRestoringHistory.current) return;
    // Discard any future snapshots when a new action is recorded
    historyStack.current = historyStack.current.slice(0, historyPointer.current + 1);
    historyStack.current.push({
      rectangles: JSON.parse(JSON.stringify(rects)),
      comments:   JSON.parse(JSON.stringify(cmts)),
      lines:      JSON.parse(JSON.stringify(lns)),
    });
    if (historyStack.current.length > 50) historyStack.current.shift(); // cap at 50
    historyPointer.current = historyStack.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyPointer.current <= 0) return;
    historyPointer.current -= 1;
    const snap = historyStack.current[historyPointer.current];
    isRestoringHistory.current = true;
    setRectangles(snap.rectangles);
    setComments(snap.comments);
    setLines(snap.lines);
    isRestoringHistory.current = false;
  }, []);

  const redo = useCallback(() => {
    if (historyPointer.current >= historyStack.current.length - 1) return;
    historyPointer.current += 1;
    const snap = historyStack.current[historyPointer.current];
    isRestoringHistory.current = true;
    setRectangles(snap.rectangles);
    setComments(snap.comments);
    setLines(snap.lines);
    isRestoringHistory.current = false;
  }, []);

  // ── Annotation label editing ─────────────────────────────────────────────────────
  const [editingLabelRectId, setEditingLabelRectId] = useState(null);
  const [editingLabelValue, setEditingLabelValue]   = useState('');
  const [showEditLabelModal, setShowEditLabelModal] = useState(false);

  // ── acType selector for save ─────────────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  const [selectedAcTypeForSave, setSelectedAcTypeForSave] = useState('ductless');

  // ── Multi-page PDF navigation ────────────────────────────────────────────────────
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const pdfDocRef = useRef(null); // caches the loaded PDF document

  // ── sessionStorage persistence (fixes iOS Safari losing state on navigation) ──
  // Primary path: store annotation _id after save, re-fetch from backend on restore (no quota issues).
  // Fallback path: raw PDF bytes in sessionStorage for unsaved PDFs (works when PDF < ~3.5 MB).
  const SESSION_KEY_ANN_ID   = 'annotator_annotation_id';
  const SESSION_KEY_PDF      = 'annotator_pdf_data';
  const SESSION_KEY_NAME     = 'annotator_pdf_name';
  const SESSION_KEY_RECTS    = 'annotator_rectangles';
  const SESSION_KEY_COMMENTS = 'annotator_comments';
  const SESSION_KEY_LINES    = 'annotator_lines';
  const SESSION_KEY_ROOMS    = 'annotator_rooms';
  const SESSION_KEY_ROTATION = 'annotator_pdf_rotation';

  // Holds percent-based annotations fetched from backend; applied after PDF renders and pdfSize is known.
  const pendingPercentAnnotationsRef = useRef(null);

  // Apply percent-based annotations to state once canvas dimensions are known (after PDF renders).
  useEffect(() => {
    if (!pendingPercentAnnotationsRef.current) return;
    const ann = pendingPercentAnnotationsRef.current;
    pendingPercentAnnotationsRef.current = null;
    const cw = pdfSize.width;
    const ch = pdfSize.height;
    if (!cw || !ch) return;
    if (ann.rectangles?.length) {
      setRectangles(ann.rectangles.map(r => ({
        ...r,
        x: r.xPercent * cw,
        y: r.yPercent * ch,
        width: r.widthPercent * cw,
        height: r.heightPercent * ch,
      })));
    }
    if (ann.comments?.length) {
      setComments(ann.comments.map(c => ({
        ...c,
        x: c.xPercent * cw,
        y: c.yPercent * ch,
      })));
    }
    if (ann.lines?.length) {
      setLines(ann.lines.map(l => ({
        ...l,
        points: l.points.map((p, i) => i % 2 === 0 ? p * cw : p * ch),
      })));
    }
  }, [pdfSize]);

  // Restore state from sessionStorage on initial mount.
  useEffect(() => {
    const annotationId = sessionStorage.getItem(SESSION_KEY_ANN_ID);
    // Read token directly from localStorage to avoid stale-closure issues.
    const rawToken = (() => { try { return JSON.parse(localStorage.getItem('userInfo'))?.token || null; } catch { return null; } })();

    const restoreFromBytes = () => {
      const storedPdf  = sessionStorage.getItem(SESSION_KEY_PDF);
      const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
      if (!storedPdf || !storedName) return;
      try {
        const binary = atob(storedPdf);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob         = new Blob([bytes], { type: 'application/pdf' });
        const restoredFile = new File([blob], storedName, { type: 'application/pdf' });
        setFile(restoredFile);
        setPdfInfo({ fileName: storedName });
        setPreviewUrl(URL.createObjectURL(blob));
        const storedRects    = sessionStorage.getItem(SESSION_KEY_RECTS);
        const storedComments = sessionStorage.getItem(SESSION_KEY_COMMENTS);
        const storedLines    = sessionStorage.getItem(SESSION_KEY_LINES);
        const storedRooms    = sessionStorage.getItem(SESSION_KEY_ROOMS);
        const storedRotation = sessionStorage.getItem(SESSION_KEY_ROTATION);
        if (storedRects)    setRectangles(JSON.parse(storedRects));
        if (storedComments) setComments(JSON.parse(storedComments));
        if (storedLines)    setLines(JSON.parse(storedLines));
        if (storedRooms)    setAllRooms(JSON.parse(storedRooms));
        if (storedRotation) setPdfRotation(Number(storedRotation));
      } catch (e) {
        console.warn('Annotator: bytes restore failed', e);
      }
    };

    if (annotationId && rawToken) {
      // Primary path: re-fetch from backend (reliable on iOS, no quota issues).
      (async () => {
        try {
          const storedName     = sessionStorage.getItem(SESSION_KEY_NAME) || 'restored.pdf';
          const storedRotation = sessionStorage.getItem(SESSION_KEY_ROTATION);
          const storedRooms    = sessionStorage.getItem(SESSION_KEY_ROOMS);
          if (storedRotation) setPdfRotation(Number(storedRotation));
          if (storedRooms)    setAllRooms(JSON.parse(storedRooms));

          const [pdfRes, annRes] = await Promise.all([
            fetch(`/api/annotated-pdf/${annotationId}`, { headers: { Authorization: `Bearer ${rawToken}` } }),
            fetch(`/api/annotations/${annotationId}`,   { headers: { Authorization: `Bearer ${rawToken}` } }),
          ]);
          if (!pdfRes.ok) throw new Error(`PDF fetch ${pdfRes.status}`);

          const pdfBlob      = await pdfRes.blob();
          const restoredFile = new File([pdfBlob], storedName, { type: 'application/pdf' });
          setFile(restoredFile);
          setPdfInfo({ fileName: storedName });
          setPreviewUrl(URL.createObjectURL(pdfBlob));

          if (annRes.ok) {
            const annData = await annRes.json();
            const ann     = annData.annotations ? annData.annotations : annData;
            // Will be converted to pixels once pdfSize is known after rendering.
            pendingPercentAnnotationsRef.current = ann;
          }
        } catch (e) {
          console.warn('Annotator: backend restore failed, trying bytes fallback', e);
          restoreFromBytes();
        }
      })();
    } else {
      restoreFromBytes();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref mirrors in sync with state.
  useEffect(() => { rectanglesRef.current = rectangles; }, [rectangles]);
  useEffect(() => { commentsRef.current   = comments;   }, [comments]);
  useEffect(() => { linesRef.current      = lines;      }, [lines]);

  // Persist light metadata to sessionStorage whenever annotations change.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY_RECTS,    JSON.stringify(rectangles));
        sessionStorage.setItem(SESSION_KEY_COMMENTS, JSON.stringify(comments));
        sessionStorage.setItem(SESSION_KEY_LINES,    JSON.stringify(lines));
      } catch (e) { /* quota exceeded – silent fail */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [rectangles, comments, lines]);

  // Flush annotation state to sessionStorage immediately when iOS Safari navigates away.
  // Without this, the 500 ms debounce above may not have fired, so a deletion done just
  // before navigating would NOT be persisted — the deleted annotation then reappears on
  // back-navigation ("ghost annotation" echo bug on Safari iOS).
  useEffect(() => {
    const flushOnHide = () => {
      try {
        sessionStorage.setItem(SESSION_KEY_RECTS,    JSON.stringify(rectanglesRef.current));
        sessionStorage.setItem(SESSION_KEY_COMMENTS, JSON.stringify(commentsRef.current));
        sessionStorage.setItem(SESSION_KEY_LINES,    JSON.stringify(linesRef.current));
      } catch (e) { /* quota exceeded */ }
    };
    window.addEventListener('pagehide', flushOnHide);
    return () => window.removeEventListener('pagehide', flushOnHide);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY_ROOMS,    JSON.stringify(allRooms)); } catch (e) { /* silent */ }
  }, [allRooms]);

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY_ROTATION, String(pdfRotation)); } catch (e) { /* silent */ }
  }, [pdfRotation]);

  const idsMatch = useCallback((left, right) => {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left) === String(right);
  }, []);

  const removeAnnotationByRectId = useCallback((rectId) => {
    // snapshot BEFORE deletion so it can be undone
    pushHistory(rectanglesRef.current, commentsRef.current, lines);

    const filteredRects    = rectanglesRef.current.filter((r) => !idsMatch(r.id, rectId));
    const filteredComments = commentsRef.current.filter((c) => !idsMatch(c.rectId, rectId));

    // Synchronously update ref mirrors so the duplicate-check in confirmAcUnitAnnotation
    // sees the deletion immediately. On Safari iOS the next tap can fire before the
    // useEffect that mirrors state→ref has a chance to run (useEffect runs after paint).
    rectanglesRef.current = filteredRects;
    commentsRef.current   = filteredComments;

    setRectangles(filteredRects);
    setComments(filteredComments);
    setLines((prevLines) => prevLines.filter((line) => !idsMatch(line.rectId, rectId)));
  }, [idsMatch, pushHistory, lines]);
  
  // Track if currently dragging to prevent modal from showing
  const isDraggingRef = useRef(false);
  
  const isSavingRef = useRef(false); // Synchronous flag to prevent duplicate saves
  
  // Track pinch zoom on small screens
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const containerMainRef = useRef(null); // ref for non-passive touch listeners
  const pdfZoomRef = useRef(1);          // mirrors pdfZoom state for use inside event listeners
  const isPinchingRef = useRef(false);   // true while a 2-finger pinch is active — guards resize handler
  // Track in-flight PDF.js render task so we can cancel before starting a new one
  const renderTaskRef = useRef(null);

  // Keep pdfZoomRef in sync with state
  useEffect(() => { pdfZoomRef.current = pdfZoom; }, [pdfZoom]);

  // Attach non-passive touchmove on container-main so e.preventDefault() actually works.
  // React attaches passive listeners by default which silently ignores preventDefault,
  // causing the browser to scroll AND zoom simultaneously (the "diagonal" effect).
  // NOTE: depends on previewUrl so it re-runs after the PDF loads (container-main
  //       only renders when previewUrl is set, so containerMainRef is null at mount).
  useEffect(() => {
    const el = containerMainRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 2 && window.innerWidth < 768) {
        // Prevent browser committing to a pan/zoom gesture so our JS handler takes over
        e.preventDefault();
        isPinchingRef.current = true;
        const t1 = e.touches[0], t2 = e.touches[1];
        pinchStartDistanceRef.current = Math.hypot(
          t2.clientX - t1.clientX, t2.clientY - t1.clientY
        );
        pinchStartZoomRef.current = pdfZoomRef.current;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && window.innerWidth < 768 && pinchStartDistanceRef.current > 0) {
        e.preventDefault(); // works because listener is non-passive
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const newZoom = Math.max(1, Math.min(4, pinchStartZoomRef.current * (dist / pinchStartDistanceRef.current)));
        setPdfZoom(newZoom);
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchStartDistanceRef.current = 0;
        isPinchingRef.current = false;
      }
    };

    // Safari iOS fires proprietary gesture* events alongside the W3C touch events.
    // preventDefault() on touchstart/touchmove does NOT stop these — they must be
    // cancelled separately, otherwise Safari applies its own rotate/scale transform
    // on top of the canvas, which appears as a visual rotation to the user.
    const onGestureStart  = (e) => e.preventDefault();
    const onGestureChange = (e) => e.preventDefault();
    const onGestureEnd    = (e) => e.preventDefault();

    el.addEventListener('touchstart',    onTouchStart,    { passive: false });
    el.addEventListener('touchmove',     onTouchMove,     { passive: false });
    el.addEventListener('touchend',      onTouchEnd,      { passive: true });
    el.addEventListener('gesturestart',  onGestureStart,  { passive: false });
    el.addEventListener('gesturechange', onGestureChange, { passive: false });
    el.addEventListener('gestureend',    onGestureEnd,    { passive: false });

    return () => {
      el.removeEventListener('touchstart',    onTouchStart);
      el.removeEventListener('touchmove',     onTouchMove);
      el.removeEventListener('touchend',      onTouchEnd);
      el.removeEventListener('gesturestart',  onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
      el.removeEventListener('gestureend',    onGestureEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  // const clearResults = () => {
  //   setResults([]);
  // };

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
          const ver = pdfjsLib.version || "2.10.377";
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.worker.min.js`;
        }
        setScriptsLoaded(true);
      }
    };

    loadScript(
      "https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js",
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

    const file = files[0];
    setPdfInfo({ fileName: file.name });
    setLoading(true);
    setImages([]);
    setResults([]);
    setError(null);
    setIconPositions([]);
    setComments([]);
    setRectangles([]);
    setLines([]);
    setPreviewUrl(null);
    setFile(null);
    setPdfRotation(0); // Reset rotation when new file is uploaded
    setCurrentPage(1);
    setTotalPages(1);
    pdfDocRef.current = null; // Invalidate cached PDF doc
    // Clear old session state so new file starts fresh
    ['annotator_annotation_id', 'annotator_pdf_data', 'annotator_pdf_name',
     'annotator_rectangles', 'annotator_comments', 'annotator_lines',
     'annotator_rooms', 'annotator_pdf_rotation'].forEach(k => sessionStorage.removeItem(k));

    const output = [];
    let previewSet = false; // Track if preview has been set for the first valid file

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
        const normalizedRooms = rooms.map(normalizeRoomData);
        output.push({
          fileName: file.name,
          text,
          ocrWords,
          apartmentType,
          totalSf,
          rooms: normalizedRooms,
        });
        console.log(text);
        if (!previewSet) {
          setPreviewUrl(URL.createObjectURL(file));
          setFile(file);
          previewSet = true;
          // Signal parent that a file is loaded so BTU Calculator becomes visible
          // even before OCR finishes (or if OCR finds no rooms)
          if (setRoomData) setRoomData([], []);
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

  const generateUniqueId = () => {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  };

  useEffect(() => {
    // Guard: only run when there are actual OCR results.
    // Without this guard the effect fires on mount with results=[] and calls
    // setAllRooms([]), racing with (and overwriting) the sessionStorage restore
    // that also runs on mount.  It also triggers the [allRooms] persist effect
    // which immediately writes [] back to sessionStorage, corrupting future
    // back-navigation restores — the root cause of the "echo calculation table"
    // bug on Safari iOS small screens.
    if (results?.length) {
      setAllRooms(
        results.map((result) => {
          const roomsWithIds = (result.rooms || []).map((room) => ({
            ...room,
            uniqueId: generateUniqueId(),
          }));
          return roomsWithIds;
        })
      );
      // Trigger BTU Calculator update when new results arrive
      setFilteredRoomsTrigger((prev) => prev + 1);
    }
  }, [results]);

  // Helper function to format rooms with flat prefixes
  const formatRoomsWithFlatPrefixes = useCallback((validRooms, acAnnotations) => {
    // Build AC annotations from current canvas comments if not provided
    const annotations = acAnnotations || comments
      .filter((c) => c.text)
      .map((c) => ({
        label: c.text,
        coordinates: { x: c.x, y: c.y },
      }));

    // Detect flat numbers from annotations
    const detectedFlatNums = new Set();
    annotations.forEach(({ label }) => {
      const t = label.toLowerCase();
      const cm = t.match(/condenser[-\s]?(\d+)/);
      if (cm) detectedFlatNums.add(parseInt(cm[1], 10));
      const fm = t.match(/(?:flat|unit)\s*(\d+)/);
      if (fm) detectedFlatNums.add(parseInt(fm[1], 10));
      const am = t.match(/ac[-\s]?(\d+)\.\d+/);
      if (am) detectedFlatNums.add(parseInt(am[1], 10));
    });

    let flatNumsArray = Array.from(detectedFlatNums).sort((a, b) => a - b);
    const isMultiFlat = flatNumsArray.length > 1;

    // Format rooms, adding flat prefixes when multi-flat
    // Strategy: group duplicate room types and distribute them round-robin
    // across flats. e.g. Kitchen#1 → Flat 1, Kitchen#2 → Flat 2
    let formattedRooms = [];
    if (isMultiFlat) {
      const numFlats = flatNumsArray.length;
      // Count how many times each room type appears
      const typeCounters = {};
      validRooms.forEach((room) => {
        const base = room.roomType || "Room";
        const alreadyPrefixed = /^flat\s*\d+\s*[: ]/i.test(base);
        if (alreadyPrefixed) return; // skip, handled below
        const key = base.toLowerCase();
        typeCounters[key] = (typeCounters[key] || 0);
      });

      // Assign each room to a flat based on its occurrence index among same type
      const typeOccurrence = {};
      formattedRooms = validRooms.map((room) => {
        const base = room.roomType || "Room";
        const alreadyPrefixed = /^flat\s*\d+\s*[: ]/i.test(base);
        let name = base;

        if (!alreadyPrefixed) {
          const key = base.toLowerCase();
          const occurrence = typeOccurrence[key] || 0;
          typeOccurrence[key] = occurrence + 1;
          const flatIndex = Math.min(occurrence, numFlats - 1);
          const flatNum = flatNumsArray[flatIndex];
          name = `Flat ${flatNum}: ${base}`;
        }

        return {
          name,
          size:
            parseFloat(
              (room.areaSqM || "0").toString().replace(/[^\d.-]/g, "")
            ) || 0,
          btu: 0,
          unit: "meters",
        };
      });
    } else {
      formattedRooms = validRooms.map((room) => {
        const base = room.roomType || "Room";
        return {
          name: base,
          size:
            parseFloat(
              (room.areaSqM || "0").toString().replace(/[^\d.-]/g, "")
            ) || 0,
          btu: 0,
          unit: "meters",
        };
      });
    }

    // When multi-flat: sort by flat number so flats are grouped
    if (isMultiFlat) {
      formattedRooms = formattedRooms
        .map((r) => ({
          ...r,
          _flatNum: parseInt(r.name.match(/^flat\s*(\d+)/i)?.[1] || "1", 10),
        }))
        .sort((a, b) => a._flatNum - b._flatNum)
        .map(({ _flatNum, ...r }) => r);
    }

    return { formattedRooms, isMultiFlat, annotations };
  }, [comments]);

  // Auto-update BTU Calculator whenever filtered rooms change
  useEffect(() => {
    // Get filtered rooms from the table (from filteredRoomsRef)
    const filteredRooms = filteredRoomsRef.current.flat().filter(Boolean);

    if (setRoomData && filteredRooms.length > 0) {
      // Filter out rooms without valid roomType and areaSqM
      const validRooms = filteredRooms.filter(
        (room) => room.roomType && room.areaSqM
      );

      if (validRooms.length > 0) {
        const { formattedRooms, isMultiFlat, annotations } = formatRoomsWithFlatPrefixes(validRooms);
        
        console.log("Sending to BTU Calculator (multi-flat:", isMultiFlat, "):", formattedRooms);
        // Pass rooms AND annotations so BtuCalculator can detect multi-flat
        setRoomData(formattedRooms, isMultiFlat ? annotations : []);
      }
    }
    // Intentionally exclude `setRoomData` from deps to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRoomsTrigger, comments]);

  // Trigger update when filter text changes
  useEffect(() => {
    setFilteredRoomsTrigger((prev) => prev + 1);
  }, [filterText]);

  const handleAddRoom = (fileIdx) => {
    setAllRooms((prev) => {
      const updated = [...prev];

      const widthFt = parseToFeet(newRoom.width);
      const heightFt = parseToFeet(newRoom.length);

      const areaSqFt = widthFt * heightFt;
      const areaSqM = areaSqFt * 0.092903;

      const roomWithAreas = {
        ...newRoom,
        width: widthFt.toFixed(2),
        length: heightFt.toFixed(2),
        areaSqFt: areaSqFt.toFixed(2),
        areaSqM: areaSqM.toFixed(2),
        uniqueId: Date.now() + Math.random(),
      };

      updated[fileIdx] = [...(updated[fileIdx] || []), roomWithAreas];
      return updated;
    });

    setNewRoom({
      roomType: "",
      width: "",
      length: "",
      areaSqFt: "",
      areaSqM: "",
    });
    // Trigger BTU Calculator update
    setFilteredRoomsTrigger((prev) => prev + 1);
  };

  const handleEditClick = (room, roomIdx, fileIdx) => {
    setEditingRoomData({ ...room });
    setEditingRoomIdx(roomIdx);
    setEditingFileIdx(fileIdx);
    setEditingRoomId(room.uniqueId);
  };

  const handleCancelEdit = () => {
    setEditingRoomData(null);
    setEditingRoomIdx(null);
    setEditingFileIdx(null);
  };

  const handleEditingChange = (field, value) => {
    const newEditingRoomData = { ...editingRoomData, [field]: value };

    const parseFeetAndInches = (inputValue) => {
      if (inputValue.includes("'") || inputValue.includes('"')) {
        const parts = inputValue.split(/[ '"]+/).filter(Boolean);
        const feet = parseFloat(parts[0]) || 0;
        const inches = parseFloat(parts[1]) || 0;
        return feet + inches / 12;
      } else {
        return parseFloat(inputValue);
      }
    };

    if (field === "width" || field === "length") {
      const newWidth = parseFeetAndInches(newEditingRoomData.width);
      const newHeight = parseFeetAndInches(newEditingRoomData.length);

      if (!isNaN(newWidth) && !isNaN(newHeight)) {
        const areaSqFt = (newWidth * newHeight).toFixed(2);
        const areaSqM = (areaSqFt * 0.092903).toFixed(2);

        newEditingRoomData.areaSqFt = areaSqFt;
        newEditingRoomData.areaSqM = areaSqM;
      } else {
        newEditingRoomData.areaSqFt = "Invalid input";
        newEditingRoomData.areaSqM = "Invalid input";
      }
    }

    setEditingRoomData(newEditingRoomData);
  };

  const handleSaveEdit = () => {
    setAllRooms((prev) => {
      const updated = [...prev];
      const roomsForFile = updated[editingFileIdx];

      if (roomsForFile) {
        const roomToUpdateIndex = roomsForFile.findIndex(
          (r) => r.uniqueId === editingRoomId
        );

        if (roomToUpdateIndex !== -1) {
          roomsForFile[roomToUpdateIndex] = { ...editingRoomData };
        }
      }
      return updated;
    });

    setEditingRoomData(null);
    setEditingRoomIdx(null);
    setEditingFileIdx(null);
    setEditingRoomId(null);
    // Trigger BTU Calculator update
    setFilteredRoomsTrigger((prev) => prev + 1);
  };

  const handleDeleteRoom = (roomId, fileIdx) => {
    setAllRooms((prev) => {
      const updated = [...prev];

      if (Array.isArray(updated[fileIdx])) {
        updated[fileIdx] = updated[fileIdx].filter(
          (room) => room.uniqueId !== roomId
        );
      }
      return updated;
    });
    // Trigger BTU Calculator update
    setFilteredRoomsTrigger((prev) => prev + 1);
  };

  // Returns [x1,y1, x2,y2] connecting the nearest edges of the rect and comment box.
  // This keeps the line short instead of crossing through both shapes.
  const getLinePoints = (rectX, rectY, rectW, rectH, commentX, commentY) => {
    const charWidth = 6;
    const textPadding = 6;
    // comment box height is 16, estimated from rendering
    const startX = commentX > rectX ? rectX + rectW : rectX;
    const startY = rectY + rectH / 2;
    const endX   = commentX > rectX ? commentX : commentX + Math.max(48, charWidth + textPadding);
    const endY   = commentY + 8; // mid-height of comment box (16/2)
    return [startX, startY, endX, endY];
  };

  // Confirm the AC unit annotation after modal input
  // Get responsive rectangle dimensions based on screen width
  const getResponsiveRectSize = () => {
    const width = window.innerWidth;
    if (width < 480) {
      return { width: 24, height: 9 };
    } else if (width < 768) {
      return { width: 32, height: 11 };
    }
    return { width: 54, height: 18 };
  };

  // Returns {x, y} for the comment box next to a rect, clamped to canvas bounds.
  const computeCommentPos = useCallback((rectX, rectY, rectW, rectH, commentText) => {
    const canvasWidth = pdfSize.width;
    const canvasHeight = pdfSize.height;
    const _w = window.innerWidth;
    const charWidth   = _w < 480 ? 4 : _w < 768 ? 5 : 6;
    const textPadding = _w < 480 ? 3 : _w < 768 ? 4 : 6;
    const minBoxWidth = _w < 480 ? 24 : _w < 768 ? 28 : 48;
    const boxWidth = Math.max(minBoxWidth, commentText.length * charWidth + textPadding);
    const boxHeight = _w < 480 ? 10 : _w < 768 ? 12 : 16;
    // +2 so comment box centre aligns with rect centre (box renders at y-10, h=16, centre=y-2)
    let cx = rectX + rectW + 2;
    let cy = rectY + rectH / 2 + 2;
    if (canvasWidth > 0 && cx + boxWidth > canvasWidth) cx = rectX - boxWidth - 2;
    if (cx < 0) cx = 2;
    if (canvasHeight > 0) {
      if (cy + boxHeight > canvasHeight) cy = canvasHeight - boxHeight - 2;
      if (cy < 0) cy = 2;
    }
    return { x: cx, y: cy };
  }, [pdfSize]);

  // Keyboard shortcut Ctrl+Z / Ctrl+Y for undo/redo
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const confirmAcUnitAnnotation = useCallback((commentText, position) => {
    
    if (!commentText) {
      console.log('confirmAcUnitAnnotation: no comment text, returning');
      return;
    }

    const normalizedCommentText = commentText.trim().toLowerCase();
    if (!normalizedCommentText) {
      return;
    }

    // Only treat a label as duplicate if it belongs to a comment that is still
    // attached to an existing rectangle. This allows recreating deleted labels.
    // Use ref mirrors instead of closure values to avoid stale-closure false positives in Safari.
    const existingRectIds = new Set(rectanglesRef.current.map((rect) => String(rect.id)));
    
    const existingComment = commentsRef.current.some((comment) => {
      const hasActiveRect = existingRectIds.has(String(comment.rectId));
      const sameText =
        typeof comment.text === 'string' &&
        comment.text.trim().toLowerCase() === normalizedCommentText;
      return hasActiveRect && sameText;
    });

    if (existingComment) {
      console.log('confirmAcUnitAnnotation: comment already exists');
      toast.error('This comment already exists.');
      return;
    }
    
    const newRectId = Date.now();
    const trimmedText = normalizedCommentText;
    const isCondenser = /^condenser/i.test(trimmedText) || trimmedText.includes('condenser');
    const rectSize = getResponsiveRectSize();
    console.log('confirmAcUnitAnnotation: creating rect at position', position, 'with size', rectSize, { trimmedText, isCondenser });
    
    const newRect = {
      id: newRectId,
      x: position.x,
      y: position.y,
      width: rectSize.width,
      height: rectSize.height,
      fill: isCondenser ? 'rgba(255, 140, 50, 0.7)' : 'rgba(20, 205, 230, 0.7)',
      stroke: isCondenser ? '#cc5500' : undefined,
      rotation: 0,
    };
    // snapshot BEFORE placing so it can be undone
    pushHistory(rectanglesRef.current, commentsRef.current, lines);
    setRectangles((prevRects) => [...prevRects, newRect]);
    const newCommentId = `comment-${Date.now()}`;

    const commentPos = computeCommentPos(
      newRect.x, newRect.y, newRect.width, newRect.height, commentText
    );

    const newComment = {
      id: newCommentId,
      rectId: newRectId,
      text: commentText,
      x: commentPos.x,
      y: commentPos.y,
      fill: 'rgba(226, 218, 228, 0.3)',
    };
    setComments((prevComments) => [...prevComments, newComment]);
    const newLine = {
      id: `line-${Date.now()}`,
      rectId: newRectId,
      commentId: newCommentId,
      points: getLinePoints(
        newRect.x, newRect.y, newRect.width, newRect.height,
        newComment.x, newComment.y
      ),
      stroke: 'black',
      strokeWidth: 1,
    };
    setLines((prevLines) => [...prevLines, newLine]);
  }, [computeCommentPos, pushHistory, lines]);

  const handleStageClick = (event) => {
    // Small screens use handleStageTouchEnd (onTap) exclusively — skip here
    if (window.innerWidth < 768) return;
    // Don't show modal during drag or rotation
    if (isDraggingRef.current || isRotating) return;
    if (event.target === event.target.getStage()) {
      let pointerPosition = stageRef.current.getPointerPosition();
      if (!pointerPosition) return;

      // Use pre-typed label from stable input — skip if empty
      if (!acUnitInput.trim()) return;
      confirmAcUnitAnnotation(acUnitInput.trim(), { x: pointerPosition.x, y: pointerPosition.y });
    }
  };

  // Handle touch tap on stage for placing annotations (mobile equivalent of click)
  const handleStageTouchEnd = (event) => {
    // Don't place during drag or rotation
    if (isDraggingRef.current || isRotating) return;

    // Only act on blank stage area (not on existing shapes)
    if (event.target.name && event.target.name() === 'rect') return;

    // ── Small screens: gate behind Place mode toggle to prevent accidental triggers ──
    if (window.innerWidth < 768) {
      if (!mobileAnnotationActive) return; // mode is off — ignore accidental taps
    }

    // Use pre-typed label from stable input — skip if empty
    let pointerPosition = stageRef.current.getPointerPosition();
    if (!pointerPosition) return;
    const containerMain = document.querySelector('.container-main');
    if (containerMain && window.innerWidth < 768) {
      pointerPosition = {
        x: pointerPosition.x + containerMain.scrollLeft,
        y: pointerPosition.y + containerMain.scrollTop,
      };
    }
    if (!acUnitInput.trim()) return;
    confirmAcUnitAnnotation(acUnitInput.trim(), { x: pointerPosition.x, y: pointerPosition.y });
  };

  const handleRectangleRightClick = (event) => {
    event.evt.preventDefault();
    const clickedRectId = event.target.attrs.id;
    removeAnnotationByRectId(clickedRectId);
  };

  const handleCanvasEvent = (e) => {
    if (window.innerWidth < 768) return; // small screens handled by handleStageTouchEnd
    handleStageClick(e);
  };

  const handleDragMove = (e) => {
    isDraggingRef.current = true;
    const draggedNode = e.target;
    const draggedId = draggedNode.id();

    // Keep comment tracking the rect in real time (prevents visual lag)
    const isRectDrag = rectangles.some((r) => idsMatch(r.id, draggedId));
    if (isRectDrag) {
      const linkedComment = comments.find((c) => idsMatch(c.rectId, draggedId));
      if (linkedComment) {
        const rw = draggedNode.width();
        const rh = draggedNode.height();
        const pos = computeCommentPos(draggedNode.x(), draggedNode.y(), rw, rh, linkedComment.text);
        setComments((prev) =>
          prev.map((c) => idsMatch(c.rectId, draggedId) ? { ...c, x: pos.x, y: pos.y } : c)
        );
        setLines((prev) =>
          prev.map((l) => {
            if (!idsMatch(l.rectId, draggedId)) return l;
            return { ...l, points: getLinePoints(draggedNode.x(), draggedNode.y(), rw, rh, pos.x, pos.y) };
          })
        );
      }
    }

    const layer = draggedNode.getLayer();
    if (layer) layer.batchDraw();
  };

  const handleDragEnd = (e) => {
    isDraggingRef.current = false;
    const draggedNode = e.target;
    const draggedId = draggedNode.id();

    // Check if it's a rect being dragged (has a matching rectangle) or a comment text
    const isRectDrag = rectangles.some((r) => idsMatch(r.id, draggedId));

    if (isRectDrag) {
      const rw = draggedNode.width();
      const rh = draggedNode.height();
      const newRectX = draggedNode.x();
      const newRectY = draggedNode.y();

      const linkedComment = comments.find((c) => idsMatch(c.rectId, draggedId));
      let newCommentX = newRectX;
      let newCommentY = newRectY;

      if (linkedComment) {
        const pos = computeCommentPos(newRectX, newRectY, rw, rh, linkedComment.text);
        newCommentX = pos.x;
        newCommentY = pos.y;
      }

      setRectangles((prevRects) =>
        prevRects.map((rect) =>
          idsMatch(rect.id, draggedId)
            ? { ...rect, x: newRectX, y: newRectY }
            : rect
        )
      );

      setComments((prevComments) =>
        prevComments.map((comment) =>
          idsMatch(comment.rectId, draggedId)
            ? { ...comment, x: newCommentX, y: newCommentY }
            : comment
        )
      );

      setLines((prevLines) =>
        prevLines.map((line) => {
          if (!idsMatch(line.rectId, draggedId)) return line;
          return {
            ...line,
            points: getLinePoints(newRectX, newRectY, rw, rh, newCommentX, newCommentY),
          };
        })
      );
    } else {
      // Comment text box was dragged — update only the line endpoint
      const newCommentX = draggedNode.x();
      const newCommentY = draggedNode.y();

      setComments((prevComments) =>
        prevComments.map((comment) =>
          idsMatch(comment.id, draggedId)
            ? { ...comment, x: newCommentX, y: newCommentY }
            : comment
        )
      );

      setLines((prevLines) =>
        prevLines.map((line) => {
          if (!idsMatch(line.commentId, draggedId)) return line;
          const rect = rectangles.find((r) => idsMatch(r.id, line.rectId));
          if (!rect) return line;
          return {
            ...line,
            points: getLinePoints(
              rect.x, rect.y, rect.width, rect.height,
              newCommentX, newCommentY
            ),
          };
        })
      );
    }
  };

  const rotateRectangle = useCallback((rectId) => {
    setRectangles((prevRects) =>
      prevRects.map((rect) =>
        idsMatch(rect.id, rectId)
          ? { ...rect, rotation: rect.rotation + 90 }
          : rect
      )
    );
  }, [idsMatch]);

  // Note: Comments are now rendered via Konva Stage text elements, not canvas
  
  const memoizedCallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
  }, []);

  const drawRotatedRectangle = useCallback(
    (context, x, y, width, height, angle) => {
      // compute center
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      context.save();
      context.translate(centerX, centerY);
      context.rotate(angle * (Math.PI / 180));
      context.fillRect(-width / 2, -height / 2, width, height);
      context.restore();
    },
    []
  );

  const renderPDFOnCanvas = useCallback(
    async (pdfData, pageNum) => {
      const canvas = canvasRef.current;
      if (!canvas || !file) return;
      const context = canvas.getContext("2d");

      // Re-use cached PDF document when possible
      let pdf = pdfDocRef.current;
      if (!pdf) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
      }
      const requestedPage = Math.max(1, Math.min(pageNum || currentPage, pdf.numPages));
      const page = await pdf.getPage(requestedPage);

      // On small screens, keep PDF at native size for horizontal scrolling
      // On larger screens, scale to fit the viewport
      let scale = 1;
      const screenWidth = window.innerWidth;
      
      let initialViewport = page.getViewport({ scale: 1 });
      const maxContainerWidth = screenWidth * 0.95;
      
      // Apply responsive scaling on all screens to prevent PDF from being too huge
      // On small screens, this still allows horizontal scrolling if needed
      if (initialViewport.width > maxContainerWidth) {
        scale = maxContainerWidth / initialViewport.width;
      }
      // On small screens (< 768px), minimum scale is 0.8 to keep it manageable
      if (screenWidth < 768 && scale > 0.8) {
        scale = Math.min(scale, 0.85);
      }
      
      let viewport = page.getViewport({ scale });

      // Apply rotation to viewport
      if (pdfRotation !== 0) {
        viewport = page.getViewport({ scale, rotation: pdfRotation });
      }

      // Set canvas size to viewport size (WITHOUT zoom - zoom applied visually only)
      let finalWidth = viewport.width;
      let finalHeight = viewport.height;

      setPdfSize({ width: finalWidth, height: finalHeight });

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // Render at the calculated viewport (without zoom - zoom applied visually)
      let renderViewport = viewport;

      const renderContext = {
        canvasContext: context,
        viewport: renderViewport,
      };

      // Cancel any previous render task before starting a new one
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      const task = page.render(renderContext);
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (err) {
        // RenderingCancelledException is expected when we cancel — ignore it
        if (err?.name !== 'RenderingCancelledException') throw err;
        return;
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
      }

      // Scale for drawing on canvas (without zoom - zoom applied visually)
      const scaleX = scale;
      const scaleY = scale;

      iconPositions.forEach((icon) => {
        const scaledX = icon.x * scaleX;
        const scaledY = icon.y * scaleY;
        const rectWidth = 60 * scaleX;
        const rectHeight = 15 * scaleY;
        drawRotatedRectangle(
          context,
          scaledX,
          scaledY,
          rectWidth,
          rectHeight,
          icon.angle
        );
      });

      memoizedCallback(context);
    },
    [
      drawRotatedRectangle,
      file,
      iconPositions,
      memoizedCallback,
      setPdfSize,
      pdfRotation,
      currentPage,
    ]
  );

  // Re-render when page changes
  useEffect(() => {
    if (pdfDataRef.current && file?.type === 'application/pdf') {
      renderPDFOnCanvas(pdfDataRef.current, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

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
          const rectWidth = 85;
          const rectHeight = 20;
          drawRotatedRectangle(
            context,
            icon.x,
            icon.y,
            rectWidth,
            rectHeight,
            icon.angle
          );
        });
      };
    }

    if (file?.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        pdfDataRef.current = pdfData; // Store for responsive re-rendering
        await renderPDFOnCanvas(pdfData);
        // Persist PDF bytes to sessionStorage for iOS navigation recovery
        try {
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < pdfData.length; i += chunkSize) {
            binary += String.fromCharCode(...pdfData.subarray(i, i + chunkSize));
          }
          sessionStorage.setItem('annotator_pdf_data', btoa(binary));
          sessionStorage.setItem('annotator_pdf_name', file.name);
        } catch (e) { /* quota exceeded – silent fail */ }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [
    drawRotatedRectangle,
    file,
    iconPositions,
    previewUrl,
    renderPDFOnCanvas,
    // pdfZoom intentionally omitted: zoom is applied via CSS transform only,
    // re-rendering the PDF on every pinch event causes the
    // "multiple render() operations" canvas error.
  ]);

  // Handle responsive PDF resizing when window is resized
  useEffect(() => {
    let resizeTimeout;
    
    const handleWindowResize = () => {
      // Ignore resize events fired by Safari's pinch-zoom gesture — the visual
      // viewport change is temporary and corrects itself; re-rendering the PDF
      // during a pinch causes the canvas to flash back to its unzoomed state.
      if (isPinchingRef.current) return;
      // Debounce resize events to avoid excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(async () => {
        if (pdfDataRef.current && file?.type === "application/pdf") {
          // Capture canvas dimensions BEFORE re-render so we can scale annotations
          const oldWidth  = canvasRef.current?.width  || 0;
          const oldHeight = canvasRef.current?.height || 0;

          await renderPDFOnCanvas(pdfDataRef.current);

          // After render, canvas has the new dimensions (set synchronously inside renderPDFOnCanvas)
          const newWidth  = canvasRef.current?.width  || 0;
          const newHeight = canvasRef.current?.height || 0;

          // Only rescale when dimensions actually changed (e.g. window restore/snap)
          if (oldWidth > 0 && oldHeight > 0 && (oldWidth !== newWidth || oldHeight !== newHeight)) {
            const scaleX = newWidth  / oldWidth;
            const scaleY = newHeight / oldHeight;

            setRectangles(prev => prev.map(r => ({
              ...r,
              x: r.x * scaleX,
              y: r.y * scaleY,
              width:  r.width  * scaleX,
              height: r.height * scaleY,
            })));
            setComments(prev => prev.map(c => ({
              ...c,
              x: c.x * scaleX,
              y: c.y * scaleY,
            })));
            setLines(prev => prev.map(l => ({
              ...l,
              points: l.points.map((p, i) => i % 2 === 0 ? p * scaleX : p * scaleY),
            })));
          }
        }
      }, 300);
    };
    
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      clearTimeout(resizeTimeout);
    };
  }, [file, renderPDFOnCanvas]);

  const fileInputRef = useRef();

  const saveToBackend = useCallback(async () => {
    // Prevent concurrent saves from multiple taps using synchronous ref
    if (isSavingRef.current) {
      console.warn('Save already in progress, blocking concurrent save');
      return;
    }
    isSavingRef.current = true;
    setIsSaving(true); // Update UI immediately to disable button
    
    if (!file) {
      isSavingRef.current = false;
      setIsSaving(false);
      alert("Please select a PDF file to save.");
      return;
    }
    setIsSaved(false);
    
    // Get the filtered room data and format with flat prefixes
    const filteredRooms = filteredRoomsRef.current.flat().filter(Boolean);
    const validRooms = filteredRooms.filter(
      (room) => room.roomType && room.areaSqM
    );
    
    // Format rooms with flat prefixes using the same logic as BTU Calculator export
    const { formattedRooms } = formatRoomsWithFlatPrefixes(validRooms);
    
    // Deduplicate rooms by name (keep first occurrence)
    const seenRoomNames = new Set();
    const roomsToSave = formattedRooms.filter((room) => {
      const key = room.name;
      if (seenRoomNames.has(key)) {
        console.log(`Removing duplicate room: ${key}`);
        return false;
      }
      seenRoomNames.add(key);
      return true;
    });
    
    console.log(`Saving ${roomsToSave.length} unique rooms:`, roomsToSave.map(r => r.name));
    
    // Get canvas dimensions for converting to percentages
    const canvas = document.getElementById("my-canvas");
    const canvasWidth = canvas?.width || 1;
    const canvasHeight = canvas?.height || 1;
    console.log('Saving annotations with canvas dimensions:', { canvasWidth, canvasHeight, screenWidth: window.innerWidth, pdfRotation });
    
    // Convert rectangles to percentage-based coordinates
    const rectanglesWithPercent = rectangles.map((rect) => ({
      ...rect,
      xPercent: rect.x / canvasWidth,
      yPercent: rect.y / canvasHeight,
      widthPercent: rect.width / canvasWidth,
      heightPercent: rect.height / canvasHeight,
    }));

    // Convert comments to percentage-based coordinates
    const commentsWithPercent = comments.map((comment) => ({
      ...comment,
      xPercent: comment.x / canvasWidth,
      yPercent: comment.y / canvasHeight,
    }));

    // Convert lines to percentage-based coordinates (if they aren't already)
    const linesWithPercent = lines.map((line) => ({
      ...line,
      points: line.points.map((val, idx) => {
        // If points are already percentages (< 1.5), keep them
        if (Math.abs(val) <= 1.5) return val;
        // Otherwise convert from pixels to percentages
        return idx % 2 === 0 ? val / canvasWidth : val / canvasHeight;
      }),
    }));
    
    const formData = new FormData();
    formData.append("pdfFile", file);
    formData.append("rectangles", JSON.stringify(rectanglesWithPercent));
    formData.append("comments", JSON.stringify(commentsWithPercent));
    formData.append("lines", JSON.stringify(linesWithPercent));
    formData.append("pdfId", pdfId);
    formData.append("acType", selectedAcTypeForSave);
    formData.append("roomData", JSON.stringify(roomsToSave)); // Save room data with flat prefixes

    const imageWidth = canvas?.width;
    const imageHeight = canvas?.height;

    formData.append("imageWidth", imageWidth);
    formData.append("imageHeight", imageHeight);

    if (!token) {
      isSavingRef.current = false;
      setIsSaving(false);
      alert("You must be signed in to save.");
      return;
    }

    try {
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
        toast.success("PDF and annotations saved successfully!", { autoClose: 3000 });
        // Store annotation ID so iOS Safari can re-fetch on navigation restore.
        try { sessionStorage.setItem('annotator_annotation_id', data.id); } catch (e) { /* silent */ }
        setIsSaved(true);
        // Keep the PDF and annotations on canvas after saving
        // User can manually clear using "Clear Canvas" button if needed
      } else {
        const errorData = await response.json();
        console.error("Error saving data:", errorData);
        toast.error(`Failed to save: ${errorData.message || "Unknown error"}`, { autoClose: 5000 });
      }
    } catch (error) {
      console.error("Network error while saving:", error);
        toast.error("Network error occurred while saving.", { autoClose: 5000 });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [file, formatRoomsWithFlatPrefixes, pdfRotation, rectangles, comments, lines, pdfId, selectedAcTypeForSave, token]);

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
    // setRoomData(renderClassifiedRoomsByOcr);

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
    // `setRoomData` may be an inline prop from parent and change identity each render.
    // Exclude it from deps to avoid retriggering this effect repeatedly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, images]);

  useEffect(() => {
    if (setRoomData && allRooms.length > 0) {
      const flattenedRooms = allRooms.flat().filter(Boolean);
      console.log("Syncing rooms to parent:", flattenedRooms);
      setRoomData(flattenedRooms);
    }
    // Avoid including `setRoomData` in deps to prevent update loops when parent
    // passes a non-memoized function. We still call it conditionally inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRooms]);

  const handleExportToBtuCalculator = (roomsToExport) => {
    const refRooms = filteredRoomsRef.current.flat().filter(Boolean);
    const flatRooms =
      refRooms && refRooms.length > 0
        ? refRooms
        : roomsToExport && roomsToExport.length > 0
        ? roomsToExport
        : allRooms.flat().filter(Boolean);

    console.log("Exporting filtered rooms to BTU Calculator:", flatRooms);

    // Extract AC annotations (ac-1.1, condenser-1, condenser, etc.)
    const acAnnotations = comments
      .filter(
        (comment) =>
          comment.text &&
          (comment.text.toLowerCase().match(/ac-\d+/) ||
            /condenser/i.test(comment.text) ||
            comment.text.toLowerCase().match(/flat\s+\d+/i) ||
            comment.text.toLowerCase().match(/unit\s+\d+/i))
      )
      .map((comment) => ({
        label: comment.text,
        coordinates: { x: comment.x, y: comment.y },
      }));

    console.log("Raw AC annotations:", acAnnotations);

    // Parse annotations to detect flats - look for specific patterns
    const flatNumbers = new Set();

    acAnnotations.forEach((ann) => {
      const text = ann.label.toLowerCase();

      // Pattern 1: condenser-1, condenser-2
      const condenserMatch = text.match(/condenser-(\d+)/);
      if (condenserMatch) {
        flatNumbers.add(parseInt(condenserMatch[1]));
      }

      // Pattern 2: Flat 1, Unit 1
      const flatMatch = text.match(/(?:flat|unit)\s+(\d+)/);
      if (flatMatch) {
        flatNumbers.add(parseInt(flatMatch[1]));
      }
    });

    const flatArray = Array.from(flatNumbers).sort((a, b) => a - b);
    console.log("Detected flat numbers:", flatArray);
    console.log("Number of flats detected:", flatArray.length);
    // NOTE: We intentionally do NOT infer flats from duplicate room names.
    // A single large apartment can have multiple rooms with the same name.
    // Multi-flat must be indicated explicitly via condenser-N, flat-N, or ac-N.M labels.

    // Format rooms with flat prefixes if multiple flats detected
    let formattedRooms = flatRooms.map((room, idx) => ({
      name: room.roomType || "Room",
      size:
        parseFloat((room.areaSqM || "0").toString().replace(/[^\d.-]/g, "")) ||
        0,
      btu: 0,
      unit: "meters",
    }));

    // If we have multiple flats, distribute rooms among them
    console.log("Checking if multi-flat:", flatArray.length, ">", 1);
    if (flatArray.length > 1) {
      console.log("Multi-flat property detected, assigning rooms to flats");

      // Distribute rooms in alternating pattern across flats
      // This handles the case where rooms are interleaved: Flat1Room1, Flat2Room1, Flat1Room2, Flat2Room2, etc.
      formattedRooms = flatRooms.map((room, idx) => {
        const flatIndex = idx % flatArray.length;
        const flatNum = flatArray[flatIndex];
        console.log(
          `Room ${idx} (${room.roomType}) -> Flat ${flatNum} (alternating pattern)`
        );
        return {
          name: `Flat ${flatNum}: ${room.roomType || "Room"}`,
          size:
            parseFloat(
              (room.areaSqM || "0").toString().replace(/[^\d.-]/g, "")
            ) || 0,
          btu: 0,
          unit: "meters",
          _flatNum: flatNum, // Store flat number for sorting
        };
      });

      // Sort rooms by flat number to group them together
      formattedRooms.sort((a, b) => a._flatNum - b._flatNum);
      // Remove the temporary _flatNum property
      formattedRooms = formattedRooms.map(({ _flatNum, ...room }) => room);
    }

    console.log("Formatted rooms:", formattedRooms);
    console.log("AC annotations for BTU:", acAnnotations);

    if (typeof setRoomData === "function") {
      setRoomData(formattedRooms, acAnnotations);
      // Scroll to BTU Calculator after setting room data
      if (typeof onExportToBtuCalculator === "function") {
        onExportToBtuCalculator();
      }
    }
  };

  const handleExportExcelStyled = async (data, info) => {
    const baseName = info?.fileName || "annotated_data";

    if (!data.length) {
      alert("No rooms to export");
      return;
    }

    setExportStatus("loading");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Room Data");

      worksheet.columns = [
        { header: "Room Type", key: "roomType", width: 20 },
        { header: "Width", key: "width", width: 15 },
        { header: "Length", key: "length", width: 15 },
        { header: "Area (sqft)", key: "areaSqFt", width: 15 },
        { header: "Area (sqm)", key: "areaSqM", width: 15 },
      ];

      data.forEach((room) => {
        worksheet.addRow({
          roomType: room.roomType,
          width: room.width,
          length: room.length,
          areaSqFt: room.areaSqFt,
          areaSqM: room.areaSqM,
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F81BD" },
      };

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber !== 1) {
          const fillColor =
            rowNumber % 2 === 0 ? { argb: "FFDCE6F1" } : { argb: "FFFFFFFF" };
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: fillColor,
            };
          });
        }
      });

      worksheet.autoFilter = { from: "A1", to: "E1" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const finalFileName = `${baseName}-data-${Date.now()}.xlsx`;

      // On mobile, use Web Share API to avoid Chrome's "can't download securely" warning
      // (async breaks the user-gesture chain required for trusted blob downloads)
      const shareFile = new File([blob], finalFileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        try {
          await navigator.share({ files: [shareFile], title: finalFileName });
        } catch (shareErr) {
          // User cancelled share or share failed — fall through to blob download
          if (shareErr.name !== 'AbortError') {
            const url = URL.createObjectURL(blob);
            setDownloadedFiles((prev) => [
              ...prev,
              { id: Date.now(), name: finalFileName, url, fileType: 'excel' },
            ]);
            const a = document.createElement("a");
            a.href = url; a.download = finalFileName; a.style.display = 'none';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }
        }
      } else {
        // Desktop or unsupported — standard blob download
        const url = URL.createObjectURL(blob);
        setDownloadedFiles((prev) => [
          ...prev,
          { id: Date.now(), name: finalFileName, url, fileType: 'excel' },
        ]);
        const a = document.createElement("a");
        a.href = url; a.download = finalFileName; a.style.display = 'none';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 5000);
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("error");
      alert("Failed to export Excel file.");
      setTimeout(() => setExportStatus("idle"), 5000);
    }
  };

  const handleExportJSON = (data, info) => {
    try {
      const baseName = info?.fileName
        ? info.fileName.replace(/\.[^.]+$/, '')
        : file?.name?.replace(/\.[^.]+$/, '') || 'annotation';

      const payload = {
        exportedAt: new Date().toISOString(),
        fileName: baseName,
        rooms: data.map((room) => ({
          roomType: room.roomType,
          width:    room.width,
          length:   room.length,
          areaSqFt: room.areaSqFt,
          areaSqM:  room.areaSqM,
        })),
        annotations: {
          rectangles: rectangles.map((r) => ({
            id:           r.id,
            x:            r.x,
            y:            r.y,
            width:        r.width,
            height:       r.height,
            rotation:     r.rotation,
            fill:         r.fill,
          })),
          comments: comments.map((c) => ({
            id:     c.id,
            rectId: c.rectId,
            text:   c.text,
            x:      c.x,
            y:      c.y,
          })),
        },
        canvasSize: { width: pdfSize.width, height: pdfSize.height },
      };

      const json     = JSON.stringify(payload, null, 2);
      const blob     = new Blob([json], { type: 'application/json' });
      const url      = URL.createObjectURL(blob);
      const fileName = `${baseName}-annotations-${Date.now()}.json`;

      setDownloadedFiles((prev) => [...prev, { id: Date.now(), name: fileName, url, fileType: 'json' }]);

      const a = document.createElement('a');
      a.href     = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('JSON export failed:', err);
      alert('Failed to export JSON file.');
    }
  };

  const handleRemoveFile = (fileToRemove) => {
    URL.revokeObjectURL(fileToRemove.url);

    setDownloadedFiles((prev) =>
      prev.filter((file) => file.id !== fileToRemove.id)
    );
  };

  useEffect(() => {
    return () => {
      downloadedFiles.forEach((file) => {
        URL.revokeObjectURL(file.url);
      });
    };
  }, [downloadedFiles]);

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
    setLines([]);
    setFile(null);
    setResults([]);
    setImages([]);
    setPdfInfo(null);
    setPdfZoom(1);
    pdfDataRef.current = null;
    setError(null);
    setMobileAnnotationLabel('');
    setMobileAnnotationActive(false);
    // Clear persisted session state so restored data doesn't reappear
    ['annotator_annotation_id', 'annotator_pdf_data', 'annotator_pdf_name',
     'annotator_rectangles', 'annotator_comments', 'annotator_lines',
     'annotator_rooms', 'annotator_pdf_rotation'].forEach(k => sessionStorage.removeItem(k));
    console.log("Canvas and table data cleared.");
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <Form className="btu-calculation-measure mt-4">
        <Form.Label className=" label-upload fw-bold text-secondary "></Form.Label>
        <Form.Control
          className="my-4 form-control"
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
        results?.map((result, fileIdx) => {
          const rooms = allRooms[fileIdx] || [];
          const filteredRoomsForTable = rooms
            .filter((room) => {
              const sqft = parseFloat(
                (room.areaSqFt || "").toString().replace(/[^\d.]/g, "")
              );
              const sqm = parseFloat(
                (room.areaSqM || "").toString().replace(/[^\d.]/g, "")
              );
              return (
                sqft &&
                sqm &&
                room.roomType?.toLowerCase().includes(filterText.toLowerCase())
              );
            })
            .sort((a, b) => {
              let aVal, bVal;
              switch (sortKey) {
                case "roomType":
                  aVal = a.roomType?.toLowerCase() || "";
                  bVal = b.roomType?.toLowerCase() || "";
                  return sortOrder === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
                case "width":
                  aVal = parseFloat((a.width || "").replace(/[^\d.]/g, ""));
                  bVal = parseFloat((b.width || "").replace(/[^\d.]/g, ""));
                  break;
                case "length":
                  aVal = parseFloat((a.length || "").replace(/[^\d.]/g, ""));
                  bVal = parseFloat((b.length || "").replace(/[^\d.]/g, ""));
                  break;
                case "areaSqft":
                  aVal = parseFloat((a.areaSqFt || "").replace(/[^\d.]/g, ""));
                  bVal = parseFloat((b.areaSqFt || "").replace(/[^\d.]/g, ""));
                  break;
                case "areaSqm":
                  aVal = parseFloat((a.areaSqM || "").replace(/[^\d.]/g, ""));
                  bVal = parseFloat((b.areaSqM || "").replace(/[^\d.]/g, ""));
                  break;
                default:
                  return 0;
              }
              return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
            });
          filteredRoomsRef.current[fileIdx] = filteredRoomsForTable;
          return (
            <div
              key={fileIdx}
              className="mt-4 p-4 bg-white rounded shadow-sm border"
            >
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
                      <span className="text-primary">
                        {result.apartmentType}
                      </span>
                    </p>
                  )}
                  <h6 className="fw-semibold fs-5 mt-4 mb-3">
                    Classified Room Data Table
                  </h6>
                  <div>
                    <p className="fs-5">General Guidelines by Room Size: </p>
                    <ol className="fs-6">
                      <li>Small Rooms (90-250 sq. ft.)</li>
                      <li>Medium Rooms (250–350 sq. ft.)</li>
                      <li>Large Rooms (350-550 sq. ft.)</li>
                    </ol>
                  </div>
                  <div className="mb-3 d-flex flex-column flex-md-row gap-3 align-items-start">
                    <div className="d-flex flex-column flex-sm-row gap-2">
                      <input
                        type="text"
                        placeholder="Filter by room type"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="form-control flex-grow-1 my-2"
                      />

                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value)}
                        className="form-select flex-grow-1 m-1"
                      >
                        <option value="roomType">Room Type</option>
                        <option value="width">Width</option>
                        <option value="length">Length</option>
                        <option value="areaSqft">Area (sqft)</option>
                        <option value="areaSqm">Area (sqm)</option>
                      </select>
                    </div>
                    <div className="d-flex flex-column flex-sm-row gap-2 sort-export-btns">
                      <Button
                        variant="light"
                        size="sm"
                        className="go-to-btn btn-text  w-auto pt-2"
                        onClick={() =>
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }
                        title="Toggle sort order"
                      >
                        Sort: {sortOrder === "asc" ? "ASC" : "DESC"}
                      </Button>

                      <Button
                        variant="link"
                        className="excel-icon-button "
                        title="Export and Download Excel File"
                        onClick={() =>
                          handleExportExcelStyled(
                            filteredRoomsForTable,
                            pdfInfo
                          )
                        }
                        disabled={exportStatus === "loading"}
                        style={{ padding: 0 }}
                      >
                        {exportStatus === "loading" ? (
                          <FaSpinner
                            size={32}
                            color="#007bff"
                            className="spin"
                          />
                        ) : (
                          <FaFileExcel size={32} color="#217346" />
                        )}
                      </Button>

                      <Button
                        variant="link"
                        title="Export raw JSON (rooms + annotations)"
                        onClick={() => handleExportJSON(filteredRoomsForTable, pdfInfo)}
                        style={{ padding: 0, marginLeft: '4px' }}
                      >
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, background: '#f59e0b', borderRadius: '6px',
                          color: '#fff', fontWeight: 700, fontSize: '11px', letterSpacing: '-0.5px',
                        }}>JSON</span>
                      </Button>
                      {exportStatus === "success" && (
                        <span className="export-success">
                          <FaDownload /> Download Started!
                        </span>
                      )}
                    </div>
                    <div className="recent-exports">
                      <h5>Recent Exports (Click to Re-download)</h5>
                      {downloadedFiles.length === 0 ? (
                        <p>No files exported in this session.</p>
                      ) : (
                        <ul>
                          {downloadedFiles.map((file) => (
                            <li key={file.id}>
                              <a
                                href={file.url}
                                download={file.name}
                                title={`Click to download and open: ${file.name}`}
                              >
                                {file.fileType === 'json' ? (
                                  <FaFileCode
                                    className="excel-icon-button excel-icon"
                                    size={20}
                                    color="#f59e0b"
                                  />
                                ) : (
                                  <FaFileExcel
                                    className="excel-icon-button excel-icon"
                                    size={20}
                                    color="#217346"
                                  />
                                )}
                                <span>{file.name}</span>
                              </a>
                              <button
                                onClick={() => handleRemoveFile(file)}
                                title="Remove link from list (frees memory)"
                              >
                                <FaTimes size={14} color="#dc3545" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="mb-3 mt-2">
                    <input
                      type="text"
                      placeholder="Room Type"
                      value={newRoom.roomType}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, roomType: e.target.value })
                      }
                      className="form-control"
                    />
                    <input
                      type="text"
                      placeholder="Enter width in decimal ft e.g., 10.5 for 10'6 "
                      value={newRoom.width}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, width: e.target.value })
                      }
                      className="form-control"
                    />
                    <input
                      type="text"
                      placeholder="Enter length in decimal ft e.g., 10.5 for 10'6"
                      value={newRoom.length}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, length: e.target.value })
                      }
                      className="form-control"
                    />
                    <Button
                      variant="light"
                      size="sm"
                      className="go-to-btn btn-text w-auto"
                      onClick={() => handleAddRoom(fileIdx)}
                    >
                      Add Room
                    </Button>
                  </div>
                  {filteredRoomsForTable?.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped bordered hover responsive size="sm">
                        <thead>
                          <tr>
                            <th>Room Type</th>
                            <th>Width (ft)</th>
                            <th>Length (ft)</th>
                            <th>Area (sqft)</th>
                            <th>Area (sqm)</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <TableBody
                          data={filteredRoomsForTable}
                          renderRow={(room, roomIdx) => {
                            const isEditing =
                              editingRoomIdx === roomIdx &&
                              editingFileIdx === fileIdx;
                            return (
                              <tr key={room.uniqueId}>
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRoomData.roomType}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "roomType",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    room.roomType
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRoomData.width}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "width",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    `${room.width} ft`
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRoomData.length}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "length",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    `${room.length} ft`
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRoomData.areaSqFt}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "areaSqFt",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    `${room.areaSqFt} sqft`
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRoomData.areaSqM}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "areaSqM",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    `${room.areaSqM} sqm`
                                  )}
                                </td>
                                <td>
                                  {isEditing ? (
                                    <div className="d-flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="success"
                                        onClick={handleSaveEdit}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleCancelEdit}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="d-flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        style={{ color: '#fff', whiteSpace: 'nowrap' }}
                                        onClick={() =>
                                          handleEditClick(
                                            room,
                                            roomIdx,
                                            fileIdx
                                          )
                                        }
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        style={{ whiteSpace: 'nowrap' }}
                                        onClick={() =>
                                          handleDeleteRoom(
                                            room.uniqueId,
                                            fileIdx
                                          )
                                        }
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          }}
                        />
                      </Table>
                      <p className="fw-bold text-center mt-3">
                        Total:{" "}
                        {filteredRoomsForTable
                          .reduce(
                            (sum, room) => sum + parseFloat(room.areaSqFt || 0),
                            0
                          )
                          .toFixed(2)}{" "}
                        sqft |{" "}
                        {filteredRoomsForTable
                          .reduce(
                            (sum, room) => sum + parseFloat(room.areaSqM || 0),
                            0
                          )
                          .toFixed(2)}{" "}
                        sqm
                      </p>
                    </div>
                  ) : (
                    <p className="fst-italic text-secondary">
                      No classified room data found. Add a room using the form
                      above.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      <ButtonToolbar
        className="mb-3 mt-3 button-toolbar-annotator px-2"
        aria-label="PDF controls"
      >
        {file && file.type === "application/pdf" && (
          <>
            <ButtonGroup size="sm" className="me-2">
              <Button
                variant="outline-primary"
                onClick={() => {
                  // Collect ALL filtered rooms from ALL files
                  const allFilteredRooms = results
                    .map((result, fileIdx) => {
                      const rooms = allRooms[fileIdx] || [];
                      return rooms.filter((room) => {
                        const sqft = parseFloat(
                          (room.areaSqFt || "")
                            .toString()
                            .replace(/[^\d.]/g, "")
                        );
                        const sqm = parseFloat(
                          (room.areaSqM || "").toString().replace(/[^\d.]/g, "")
                        );
                        return (
                          sqft >= 64 &&
                          sqm >= 5.94 &&
                          room.roomType
                            ?.toLowerCase()
                            .includes(filterText.toLowerCase())
                        );
                      });
                    })
                    .flat();

                  handleExportToBtuCalculator(allFilteredRooms);
                }}
                disabled={
                  filteredRoomsRef.current.flat().filter(Boolean).length === 0
                }
                title="Export rooms to BTU Calculator"
              >
                Export to BTU ({filteredRoomsRef.current.flat().filter(Boolean).length} rooms)
              </Button>

              <Button
                variant="outline-primary"
                onClick={saveToBackend}
                disabled={isSaving}
                title="Save PDF and annotations"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>

              <Button
                variant="outline-secondary"
                onClick={clearCanvas}
                title="Clear canvas and data"
              >
                Clear
              </Button>
            </ButtonGroup>

            {/* Undo / Redo */}
            <ButtonGroup size="sm" className="me-2">
              <Button
                variant="outline-dark"
                onClick={undo}
                title="Undo last annotation action (Ctrl+Z)"
              >↩ Undo</Button>
              <Button
                variant="outline-dark"
                onClick={redo}
                title="Redo (Ctrl+Y)"
              >↪ Redo</Button>
            </ButtonGroup>

            {file && file.type === "application/pdf" && totalPages > 1 && (
              <ButtonGroup size="sm" className="me-2">
                <Button
                  variant="outline-success"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  title="Previous page"
                >◀ Prev</Button>
                <Button
                  variant="outline-success"
                  disabled
                  style={{ minWidth: '70px' }}
                >Page {currentPage}/{totalPages}</Button>
                <Button
                  variant="outline-success"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next page"
                >Next ▶</Button>
              </ButtonGroup>
            )}

            {file && file.type === "application/pdf" && (
              <ButtonGroup size="sm">
                <Button
                  variant="outline-secondary"
                  onClick={() =>
                    setPdfRotation((prev) => (prev - 90 + 360) % 360)
                  }
                  title="Rotate PDF counter-clockwise"
                >
                  ↶ Left
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={() => setPdfRotation((prev) => (prev + 90) % 360)}
                  title="Rotate PDF clockwise"
                >
                  ↷ Right
                </Button>

                {pdfRotation !== 0 && (
                  <Button
                    variant="outline-warning"
                    onClick={() => setPdfRotation(0)}
                    title="Reset PDF to original orientation"
                  >
                    Reset ({pdfRotation}°)
                  </Button>
                )}
              </ButtonGroup>
            )}

            {file && file.type === "application/pdf" && (
              <ButtonGroup size="sm">
                <Button
                  variant="outline-info"
                  onClick={() => setPdfZoom((prev) => Math.min(4, prev + 0.2))}
                  title="Zoom in"
                >
                  🔍 +
                </Button>
                <Button
                  variant="outline-info"
                  onClick={() => setPdfZoom(1)}
                  title="Reset zoom level"
                  disabled={pdfZoom === 1}
                >
                  {(pdfZoom * 100).toFixed(0)}%
                </Button>
                <Button
                  variant="outline-info"
                  onClick={() => setPdfZoom((prev) => Math.max(1, prev - 0.2))}
                  title="Zoom out"
                  disabled={pdfZoom === 1}
                >
                  🔍 −
                </Button>
              </ButtonGroup>
            )}
          </>
        )}
      </ButtonToolbar>
      {error && <p className="error-message mt-4">{error}</p>}

      {/* ── Desktop annotation label input (≥768px only) ── */}
      {file && file.type === 'application/pdf' && (
        <div className="d-none d-md-flex align-items-center gap-2 mb-2 px-2">
          <span className="text-muted small" style={{ whiteSpace: 'nowrap' }}>Annotation label:</span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: '200px' }}
            placeholder="ac-1, ac-2, condenser…"
            value={acUnitInput}
            onChange={(e) => setAcUnitInput(e.target.value)}
          />
          <span className="text-muted small">{acUnitInput.trim() ? 'Click canvas to place' : 'Type label, then click canvas'}</span>
        </div>
      )}

      {/* ── Mobile annotation label input + place mode toggle (<768px only) ── */}
      {file && file.type === 'application/pdf' && (
        <div className="mobile-annotation-bar d-flex d-md-none flex-column align-items-center gap-1 mb-2 px-1 text-center">
          <span className="text-muted small">
            {acUnitInput.trim()
              ? mobileAnnotationActive ? 'Tap canvas to place annotation' : 'Enable place mode, then tap canvas'
              : 'Type a label below, then tap the canvas to place'}
          </span>
          <div className="d-flex align-items-center gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: '180px' }}
              placeholder="ac-1, ac-2, condenser…"
              value={acUnitInput}
              onChange={(e) => setAcUnitInput(e.target.value)}
            />
            <button
              className={`btn btn-sm ${mobileAnnotationActive ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setMobileAnnotationActive(prev => !prev)}
            >
              {mobileAnnotationActive ? '✅ Tap to place' : '📌 Place mode'}
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        <div>
          {previewUrl && (
            <div 
              className="container-main"
              ref={containerMainRef}
            >
              {/* Size-holder: expands to actual zoomed pixel size so scroll area is correct */}
              <div style={pdfZoom !== 1 ? {
                position: 'relative',
                width: pdfSize.width * pdfZoom,
                height: pdfSize.height * pdfZoom,
                flexShrink: 0,
              } : { position: 'relative' }}>
              <div 
                className="canvas-wrapper"
                style={pdfZoom !== 1 ? {
                  transform: `scale(${pdfZoom})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                } : {}}
              >
                <canvas
                  id="my-canvas"
                  ref={canvasRef}
                  width={pdfSize.width}
                  height={pdfSize.height}
                  onClick={handleCanvasEvent}
                />

                <Stage
                  ref={stageRef}
                  width={pdfSize.width}
                  height={pdfSize.height}
                  onClick={handleStageClick}
                  onTap={handleStageTouchEnd}
                  onContextMenu={handleRectangleRightClick}
                  className="konva-stage"
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
                  </Layer>
                  <Layer>
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
                          stroke={rect.stroke}
                          strokeWidth={rect.stroke ? 2 : 0}
                          hitStrokeWidth={24}
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
                            removeAnnotationByRectId(clickedRectId);
                          }}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                          onClick={(event) => {
                            event.cancelBubble = true;
                            const clickedRectId = event.target.attrs.id;
                            setIsRotating(true);
                            rotateRectangle(clickedRectId);
                            setTimeout(() => setIsRotating(false), 100);
                          }}
                          onTap={(event) => {
                            event.cancelBubble = true;
                            const clickedRectId = event.target.attrs.id;
                            setIsRotating(true);
                            rotateRectangle(clickedRectId);
                            setTimeout(() => setIsRotating(false), 100);
                          }}
                        />
                      </React.Fragment>
                    ))}
                    {comments.map((comment) => {
                      const _w = window.innerWidth;
                      const charWidth   = _w < 480 ? 4 : _w < 768 ? 5 : 6;
                      const textPadding = _w < 480 ? 3 : _w < 768 ? 4 : 6;
                      const minBoxWidth = _w < 480 ? 24 : _w < 768 ? 28 : 48;
                      const boxHeight   = _w < 480 ? 10 : _w < 768 ? 12 : 16;
                      const fontSize    = _w < 480 ? 7 : _w < 768 ? 8 : 10;
                      const boxWidth = Math.max(minBoxWidth, comment.text.length * charWidth + textPadding);
                      return (
                      <Group key={comment.id}>
                        {/* Comment background box */}
                        <Rect
                          rectId={comment.rectId}
                          x={comment.x}
                          y={comment.y - (boxHeight - 2)}
                          width={boxWidth}
                          height={boxHeight}
                          fill="rgba(252, 252, 243, 0.3)"
                          stroke="grey"
                          strokeWidth={1}
                          hitStrokeWidth={24}
                        />
                        {/* Comment text */}
                        <Text
                          key={comment.id}
                          id={comment.id}
                          rectId={comment.rectId}
                          x={comment.x + 2}
                          y={comment.y - (boxHeight - 3)}
                          text={comment.text}
                          fontSize={fontSize}
                          fontFamily="Arial"
                          fontStyle="bold"
                          fill="deeppink"
                          width={boxWidth - 4}
                          draggable={true}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                          onDblClick={(event) => {
                            event.cancelBubble = true;
                            setEditingLabelRectId(comment.rectId);
                            setEditingLabelValue(comment.text);
                            setShowEditLabelModal(true);
                          }}
                          onDblTap={(event) => {
                            event.cancelBubble = true;
                            setEditingLabelRectId(comment.rectId);
                            setEditingLabelValue(comment.text);
                            setShowEditLabelModal(true);
                          }}
                        />
                      </Group>
                      );
                    })}
                  </Layer>
                </Stage>
              </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placed annotations list — edit or delete without hunting on canvas */}
      {comments.length > 0 && (
        <div style={{ margin: '12px 0 4px', padding: '10px 14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#495057' }}>
            📌 Placed annotations ({comments.length})
            <span style={{ fontWeight: 400, color: '#6c757d', marginLeft: '8px', fontSize: '12px' }}>
              — or double-click a label on the canvas to edit
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: '#fff', border: '1px solid #ced4da', borderRadius: '20px',
                  padding: '2px 8px 2px 10px', fontSize: '12px', color: '#212529',
                }}
              >
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {comment.text}
                </span>
                <button
                  title="Edit annotation label"
                  onClick={() => {
                    setEditingLabelRectId(comment.rectId);
                    setEditingLabelValue(comment.text);
                    setShowEditLabelModal(true);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 2px', color: '#0d6efd', fontSize: '13px', lineHeight: 1,
                  }}
                >✏️</button>
                <button
                  title="Delete annotation"
                  onClick={() => removeAnnotationByRectId(comment.rectId)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 2px', color: '#dc3545', fontSize: '13px', lineHeight: 1,
                  }}
                >🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Label modal (double-click on annotation label) */}
      {showEditLabelModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setShowEditLabelModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '12px', padding: '24px',
              minWidth: '280px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: '12px' }}>✏️ Edit annotation label</h5>
            <Form.Control
              type="text"
              value={editingLabelValue}
              onChange={(e) => setEditingLabelValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingLabelValue.trim()) {
                  pushHistory(rectangles, comments, lines);
                  setComments((prev) =>
                    prev.map((c) =>
                      idsMatch(c.rectId, editingLabelRectId) ? { ...c, text: editingLabelValue.trim() } : c
                    )
                  );
                  setShowEditLabelModal(false);
                }
              }}
              autoFocus
              style={{ marginBottom: '16px', fontSize: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="primary" size="sm"
                onClick={() => {
                  if (!editingLabelValue.trim()) return;
                  pushHistory(rectangles, comments, lines);
                  setComments((prev) =>
                    prev.map((c) =>
                      idsMatch(c.rectId, editingLabelRectId) ? { ...c, text: editingLabelValue.trim() } : c
                    )
                  );
                  setShowEditLabelModal(false);
                }}
                disabled={!editingLabelValue.trim()}
              >Save</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowEditLabelModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Annotator;