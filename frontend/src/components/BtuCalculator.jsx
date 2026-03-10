import { useState, useEffect, useRef, useCallback } from "react";
import { Container, Row, Col, Form, Button, Table } from "react-bootstrap";
import axios from "axios";
import { Link } from "react-router-dom";
import { getError } from "../utils";
import { useContext } from "react";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import CheckboxGroup from "./CheckboxGroup.jsx";
import printJS from "print-js";
import TableBody from "./TableBody";
import { ShoppingCart } from "lucide-react";
import { toast } from "react-toastify";
import "./BtuCalculator.css";

const CONSTANTS = {
  // ~147 W/m² ≈ 500 BTU/m² — calibrated for Israel (Tel Aviv / central regions).
  // Hot Middle East ×1.2 brings this to ~600 BTU/m² for Negev / Eilat desert.
  BASE_BTU_PER_SQ_METER:600,
  // Each extra metre above 2.5 m adds this fraction of base BTU (proportional volume increase).
  HEIGHT_BTU_FACTOR_PER_METER: 0.4,
  // ASHRAE sensible heat for sedentary occupancy: ~450 BTU/hr per person.
  BTU_PER_ADDITIONAL_PERSON: 450,
  KITCHEN_BTU_ADDITION: 600,
  OUTDOOR_LOCATION_BTU_ADJUSTMENTS: {
    Roof: 1.0,
    WallBrackets: 1.0,
    HardGround: 1.0,
  },
  apartmentOrientationMultipliers: {
    North: 0.9,
    East: 1.1,
    South: 1.2,
    West: 1.0,
  },
  CONVERT_FEET_TO_METERS: 0.3048,
};
function BtuCalculator({ roomData, acAnnotations = [] }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const componentRef = useRef();
  const cartItems = state?.cart?.cartItems || [];

  // Parse AC annotations (e.g., "ac-1.1", "ac-1.2", "condenser-1", "Flat 1", etc.)
  const parseAcAnnotations = useCallback((annotations) => {
    const acUnits = [];
    const condensers = {};
    const flatKeywords = new Set();

    console.log("Parsing annotations:", annotations);

    annotations.forEach((annotation) => {
      const label = annotation.label?.toLowerCase() || "";
      console.log("Processing annotation:", label);

      // Match patterns: ac-1.1, ac-2.1, etc. (with or without dash)
      const acMatch = label.match(/ac-?(\d+)\.(\d+)/);
      if (acMatch) {
        const flatNumber = acMatch[1];
        const unitNumber = acMatch[2];
        acUnits.push({
          label: annotation.label,
          flatNumber: parseInt(flatNumber),
          unitNumber: parseInt(unitNumber),
          coordinates: annotation.coordinates,
        });
      }

      // Also match simpler pattern: ac-1, ac-2, ac1, ac2 (without unit number)
      const simpleAcMatch = label.match(/ac-?(\d+)(?:[,;\s]|$)/);
      if (simpleAcMatch && !acMatch) {
        const flatNumber = simpleAcMatch[1];
        acUnits.push({
          label: annotation.label,
          flatNumber: parseInt(flatNumber),
          unitNumber: 1,
          coordinates: annotation.coordinates,
        });
      }

      // Match patterns: condenser-1, condenser-2, etc. (with or without dash)
      const condenserMatch = label.match(/condenser-?(\d+)/);
      if (condenserMatch) {
        const flatNumber = condenserMatch[1];
        condensers[flatNumber] = {
          label: annotation.label,
          flatNumber: parseInt(flatNumber),
          coordinates: annotation.coordinates,
        };
        flatKeywords.add(parseInt(flatNumber));
      }

      // Also match: "condenser 1", "condenser 2"
      const simpleCondenserMatch = label.match(/condenser\s+(\d+)/);
      if (simpleCondenserMatch && !condenserMatch) {
        const flatNumber = simpleCondenserMatch[1];
        condensers[flatNumber] = {
          label: annotation.label,
          flatNumber: parseInt(flatNumber),
          coordinates: annotation.coordinates,
        };
        flatKeywords.add(parseInt(flatNumber));
      }

      // Match keywords: "Flat 1", "Flat 2", "Unit 1", "Unit 2"
      const flatKeywordMatch = label.match(/(?:flat|unit)\s+(\d+)/);
      if (flatKeywordMatch) {
        flatKeywords.add(parseInt(flatKeywordMatch[1]));
      }
    });

    console.log("Parsed results:", {
      acUnits,
      condensers,
      flatKeywords: Array.from(flatKeywords),
    });

    return {
      acUnits,
      condensers,
      flatKeywords: Array.from(flatKeywords).sort((a, b) => a - b),
    };
  }, []);

  // Group flats based on parsed annotations
  const groupFlatsByAnnotations = useCallback(
    (annotations) => {
      const { acUnits, condensers, flatKeywords } =
        parseAcAnnotations(annotations);
      const flats = {};

      // Create flat structure based on condensers found
      Object.keys(condensers).forEach((flatNum) => {
        flats[`Flat ${flatNum}`] = {
          flatNumber: parseInt(flatNum),
          acUnits: acUnits.filter((ac) => ac.flatNumber === parseInt(flatNum)),
          condenser: condensers[flatNum],
        };
      });

      // If condensers weren't explicitly found, use flat keywords to create flats
      if (flatKeywords.length > 0 && Object.keys(condensers).length === 0) {
        flatKeywords.forEach((flatNum) => {
          flats[`Flat ${flatNum}`] = {
            flatNumber: flatNum,
            acUnits: acUnits.filter((ac) => ac.flatNumber === flatNum),
            condenser: null,
          };
        });
      }

      return { flats, acUnits, condensers, flatKeywords };
    },
    [parseAcAnnotations]
  );

useEffect(() => {
  if (roomData?.length) {
    // Filter out invalid rooms (those without name or size)
    const validRooms = roomData.filter((room) => room.name && room.size);

    if (validRooms.length > 0) {
      const formattedRooms = validRooms.map((room) => ({
        name: room.name,
        size: room.size,
        btu: 0,
        unit: "meters",
      }));

      // 1. Detect multi-flat from AC annotations
      let isMultiFlat = false;
      let flatNamesFromAnnotations = [];
      if (acAnnotations?.length > 0) {
        const { flats } = groupFlatsByAnnotations(acAnnotations);
        flatNamesFromAnnotations = Object.keys(flats);
        isMultiFlat = flatNamesFromAnnotations.length > 1;
      }

      // 2. Also detect multi-flat from distinct flat-number prefixes in room names
      //    (handles the case where Annotator sends rooms with prefixes but no annotations)
      const flatNumsInRoomNames = new Set(
        formattedRooms
          .map((r) => r.name.match(/^flat\s*(\d+)\s*[:\s]/i)?.[1])
          .filter(Boolean)
      );
      if (flatNumsInRoomNames.size > 1) {
        isMultiFlat = true;
      }

      // Only strip prefixes when genuinely single-flat
      if (!isMultiFlat) {
        formattedRooms.forEach((room) => {
          room.name = room.name
            .replace(/^(Flat\s*\d+|Unit\s*[A-Z0-9]+|Apt\s*\d+)[\s:]+/i, "")
            .trim();
        });
      }

      console.log("BtuCalculator received rooms (multi-flat:", isMultiFlat, "):", formattedRooms);
      setRooms(formattedRooms);

      // 3. Update detectedFlats from annotations or from room-name prefixes
      let allFlatNames = flatNamesFromAnnotations;
      if (allFlatNames.length < 2 && flatNumsInRoomNames.size > 1) {
        allFlatNames = Array.from(flatNumsInRoomNames)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((n) => `Flat ${n}`);
      }
      if (allFlatNames.length > 1) {
        setDetectedFlats(allFlatNames);
        setIsMultiFlatProperty(true);
      } else {
        setDetectedFlats([]);
        setIsMultiFlatProperty(false);
      }
    }
  }
}, [roomData, acAnnotations, groupFlatsByAnnotations]);
  
  
  const handlePrint = () => {
    if (!rooms?.length || !btuResults?.length) return;

    // Ensure condenser calculation has completed
    if (showCondenser && condensersForDisplay.length === 0) {
      alert("Please wait for calculations to complete before printing.");
      return;
    }

    const totalBTU = btuResults.reduce((sum, btu) => sum + (btu || 0), 0);
    const totalProductBTU = products.reduce(
      (sum, product) => sum + (product.btu || 0),
      0
    );
    const totalPrice = products.length
      ? products.reduce(
          (sum, product) =>
            sum +
            (product.price
              ? product.discount
                ? product.price - (product.price * product.discount) / 100
                : product.price
              : 0),
          0
        )
      : 0;
    // Treat condenser as a single aggregated condenser in print/export
    const condenserTotalBTU = condensersForDisplay.reduce(
      (sum, c) => sum + (c?.btu || 0),
      0
    );
    const condenserTotalPrice = condensersForDisplay.reduce((sum, c) => {
      if (!c) return sum;
      const price = c.price
        ? c.discount
          ? c.price - (c.price * c.discount) / 100
          : c.price
        : 0;
      return sum + price;
    }, 0);

    // Calculate totals including condensers (may be multiple)
    const totalItemCount =
      products.length + (showCondenser ? condensersForDisplay.length : 0);
    const totalAllBTU = totalProductBTU + condenserTotalBTU;
    const totalAllPrice = totalPrice + condenserTotalPrice;

    // Build room rows — insert flat section headers for multi-flat properties
    const getFlatPrefix = (name) => {
      const m = name?.match(/^(Flat\s*\d+)\s*:/i);
      return m ? m[1] : null;
    };
    // Pre-compute per-flat (or total) BTU requirement for each condenser
    const condenserBtus = condensersForDisplay.map((cond) => {
      const flatNum = cond?.flatName?.match(/\d+/)?.[0];
      if (flatNum) {
        return btuResults.reduce(
          (s, btu, ri) =>
            rooms[ri]?.name?.toLowerCase().includes(`flat ${flatNum}:`) ? s + (btu || 0) : s,
          0
        );
      }
      return btuResults.reduce((s, b) => s + (b || 0), 0);
    });

    let lastFlatHeader = null;
    const roomRowsHtml = btuResults
      .map((btu, i) => {
        const rawName = rooms[i]?.name || "";
        const flatPrefix = getFlatPrefix(rawName);
        let headerHtml = "";
        if (flatPrefix && flatPrefix !== lastFlatHeader) {
          lastFlatHeader = flatPrefix;
          headerHtml = `<tr class="flat-section-header"><td colspan="5">${flatPrefix}</td></tr>`;
        }
        const displayName = flatPrefix
          ? rawName.replace(/^Flat\s*\d+\s*:\s*/i, "")
          : rawName;
        return `${headerHtml}<tr>
              <td>${displayName}</td>
              <td>${btu}</td>
              <td>${products[i]?.model || ""}</td>
              <td>${products[i]?.btu || ""}</td>
              <td>${
                products[i]?.price
                  ? products[i].discount
                    ? (
                        products[i].price -
                        (products[i].price * products[i].discount) / 100
                      ).toFixed(2)
                    : products[i].price.toFixed(2)
                  : ""
              }</td>
            </tr>`;
      })
      .join("");

    let tableHtml = `
    <div class="print-container">
      <h1>Products Quote</h1>
      <table class="quote-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Room BTU</th>
            <th>Optimal Product</th>
            <th>Product BTU</th>
            <th>Price</th>
          </tr>
        </thead>
        <tr class="cooling-load-row">
        <tbody>
          ${roomRowsHtml}
          ${
            condensersForDisplay &&
            condensersForDisplay.length > 0 &&
            showCondenser
              ? condensersForDisplay
                  .map(
                    (cond, index) => `
            <tr style="background-color: #eff6ff;">
              <td style="font-weight: 700; color: #2563a8;">${
                cond?.flatName
                  ? `${cond.flatName} Condenser`
                  : condensersForDisplay.length > 1
                  ? `Condenser ${index + 1}`
                  : "Condenser"
              }</td>
              <td style="font-weight: 700; color: #2563a8;">
                ${condenserBtus[index].toLocaleString()} BTU
              </td>
              <td style="font-weight: 700; color: #2563a8;">${
                cond?.model || cond?.name || ""
              }</td>
              <td style="font-weight: 700;">${cond?.btu || ""}</td>
              <td style="font-weight: 700; color: ${
                condenserSizingStatus === "custom" ? "#d97706" : "#2563a8"
              };">${
                      cond?.price > 0
                        ? `$${
                            cond?.discount
                              ? (
                                  cond.price -
                                  (cond.price * cond.discount) / 100
                                ).toFixed(2)
                              : cond.price.toFixed(2)
                          }${
                            condenserSizingStatus === "custom" ? " (est.)" : ""
                          }`
                        : "Contact for price"
                    }</td>
            </tr>
          `
                  )
                  .join("")
              : ""
          }
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td><strong>${totalBTU}</strong></td>
            <td><strong>${totalItemCount}</strong></td>
            <td><strong>${totalAllBTU.toFixed(0)}</strong></td>
            <td><strong>${
              totalItemCount > 0
                ? totalAllPrice.toFixed(2)
                : "No price available"
            }</strong></td>
          </tr>
          <tr class="cooling-load-row">
            <td colspan="5" style="color: #1e40af; font-weight: bold; text-align: center;">
              Total Cooling Load: ${displayValue} ${selectedUnit}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

    if (showCondenser && condenser) {
      // Show condenser sizing status
      let statusText = "";
      let statusColor = "#2563a8";

      if (condenserSizingStatus === "perfect") {
        statusText = "✓ Perfect Match";
        statusColor = "#16a34a";
      } else if (condenserSizingStatus === "oversized") {
        statusText = "📈 Slightly Oversized";
        statusColor = "#2563a8";
      } else if (condenserSizingStatus === "undersized") {
        statusText = "⚠️ Slightly Undersized";
        statusColor = "#d97706";
      } else if (condenserSizingStatus === "custom") {
        statusText = "🔧 Custom Solution Required";
        statusColor = "#dc2626";
      }

      const condenserStatusRow = `
      <tr class="text-center" style="background-color: #eff6ff;">
        <td colspan="5" style="color: ${statusColor}; font-weight: 700; padding: 10px;">
          <strong>Condenser Status: ${statusText}</strong><br/>
          <small style="color:#6b7280;">${condenser ? `${condenser.name} - ${condenser.btu} BTU` : "Estimated condenser"}</small>
        </td>
      </tr>
    `;
      tableHtml = tableHtml.replace(
        "</tbody>",
        `${condenserStatusRow}</tbody>`
      );
    }
    setShowTable(true);

    printJS({
      printable: tableHtml,
      type: "raw-html",
      header: null,
      css: "../index.css",
      style: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Segoe UI', sans-serif; background: #f5f6fa; }
        .print-container {
          max-width: 960px;
          margin: 24px auto;
          padding: 0 0 24px;
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          overflow: hidden;
        }
        .print-container > h1 {
          background: linear-gradient(135deg, #5b6070, #2563a8);
          color: #fff;
          text-align: center;
          padding: 1.4rem 1rem;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0;
          border-radius: 14px 14px 0 0;
        }
        .quote-table {
          width: calc(100% - 2rem);
          margin: 1.25rem 1rem 0;
          border-collapse: collapse;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
        }
        th {
          background: linear-gradient(135deg, #1a3c5e, #2563a8);
          color: #fff;
          padding: 12px 14px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: center;
        }
        td {
          padding: 10px 14px;
          text-align: center;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.88rem;
          color: #1f2937;
        }
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        tbody tr:hover {
          background: #eff6ff;
        }
        .total-row td {
          background: linear-gradient(135deg, #a8112a, #ec133e);
          color: #fff !important;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .cooling-load-row td {
          background: #dbeafe;
          color: #1e40af;
          font-weight: 700;
          text-align: center;
          border-top: 2px solid #2563a8;
        }
        .flat-section-header td {
          background: linear-gradient(135deg, #1a3c5e, #2563a8);
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          text-align: left;
          padding: 8px 14px;
          letter-spacing: 0.04em;
          border-top: 3px solid #ec133e;
        }
      `,
    });
  };

  const [measurementSystem, setMeasurementSystem] = useState("meters");
  const [rooms, setRooms] = useState([{ name: "Bedroom 1", size: "", btu: 0 }]);
  const [ceilingHeight, setCeilingHeight] = useState("2.5");
  const [numPeople, setNumPeople] = useState(2);
  const [showCondenser, setShowCondenser] = useState(false);
  const [error, setError] = useState("");
  const [totalBTU, setTotalBTU] = useState(0);
  const [condenser, setCondenser] = useState(null);
  const [selectedCondensers, setSelectedCondensers] = useState([]);
  const [condenserSizingStatus, setCondenserSizingStatus] = useState(""); // 'perfect', 'oversized', 'undersized', 'custom'
  // eslint-disable-next-line no-unused-vars
  const [showTable, setShowTable] = useState(false);
  const [optimalProductCount, setOptimalProductCount] = useState(0);
  const [options, setOptions] = useState({
    OutdoorUnitLocation: {
      Roof: false,
      WallBrackets: false,
      HardGround: false,
    },
    typeOfWall: {
      BrickVeneer: false,
      DoubleBrick: false,
      FoamCladding: false,
    },
    insulation: {
      Average: false,
      Good: false,
      Poor: false,
    },
    sunExposure: {
      Average: false,
      FullSunlight: false,
      HeavilyShaded: false,
    },
    climate: {
      AverageEurope: false,
      HotMiddleEast: false,
      ColdAlaska: false,
    },
    appliances: {
      Oven: false,
      Television: false,
      Computer: false,
    },
    windowType: {
      SingleGlazed: false,
      DoubleGlazed: false,
      TripleGlazed: false,
      Louvered: false,
    },
    roofType: {
      Roof: false,
      Flat: false,
      Pitched: false,
      Gable: false,
    },
    floorType: {
      Marble: false,
      Timber: false,
      Concrete: false,
      Carpeted: false,
    },
    apartmentOrientation: {
      North: false,
      East: false,
      South: false,
      West: false,
    },

    outputUnit: {
      BTU: true,
      Watt: false,
      kW: false,
    },
  });

  const [btuResults, setBtuResults] = useState([]);
  const [products, setProducts] = useState([]);
  const isVRFSystem = true;
  const [isMultiFlatProperty, setIsMultiFlatProperty] = useState(false);
  const [detectedFlats, setDetectedFlats] = useState([]);

  // hvacSystemType was removed to avoid unused variable; use `isVRFSystem` directly

  // VRF system limits and validations
  const MAX_VRF_INDOOR_UNITS = 64;
  const MAX_VRF_TOTAL_CAPACITY = 360000; // BTU

  // Validate system capacity limits (side-effect moved to useEffect to avoid render-phase setState)
  useEffect(() => {
    if (isVRFSystem && rooms.length > MAX_VRF_INDOOR_UNITS) {
      setError(
        `⚠️ Warning: VRF systems support maximum ${MAX_VRF_INDOOR_UNITS} indoor units. Current: ${rooms.length}. Consider splitting into multiple VRF systems.`
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.length]);

  const selectedUnit = "kW";

  const outputUnitConversion = {
    BTU: 1,
    Watt: 0.29307107,
    kW: 0.00029307107,
  };

  const convertedValue = totalBTU * outputUnitConversion[selectedUnit];

  const convertArea = (value) => {
    // 1 sq ft = 0.0929 m²  (0.3048²)
    return measurementSystem === "feet"
      ? value * 0.0929
      : value;
  };

  useEffect(() => {
    setRooms((prevRooms) =>
      prevRooms.map((room) => {
        if (!room.size) return room;

        const currentUnit = room.unit || "meters"; // Default to meters if not set

        // Converting FROM meters TO feet
        if (measurementSystem === "feet" && currentUnit === "meters") {
          return {
            ...room,
            size: (room.size * 10.764).toFixed(2),
            unit: "feet",
          };
        }

        // Converting FROM feet TO meters
        if (measurementSystem === "meters" && currentUnit === "feet") {
          return {
            ...room,
            size: (room.size / 10.764).toFixed(2),
            unit: "meters",
          };
        }

        // Already in correct unit
        return room;
      })
    );
  }, [measurementSystem]);

  const handleOptionChange = (category, name) => {
    setOptions((prev) => ({
      ...prev,
      [category]: { ...prev[category], [name]: !prev[category][name] },
    }));
  };

  const handleOutdoorUnitLocationChange = (e) =>
    handleOptionChange("OutdoorUnitLocation", e.target.name);

  const handleWallChange = (e) =>
    handleOptionChange("typeOfWall", e.target.name);

  const handleInsulationChange = (e) =>
    handleOptionChange("insulation", e.target.name);

  const handleSunExposureChange = (e) =>
    handleOptionChange("sunExposure", e.target.name);

  const handleClimateChange = (e) =>
    handleOptionChange("climate", e.target.name);

  const handleAppliancesChange = (e) =>
    handleOptionChange("appliances", e.target.name);

  const handleWindowChange = (e) =>
    handleOptionChange("windowType", e.target.name);

  const handleRoofChange = (e) => handleOptionChange("roofType", e.target.name);

  const handleApartmentChange = (e) =>
    handleOptionChange("apartmentOrientation", e.target.name);

  const handleFloorChange = (e) =>
    handleOptionChange("floorType", e.target.name);

  // Clear stale results whenever any calculation input changes —
  // forces the user to click Calculate again with the new settings.
  useEffect(() => {
    setBtuResults([]);
    setProducts([]);
    setCondenser(null);
    setSelectedCondensers([]);
    setTotalBTU(0);
    setShowCondenser(false);
    setCondenserSizingStatus("");
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, ceilingHeight, numPeople, measurementSystem, rooms]);

  const calculateBTUForRoom = (room) => {
    let area = convertArea(parseFloat(room.size));
    let height = parseFloat(ceilingHeight);

    if (isNaN(area) || isNaN(height)) {
      return { btu: null, error: "Enter valid room size & ceiling height." };
    }

    let btu = area * CONSTANTS.BASE_BTU_PER_SQ_METER;
    // Height adjustment: proportional to room volume increase above 2.5 m baseline.
    // Adds HEIGHT_BTU_FACTOR_PER_METER × (extra metres) × current base BTU.
    if (height > 2.5)
      btu += btu * CONSTANTS.HEIGHT_BTU_FACTOR_PER_METER * (height - 2.5);
    btu += CONSTANTS.BTU_PER_ADDITIONAL_PERSON * Math.max(0, numPeople - 1);
    if (room.name === "Kitchen") btu += CONSTANTS.KITCHEN_BTU_ADDITION;

    const diningRoomBtuByClimate = {
      AverageEurope: 3000,
      HotMiddleEast: 4000,
      ColdAlaska: 2500,
    };

    if (room.name === "Dining Room") {
      const selectedClimate = Object.keys(options.climate || {}).find(
        (k) => options.climate[k]
      );
      // Only add climate-based dining bonus when a climate is explicitly selected
      btu += diningRoomBtuByClimate[selectedClimate] || 0;
    }

    // VRF efficiency adjustment (VRF systems use base calculation)
    // btu *= 1.0; // No adjustment needed

    const applyMultiplier = (category, multipliers) => {
      if (!multipliers || typeof multipliers !== "object") return;
      if (!options[category] || typeof options[category] !== "object") return;

      Object.keys(multipliers).forEach((key) => {
        if (options[category][key]) {
          btu *= multipliers[key];
        }
      });
    };
    applyMultiplier("insulation", {
      Poor: 1.2,
      Average: 1,
      Good: 0.8,
    });
    applyMultiplier("floorType", {
      Marble: 1.0,
      Timber: 1.05,
      Concrete: 1.0,
      Carpeted: 0.95,
    });
    applyMultiplier("windowType", {
      SingleGlazed: 1.15,
      DoubleGlazed: 1.0,
      TripleGlazed: 0.85,
      Louvered: 1.2,
    });
    applyMultiplier("roofType", {
      Flat: 1.1,
      Pitched: 1.0,
      Gable: 1.0,
      Roof: 1.0,
    });
    applyMultiplier("appliances", {
      Oven: 1.1,
      Television: 1.02,
      Computer: 1.03,
    });

    applyMultiplier("sunExposure", {
      FullSunlight: 1.2,
      Average: 1,
      HeavilyShaded: 0.8,
    });

    applyMultiplier("climate", {
      HotMiddleEast: 1.2,
      AverageEurope: 1.0,
      ColdAlaska: 0.8,
    });

    applyMultiplier("typeOfWall", {
      BrickVeneer: 1.1,
      DoubleBrick: 0.9,
      FoamCladding: 0.8,
    });

    applyMultiplier(
      "OutdoorUnitLocation",
      CONSTANTS.OUTDOOR_LOCATION_BTU_ADJUSTMENTS
    );
    applyMultiplier(
      "apartmentOrientation",
      CONSTANTS.apartmentOrientationMultipliers
    );

    return { btu: Math.round(btu), error: null };
  };

  // Detect and group rooms by flat
  const detectFlatGroupings = (roomList) => {
    const flats = {};
    if (!Array.isArray(roomList)) {
      return flats;
    }
    roomList.forEach((room) => {
      // Skip if room or room.name is undefined
      if (!room || !room.name || typeof room.name !== "string") {
        return;
      }
      // Check if room name includes flat identifier (e.g., "Flat 1: Bedroom" or "Unit A: Living Room")
      const flatMatch = room.name.match(
        /^(Flat\s*\d+|Unit\s*[A-Z]|Apt\s*\d+)[\s:]/i
      );
      // Normalise to title-case "Flat 1" so keys match detectedFlats from useEffect
      const flatId = flatMatch
        ? flatMatch[1].replace(/^(\w)(.*)/, (_, a, b) => a.toUpperCase() + b.toLowerCase())
        : null;

      // Skip rooms without a flat prefix (single-flat properties)
      if (!flatId) return;

      if (!flats[flatId]) {
        flats[flatId] = [];
      }
      flats[flatId].push(room);
    });
    return flats;
  };

  const handleCalculate = async () => {
    setError("");
    const results = [];
    let totalBTU = 0;

    const productRequests = rooms.map(async (room) => {
      const { btu, error } = calculateBTUForRoom(room);
      if (error) {
        setError(error);
        return { room, product: null, btu };
      }

      results.push(btu);
      totalBTU += btu;

      try {
        const { data } = await axios.get(`/api/products/btu/${btu}`, {
          params: Object.fromEntries(
            Object.entries(options).map(([category, values]) => [
              category,
              Object.keys(values).filter((key) => values[key]),
            ])
          ),
        });

        const product =
          data && typeof data === "object" && data._id
            ? data
            : {
                _id: `placeholder-${room.name}-${btu}`,
                name: room.name,
                btu,
                price: 0,
                slug: `placeholder-${room.name.toLowerCase().replace(/\s+/g, '-')}-${btu}-btu`,
                displayName: "No product available",
                image: "",
                category: "Placeholder",
                brand: "Custom",
                description: `Product not available for ${room.name}`,
              };

        return { room, product, btu };
      } catch (err) {
        console.error(`Product not found for room ${room.name}:`, err);
        return {
          room,
          product: {
            _id: `placeholder-${room.name}-${btu}`,
            name: room.name,
            btu,
            price: 0,
            slug: `placeholder-${room.name.toLowerCase().replace(/\s+/g, '-')}-${btu}-btu`,
            displayName: "No product available",
            image: "",
            category: "Placeholder",
            brand: "Custom",
            description: `Product not available for ${room.name}`,
          },
          btu,
        };
      }
    });

    const productResults = await Promise.all(productRequests);

    const acProducts = [];
    let condenserCandidates = [];

    productResults.forEach(({ room, product }) => {
      if (
        (product.category &&
          product.category.toLowerCase().includes("condenser")) ||
        /condenser/i.test(product.name || product.title)
      ) {
        condenserCandidates.push(product);
      } else {
        acProducts.push(product);
      }
    });

    let condenser = condenserCandidates[0] || null;
    let sizingStatus = "";
    let selectedCondensers = [];

    // Determine system type from fetched products
    // VRF capacity validation (show warning but continue calculations)
    if (totalBTU > MAX_VRF_TOTAL_CAPACITY) {
      setError(
        `⚠️ Warning: VRF system total capacity (${totalBTU.toLocaleString()} BTU) exceeds recommended ${MAX_VRF_TOTAL_CAPACITY.toLocaleString()} BTU limit. Consider splitting into multiple systems for optimal performance.`
      );
      // Continue with calculations despite warning
    }

    if (!condenser) {
      // Calculate required condenser BTU based on system type
      const multiplier = 1.0;

      // Helper function to find suitable condenser for a given BTU
      const findSuitableCondenser = async (requiredBTU, label = "") => {
        let availableCondensers =
          condenserCandidates.length > 0 ? condenserCandidates : [];

        if (availableCondensers.length === 0) {
          try {
            const { data: condenserList } = await axios.get(
              `/api/products/condensers/${Math.round(requiredBTU)}`
            );
            if (Array.isArray(condenserList)) {
              availableCondensers = condenserList;
            }
          } catch (err) {
            console.log(
              `Could not fetch condensers for ${label}, will use estimate`
            );
          }
        }

        // Filter condensers for VRF systems
        availableCondensers = availableCondensers.filter(cond =>
          /vrf/i.test(cond.name) ||
          /vrf/i.test(cond.category || '')
        );

        availableCondensers.sort((a, b) => a.btu - b.btu);

        let suitableCondenser = null;
        let minDiff = Infinity;
        for (const cond of availableCondensers) {
          const diff = Math.abs(cond.btu - requiredBTU);
          if (diff < minDiff) {
            minDiff = diff;
            suitableCondenser = cond;
          }
        }

        console.log(`Suitable condenser found:`, suitableCondenser);

        if (suitableCondenser && suitableCondenser.btu < requiredBTU * 0.9) {
          const estimatedPrice = Math.round(requiredBTU * 0.065 * 100) / 100;
          return {
            _id: `condenser-${Math.round(requiredBTU)}`, // Consistent _id for custom condensers of same BTU
            name: label ? `${label} Condenser` : "Custom Condenser Required",
            model: `${Math.round(requiredBTU)} BTU VRF Condenser`,
            btu: Math.round(requiredBTU),
            price: estimatedPrice,
            discount: 0,
            slug: `custom-condenser-${Math.round(requiredBTU)}-btu`,
            image: "",
            category: "Custom Condenser",
            brand: "Custom",
            description: `Custom VRF condenser for ${Math.round(requiredBTU)} BTU requirement`,
            flatName: label || undefined,
          };
        } else if (suitableCondenser) {
          console.log(`Found suitable condenser:`, suitableCondenser);
          console.log(`Condenser BTU: ${suitableCondenser.btu}, type: ${typeof suitableCondenser.btu}`);
          // Extract BTU from name since btu field may be corrupted
          const btuFromName = suitableCondenser.name.match(/(\d+)\s*BTU/)?.[1];
          const btuValue = btuFromName ? parseInt(btuFromName) : suitableCondenser.btu;
          console.log(`Using BTU value: ${btuValue} (from name: ${btuFromName})`);
          const result = {
            ...suitableCondenser,
            _id: `condenser-${btuValue}`, // Use extracted BTU for grouping identical models
            flatName: label || undefined,
            // Keep original name for cart grouping
            name: suitableCondenser.name,
            btu: btuValue, // Ensure BTU is correct
          };
          console.log(`Returning condenser result:`, result);
          return result;
        } else {
          const estimatedPrice = Math.round(requiredBTU * 0.065 * 100) / 100;
          return {
            _id: `condenser-${Math.round(requiredBTU)}`, // Consistent _id for custom condensers of same BTU
            name: label ? `${label} Condenser` : "Custom Condenser Required",
            model: `${Math.round(requiredBTU)} BTU VRF Condenser`,
            btu: Math.round(requiredBTU),
            price: estimatedPrice,
            discount: 0,
            slug: `custom-condenser-${Math.round(requiredBTU)}-btu`,
            image: "",
            category: "Custom Condenser",
            brand: "Custom",
            description: `Custom VRF condenser for ${Math.round(requiredBTU)} BTU requirement`,
            flatName: label || undefined,
          };
        }
      };

      // Check if this is a multi-flat property with separate condensers
      if (
        isMultiFlatProperty &&
        detectedFlats.length > 1 &&
        acAnnotations?.length > 0
      ) {
        // Multi-flat property: calculate separate condensers per flat
        console.log(
          "Multi-flat property detected - calculating per-flat condensers"
        );

        const { flats, acUnits } = groupFlatsByAnnotations(acAnnotations);

        // Calculate BTU per flat by summing already-computed room results directly.
        // Room names carry a "Flat N:" prefix for multi-flat properties.
        const flatBTUs = {};

        detectedFlats.forEach((flatName) => {
          const flatNum = flatName.match(/\d+/)?.[0];
          if (!flatNum) return;

          // Sum BTU for every room whose name starts with "Flat N:"
          let flatTotalBTU = 0;
          rooms.forEach((room, roomIdx) => {
            if (room.name.toLowerCase().includes(`flat ${flatNum}:`)) {
              flatTotalBTU += results[roomIdx] || 0;
            }
          });

          if (flatTotalBTU > 0) {
            flatBTUs[flatName] = flatTotalBTU;
          } else if (flats[flatName]) {
            // Fallback: estimate from AC unit count ratio when rooms have no flat prefix
            const acUnitCount = flats[flatName].acUnits.length;
            const avgBtuPerUnit = totalBTU / (acUnits.length || 1);
            flatBTUs[flatName] = avgBtuPerUnit * acUnitCount;
          }
        });

        // Last-resort: equal distribution if nothing matched
        if (Object.keys(flatBTUs).length === 0) {
          const btuPerFlat = totalBTU / detectedFlats.length;
          detectedFlats.forEach((flatName) => {
            flatBTUs[flatName] = btuPerFlat;
          });
        }

        // Create separate condenser for each flat
        selectedCondensers = [];

        console.log("Creating condensers for flats:", Object.entries(flatBTUs));

        for (const [flatName, flatBTU] of Object.entries(flatBTUs)) {
          const flatRequiredBTU = flatBTU * multiplier;
          console.log(
            `Creating condenser for ${flatName}: ${flatBTU} BTU * ${multiplier} = ${flatRequiredBTU} BTU`
          );
          const condResult = await findSuitableCondenser(
            flatRequiredBTU,
            flatName
          );
          console.log(`Created condenser:`, condResult);
          selectedCondensers.push(condResult);
        }

        console.log("Final selectedCondensers:", selectedCondensers);
      } else {
        // Single flat or no annotations: use existing logic
        const requiredBTU = totalBTU * multiplier;
        const condResult = await findSuitableCondenser(requiredBTU, "");
        selectedCondensers = [condResult];
      }

      // Calculate total BTU provided by selected condensers
      const totalCondenserBTU = selectedCondensers.reduce(
        (sum, c) => sum + c.btu,
        0
      );

      // Determine sizing status based on scenario
      let comparisonBTU = totalBTU * multiplier;
      const percentage = (totalCondenserBTU / comparisonBTU) * 100;
      if (percentage >= 98 && percentage <= 102) {
        sizingStatus = "perfect";
      } else if (percentage > 102) {
        sizingStatus = "oversized";
      } else {
        sizingStatus = "undersized";
      }

      // Set condenser to the first one for backward compatibility, but store all selected
      condenser = selectedCondensers.length > 0 ? selectedCondensers[0] : null;
    }

    setCondenser(condenser);
    setCondenserSizingStatus(sizingStatus);
    setBtuResults(results);
    getError("");
    setProducts(acProducts);
    setSelectedCondensers(selectedCondensers);
    setTotalBTU(totalBTU);

    if (acProducts.length > 0) {
      const minBTU = Math.min(...acProducts.map((p) => p.btu));
      const maxBTU = Math.max(...acProducts.map((p) => p.btu));

      const optimalProducts = acProducts.filter(
        (product) => product.btu >= minBTU && product.btu <= maxBTU
      );

      setOptimalProductCount(optimalProducts.length);
    } else {
      setOptimalProductCount(0);
    }
    setShowCondenser(totalBTU >= 10000);
  };

  const displayValue = convertedValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  // Helper: prefer the detailed selectedCondensers array when present (multi-flat),
  // otherwise fall back to the single `condenser` object if available.
  const condensersForDisplay =
    selectedCondensers && selectedCondensers.length > 0
      ? selectedCondensers
      : condenser
      ? [condenser]
      : [];

  // Navigate to ROI Calculator with BTU data
  
  const saveResultsToCart = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Ensure condenser calculation has completed
  if (showCondenser && condensersForDisplay.length === 0) {
    alert("Please wait for calculations to complete before saving to cart.");
    return;
  }

  const addItemToCart = (product, quantity = 1) => {
    if (!product) return;

    console.log(`[handleAddToCart] Adding: ${product.name}, _id: ${product._id}, btu: ${product.btu}, quantity: ${quantity}`);

    const existItem = cartItems.find((x) => x._id === product._id);
    const newQuantity = existItem ? existItem.quantity + quantity : quantity;

    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...product, quantity: newQuantity },
    });
  };

  if (!Array.isArray(rooms)) {
    console.error("'rooms' must be an array.");
    return;
  }

  const productCount = {};

  rooms.forEach((room, index) => {
    let product = products[index];
    if (!product || !product._id || !product.price) {
      product = {
        _id: `placeholder-${index}`,
        name: room.name,
        btu: 0,
        price: 0,
        slug: `placeholder-${room.name.toLowerCase().replace(/\s+/g, '-')}-item`,
        displayName: "No product available",
        image: "",
        category: "Placeholder",
        brand: "Custom",
        description: `Product not available for ${room.name}`,
      };
    }

    if (!productCount[product.btu]) {
      productCount[product.btu] = { product, quantity: 0 };
    }
    productCount[product.btu].quantity += 1;
  });
  Object.values(productCount).forEach(({ product, quantity }) => {
    addItemToCart(product, quantity);
  });

  // Add all condensers (supports multi-flat) to cart if available
  if (showCondenser && condensersForDisplay.length > 0) {
    condensersForDisplay.forEach((c) => {
      // Make unique per flat if flatName exists
      const uniqueCond = c.flatName
        ? {
            ...c,
            _id: `${c._id}_${c.flatName.replace(/\s+/g, '_')}`, // e.g., "originalId_Flat_1"
            name: `${c.flatName}: ${c.name}`, // e.g., "Flat 1: 28300 BTU Outdoor Condenser"
          }
        : c;
      addItemToCart(uniqueCond, 1);
    });
  }

  toast.success("Products added to cart successfully!");
  navigate("/cart");
};
  
  const handleCalculateROI = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Calculate total equipment cost from products (indoor units)
    const totalIndoorUnitsCost =
      products.length > 0
        ? products.reduce((total, product) => {
            const price =
              product.price - (product.price * (product.discount || 0)) / 100;
            return total + price;
          }, 0)
        : 0;

    // Add condenser cost based on selected condensers (supports multi-flat)
    const condenserCost = showCondenser
      ? condensersForDisplay.reduce((sum, c) => {
          if (!c) return sum;
          const price = c.price
            ? c.discount
              ? c.price - (c.price * c.discount) / 100
              : c.price
            : 0;
          return sum + price;
        }, 0)
      : 0;
    const totalEquipmentCost = totalIndoorUnitsCost + condenserCost;

    // Determine property type based on number of rooms
    let propertyType = "residential-single";
    if (isMultiFlatProperty || detectedFlats.length > 1 || rooms.length >= 10) {
      propertyType = "residential-multi";
    } else if (rooms.length >= 3) {
      propertyType = "residential-multi";
    }

    // Estimate installation time based on rooms and BTU
    const estimatedDays = Math.max(
      1,
      Math.ceil(rooms.length * 0.7 + totalBTU / 10000)
    );

    // Calculate realistic project size
    let estimatedProjectSize = totalEquipmentCost;
    if (propertyType === "residential-single") {
      estimatedProjectSize = Math.max(
        1000,
        Math.round(totalEquipmentCost / 0.2)
      );
    } else if (propertyType === "residential-multi") {
      estimatedProjectSize = Math.max(
        10000,
        Math.round(totalEquipmentCost / 0.25)
      );
    } else {
      estimatedProjectSize = Math.max(
        50000,
        Math.round(totalEquipmentCost / 0.3)
      );
    }

    // Prepare BTU data to pass to ROI Calculator
    let recommendedUnits = products
      .filter((p) => p.model)
      .map((p) => ({
        type: p.model || "Split System",
        btu: p.btu || 0,
        estimatedCost: p.price || 0,
      }));

    // Append condensers to recommendedUnits when present
    if (showCondenser && condensersForDisplay.length > 0) {
      recommendedUnits = recommendedUnits.concat(
        condensersForDisplay.map((c) => ({
          type: c.model || c.name || "Condenser",
          btu: c.btu || 0,
          estimatedCost: c.price || 0,
          flatName: c.flatName || undefined,
        }))
      );
    }

    const btuData = {
      totalBTU,
      totalSquareFootage: rooms.reduce(
        (sum, room) => sum + (parseFloat(room.size) || 0),
        0
      ),
      numberOfRooms: rooms.length,
      recommendedUnits,
      propertyType,
      condenserCost,
      equipmentCost: totalEquipmentCost,
      estimatedProjectCost: estimatedProjectSize,
      estimatedInstallationDays: estimatedDays,
      rooms: rooms.map((room, index) => {
        const product = products[index] || {};
        return {
          name: room.name,
          size: room.size,
          btu: btuResults[index],
          product: {
            ...product,
            name: product.name || "No product available",
            price: typeof product.price === "number" ? product.price : null,
          },
        };
      }),
      // Include original input parameters so ROI can save/display full calculation context
      inputParams: {
        measurementSystem,
        ceilingHeight,
        numPeople,
        options,
        isMultiFlatProperty,
        detectedFlats,
        acAnnotations,
        isVRFSystem,
        condenserSizingStatus,
        condensers: condensersForDisplay.map((c) => ({
          _id: c._id,
          name: c.name,
          model: c.model,
          btu: c.btu,
          price: c.price,
          flatName: c.flatName,
        })),
      },
    };

    // Navigate directly to ROI Calculator
    navigate("/roi-calculator", {
      state: {
        btuData: btuData,
        fromBTU: true,
      },
    });
  };

  // Handle "Do Both" - save to cart AND navigate to ROI
 const handleDoBoth = (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Ensure condenser calculation has completed
  if (showCondenser && condensersForDisplay.length === 0) {
    alert("Please wait for calculations to complete before proceeding.");
    return;
  }

  const addItemToCart = (product, quantity = 1) => {
    if (!product) return;

    console.log(`[handleDoBoth] Adding: ${product.name}, _id: ${product._id}, btu: ${product.btu}, quantity: ${quantity}`);

    const existItem = cartItems.find((x) => x._id === product._id);
    const newQuantity = existItem ? existItem.quantity + quantity : quantity;

    ctxDispatch({
      type: "CART_ADD_ITEM",
      payload: { ...product, quantity: newQuantity },
    });
  };

  // Add all items to cart
  const productCount = {};
  rooms.forEach((room, index) => {
    let product = products[index];
    if (!product || !product._id || !product.price) {
      product = {
        _id: `placeholder-${index}`,
        name: room.name,
        btu: 0,
        price: 0,
        slug: `placeholder-${room.name.toLowerCase().replace(/\s+/g, '-')}-item-2`,
        displayName: "No product available",
        image: "",
        category: "Placeholder",
        brand: "Custom",
        description: `Product not available for ${room.name}`,
      };
    }

    if (!productCount[product.btu]) {
      productCount[product.btu] = { product, quantity: 0 };
    }
    productCount[product.btu].quantity += 1;
  });

  Object.values(productCount).forEach(({ product, quantity }) => {
    addItemToCart(product, quantity);
  });

  // Add all condensers (supports multi-flat) to cart if available
  if (showCondenser && condensersForDisplay.length > 0) {
    condensersForDisplay.forEach((c) => {
      // Make unique per flat if flatName exists
      const uniqueCond = c.flatName
        ? {
            ...c,
            _id: `${c._id}_${c.flatName.replace(/\s+/g, '_')}`, // e.g., "originalId_Flat_1"
            name: `${c.flatName}: ${c.name}`, // e.g., "Flat 1: 28300 BTU Outdoor Condenser"
          }
        : c;
      addItemToCart(uniqueCond, 1);
    });
  }

  console.log("handleDoBoth: Adding to cart");
  console.log("Products count:", Object.keys(productCount).length);
  console.log(
    "Condensers for display:",
    condensersForDisplay.length,
    condensersForDisplay.map((c) => ({
      id: c._id,
      name: c.name,
      btu: c.btu,
    }))
  );
  console.log("Detected flats:", detectedFlats);
  console.log("Is multi-flat:", isMultiFlatProperty);
  toast.success("Products added to cart! Navigating to ROI Calculator...");

    // Calculate total equipment cost for ROI data
    const totalIndoorUnitsCost =
      products.length > 0
        ? products.reduce((total, product) => {
            const price =
              product.price - (product.price * (product.discount || 0)) / 100;
            return total + price;
          }, 0)
        : 0;

    const condenserCost = showCondenser
      ? condensersForDisplay.reduce((sum, c) => {
          if (!c) return sum;
          const price = c.price
            ? c.discount
              ? c.price - (c.price * c.discount) / 100
              : c.price
            : 0;
          return sum + price;
        }, 0)
      : 0;
    const totalEquipmentCost = totalIndoorUnitsCost + condenserCost;

    let propertyType = "residential-single";
    if (isMultiFlatProperty || detectedFlats.length > 1 || rooms.length >= 10) {
      propertyType = "residential-multi";
    } else if (rooms.length >= 3) {
      propertyType = "residential-multi";
    }

    const estimatedDays = Math.max(
      1,
      Math.ceil(rooms.length * 0.7 + totalBTU / 10000)
    );

    let estimatedProjectSize = totalEquipmentCost;
    if (propertyType === "residential-single") {
      estimatedProjectSize = Math.max(
        1000,
        Math.round(totalEquipmentCost / 0.2)
      );
    } else if (propertyType === "residential-multi") {
      estimatedProjectSize = Math.max(
        10000,
        Math.round(totalEquipmentCost / 0.25)
      );
    } else {
      estimatedProjectSize = Math.max(
        50000,
        Math.round(totalEquipmentCost / 0.3)
      );
    }

    const btuData = {
      totalBTU,
      totalSquareFootage: rooms.reduce(
        (sum, room) => sum + (parseFloat(room.size) || 0),
        0
      ),
      numberOfRooms: rooms.length,
      recommendedUnits: [
        ...products.filter((p) => p.model).map((p) => ({
          type: p.model || "Split System",
          btu: p.btu || 0,
          estimatedCost: p.price || 0,
        })),
        ...(showCondenser && condensersForDisplay.length > 0
          ? condensersForDisplay.map((c) => ({
              type: c.model || c.name || "Condenser",
              btu: c.btu || 0,
              estimatedCost: c.price || 0,
              flatName: c.flatName || undefined,
            }))
          : []),
      ],
      propertyType,
      condenserCost,
      equipmentCost: totalEquipmentCost,
      estimatedProjectCost: estimatedProjectSize,
      estimatedInstallationDays: estimatedDays,
      rooms: rooms.map((room, index) => ({
        name: room.name,
        size: room.size,
        btu: btuResults[index],
        product: products[index],
      })),
    };

    // Append input params to DoBoth btuData so ROI save includes full calculation context
    btuData.inputParams = {
      measurementSystem,
      ceilingHeight,
      numPeople,
      options,
      isMultiFlatProperty,
      detectedFlats,
      acAnnotations,
      isVRFSystem,
      condenserSizingStatus,
      condensers: condensersForDisplay.map((c) => ({
        _id: c._id,
        name: c.name,
        model: c.model,
        btu: c.btu,
        price: c.price,
        flatName: c.flatName,
      })),
    };

    // Navigate to ROI with cart already updated. Use next-tick guard to ensure state updates.
    setTimeout(() => {
      console.log("Navigating to ROI with btuData", btuData);
      navigate("/roi-calculator", {
        state: {
          btuData: btuData,
          fromBTU: true,
        },
      });
    }, 50);
  };

  const handleClear = () => {
    setRooms([{ name: "Bedroom 1", size: "", btu: 0, unit: "meters" }]);
    setCeilingHeight("2.5");
    setNumPeople(2);
    setMeasurementSystem("meters");
    setOptions({
      OutdoorUnitLocation: {
        PitchedRoof: false,
        WallBrackets: false,
        HardGround: false,
      },
      typeOfWall: {
        BrickVeneer: false,
        DoubleBrick: false,
        FoamCladding: false,
      },
      insulation: {
        Average: false,
        Good: false,
        Poor: false,
      },
      sunExposure: {
        Average: false,
        FullSunlight: false,
        HeavilyShaded: false,
      },
      climate: {
        AverageEurope: false,
        HotMiddleEast: false,
        ColdAlaska: false,
      },
      appliances: {
        Oven: false,
        Television: false,
        Computer: false,
      },
      windowType: {
        SingleGlazed: false,
        DoubleGlazed: false,
        TripleGlazed: false,
        Louvered: false,
      },
      roofType: {
        Roof: false,
        Flat: false,
        Pitched: false,
        Gable: false,
      },
      floorType: {
        Marble: false,
        Timber: false,
        Concrete: false,
        Carpeted: false,
      },
      apartmentOrientation: {
        North: false,
        East: false,
        South: false,
        West: false,
      },
      outputUnit: {
        BTU: true,
        Watt: false,
        kW: false,
      },
    });

    setBtuResults([]);
    setProducts([]);
    setTotalBTU(0);
    setCondenser(null);
    setError("");
  };

  return (
    <Container className="btu-calculator-container mt-4 mb-4 rounded">
      <Form className="btu-form">
        <h3 className="mt-4 mb-4 text-center title">BTU Calculator</h3>
        <Form.Group className="mb-4">
          <Form.Label>Measurement System</Form.Label>
          <Form.Control
            className="w-auto"
            as="select"
            value={measurementSystem}
            onChange={(e) => setMeasurementSystem(e.target.value)}
          >
            <option value="meters">Meters (m²)</option>
            <option value="feet">Feet (ft²)</option>
          </Form.Control>
        </Form.Group>

        <Form.Group className="mb-4">
  <Form.Check
    type="checkbox"
    id="multiFlat"
    label="Multi-flat/Multi-unit property (separate condenser for each flat)"
    checked={isMultiFlatProperty}
    onChange={(e) => {
      setIsMultiFlatProperty(e.target.checked);
      if (e.target.checked) {
        const flats = detectFlatGroupings(rooms);
        setDetectedFlats(Object.keys(flats));
      }
    }}
  />
  {isMultiFlatProperty && detectedFlats.length > 0 && (
    <small className="text-muted d-block mt-2">
      ✓ Detected {detectedFlats.length} flat(s):{" "}
      {detectedFlats.join(", ")}
      <br />
      <em>Each flat will get its own condenser sized separately</em>
    </small>
  )}
  {detectedFlats.length > 1 && !isMultiFlatProperty && (
    <small className="text-info d-block mt-2">
      ✓ Multi-flat detected from annotations: {detectedFlats.join(", ")}
      <br />
      <em>Check the box above to enable separate condensers for each flat.</em>
    </small>
  )}
  {acAnnotations?.length > 0 && (
    <small className="text-success d-block mt-2">
      ✓ AC notifications found: {acAnnotations.length} label(s) detected
      <br />
      <em>
        Flats auto-detected from condenser labels (e.g., condenser-1,
        condenser-2)
      </em>
    </small>
  )}
</Form.Group>

        {products.length > 0 && (
          <div className="alert alert-info mb-4">
            <strong>📊 System Type Detected:</strong>{" "}
            VRF Heat Recovery System (${rooms.length} Zones)
            <br />
            <small className="text-muted">
              Condenser sizing: 100% of total indoor capacity (1.0x ratio) - Supports up to ${MAX_VRF_INDOOR_UNITS} zones
            </small>
            <div className="mt-2">
              <small className="text-success">
                ✨ <strong>VRF Advantages:</strong> Superior efficiency (SEER
                16-30+), simultaneous heating/cooling, longer piping runs,
                quieter operation
                </small>
                <br />
                <small className="text-warning">
                  💰 <strong>Note:</strong> VRF systems typically have 20-50%
                  higher upfront costs but provide significant long-term savings
                  through superior efficiency.
                </small>
              </div>
          </div>
        )}

        <Row>
          <Col xs={12} md={6} lg={4} className="my-4">
            <Form.Group controlId="ceilingHeight">
              <Form.Label>Ceiling Height (m):</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter ceiling height in meters"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6} lg={4} className="my-4">
            <Form.Group controlId="numberOfPeople">
              <Form.Label>Number of People:</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter number of people"
                value={numPeople}
                onChange={(e) => setNumPeople(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>
{rooms.length > 0 && (
  <div className="mb-4">
    <h5>Room Measurements:</h5>
    {(() => {
      const groupedRooms = rooms.reduce((acc, room) => {
        const match = room.name.match(/^(Flat\s*\d+|Unit\s*[A-Z]|Apt\s*\d+)\s*[:\s]/i);
        // Only group by flat when the room name has an explicit flat prefix
        const flat = match ? match[1].replace(/\s+/g, '') : null;
        const cleanName = match
          ? room.name.replace(/^(Flat\s*\d+|Unit\s*[A-Z]|Apt\s*\d+)\s*[:\s]/i, '').trim()
          : room.name;
        const key = flat || '__single__';
        if (!acc[key]) acc[key] = [];
        acc[key].push({ displayName: `${cleanName} - ${room.size} m²`, flat });
        return acc;
      }, {});

      const flatKeys = Object.keys(groupedRooms).filter(k => k !== '__single__');
      const isMultiGroup = flatKeys.length > 1;

      // Single flat — just render a plain list, no "Flat 1:" header
      if (!isMultiGroup) {
        const allRoomItems = Object.values(groupedRooms).flat();
        allRoomItems.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return (
          <ul className="list-group">
            {allRoomItems.map((r, idx) => (
              <li key={idx} className="list-group-item">{r.displayName}</li>
            ))}
          </ul>
        );
      }

      // Multi-flat — show grouped headers
      return flatKeys
        .sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0))
        .map((flat) => {
          const roomList = (groupedRooms[flat] || []).map(r => r.displayName).sort();
          return (
            <div key={flat} className="mb-3">
              <h6>{flat.replace(/(\d+)/, ' $1')}:</h6>
              <ul className="list-group">
                {roomList.map((room, idx) => (
                  <li key={idx} className="list-group-item">{room}</li>
                ))}
              </ul>
            </div>
          );
        });
    })()}
  </div>
)}
        <hr className="ms-2 mt-1 mb-5 btu-hr" />
        <Row className="g-6">
          <Col md={6}>
            <CheckboxGroup
              title="Outdoor Unit Location"
              name="OutdoorUnitLocation"
              options={options.OutdoorUnitLocation}
              onChange={handleOutdoorUnitLocationChange}
            />

            <CheckboxGroup
              title="Insulation Condition"
              name="insulation"
              options={options.insulation}
              onChange={handleInsulationChange}
            />

            <CheckboxGroup
              title="Climate"
              name="climate"
              options={options.climate}
              onChange={handleClimateChange}
            />

            <CheckboxGroup
              title="Window Type"
              name="windowType"
              options={options.windowType}
              onChange={handleWindowChange}
            />

            <CheckboxGroup
              title="Apartment Orientation"
              name="apartment"
              options={options.apartmentOrientation}
              onChange={handleApartmentChange}
            />
          </Col>

          <Col md={6}>
            <CheckboxGroup
              title="Type of Wall"
              name="typeOfWall"
              options={options.typeOfWall}
              onChange={handleWallChange}
            />

            <CheckboxGroup
              title="Sun Exposure"
              name="sunExposure"
              options={options.sunExposure}
              onChange={handleSunExposureChange}
            />

            <CheckboxGroup
              title="Appliances"
              name="appliances"
              options={options.appliances}
              onChange={handleAppliancesChange}
            />

            <CheckboxGroup
              title="Roof Type"
              name="roofType"
              options={options.roofType}
              onChange={handleRoofChange}
            />
            <CheckboxGroup
              title="Floor"
              name=" floorType"
              options={options.floorType}
              onChange={handleFloorChange}
            />
          </Col>
        </Row>
        <Button
          variant="primary"
          onClick={handleCalculate}
          className="mt-4 me-3 mb-4"
        >
          Calculate BTU
        </Button>

        <Button variant="secondary" onClick={handleClear} className="mt-4 mb-4">
          Clear
        </Button>

        {error && (
          <div
            className={`btu-error ${
              error.startsWith("⚠️") ? "alert-warning" : "alert-danger"
            }`}
          >
            {getError({ response: { data: { message: error } } })}
          </div>
        )}
      </Form>

      {btuResults.length > 0 && (
        <div className="table-responsive">
          <div ref={componentRef}>
            <h3 className="text-center mt-4">BTU Results</h3>
            <Button
              variant="light"
              size="sm"
              className="go-to-btn btn-text w-auto pt-2"
              onClick={handlePrint}
              disabled={showCondenser && condensersForDisplay.length === 0}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-printer"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              Print Table
              {showCondenser && !condenser && (
                <small className="d-block text-muted">Calculating...</small>
              )}
            </Button>
            <Table bordered hover className="mt-3 text-center">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room BTU</th>
                  <th>Optimal Product</th>
                  <th>Product BTU</th>
                  <th>Product Price, ($)</th>
                </tr>
              </thead>
              <TableBody
                data={rooms}
                renderRow={(room, index) => {
                  const product = products[index] || {};
                  return (
                    <tr key={index}>
                      <td data-label="Room">{room.name}</td>
                      <td data-label="Room BTU">{btuResults[index]}</td>
                      <td
                        className="optimal-product"
                        data-label="Optimal Product"
                      >
                        {product.slug ? (
                          <Link
                            to={`/product/${product.slug}`}
                            className="link-product-details"
                          >
                            {product.name || "No product available"}
                          </Link>
                        ) : (
                          "No product available"
                        )}
                      </td>
                      <td
                        className="product-btu table-fit-content"
                        data-label="Product BTU"
                      >
                        {product.btu || "No product available"}
                      </td>
                      <td
                        data-label="Product Price"
                        className="table-fit-content"
                      >
                        {product.price
                          ? product.discount > 0
                            ? (
                                product.price -
                                (product.price * product.discount) / 100
                              ).toFixed(2)
                            : product.price.toFixed(2)
                          : "No price available"}
                      </td>
                    </tr>
                  );
                }}
              />
              <tbody>
                {/* Add condenser rows if available (support multi-flat) */}
                {showCondenser &&
                  condensersForDisplay &&
                  condensersForDisplay.length > 0 &&
                  condensersForDisplay.map((cond, idx) => {
                    // Calculate per-flat BTU total if flat name is present
                    let condenserBtuRequirement = 0;
                    if (cond?.flatName && isMultiFlatProperty) {
                      // Extract flat number from condenser name (e.g., "Flat 1 Condenser" -> "1")
                      const flatKeyword = cond.flatName.match(/\d+/)?.[0];
                      if (flatKeyword) {
                        condenserBtuRequirement = rooms.reduce(
                          (sum, room, roomIdx) => {
                            // Check if room belongs to this flat
                            if (
                              room.name
                                .toLowerCase()
                                .includes(`flat ${flatKeyword}:`)
                            ) {
                              return sum + (btuResults[roomIdx] || 0);
                            }
                            return sum;
                          },
                          0
                        );
                      }
                    } else {
                      // Single flat or no flat name: use total
                      condenserBtuRequirement = btuResults.reduce(
                        (sum, btu) => sum + (btu || 0),
                        0
                      );
                    }

                    const multiplier = 1.0;
                    const displayBtu = Math.round(
                      condenserBtuRequirement * multiplier
                    );

                    return (
                      <tr
                        key={`cond-${idx}-${cond?._id || cond?.flatName || idx}`}
                        className="condenser-row condenser-row-bg"
                      >
                        <td data-label="Room" className="condenser-cell">
                          {cond?.flatName
                            ? `${cond.flatName} Condenser`
                            : condensersForDisplay.length > 1
                            ? `Condenser ${idx + 1}`
                            : "Condenser"}
                        </td>
                        <td data-label="Room BTU" className="condenser-cell">
                          {`${displayBtu.toLocaleString()} BTU`}
                        </td>
                        <td data-label="Product">
                          {cond?.slug ? (
                            <Link
                              to={`/product/${cond.slug}`}
                              className="link-product-details condenser-cell"
                            >
                              {cond.name || cond.model}
                            </Link>
                          ) : (
                            <span className="condenser-cell">{cond?.name || cond?.model}</span>
                          )}
                        </td>
                        <td
                          className="product-btu table-fit-content condenser-cell"
                          data-label="Product BTU"
                        >
                          {cond?.btu || "N/A"}
                        </td>
                        <td
                          data-label="Product Price"
                          className={`table-fit-content ${
                            condenserSizingStatus === "custom"
                              ? "condenser-price-custom"
                              : "condenser-price-normal"
                          }`}
                        >
                          {cond?.price > 0
                            ? `$${(cond.discount > 0
                                ? cond.price -
                                  (cond.price * cond.discount) / 100
                                : cond.price
                              ).toFixed(2)}${
                                condenserSizingStatus === "custom"
                                  ? " (est.)"
                                  : ""
                              }`
                            : "Contact for price"}
                        </td>
                      </tr>
                    );
                  })}
                <tr>
                  <td
                    colSpan="5"
                    className="total-results text-center cooling-load-cell"
                  >
                    {isMultiFlatProperty && detectedFlats.length > 1
                      ? (() => {
                          // Extract unique flat numbers from room names
                          const flatNumbersInRooms = new Set();
                          rooms.forEach((room) => {
                            const match = room.name.match(/flat\s+(\d+):/i);
                            if (match) {
                              flatNumbersInRooms.add(parseInt(match[1]));
                            }
                          });

                          const flatNumbers = Array.from(
                            flatNumbersInRooms
                          ).sort((a, b) => a - b);

                          if (flatNumbers.length > 0) {
                            return `Per-Flat Cooling Load: ${flatNumbers
                              .map((flatNum) => {
                                const flatTotal = rooms.reduce(
                                  (sum, room, idx) => {
                                    if (
                                      room.name
                                        .toLowerCase()
                                        .includes(`flat ${flatNum}:`)
                                    ) {
                                      return sum + (btuResults[idx] || 0);
                                    }
                                    return sum;
                                  },
                                  0
                                );
                                return `Flat ${flatNum}: ${(
                                  flatTotal * outputUnitConversion[selectedUnit]
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} ${selectedUnit}`;
                              })
                              .join(" | ")}`;
                          }
                          return `Total Cooling Load: ${displayValue} ${selectedUnit}`;
                        })()
                      : `Total Cooling Load: ${displayValue} ${selectedUnit}`}
                  </td>
                </tr>
                <tr>
                  <td data-label="Total" className="total-results total-cell">
                    Total
                  </td>
                  <td
                    data-label="Total Room Btu"
                    className="total-results total-cell"
                  >
                    {totalBTU}
                  </td>
                  <td
                    data-label="Total Optimal Products"
                    className="total-results total-cell"
                  >
                    {(optimalProductCount || 0) +
                      (showCondenser ? condensersForDisplay.length : 0) ||
                      "No products available"}
                  </td>
                  <td
                    data-label="Total Product BTU"
                    className="total-results total-cell"
                  >
                    {(() => {
                      const productsBTU = products.reduce(
                        (total, product) => total + (product.btu || 0),
                        0
                      );
                      const condensersBTU = showCondenser
                        ? condensersForDisplay.reduce(
                            (sum, c) => sum + (c?.btu || 0),
                            0
                          )
                        : 0;
                      return (productsBTU + condensersBTU).toFixed(0);
                    })()}
                  </td>
                  <td
                    data-label="Total Product Price"
                    className="total-results total-cell"
                  >
                    {products.length > 0 || (condenser && showCondenser)
                      ? (() => {
                          const indoorUnitsTotal = products.reduce(
                            (total, product) => {
                              const price =
                                product.price -
                                (product.price * (product.discount || 0)) / 100;
                              return total + price;
                            },
                            0
                          );

                          const condensersTotal = showCondenser
                            ? condensersForDisplay.reduce((sum, c) => {
                                const price = c?.price
                                  ? c.discount
                                    ? c.price - (c.price * c.discount) / 100
                                    : c.price
                                  : 0;
                                return sum + price;
                              }, 0)
                            : 0;

                          return (indoorUnitsTotal + condensersTotal).toFixed(
                            2
                          );
                        })()
                      : "No price available"}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
          <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mt-3">
            <Button
              onClick={saveResultsToCart}
              variant="info"
              className="btn-outline-primary w-75 w-md-auto py-2"
              disabled={showCondenser && condensersForDisplay.length === 0}
            >
              <ShoppingCart size={20} />
              <span> Save to Cart</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ms-1"
              >
                <path d="M9 18l6-6-6-6"></path>
              </svg>
              {showCondenser && !condenser && (
                <small className="d-block text-muted">Calculating...</small>
              )}
            </Button>

            <Button
              onClick={handleCalculateROI}
              variant="primary"
              className="btn-outline-primary w-75 w-md-auto py-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-1"
              >
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Calculate ROI for this Project</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ms-1"
              >
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </Button>

            <Button
              onClick={handleDoBoth}
              variant="info"
              className="btn-outline-primary w-75 w-md-auto py-2"
              disabled={showCondenser && condensersForDisplay.length === 0}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="me-1"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Do Both</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ms-1"
              >
                <path d="M9 18l6-6-6-6"></path>
              </svg>
            </Button>
          </div>
          {showCondenser &&
            condensersForDisplay &&
            condensersForDisplay.length > 0 && (
              <div
                className="text-center mt-2 p-3 rounded"
                style={{
                  backgroundColor:
                    condenserSizingStatus === "custom" ? "#fff3cd" : "#f0f8ff",
                }}
              >
                <strong className="text-primary fs-5">
                  Recommended VRF Condenser:{" "}
                  {(() => {
                    const recommended = Math.round(
                      btuResults.reduce((total, btu) => total + (btu || 0), 0) *
                        1.0
                    );
                    return recommended.toLocaleString();
                  })()}{" "}
                  BTU
                </strong>

                <div className="mt-2">
                  <span className="badge bg-primary">Condenser Selected</span>
                  <ul className="small text-muted mb-0 mt-2 list-unstyled">
                    {condensersForDisplay.map((c, i) => (
                      <li key={`selected-cond-${i}`}>
                        {c?.name || `Condenser ${i + 1}`} - {c?.btu || "N/A"}{" "}
                        BTU
                      </li>
                    ))}
                  </ul>
                </div>

                {condenserSizingStatus === "perfect" && (
                  <div className="mt-2">
                    <span className="badge bg-success">✓ Perfect Match</span>
                  </div>
                )}

                {condenserSizingStatus === "oversized" && (
                  <div className="mt-2">
                    <span className="badge bg-info">📈 Slightly Oversized</span>
                    <p className="small text-muted mb-0 mt-1">
                      {condensersForDisplay.map((c, idx) => (
                        <span key={`ov-${idx}`}>
                          {c.name} - {c.btu} BTU
                          {idx < condensersForDisplay.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      <br />
                      <em>
                        Provides extra capacity - good for extreme weather
                        conditions
                      </em>
                    </p>
                  </div>
                )}

                {condenserSizingStatus === "undersized" && (
                  <div className="mt-2">
                    <span className="badge bg-warning text-dark">
                      ⚠️ Slightly Undersized
                    </span>
                    <p className="small text-muted mb-0 mt-1">
                      {condensersForDisplay.map((c, idx) => (
                        <span key={`ud-${idx}`}>
                          {c.name} - {c.btu} BTU
                          {idx < condensersForDisplay.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      <br />
                      <em>
                        May not cool effectively in extreme heat - consider next
                        size up if available
                      </em>
                    </p>
                  </div>
                )}

                {condenserSizingStatus === "custom" && (
                  <div className="mt-2">
                    <span className="badge bg-warning text-dark">
                      📞 Custom Order Required
                    </span>
                    <p className="small text-muted mb-0 mt-1">
                      No stock product matches your requirement
                      <br />
                      <em>Please contact us for a custom solution</em>
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </Container>
  );
}

export default BtuCalculator;