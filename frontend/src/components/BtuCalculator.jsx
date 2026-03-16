import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import axios from "axios";
import { getError } from "../utils";
import { useContext } from "react";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import CheckboxGroup from "./CheckboxGroup.jsx";
import { toast } from "react-toastify";
import "./BtuCalculator.css";

const CONSTANTS = {
  // ~147 W/m² ≈ 450 BTU/m² — moderate climate baseline
  // Climate multiplier will adjust this for hot/cold regions
  BASE_BTU_PER_SQ_METER: 400,
  // Each extra metre above 2.5 m adds this fraction of base BTU (proportional volume increase).
  // 0.2 means 20% increase per meter above baseline
  HEIGHT_BTU_FACTOR_PER_METER: 0.2,
  // ASHRAE sensible heat for sedentary occupancy: ~450 BTU/hr per person.
  BTU_PER_ADDITIONAL_PERSON: 450,
  KITCHEN_BTU_ADDITION: 600,
  OUTDOOR_LOCATION_BTU_ADJUSTMENTS: {
    Roof: 1.0,
    WallBrackets: 1.0,
    HardGround: 1.0,
  },
  apartmentOrientationMultipliers: {
    North: 0.95,
    East: 1.08,     // Increased from 1.05 (morning sun important)
    South: 1.12,    // Increased from 1.10 (all-day sun critical)
    West: 1.08,     // Increased from 1.05 (afternoon heat)
  },
  CONVERT_FEET_TO_METERS: 0.3048,
};
function BtuCalculator({ roomData, acAnnotations = [] }) {
  const { dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();

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
    // Filter out invalid rooms and condenser entries
    const validRooms = roomData.filter((room) => 
      room.name && 
      room.size && 
      !room.name?.toLowerCase().includes('condenser') && 
      room.size !== '—' &&
      !room.product?.isCondenser
    );

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
  
  
  const [measurementSystem, setMeasurementSystem] = useState("meters");
  const [rooms, setRooms] = useState([{ name: "Bedroom 1", size: "", btu: 0 }]);
  const [ceilingHeight, setCeilingHeight] = useState("2.5");
  const [numPeople, setNumPeople] = useState(2);
  const [error, setError] = useState("");
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

  // Clear error whenever any calculation input changes
  useEffect(() => {
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

    // Dining room climate bonuses (moderate values)
    const diningRoomBtuByClimate = {
      AverageEurope: 1000,
      HotMiddleEast: 1500,
      ColdAlaska: 700,
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
    // Reduced multipliers to avoid excessive compounding
    applyMultiplier("insulation", {
      Poor: 1.18,      // Increased from 1.15 (poor insulation has significant impact in hot climate)
      Average: 1,
      Good: 0.85,
    });
    applyMultiplier("floorType", {
      Marble: 1.0,
      Timber: 1.03,
      Concrete: 1.0,
      Carpeted: 0.97,
    });
    applyMultiplier("windowType", {
      SingleGlazed: 1.12,    // Increased from 1.10 (windows critical in hot climate)
      DoubleGlazed: 1.0,
      TripleGlazed: 0.90,
      Louvered: 1.14,        // Increased from 1.12
    });
    applyMultiplier("roofType", {
      Flat: 1.05,      // was 1.1
      Pitched: 1.0,
      Gable: 1.0,
      Roof: 1.0,
    });
    applyMultiplier("appliances", {
      Oven: 1.08,      // was 1.1
      Television: 1.02,
      Computer: 1.03,
    });

    applyMultiplier("sunExposure", {
      FullSunlight: 1.18,    // Increased from 1.15 (critical factor in hot climate)
      Average: 1,
      HeavilyShaded: 0.85,
    });

    applyMultiplier("climate", {
      HotMiddleEast: 1.5,    // Increased from 1.25 to properly reflect hot climate needs
      AverageEurope: 1.0,
      ColdAlaska: 0.85,
    });

    applyMultiplier("typeOfWall", {
      BrickVeneer: 1.08,
      DoubleBrick: 0.92,
      FoamCladding: 0.85,
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

    // Filter out condenser entries before processing
    const actualRooms = rooms.filter(room => 
      !room.name?.toLowerCase().includes('condenser') && 
      room.size !== '—' &&
      !room.product?.isCondenser
    );

    const productRequests = actualRooms.map(async (room) => {
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
                image: "/images/p1.jpg",
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
            image: "/images/p1.jpg",
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
      if (!product) {
        // Skip null products (errors during calculation)
        return;
      }
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
            image: "/images/p1.jpg",
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
            image: "/images/p1.jpg",
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



    // Prepare BTU data for recommendations page
    const condensersForDisplay =
      selectedCondensers && selectedCondensers.length > 0
        ? selectedCondensers
        : condenser
        ? [condenser]
        : [];

    const totalIndoorUnitsCost =
      acProducts.length > 0
        ? acProducts.reduce((total, product) => {
            const price =
              product.price - (product.price * (product.discount || 0)) / 100;
            return total + price;
          }, 0)
        : 0;

    const condenserCost = totalBTU >= 10000
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
    if (isMultiFlatProperty || detectedFlats.length > 1 || actualRooms.length >= 10) {
      propertyType = "residential-multi";
    } else if (actualRooms.length >= 3) {
      propertyType = "residential-multi";
    }

    const estimatedDays = Math.max(
      1,
      Math.ceil(actualRooms.length * 0.7 + totalBTU / 10000)
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

    let recommendedUnits = acProducts
      .filter((p) => p.model)
      .map((p) => ({
        type: p.model || "Split System",
        btu: p.btu || 0,
        estimatedCost: p.price || 0,
      }));

    if (totalBTU >= 10000 && condensersForDisplay.length > 0) {
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
      totalSquareFootage: actualRooms.reduce(
        (sum, room) => sum + (parseFloat(room.size) || 0),
        0
      ),
      numberOfRooms: actualRooms.length,
      recommendedUnits,
      propertyType,
      condenserCost,
      equipmentCost: totalEquipmentCost,
      estimatedProjectCost: estimatedProjectSize,
      estimatedInstallationDays: estimatedDays,
      rooms: productResults
        .filter(({ product }) => product && !product.isCondenser)
        .map(({ room, product, btu }, index) => ({
          name: room.name,
          size: room.size,
          btu: btu,
          product: {
            ...product,
            name: product.name || "No product available",
            price: typeof product.price === "number" ? product.price : null,
          },
        }))
        .concat(
          totalBTU >= 10000 && condensersForDisplay.length > 0
            ? condensersForDisplay.map((cond, idx) => {
                let condenserBtuRequirement = 0;
                if (cond?.flatName && isMultiFlatProperty) {
                  const flatKeyword = cond.flatName.match(/\d+/)?.[0];
                  if (flatKeyword) {
                    condenserBtuRequirement = rooms.reduce(
                      (sum, room, roomIdx) => {
                        const roomNameLower = room.name.toLowerCase();
                        const searchKey = `flat ${flatKeyword}:`;
                        const matches = roomNameLower.includes(searchKey);
                        if (matches) {
                          return sum + (results[roomIdx] || 0);
                        }
                        return sum;
                      },
                      0
                    );
                  }
                } else {
                  condenserBtuRequirement = results.reduce(
                    (sum, btu) => sum + (btu || 0),
                    0
                  );
                }

                const displayBtu = Math.round(condenserBtuRequirement * 1.0);

                return {
                  name: cond?.flatName
                    ? `${cond.flatName} Condenser`
                    : condensersForDisplay.length > 1
                    ? `Condenser ${idx + 1}`
                    : "Condenser",
                  size: "—",
                  btu: displayBtu,
                  product: {
                    _id: cond._id,
                    name: cond.name || cond.model,
                    model: cond.model,
                    btu: cond.btu,
                    price: cond.price,
                    discount: cond.discount || 0,
                    slug: cond.slug,
                    image: cond.image || "/images/p1.jpg",
                    isCondenser: true,
                  },
                };
              })
            : []
        ),
      inputParams: {
        measurementSystem,
        ceilingHeight,
        numPeople,
        options,
        isMultiFlatProperty,
        detectedFlats,
        acAnnotations,
        isVRFSystem,
        condenserSizingStatus: sizingStatus,
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

    // Save BTU data to Store and navigate to recommendations
    console.log('BTU Data being saved to Store:', btuData);
    console.log('Total BTU:', totalBTU);
    console.log('Number of rooms:', actualRooms.length);
    console.log('Rooms with products:', btuData.rooms);
    
    ctxDispatch({
      type: "BTU_SET_CURRENT_PROJECT",
      payload: btuData,
    });

    toast.success("BTU calculation complete! Navigating to recommendations...");
    navigate("/recommendations");
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
      // Filter out condenser entries from room measurements display
      const actualRooms = rooms.filter(room => 
        !room.name?.toLowerCase().includes('condenser') && 
        room.size !== '—' &&
        !room.product?.isCondenser
      );
      
      const groupedRooms = actualRooms.reduce((acc, room) => {
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
        <Row className="g-3">
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
    </Container>
  );
}

export default BtuCalculator;
