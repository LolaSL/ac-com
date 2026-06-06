import { useState, useEffect, useCallback, useContext } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import axios from "axios";
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
    Roof: 1.05, // Roof increases load by 5%
    WallBrackets: 1.02, // Wall brackets by 2%
    HardGround: 1.0, // No effect
  },
  apartmentOrientationMultipliers: {
    North: 0.95,
    East: 1.08,     // Increased from 1.05 (morning sun important)
    South: 1.12,    // Increased from 1.10 (all-day sun critical)
    West: 1.08,     // Increased from 1.05 (afternoon heat)
  },
  CONVERT_FEET_TO_METERS: 0.3048,
};

// Per-flat appliance defaults — used when initialising each flat's appliance state
const DEFAULT_APPLIANCES = {
  Oven: false,
  ServerRoom: false,
  CommercialKitchen: false,
  Gym: false,
  HomeTheater: false,
  Workshop: false,
  OfficeRoom: false,
  HotelRoom: false,
};

const DEFAULT_FLOOR_TYPE = {
  Marble: false,
  Timber: false,
  Concrete: false,
  Carpeted: false,
};

const DEFAULT_ORIENTATION = {
  North: false,
  East: false,
  South: false,
  West: false,
};

const DEFAULT_OUTDOOR_LOCATION = {
  Roof: false,
  WallBrackets: false,
  HardGround: false,
};

function BtuCalculator({ roomData, acAnnotations = [] }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const prevProject = state?.btuData?.currentProject ?? null;

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

      // Also match plain "condenser" with no number (single-flat / whole-building unit)
      const plainCondenserMatch = !condenserMatch && !simpleCondenserMatch && /\bcondenser\b/.test(label);
      if (plainCondenserMatch && !condensers['1']) {
        condensers['1'] = {
          label: annotation.label,
          flatNumber: 1,
          coordinates: annotation.coordinates,
        };
        flatKeywords.add(1);
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
  const [rooms, setRooms] = useState([{ name: "", size: "", btu: 0, unit: "meters" }]);
  const [ceilingHeight, setCeilingHeight] = useState("2.5");
  const [numPeople, setNumPeople] = useState(0);
  const [error, setError] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [showPrevSummary, setShowPrevSummary] = useState(true);

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
      TropicalSEAsia: false,
      Continental: false,
      Subtropical: false,
      SubArctic: false,
    },
    appliances: {
      Oven: false,
      ServerRoom: false,
      CommercialKitchen: false,
      Gym: false,
      HomeTheater: false,
      Workshop: false,
      OfficeRoom: false,
      HotelRoom: false,
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

  // VRF system is always true for now; if needed, make this a prop or state
  const isVRFSystem = true;
  const [isMultiFlatProperty, setIsMultiFlatProperty] = useState(false);
  const [detectedFlats, setDetectedFlats] = useState([]);
  // Per-flat people count (only used when isMultiFlatProperty && detectedFlats.length > 1)
  const [flatPeopleCount, setFlatPeopleCount] = useState({});
  // Per-flat appliances (only used when isMultiFlatProperty && detectedFlats.length > 1)
  const [flatAppliances, setFlatAppliances] = useState({});
  // Per-flat floor type (only used when isMultiFlatProperty && detectedFlats.length > 1)
  const [flatFloorType, setFlatFloorType] = useState({});
  // Per-flat apartment orientation (only used when isMultiFlatProperty && detectedFlats.length > 1)
  const [flatOrientation, setFlatOrientation] = useState({});
  // Per-flat outdoor unit location (only used when isMultiFlatProperty && detectedFlats.length > 1)
  const [flatOutdoorLocation, setFlatOutdoorLocation] = useState({});

  // ── Humidity input ────────────────────────────────────────────────────────
  const [humidity, setHumidity]       = useState('average');   // 'low' | 'average' | 'high'

  // ── Infiltration (envelope air-leakage) ──────────────────────────────────
  // Tight  = new/sealed build (~3 ACH50)
  // Average = typical existing dwelling (~7 ACH50)
  // Leaky  = older drafty stock (~12+ ACH50)
  const [infiltration, setInfiltration] = useState('average'); // 'tight' | 'average' | 'leaky'

  // ── System mode (cooling / heating / both) ───────────────────────────────
  // Drives which capacity field (coolingBtu / heatingBtu) the backend matches.
  // 'both' lets the backend size on max(coolingBtu, heatingBtu) for heat pumps.
  const [systemMode, setSystemMode] = useState('heatpump'); // 'heatpump' | 'recovery'






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

  // Initialise per-flat appliance and floor state when detectedFlats changes (preserve existing selections)
  useEffect(() => {
    if (detectedFlats.length < 2) return;
    setFlatAppliances(prev => {
      const next = {};
      detectedFlats.forEach(flatName => {
        next[flatName] = prev[flatName] ?? { ...DEFAULT_APPLIANCES };
      });
      return next;
    });
    setFlatFloorType(prev => {
      const next = {};
      detectedFlats.forEach(flatName => {
        next[flatName] = prev[flatName] ?? { ...DEFAULT_FLOOR_TYPE };
      });
      return next;
    });
    setFlatOrientation(prev => {
      const next = {};
      detectedFlats.forEach(flatName => {
        next[flatName] = prev[flatName] ?? { ...DEFAULT_ORIENTATION };
      });
      return next;
    });
    setFlatOutdoorLocation(prev => {
      const next = {};
      detectedFlats.forEach(flatName => {
        next[flatName] = prev[flatName] ?? { ...DEFAULT_OUTDOOR_LOCATION };
      });
      return next;
    });
  }, [detectedFlats]);

  // Clear error whenever any calculation input changes
  useEffect(() => {
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, ceilingHeight, numPeople, flatPeopleCount, flatAppliances, flatFloorType, flatOrientation, flatOutdoorLocation, measurementSystem, rooms]);

  const calculateBTUForRoom = (room, peopleOverride, mode = 'cooling', appliancesOverride, floorTypeOverride, orientationOverride, outdoorLocationOverride) => {
    // When overrides are provided (per-flat mode), use them instead of global options.
    // All other option categories (roofType, climate, etc.) remain global.
    const effectiveOptions = (appliancesOverride || floorTypeOverride || orientationOverride || outdoorLocationOverride)
      ? {
          ...options,
          ...(appliancesOverride      ? { appliances:           appliancesOverride      } : {}),
          ...(floorTypeOverride       ? { floorType:            floorTypeOverride       } : {}),
          ...(orientationOverride     ? { apartmentOrientation: orientationOverride     } : {}),
          ...(outdoorLocationOverride ? { OutdoorUnitLocation:  outdoorLocationOverride } : {}),
        }
      : options;

    let area = convertArea(parseFloat(room.size));
    let height = parseFloat(ceilingHeight);
    const effectivePeople = peopleOverride !== undefined
      ? Math.max(0, parseInt(peopleOverride, 10) || 0)
      : Math.max(0, parseInt(numPeople, 10) || 0);

    if (isNaN(area) || isNaN(height)) {
      return { btu: null, error: "Enter valid room size & ceiling height." };
    }

    const isHeating = mode === 'heating';

    let btu = area * CONSTANTS.BASE_BTU_PER_SQ_METER;
    // Height adjustment: proportional to room volume increase above 2.5 m baseline.
    // Adds HEIGHT_BTU_FACTOR_PER_METER × (extra metres) × current base BTU.
    if (height > 2.5)
      btu += btu * CONSTANTS.HEIGHT_BTU_FACTOR_PER_METER * (height - 2.5);

    // Occupants: in cooling they add sensible load; in heating they slightly
    // offset it (internal gains). Use a smaller offset for heating.
    if (isHeating) {
      btu -= 250 * Math.max(0, effectivePeople - 1);
    } else {
      btu += CONSTANTS.BTU_PER_ADDITIONAL_PERSON * Math.max(0, effectivePeople - 1);
    }

    // Kitchen addition: cooking adds heat (raises cooling load, lowers heating load).
    if (room.name === "Kitchen") {
      btu += isHeating ? -300 : CONSTANTS.KITCHEN_BTU_ADDITION;
    }

    // Dining room climate bonuses apply only to cooling (cooking + occupancy heat).
    const diningRoomBtuByClimate = {
      AverageEurope: 1000,
      HotMiddleEast: 1500,
      ColdAlaska: 700,
      TropicalSEAsia: 1400,
      Continental: 900,
      Subtropical: 1200,
      SubArctic: 600,
    };

    if (!isHeating && room.name === "Dining Room") {
      const selectedClimate = Object.keys(effectiveOptions.climate || {}).find(
        (k) => effectiveOptions.climate[k]
      );
      // Only add climate-based dining bonus when a climate is explicitly selected
      btu += diningRoomBtuByClimate[selectedClimate] || 0;
    }

    // VRF efficiency adjustment (VRF systems use base calculation)
    // btu *= 1.0; // No adjustment needed

    const applyMultiplier = (category, multipliers) => {
      if (!multipliers || typeof multipliers !== "object") return;
      if (!effectiveOptions[category] || typeof effectiveOptions[category] !== "object") return;

      Object.keys(multipliers).forEach((key) => {
        if (effectiveOptions[category][key]) {
          btu *= multipliers[key];
        }
      });
    };
    // Reduced multipliers to avoid excessive compounding.
    // Heating tables flip sign on most envelope/sun/climate factors: poor
    // envelopes lose more heat, sun helps in winter, cold climates dominate.
    applyMultiplier("insulation", isHeating
      ? { Poor: 1.30, Average: 1, Good: 0.75 }
      : { Poor: 1.18, Average: 1, Good: 0.85 });
    applyMultiplier("floorType", isHeating
      ? { Marble: 1.05, Timber: 0.98, Concrete: 1.03, Carpeted: 0.94 }
      : { Marble: 1.0, Timber: 1.03, Concrete: 1.0, Carpeted: 0.97 });
    applyMultiplier("windowType", isHeating
      ? { SingleGlazed: 1.25, DoubleGlazed: 1.0, TripleGlazed: 0.78, Louvered: 1.30 }
      : { SingleGlazed: 1.12, DoubleGlazed: 1.0, TripleGlazed: 0.90, Louvered: 1.14 });
    applyMultiplier("roofType", isHeating
      ? { Flat: 1.10, Pitched: 1.0, Gable: 1.0, Roof: 1.0 }
      : { Flat: 1.05, Pitched: 1.0, Gable: 1.0, Roof: 1.0 });
    applyMultiplier("appliances", isHeating
      ? {
          Oven: 0.95,
          ServerRoom: 0.85,
          CommercialKitchen: 0.80,
          Gym: 0.90,
          HomeTheater: 0.97,
          Workshop: 0.94,
          OfficeRoom: 0.92, // Offices have moderate internal gains in heating
          HotelRoom: 0.96,  // Hotel rooms have some internal gains in heating
        }
      : {
          Oven: 1.08,
          ServerRoom: 1.35,
          CommercialKitchen: 1.45,
          Gym: 1.20,
          HomeTheater: 1.06,
          Workshop: 1.12,
          OfficeRoom: 1.18, // Offices have moderate internal gains in cooling
          HotelRoom: 1.10,  // Hotel rooms have some internal gains in cooling
        });

    applyMultiplier("sunExposure", isHeating
      ? { FullSunlight: 0.90, Average: 1, HeavilyShaded: 1.08 } // passive solar helps in winter
      : { FullSunlight: 1.18, Average: 1, HeavilyShaded: 0.85 });

    applyMultiplier("climate", isHeating
      ? {
          HotMiddleEast: 0.45,   // Hot days, but cold desert nights
          TropicalSEAsia: 0.20,  // Minimal heating need
          Subtropical: 0.55,
          AverageEurope: 1.00,
          Continental: 1.30,     // Cold winters dominate
          SubArctic: 1.65,
          ColdAlaska: 1.85,
        }
      : {
          HotMiddleEast: 1.50,
          TropicalSEAsia: 1.45,
          Subtropical: 1.30,
          AverageEurope: 1.00,
          Continental: 0.95,
          SubArctic: 0.80,
          ColdAlaska: 0.75,
        });

    applyMultiplier("typeOfWall", isHeating
      ? { BrickVeneer: 1.10, DoubleBrick: 0.90, FoamCladding: 0.75 }
      : { BrickVeneer: 1.08, DoubleBrick: 0.92, FoamCladding: 0.85 });

    applyMultiplier(
      "OutdoorUnitLocation",
      CONSTANTS.OUTDOOR_LOCATION_BTU_ADJUSTMENTS
    );
    applyMultiplier(
      "apartmentOrientation",
      isHeating
        ? { North: 1.10, East: 0.98, South: 0.92, West: 0.98 } // S-facing wins in winter (N. hemisphere)
        : CONSTANTS.apartmentOrientationMultipliers
    );

    // Humidity: matters for cooling latent load; negligible direct impact on heating.
    const humidityMultipliers = isHeating
      ? { low: 1.0, average: 1.0, high: 1.0 }
      : { low: 0.95, average: 1.0, high: 1.12 };
    btu *= humidityMultipliers[humidity] ?? 1.0;

    // Infiltration: air leakage hits heating loads harder than cooling.
    const infiltrationMultipliers = isHeating
      ? { tight: 0.88, average: 1.0, leaky: 1.22 }
      : { tight: 0.92, average: 1.0, leaky: 1.10 };
    btu *= infiltrationMultipliers[infiltration] ?? 1.0;

    return { btu: Math.max(0, Math.round(btu)), error: null };
  };

  // Per-room load wrapper. Both modes (heatpump / recovery) calculate cool + heat
  // and size on max(cool, heat) so the product covers the dominant season.
  const calculateRoomLoad = (room, peopleOverride, _systemMode, appliancesOverride, floorTypeOverride, orientationOverride, outdoorLocationOverride) => {
    const cool = calculateBTUForRoom(room, peopleOverride, 'cooling', appliancesOverride, floorTypeOverride, orientationOverride, outdoorLocationOverride);
    if (cool.error) return { btu: cool.btu, coolBtu: cool.btu, heatBtu: null, error: cool.error };
    const heat = calculateBTUForRoom(room, peopleOverride, 'heating', appliancesOverride, floorTypeOverride, orientationOverride, outdoorLocationOverride);
    if (heat.error) return { btu: cool.btu, coolBtu: cool.btu, heatBtu: null, error: heat.error };
    return {
      btu: Math.max(cool.btu || 0, heat.btu || 0),
      coolBtu: cool.btu,
      heatBtu: heat.btu,
      error: null,
    };
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
    setIsCalculating(true);
    const results = [];
    let totalBTU = 0;

    // Determine if user explicitly placed a condenser rectangle in the Annotator
    const hasAnnotatedCondenser = (() => {
      if (!acAnnotations?.length) return false;
      const { condensers: annotatedCond } = parseAcAnnotations(acAnnotations);
      return Object.keys(annotatedCond).length > 0;
    })();

    // Filter out condenser entries before processing
    const actualRooms = rooms.filter(room => 
      !room.name?.toLowerCase().includes('condenser') && 
      room.size !== '—' &&
      !room.product?.isCondenser
    );

    const productRequests = actualRooms.map(async (room) => {
      // Resolve per-flat people count and per-flat appliances for multi-flat properties
      let peopleOverride;
      let appliancesOverride;
      let floorTypeOverride;
      let orientationOverride;
      let outdoorLocationOverride;
      if (isMultiFlatProperty && detectedFlats.length > 1) {
        const flatMatch = room.name.match(/^(Flat\s*\d+|Unit\s*[A-Z0-9]+|Apt\s*\d+)[\s:]/i);
        const flatKey = flatMatch
          ? flatMatch[1].replace(/^(\w)(.*)/, (_, a, b) => a.toUpperCase() + b.toLowerCase())
          : null;
        peopleOverride = flatKey !== null && flatPeopleCount[flatKey] !== undefined
          ? flatPeopleCount[flatKey]
          : 0;
        appliancesOverride = flatKey !== null && flatAppliances[flatKey] !== undefined
          ? flatAppliances[flatKey]
          : options.appliances;
        floorTypeOverride = flatKey !== null && flatFloorType[flatKey] !== undefined
          ? flatFloorType[flatKey]
          : options.floorType;
        orientationOverride = flatKey !== null && flatOrientation[flatKey] !== undefined
          ? flatOrientation[flatKey]
          : options.apartmentOrientation;
        outdoorLocationOverride = flatKey !== null && flatOutdoorLocation[flatKey] !== undefined
          ? flatOutdoorLocation[flatKey]
          : options.OutdoorUnitLocation;
      }
      const { btu, coolBtu, heatBtu, error } = calculateRoomLoad(room, peopleOverride, systemMode, appliancesOverride, floorTypeOverride, orientationOverride, outdoorLocationOverride);
      if (error) {
        setError(error);
        return { room, product: null, btu, coolBtu, heatBtu };
      }

      results.push(btu);
      totalBTU += btu;

      try {
        const { data } = await axios.get(`/api/products/btu/${btu}`, {
          params: {
            // System mode: cooling | heating | both. Backend uses this to
            // pick between coolingBtu and heatingBtu when filtering candidates.
            mode: systemMode,
            ...Object.fromEntries(
              Object.entries(options).map(([category, values]) => [
                category,
                Object.keys(values).filter((key) => values[key]),
              ])
            ),
          },
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

        return { room, product, btu, coolBtu, heatBtu };
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
          coolBtu,
          heatBtu,
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

    // Define propertyType before any use.
    // "residential-multi" means actual separate units (flats/apartments) — NOT just
    // a single dwelling with many rooms. Only set it when the user explicitly marked
    // multi-flat OR room prefixes indicate separate flats. A 3-bedroom house/flat is
    // still residential-single and should size the condenser at 100% of the total load.
    let propertyType = "residential-single";
    if (isMultiFlatProperty || detectedFlats.length > 1) {
      propertyType = "residential-multi";
    }

    // VRF capacity validation (show warning but continue calculations)
    if (totalBTU > MAX_VRF_TOTAL_CAPACITY) {
      setError(
        `⚠️ Warning: VRF system total capacity (${totalBTU.toLocaleString()} BTU) exceeds recommended ${MAX_VRF_TOTAL_CAPACITY.toLocaleString()} BTU limit. Consider splitting into multiple systems for optimal performance.`
      );
      // Continue with calculations despite warning
    }

    if (!condenser) {
      // Diversity multiplier: multi-unit buildings apply 0.8 because not all rooms
      // in every flat run simultaneously. Single-flat properties use 1.0 — the
      // condenser must cover the full combined room load.
      let multiplier = 1.0;
      if (propertyType === "residential-multi") {
        multiplier = 0.8;
      }

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

        // Outdoor unit selection: small loads (< 30k BTU) prefer single/multi-zone
        // heat-pump outdoors over VRF (which starts at 40k and would be 2x+ oversized).
        // Larger loads stay on the VRF ladder.
        const SMALL_LOAD_THRESHOLD = 30000;
        const isSmallLoad = requiredBTU < SMALL_LOAD_THRESHOLD;
        availableCondensers = availableCondensers.filter(cond => {
          const isVRF = /vrf/i.test(cond.name) || /vrf/i.test(cond.category || '');
          const isNonVrfOutdoor =
            /outdoor condenser/i.test(cond.category || '') ||
            /single-zone|multi-zone/i.test(cond.name);
          return isSmallLoad
            ? (isVRF || isNonVrfOutdoor)   // small loads: VRF + non-VRF outdoor heat-pumps
            : isVRF;                       // large loads: VRF only (original behaviour)
        });

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
          // Extract BTU from name since btu field may be corrupted
          const btuFromName = suitableCondenser.name.match(/(\d+)\s*BTU/)?.[1];
          const btuValue = btuFromName ? parseInt(btuFromName) : suitableCondenser.btu;
          const result = {
            ...suitableCondenser,
            _id: `condenser-${btuValue}`,
            flatName: label || undefined,
            name: suitableCondenser.name,
            btu: btuValue,
          };
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

        const { flats, acUnits } = groupFlatsByAnnotations(acAnnotations);

        // Calculate BTU per flat by summing already-computed room results directly.
        // Room names carry a "Flat N:" prefix for multi-flat properties.
        const flatBTUs = {};

        detectedFlats.forEach((flatName) => {
          const flatNum = flatName.match(/\d+/)?.[0];
          if (!flatNum) return;

          // Sum BTU for every room whose name starts with "Flat N:"
          let flatTotalBTU = 0;
          productResults.forEach(({ room, btu }) => {
            if (room.name.toLowerCase().includes(`flat ${flatNum}:`)) {
              flatTotalBTU += btu || 0;
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


        for (const [flatName, flatBTU] of Object.entries(flatBTUs)) {
          const flatRequiredBTU = flatBTU * multiplier;
          const condResult = await findSuitableCondenser(
            flatRequiredBTU,
            flatName
          );
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
        coolingBtu: p.coolingBtu,
        heatingBtu: p.heatingBtu,
        productType: p.productType,
        estimatedCost: p.price || 0,
      }));

    if (totalBTU >= 10000 && condensersForDisplay.length > 0) {
      recommendedUnits = recommendedUnits.concat(
        condensersForDisplay.map((c) => ({
          type: c.model || c.name || "Condenser",
          btu: c.btu || 0,
          coolingBtu: c.coolingBtu,
          heatingBtu: c.heatingBtu,
          productType: c.productType,
          estimatedCost: c.price || 0,
          flatName: c.flatName || undefined,
        }))
      );
    }

    const btuData = {
      totalBTU,
      systemMode,
      totalCoolingBTU: productResults
        .filter(({ product }) => product && !product.isCondenser)
        .reduce((s, r) => s + (r.coolBtu || 0), 0),
      totalHeatingBTU: productResults
        .filter(({ product }) => product && !product.isCondenser)
        .reduce((s, r) => s + (r.heatBtu || 0), 0),
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
      hasAnnotatedCondenser,
      rooms: productResults
        .filter(({ product }) => product && !product.isCondenser)
        .map(({ room, product, btu, coolBtu, heatBtu }) => ({
          name: room.name,
          size: room.size,
          btu: btu,
          coolBtu: coolBtu ?? null,
          heatBtu: heatBtu ?? null,
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
                    coolingBtu: cond.coolingBtu,
                    heatingBtu: cond.heatingBtu,
                    category: cond.category,
                    productType: cond.productType || 'outdoor',
                    numberOfMaximumIndoorUnits: cond.numberOfMaximumIndoorUnits,
                    areaCoverage: cond.areaCoverage,
                    energyEfficiency: cond.energyEfficiency,
                    countInStock: cond.countInStock,
                    price: cond.price,
                    discount: cond.discount || 0,
                    slug: cond.slug,
                    image: cond.image || "/images/p1.jpg",
                    isCondenser: true,
                    flatName: cond.flatName || undefined,
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
    ctxDispatch({
      type: "BTU_SET_CURRENT_PROJECT",
      payload: btuData,
    });

    setIsCalculating(false);
    toast.success(`✅ Calculation complete — ${actualRooms.length} room${actualRooms.length !== 1 ? 's' : ''}, ${totalBTU.toLocaleString()} BTU total`);
    navigate("/recommendations");
  };

  const handleClear = () => {
    setRooms([{ name: "", size: "", btu: 0, unit: "meters" }]);
    setCeilingHeight("2.5");
    setNumPeople(0);
    setFlatPeopleCount({});
    setFlatAppliances({});
    setFlatFloorType({});
    setFlatOrientation({});
    setFlatOutdoorLocation({});
    setMeasurementSystem("meters");
    setOptions({
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
        TropicalSEAsia: false,
        Continental: false,
        Subtropical: false,
        SubArctic: false,
      },
      appliances: {
        Oven: false,
        ServerRoom: false,
        CommercialKitchen: false,
        Gym: false,
        HomeTheater: false,
        Workshop: false,
        OfficeRoom: false,
        HotelRoom: false,
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
        {/* Mobile-only previous calculation echo — only on xs/sm screens */}
        {prevProject && showPrevSummary && (
          <div className="d-block d-md-none btu-prev-summary mb-3">
            <div className="btu-prev-summary__header">
              <span className="btu-prev-summary__title">Previous calculation</span>
              <button
                type="button"
                className="btu-prev-summary__close"
                aria-label="Dismiss"
                onClick={() => setShowPrevSummary(false)}
              >
                ×
              </button>
            </div>
            <div className="btu-prev-summary__meta">
              {prevProject.numberOfRooms} room{prevProject.numberOfRooms !== 1 ? 's' : ''}
              {' · '}
              <strong>{(prevProject.totalBTU || 0).toLocaleString()} BTU</strong> total
              {prevProject.totalSquareFootage > 0 && (
                <span> · {Math.round(prevProject.totalSquareFootage)} m²</span>
              )}
            </div>
            {Array.isArray(prevProject.rooms) && prevProject.rooms.length > 0 && (
              <ul className="btu-prev-summary__rooms">
                {prevProject.rooms
                  .filter((r) => !r.product?.isCondenser)
                  .map((r, i) => (
                    <li key={i}>
                      <span className="btu-prev-summary__room-name">{r.name}</span>
                      <span className="btu-prev-summary__room-btu">
                        {(r.coolBtu || r.btu || 0).toLocaleString()} BTU
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            <button
              type="button"
              className="btu-prev-summary__view-btn"
              onClick={() => navigate('/recommendations')}
            >
              View Recommendations →
            </button>
          </div>
        )}
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
      ✓ AC annotations found: {acAnnotations.length} label(s) detected
      {detectedFlats.length > 1 && (
        <>
          <br />
          <em>
            Flats auto-detected from condenser labels (e.g., condenser-1,
            condenser-2)
          </em>
        </>
      )}
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
              {isMultiFlatProperty && detectedFlats.length > 1 ? (
                <>
                  <Form.Label>Number of People (per flat):</Form.Label>
                  {detectedFlats.map((flatName) => (
                    <div key={flatName} className="d-flex align-items-center gap-2 mb-1">
                      <span style={{ minWidth: 60, fontSize: '0.9rem' }}>{flatName}:</span>
                      <Form.Control
                        type="number"
                        size="sm"
                        min={0}
                        placeholder="0"
                        value={flatPeopleCount[flatName] ?? ''}
                        onChange={(e) => setFlatPeopleCount(prev => ({
                          ...prev,
                          [flatName]: e.target.value === '' ? undefined : e.target.value,
                        }))}
                        style={{ maxWidth: 80 }}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <Form.Label>Number of People:</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    placeholder="Enter number of people"
                    value={numPeople}
                    onChange={(e) => setNumPeople(e.target.value)}
                  />
                </>
              )}
            </Form.Group>
          </Col>

          {/* Humidity selector */}
          <Col xs={12} md={6} lg={4} className="my-4">
            <Form.Group controlId="humidity">
              <Form.Label>Humidity Level:</Form.Label>
              <Form.Select value={humidity} onChange={(e) => setHumidity(e.target.value)}>
                <option value="low">Low (dry climate)</option>
                <option value="average">Average</option>
                <option value="high">High (humid / coastal)</option>
              </Form.Select>
            </Form.Group>
          </Col>

          {/* Infiltration (envelope air-leakage) selector */}
          <Col xs={12} md={6} lg={4} className="my-4">
            <Form.Group controlId="infiltration">
              <Form.Label>Building Air-Tightness:</Form.Label>
              <Form.Select
                value={infiltration}
                onChange={(e) => setInfiltration(e.target.value)}
              >
                <option value="tight">Tight (new / sealed build)</option>
                <option value="average">Average (typical dwelling)</option>
                <option value="leaky">Leaky (older / drafty)</option>
              </Form.Select>
            </Form.Group>
          </Col>

          {/* System mode selector – drives heating vs cooling sizing */}
          <Col xs={12} md={6} lg={4} className="my-4">
            <Form.Group controlId="systemMode">
              <Form.Label>System Mode:</Form.Label>
              <Form.Select
                value={systemMode}
                onChange={(e) => setSystemMode(e.target.value)}
              >
                <option value="heatpump">Cooling or Heating (heat pump)</option>
                <option value="recovery">Cooling &amp; Heat Recovery</option>
              </Form.Select>
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
            {isMultiFlatProperty && detectedFlats.length > 1 ? (
              <div className="mb-3">
                <div className="checkbox-group-section-title">Outdoor Unit Location (per flat):</div>
                {detectedFlats.map(flatName => (
                  <div key={flatName} className="mb-2 ps-2" style={{ borderLeft: '3px solid rgba(102,126,234,0.4)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px', color: '#495057' }}>{flatName}</div>
                    <CheckboxGroup
                      title=""
                      name={`OutdoorUnitLocation-${flatName}`}
                      options={flatOutdoorLocation[flatName] ?? DEFAULT_OUTDOOR_LOCATION}
                      onChange={(e) => setFlatOutdoorLocation(prev => ({
                        ...prev,
                        [flatName]: {
                          ...(prev[flatName] ?? DEFAULT_OUTDOOR_LOCATION),
                          [e.target.name]: !(prev[flatName] ?? DEFAULT_OUTDOOR_LOCATION)[e.target.name],
                        },
                      }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
            <CheckboxGroup
              title="Outdoor Unit Location"
              name="OutdoorUnitLocation"
              options={options.OutdoorUnitLocation}
              onChange={handleOutdoorUnitLocationChange}
            />
            )}

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
              labels={{
                HotMiddleEast: 'Hot Middle East',
                TropicalSEAsia: 'Tropical (SE Asia)',
                Subtropical: 'Subtropical (Australia/S. Africa)',
                AverageEurope: 'Average Europe',
                Continental: 'Continental (E. Europe)',
                SubArctic: 'Sub-Arctic (Scandinavia/Canada)',
                ColdAlaska: 'Cold Alaska',
              }}
            />

            <CheckboxGroup
              title="Window Type"
              name="windowType"
              options={options.windowType}
              onChange={handleWindowChange}
            />

            {isMultiFlatProperty && detectedFlats.length > 1 ? (
              <div className="mb-3">
                <div className="checkbox-group-section-title">Apartment Orientation (per flat):</div>
                {detectedFlats.map(flatName => (
                  <div key={flatName} className="mb-2 ps-2" style={{ borderLeft: '3px solid rgba(102,126,234,0.4)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px', color: '#495057' }}>{flatName}</div>
                    <CheckboxGroup
                      title=""
                      name={`orientation-${flatName}`}
                      options={flatOrientation[flatName] ?? DEFAULT_ORIENTATION}
                      onChange={(e) => setFlatOrientation(prev => ({
                        ...prev,
                        [flatName]: {
                          ...(prev[flatName] ?? DEFAULT_ORIENTATION),
                          [e.target.name]: !(prev[flatName] ?? DEFAULT_ORIENTATION)[e.target.name],
                        },
                      }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
            <CheckboxGroup
              title="Apartment Orientation"
              name="apartment"
              options={options.apartmentOrientation}
              onChange={handleApartmentChange}
            />
            )}
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

{isMultiFlatProperty && detectedFlats.length > 1 ? (
              <div className="mb-3">
                <div className="checkbox-group-section-title">Room Usage & Appliances (per flat):</div>
                {detectedFlats.map(flatName => (
                  <div key={flatName} className="mb-2 ps-2" style={{ borderLeft: '3px solid rgba(102,126,234,0.4)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px', color: '#495057' }}>{flatName}</div>
                    <CheckboxGroup
                      title=""
                      name={`appliances-${flatName}`}
                      options={flatAppliances[flatName] ?? DEFAULT_APPLIANCES}
                      onChange={(e) => setFlatAppliances(prev => ({
                        ...prev,
                        [flatName]: {
                          ...(prev[flatName] ?? DEFAULT_APPLIANCES),
                          [e.target.name]: !(prev[flatName] ?? DEFAULT_APPLIANCES)[e.target.name],
                        },
                      }))}
                      tooltips={{
                        Oven: '+8% cooling · −5% heating — Cooking adds heat; offsets some heating load',
                        ServerRoom: '+35% cooling · −15% heating — Servers and IT equipment generate continuous high heat',
                        CommercialKitchen: '+45% cooling · −20% heating — Multiple cooking appliances generate intense, sustained heat',
                        Gym: '+20% cooling · −10% heating — Exercise equipment and high metabolic activity from occupants',
                        HomeTheater: '+6% cooling · −3% heating — AV receivers, projectors and amplifiers add moderate heat',
                        Workshop: '+12% cooling · −6% heating — Power tools and compressors generate heat during operation',
                        OfficeRoom: '+18% cooling · −8% heating — Office equipment and occupants add moderate heat in cooling, reduce heating need',
                        HotelRoom: '+10% cooling · −4% heating — Hotel rooms have some internal gains from appliances and occupants',
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
            <CheckboxGroup
              title="Room Usage & Appliances"
              name="appliances"
              options={options.appliances}
              onChange={handleAppliancesChange}
              tooltips={{
                Oven: '+8% cooling · −5% heating — Cooking adds heat; offsets some heating load',
                ServerRoom: '+35% cooling · −15% heating — Servers and IT equipment generate continuous high heat',
                CommercialKitchen: '+45% cooling · −20% heating — Multiple cooking appliances generate intense, sustained heat',
                Gym: '+20% cooling · −10% heating — Exercise equipment and high metabolic activity from occupants',
                HomeTheater: '+6% cooling · −3% heating — AV receivers, projectors and amplifiers add moderate heat',
                Workshop: '+12% cooling · −6% heating — Power tools and compressors generate heat during operation',
                OfficeRoom: '+18% cooling · −8% heating — Office equipment and occupants add moderate heat in cooling, reduce heating need',
                HotelRoom: '+10% cooling · −4% heating — Hotel rooms have some internal gains from appliances and occupants',
              }}
            />
            )}

            <CheckboxGroup
              title="Roof Type"
              name="roofType"
              options={options.roofType}
              onChange={handleRoofChange}
            />
            {isMultiFlatProperty && detectedFlats.length > 1 ? (
              <div className="mb-3">
                <div className="checkbox-group-section-title">Floor (per flat):</div>
                {detectedFlats.map(flatName => (
                  <div key={flatName} className="mb-2 ps-2" style={{ borderLeft: '3px solid rgba(102,126,234,0.4)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px', color: '#495057' }}>{flatName}</div>
                    <CheckboxGroup
                      title=""
                      name={`floorType-${flatName}`}
                      options={flatFloorType[flatName] ?? DEFAULT_FLOOR_TYPE}
                      onChange={(e) => setFlatFloorType(prev => ({
                        ...prev,
                        [flatName]: {
                          ...(prev[flatName] ?? DEFAULT_FLOOR_TYPE),
                          [e.target.name]: !(prev[flatName] ?? DEFAULT_FLOOR_TYPE)[e.target.name],
                        },
                      }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
            <CheckboxGroup
              title="Floor"
              name="floorType"
              options={options.floorType}
              onChange={handleFloorChange}
            />
            )}
          </Col>
        </Row>
        <Button
          variant="primary"
          onClick={handleCalculate}
          className="mt-4 me-3 mb-4"
          disabled={isCalculating}
        >
          {isCalculating ? '⏳ Calculating…' : 'Calculate BTU'}
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
            {error}
          </div>
        )}


      </Form>
    </Container>
  );
}

export default BtuCalculator;