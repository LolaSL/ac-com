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
import { FaFileExcel, FaDownload, FaSpinner, FaTimes } from "react-icons/fa";
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

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
  const heightFt = parseToFeet(room.height);

  const areaSqFt = widthFt * heightFt;
  const areaSqM = areaSqFt * 0.092903;

  return {
    ...room,
    width: widthFt ? widthFt.toFixed(2) : "",
    height: heightFt ? heightFt.toFixed(2) : "",
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
    } = await Tesseract.recognize(image, "eng");

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
  const cleanedApartmentTypes = apartmentTypes
    .map((type) => {
      const match = type.match(
        /\b(\d+\s+Bedroom\s+Apartment\s*-\s*Model\s*[A-Z\d]+|Studio\s+Apartment|Loft\s+Apartment)\b/i
      );
      return match ? match[1].trim() : null;
    })
    .filter(Boolean);

  console.log(cleanedApartmentTypes);

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

  result.totalSf = totalSfMatch ? totalSfMatch[1].trim() : null;
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
  const [isSaved, setIsSaved] = useState(false);
  const canvasRef = useRef(null);
  const pdfDataRef = useRef(null); // Store PDF data for responsive re-rendering
  const [file, setFile] = useState(null);
  const stageRef = useRef(null);
  const [pdfSize, setPdfSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
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
    height: "",
    areaSqFt: "",
    areaSqM: "",
  });

  const [downloadedFiles, setDownloadedFiles] = useState([]);
  const [pdfRotation, setPdfRotation] = useState(0); // Store rotation in degrees
  const [pdfZoom, setPdfZoom] = useState(1); // Store pinch zoom level for small screens

  // Mobile-friendly prompt modal state (replaces window.prompt)
  const [showAcUnitModal, setShowAcUnitModal] = useState(false);
  const [acUnitInput, setAcUnitInput] = useState('');
  const [pendingAnnotationPos, setPendingAnnotationPos] = useState(null);
  // Default to annotation mode (true) so users can create rectangles immediately
  // Track last rectangle tap for double-tap deletion on mobile
  const lastRectTapRef = useRef({});

  const idsMatch = useCallback((left, right) => {
    if (left === undefined || left === null || right === undefined || right === null) {
      return false;
    }
    return String(left) === String(right);
  }, []);

  const removeAnnotationByRectId = useCallback((rectId) => {
    setRectangles((prevRects) => prevRects.filter((r) => !idsMatch(r.id, rectId)));
    setComments((prevComments) =>
      prevComments.filter((comment) => !idsMatch(comment.rectId, rectId))
    );
    setLines((prevLines) => prevLines.filter((line) => !idsMatch(line.rectId, rectId)));
  }, [idsMatch]);
  
  // Track if currently dragging to prevent modal from showing
  const isDraggingRef = useRef(false);
  
  // Track touch movement to distinguish between tap and drag
  const touchStartRef = useRef({ x: 0, y: 0, time: 0, rectId: null });
  const LONG_TAP_THRESHOLD = 800; // milliseconds - hold time for long press delete
  const longPressTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false); // Track if long-press actually fired
  const isSavingRef = useRef(false); // Synchronous flag to prevent duplicate saves
  
  // Track pinch zoom on small screens
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(1);

  // Cleanup long-press timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

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

    const file = files[0];
    setPdfInfo({ fileName: file.name });
    setLoading(true);
    setImages([]);
    setResults([]);
    setError(null);
    setIconPositions([]);
    setComments([]);
    setPdfRotation(0); // Reset rotation when new file is uploaded

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

  const generateUniqueId = () => {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  };

  useEffect(() => {
    if (results) {
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
      const heightFt = parseToFeet(newRoom.height);

      const areaSqFt = widthFt * heightFt;
      const areaSqM = areaSqFt * 0.092903;

      const roomWithAreas = {
        ...newRoom,
        width: widthFt.toFixed(2),
        height: heightFt.toFixed(2),
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
      height: "",
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

    if (field === "width" || field === "height") {
      const newWidth = parseFeetAndInches(newEditingRoomData.width);
      const newHeight = parseFeetAndInches(newEditingRoomData.height);

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

  // Confirm the AC unit annotation after modal input
  // Get responsive rectangle dimensions based on screen width
  const getResponsiveRectSize = () => {
    const width = window.innerWidth;
    if (width < 480) {
      return { width: 36, height: 14 };
    } else if (width < 768) {
      return { width: 48, height: 16 };
    }
    return { width: 64, height: 22 };
  };

  const confirmAcUnitAnnotation = useCallback((commentText, position) => {
    console.log('confirmAcUnitAnnotation called', { commentText, position });
    
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
    const existingRectIds = new Set(rectangles.map((rect) => String(rect.id)));
    
    const existingComment = comments.some((comment) => {
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
    setRectangles((prevRects) => [...prevRects, newRect]);
    const newCommentId = `comment-${Date.now()}`;
    const newComment = {
      id: newCommentId,
      rectId: newRectId,
      text: commentText,
      x: position.x + rectSize.width + 2,
      y: position.y + rectSize.height / 2 - 6,
      fill: 'rgba(226, 218, 228, 0.3)',
    };
    setComments((prevComments) => [...prevComments, newComment]);
    const newLine = {
      id: `line-${Date.now()}`,
      rectId: newRectId,
      commentId: newCommentId,
      points: [
        newRect.x + newRect.width / 2,
        newRect.y + newRect.height / 2,
        newComment.x + 3,
        newComment.y + 6,
      ],
      stroke: 'black',
      strokeWidth: 1,
    };
    setLines((prevLines) => [...prevLines, newLine]);
  }, [comments, rectangles]);

  const handleStageClick = (event) => {
    console.log('handleStageClick fired', { isRotating, isDragging: isDraggingRef.current, eventTarget: event.target?.constructor?.name });    // Don't show modal during drag or rotation
    if (isDraggingRef.current || isRotating) {
      console.log('handleStageClick: currently dragging or rotating, returning');
      return;
    }
    if (event.target === event.target.getStage()) {
      console.log('handleStageClick: Getting pointer position...');
      let pointerPosition = stageRef.current.getPointerPosition();
      console.log('Pointer position:', pointerPosition);
      if (!pointerPosition) return;

      // On small screens with horizontal scrolling, adjust for scroll offset
      const containerMain = document.querySelector('.container-main');
      if (containerMain && window.innerWidth < 768) {
        pointerPosition = {
          x: pointerPosition.x + containerMain.scrollLeft,
          y: pointerPosition.y + containerMain.scrollTop,
        };
        console.log('Adjusted pointer position (with scroll):', pointerPosition);
      }

      // Use mobile-friendly modal instead of prompt()
      console.log('handleStageClick: Opening modal at position:', pointerPosition);
      setPendingAnnotationPos({ x: pointerPosition.x, y: pointerPosition.y });
      setAcUnitInput('');
      setShowAcUnitModal(true);
    } else {
      console.log('handleStageClick: Condition not met', { isStageClick: event.target === event.target.getStage() });
    }
  };

  const handleTouchStart = (e) => {
    // Safety check: ensure event has valid target with ID
    if (!e || !e.target || !e.target.attrs) {
      return;
    }

    // Touch can happen on rectangle or on linked comment elements.
    const clickedRectId = e.target.attrs.rectId || e.target.attrs.id;
    if (clickedRectId === undefined || clickedRectId === null) {
      return;
    }

    const now = Date.now();
    
    // Record touch start position and time for drag detection
    // Handle both native touch events and Konva touch events
    let touchX = 0, touchY = 0;
    if (e.evt && e.evt.touches && e.evt.touches.length > 0) {
      // Native touch event
      touchX = e.evt.touches[0].clientX;
      touchY = e.evt.touches[0].clientY;
    } else if (e.pointers && e.pointers.length > 0) {
      // Konva pointer event
      touchX = e.pointers[0].clientX || 0;
      touchY = e.pointers[0].clientY || 0;
    }
    
    touchStartRef.current = { x: touchX, y: touchY, time: now, rectId: clickedRectId };
    longPressTriggeredRef.current = false; // Reset flag
    
    // Clear any existing long-press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    
    // Check for double-tap: if same rect was tapped within 400ms, delete it
    if (idsMatch(lastRectTapRef.current.id, clickedRectId) && 
        now - lastRectTapRef.current.timestamp < 700) {
      // Double-tap detected - delete rectangle
      removeAnnotationByRectId(clickedRectId);
      lastRectTapRef.current = {}; // Reset
      return;
    }
    
    // Record this tap
    lastRectTapRef.current = { id: clickedRectId, timestamp: now };
    
    // Set up long-press timeout (800ms)
    longPressTimeoutRef.current = setTimeout(() => {
      if (idsMatch(touchStartRef.current.rectId, clickedRectId)) {
        longPressTriggeredRef.current = true; // Mark that long-press fired
        // Long press detected - delete rectangle
        removeAnnotationByRectId(clickedRectId);
        touchStartRef.current = { x: 0, y: 0, time: 0, rectId: null };
      }
    }, LONG_TAP_THRESHOLD);
  };

  // Handle touch tap on stage for placing annotations (mobile equivalent of click)
  const handleStageTouchEnd = (event) => {
    console.log('handleStageTouchEnd fired', { isDragging: isDraggingRef.current, 
      isRotating,
      targetName: event.target?.name(),
      targetIsStage: event.target === event.target.getStage()
    });    
    // Don't show modal during drag or rotation
    if (isDraggingRef.current || isRotating) {
      console.log('handleStageTouchEnd: currently dragging or rotating, returning');
      return;
    }
    
    // Only act on taps on blank stage area (not on shapes/rects)
    // Check if tap was on stage or on a rect
    if (event.target.name && event.target.name() === 'rect') {
      console.log('handleStageTouchEnd: tap was on a rect, not blank stage');
      return;
    }
    
    let pointerPosition = stageRef.current.getPointerPosition();
    console.log('handleStageTouchEnd: pointer position:', pointerPosition);
    
    if (!pointerPosition) {
      console.log('handleStageTouchEnd: no pointer position, returning');
      return;
    }
    
    // On small screens with horizontal scrolling, adjust for scroll offset
    const containerMain = document.querySelector('.container-main');
    if (containerMain && window.innerWidth < 768) {
      pointerPosition = {
        x: pointerPosition.x + containerMain.scrollLeft,
        y: pointerPosition.y + containerMain.scrollTop,
      };
      console.log('handleStageTouchEnd: adjusted position (with scroll):', pointerPosition);
    }

    console.log('handleStageTouchEnd: opening modal at position:', pointerPosition);
    setPendingAnnotationPos({ x: pointerPosition.x, y: pointerPosition.y });
    setAcUnitInput('');
    setShowAcUnitModal(true);
  };

  const handleRectangleRightClick = (event) => {
    event.evt.preventDefault();
    const clickedRectId = event.target.attrs.id;
    removeAnnotationByRectId(clickedRectId);
  };

  const handleCanvasEvent = (e) => {
    if (window.innerWidth > 268) {
      handleStageClick(e);
    }
  };

  const handleDragMove = (e) => {
    isDraggingRef.current = true;
    const draggedNode = e.target;
    const layer = draggedNode.getLayer();
    if (layer) {
      layer.batchDraw();
    }
  };

  const handleDragEnd = (e) => {
    isDraggingRef.current = false;
    const draggedNode = e.target;
    const draggedId = draggedNode.id();

    setRectangles((prevRects) =>
      prevRects.map((rect) =>
        idsMatch(rect.id, draggedId)
          ? { ...rect, x: draggedNode.x(), y: draggedNode.y() }
          : rect
      )
    );

    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (idsMatch(comment.rectId, draggedId)) {
          const rectSize = getResponsiveRectSize();
          const newCommentPos = {
            x: draggedNode.x() + rectSize.width + 2,
            y: draggedNode.y() + rectSize.height / 2 - 6,
          };
          return { ...comment, ...newCommentPos };
        }
        return comment;
      })
    );

    setLines((prevLines) =>
      prevLines.map((line) => {
        const isRect = idsMatch(line.rectId, draggedId);
        const isComment = idsMatch(line.commentId, draggedId);
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
            : rectangles.find((r) => idsMatch(r.id, line.rectId));

          comment = isComment
            ? { x: draggedNode.x(), y: draggedNode.y() }
            : comments.find((c) => idsMatch(c.rectId, draggedId));

          if (rect && comment) {
            return {
              ...line,
              points: [
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
                comment.x + 3,
                comment.y + 6,
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
    async (pdfData) => {
      const canvas = canvasRef.current;
      if (!canvas || !file) return;
      const context = canvas.getContext("2d");

      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

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

      await page.render(renderContext).promise;

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
      };
      reader.readAsArrayBuffer(file);
    }
  }, [
    drawRotatedRectangle,
    file,
    iconPositions,
    previewUrl,
    renderPDFOnCanvas,
    pdfZoom,
  ]);

  // Handle responsive PDF resizing when window is resized
  useEffect(() => {
    let resizeTimeout;
    
    const handleWindowResize = () => {
      // Debounce resize events to avoid excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (pdfDataRef.current && file?.type === "application/pdf") {
          renderPDFOnCanvas(pdfDataRef.current);
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
    formData.append("acType", "ductless");
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
  }, [file, formatRoomsWithFlatPrefixes, pdfRotation, rectangles, comments, lines, pdfId, token]);

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

  useEffect(() => {
    if (isSaved) {
      toast.success("Saved successfully!", {
        duration: 3000,
        position: "bottom-center",
      });
    }
  }, [isSaved]);

  const handleExportToBtuCalculator = (roomsToExport) => {
    const refRooms = filteredRoomsRef.current.flat().filter(Boolean);
    const flatRooms =
      refRooms && refRooms.length > 0
        ? refRooms
        : roomsToExport && roomsToExport.length > 0
        ? roomsToExport
        : allRooms.flat().filter(Boolean);

    console.log("Exporting filtered rooms to BTU Calculator:", flatRooms);

    // Extract AC annotations (ac-1.1, condenser-1, etc.)
    const acAnnotations = comments
      .filter(
        (comment) =>
          comment.text &&
          (comment.text.toLowerCase().match(/ac-\d+/) ||
            comment.text.toLowerCase().match(/condenser-\d+/) ||
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
        { header: "Height", key: "height", width: 15 },
        { header: "Area (sqft)", key: "areaSqFt", width: 15 },
        { header: "Area (sqm)", key: "areaSqM", width: 15 },
      ];

      data.forEach((room) => {
        worksheet.addRow({
          roomType: room.roomType,
          width: room.width,
          height: room.height,
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

      const url = URL.createObjectURL(blob);

      setDownloadedFiles((prev) => [
        ...prev,
        { id: Date.now(), name: finalFileName, url: url },
      ]);

      const a = document.createElement("a");
      a.href = url;
      a.download = finalFileName;
      a.click();

      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 5000);
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("error");
      alert("Failed to export Excel file.");
      setTimeout(() => setExportStatus("idle"), 5000);
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

  React.useEffect(() => {
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
    setFile(null);
    setResults([]);
    setError(null);
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
                case "height":
                  aVal = parseFloat((a.height || "").replace(/[^\d.]/g, ""));
                  bVal = parseFloat((b.height || "").replace(/[^\d.]/g, ""));
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
                        <option value="height">Height</option>
                        <option value="areaSqft">Area (sqft)</option>
                        <option value="areaSqm">Area (sqm)</option>
                      </select>
                    </div>
                    <div className="d-flex flex-column flex-sm-row gap-2">
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
                                <FaFileExcel
                                  className="excel-icon-button excel-icon"
                                  size={20}
                                  color="#217346"
                                />
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
                      placeholder="Enter height in decimal ft e.g., 10.5 for 10'6"
                      value={newRoom.height}
                      onChange={(e) =>
                        setNewRoom({ ...newRoom, height: e.target.value })
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
                            <th>Height (ft)</th>
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
                                      value={editingRoomData.height}
                                      onChange={(e) =>
                                        handleEditingChange(
                                          "height",
                                          e.target.value
                                        )
                                      }
                                    />
                                  ) : (
                                    `${room.height} ft`
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
                                        variant="info"
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
        className="mb-3 mt-3 button-toolbar-annotator"
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
                Export rooms to BTU Calculator (
                {filteredRoomsRef.current.flat().filter(Boolean).length} rooms)
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
      {previewUrl && (
        <div>
          {previewUrl && (
            <div 
              className="container-main"
              onTouchStart={(e) => {
                // Support pinch zoom on small screens
                if (e.touches.length === 2 && window.innerWidth < 768) {
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  pinchStartDistanceRef.current = distance;
                  pinchStartZoomRef.current = pdfZoom;
                }
              }}
              onTouchMove={(e) => {
                // Handle pinch zoom
                if (e.touches.length === 2 && window.innerWidth < 768 && pinchStartDistanceRef.current > 0) {
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  
                  const ratio = distance / pinchStartDistanceRef.current;
                  let newZoom = pinchStartZoomRef.current * ratio;
                  
                  // Constrain zoom between 1x and 4x
                  newZoom = Math.max(1, Math.min(4, newZoom));
                  
                  setPdfZoom(newZoom);
                  e.preventDefault();
                }
              }}
              onTouchEnd={() => {
                pinchStartDistanceRef.current = 0;
              }}
            >
              <div 
                className="canvas-wrapper"
                style={window.innerWidth < 768 && pdfZoom > 1 ? {
                  transform: `scale(${pdfZoom})`,
                  transformOrigin: '0 0',
                  display: 'inline-block',
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
                            // Don't rotate if a long-press is pending or just fired
                            if (longPressTriggeredRef.current || longPressTimeoutRef.current) {
                              longPressTriggeredRef.current = false; // Reset for next touch
                              return;
                            }
                            event.cancelBubble = true;
                            const clickedRectId = event.target.attrs.id;
                            setIsRotating(true);
                            rotateRectangle(clickedRectId);
                            setTimeout(() => setIsRotating(false), 100);
                          }}
                          onTap={(event) => {
                            // Don't rotate if a long-press is pending or just fired
                            if (longPressTriggeredRef.current || longPressTimeoutRef.current) {
                              longPressTriggeredRef.current = false; // Reset for next touch
                              return;
                            }
                            event.cancelBubble = true;
                            const clickedRectId = event.target.attrs.id;
                            setIsRotating(true);
                            rotateRectangle(clickedRectId);
                            setTimeout(() => setIsRotating(false), 100);
                          }}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={() => {
                            // Only cancel long-press if it hasn't fired yet
                            if (longPressTimeoutRef.current && !longPressTriggeredRef.current) {
                              clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                          onDragStart={() => {
                            // Cancel long-press when dragging starts (but not if it already fired)
                            if (longPressTimeoutRef.current && !longPressTriggeredRef.current) {
                              clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                        />
                      </React.Fragment>
                    ))}
                    {comments.map((comment) => {
                      const charWidth = 6; // approximate width per character at fontSize 10
                      const textPadding = 6;
                      const boxWidth = Math.max(48, comment.text.length * charWidth + textPadding);
                      return (
                      <Group key={comment.id}>
                        {/* Comment background box */}
                        <Rect
                          rectId={comment.rectId}
                          x={comment.x}
                          y={comment.y - 10}
                          width={boxWidth}
                          height={16}
                          fill="rgba(252, 252, 243, 0.3)"
                          stroke="grey"
                          strokeWidth={1}
                          hitStrokeWidth={24}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={() => {
                            if (longPressTimeoutRef.current && !longPressTriggeredRef.current) {
                              clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                        />
                        {/* Comment text */}
                        <Text
                          key={comment.id}
                          id={comment.id}
                          rectId={comment.rectId}
                          x={comment.x + 2}
                          y={comment.y - 9}
                          text={comment.text}
                          fontSize={10}
                          fontFamily="Arial"
                          fontStyle="bold"
                          fill="deeppink"
                          width={boxWidth - 4}
                          draggable={true}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={() => {
                            if (longPressTimeoutRef.current && !longPressTriggeredRef.current) {
                              clearTimeout(longPressTimeoutRef.current);
                              longPressTimeoutRef.current = null;
                            }
                          }}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                        />
                      </Group>
                      );
                    })}
                  </Layer>
                </Stage>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile-friendly AC Unit annotation modal (replaces window.prompt) */}
      {showAcUnitModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowAcUnitModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '280px',
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h5 style={{ marginBottom: '12px' }}>Enter AC unit number</h5>
            <Form.Control
              type="text"
              placeholder="ac-1, ac-2, condenser, condenser-1, etc."
              value={acUnitInput}
              onChange={(e) => setAcUnitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  console.log('Modal Enter key pressed, pendingAnnotationPos:', pendingAnnotationPos);
                  confirmAcUnitAnnotation(acUnitInput.trim(), pendingAnnotationPos);
                  setShowAcUnitModal(false);
                }
              }}
              autoFocus
              style={{ marginBottom: '16px', fontSize: '16px' }}
            />  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  console.log('Modal Add button clicked, pendingAnnotationPos:', pendingAnnotationPos);
                  confirmAcUnitAnnotation(acUnitInput.trim(), pendingAnnotationPos);
                  setShowAcUnitModal(false);
                }}
                disabled={!acUnitInput.trim()}
              >
                Add
              </Button>
          <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAcUnitModal(false)}
              >
                Cancel
              </Button>
          
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Annotator;