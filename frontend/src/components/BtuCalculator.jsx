import { useState, useEffect, useRef } from "react";
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

function BtuCalculator({ roomData }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const componentRef = useRef();

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
        console.log("BtuCalculator received rooms:", formattedRooms);
        setRooms(formattedRooms);
      }
    }
  }, [roomData]);

  const handlePrint = () => {
    if (!rooms?.length || !btuResults?.length) return;

    // Ensure condenser calculation has completed
    if (
      showCondenser &&
      (!selectedCondensers || selectedCondensers.length === 0)
    ) {
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
    const condenserTotalBTU = selectedCondensers
      ? selectedCondensers.reduce((sum, cond) => sum + (cond.btu || 0), 0)
      : 0;
    const condenserTotalPrice = selectedCondensers
      ? selectedCondensers.reduce(
          (sum, cond) =>
            sum +
            (cond.price
              ? cond.discount
                ? cond.price - (cond.price * cond.discount) / 100
                : cond.price
              : 0),
          0
        )
      : 0;

    // Calculate totals including condensers
    const totalItemCount =
      products.length +
      (selectedCondensers && showCondenser ? selectedCondensers.length : 0);
    const totalAllBTU = totalProductBTU + condenserTotalBTU;
    const totalAllPrice = totalPrice + condenserTotalPrice;

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
          ${btuResults
            .map(
              (btu, i) => `
            <tr>
              <td>${rooms[i]?.name || ""}</td>
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
            </tr>
          `
            )
            .join("")}
          ${
            selectedCondensers && selectedCondensers.length > 0 && showCondenser
              ? selectedCondensers
                  .map(
                    (cond, index) => `
            <tr style="background-color: #f0f8ff;">
              <td style="font-weight: bold; color: #007bff;">${
                selectedCondensers.length > 1
                  ? `Condenser ${index + 1}`
                  : "Condenser"
              }</td>
              <td style="font-weight: bold; color: #007bff;">${
                index === 0
                  ? (
                      btuResults.reduce((sum, btu) => sum + (btu || 0), 0) *
                      (isVRFSystem ? 1.0 : 0.8)
                    ).toLocaleString() + " BTU"
                  : ""
              }</td>
              <td style="font-weight: bold; color: #007bff;">${
                cond.name || ""
              }</td>
              <td style="font-weight: bold;">${
                cond.model ||
                `${cond.btu} BTU ${
                  isVRFSystem ? "VRF" : "Multi-System"
                } Condenser`
              }</td>
              <td style="font-weight: bold; color: ${
                condenserSizingStatus === "custom" ? "#ff8c00" : "#007bff"
              };">${
                      cond.price > 0
                        ? `$${
                            cond.discount
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
            <td colspan="5" style="color: #007bff; font-weight: bold; text-align: center;">
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
      let statusColor = "#007bff";

      if (condenserSizingStatus === "perfect") {
        statusText = "✓ Perfect Match";
        statusColor = "#28a745";
      } else if (condenserSizingStatus === "oversized") {
        statusText = "📈 Slightly Oversized";
        statusColor = "#17a2b8";
      } else if (condenserSizingStatus === "undersized") {
        statusText = "⚠️ Slightly Undersized";
        statusColor = "#ffc107";
      } else if (condenserSizingStatus === "custom") {
        statusText = "🔧 Custom Solution Required";
        statusColor = "#ff8c00";
      }

      const condenserStatusRow = `
      <tr class="text-center" style="background-color: #f8f9fa;">
        <td colspan="5" style="color: ${statusColor}; font-weight: bold;">
          <strong>Condenser Status: ${statusText}</strong><br/>
          <small>${selectedCondensers
            .map((cond) => `${cond.name} - ${cond.btu} BTU`)
            .join(", ")}</small>
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
      header: "<h2>Product List</h2>",
      css: "../index.css",
      style: `
        .print-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        h1 {
          text-align: center;
          color: #007bff;
          margin-bottom: 20px;
          font-size: 2.5em;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .quote-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin: 0 auto;
        }
        th {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          padding: 15px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td {
          padding: 12px;
          text-align: center;
          border-bottom: 1px solid #ddd;
        }
        tbody tr:nth-child(even) {
          background: #f8f9fa;
        }
        tbody tr:hover {
          background: #e9ecef;
        }
        .total-row {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: teal;
          font-weight: bold;
        }
        .cooling-load-row {
          background: #fff3cd;
          border-top: 2px solid #ffc107;
        }
        .bg-info {
          background: #cce5ff !important;
        }
        .total-results {
          font-weight: bold;
        }
      `,
    });
  };

  const cartItems = state?.cart?.cartItems || [];
  cartItems.map((item) => (
    <div key={item.id}>
      {item.name} - {item.quantity}
    </div>
  ));
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

  const [btuResults, setBtuResults] = useState([]);
  const [products, setProducts] = useState([]);
  const [isVRFSystem, setIsVRFSystem] = useState(false);

  const hvacSystemType = isVRFSystem ? "vrf" : "minisplit";

  // VRF system limits and validations
  const MAX_VRF_INDOOR_UNITS = 64;
  const MAX_VRF_TOTAL_CAPACITY = 360000; // BTU
  const MAX_MINISPLIT_UNITS = 12;
  const MAX_MINISPLIT_CAPACITY = 96000; // BTU

  // Validate system capacity limits (warnings, not blocking)
  if (isVRFSystem && rooms.length > MAX_VRF_INDOOR_UNITS) {
    setError(
      `⚠️ Warning: VRF systems support maximum ${MAX_VRF_INDOOR_UNITS} indoor units. Current: ${rooms.length}. Consider splitting into multiple VRF systems.`
    );
  } else if (!isVRFSystem && rooms.length > MAX_MINISPLIT_UNITS) {
    setError(
      `⚠️ Warning: Minisplit systems support maximum ${MAX_MINISPLIT_UNITS} indoor units. Current: ${rooms.length}. Consider using VRF system for multi-zone applications.`
    );
  }

  const selectedUnit = "kW";

  const outputUnitConversion = {
    BTU: 1,
    Watt: 0.29307107,
    kW: 0.00029307107,
  };

  const CONSTANTS = {
    CONVERT_FEET_TO_METERS: 0.092903,
    BASE_BTU_PER_SQ_METER: 600,
    HEIGHT_ADDITIONAL_BTU: 1000,
    BTU_PER_ADDITIONAL_PERSON: 600,
    KITCHEN_BTU_ADDITION: 4000,

    OUTDOOR_LOCATION_BTU_ADJUSTMENTS: {
      PitchedRoof: 1.1,
      WallBrackets: 1.05,
      HardGround: 1.0,
    },
    windowMultipliers: {
      SingleGlazed: 1.2,
      DoubleGlazed: 1.0,
      TripleGlazed: 0.8,
      Louvered: 1.3,
    },
    roofTypeMultipliers: {
      Roof: 1.0,
      Flat: 1.2,
      FlatRoof: 1.2,
      PitchedRoof: 1.0,
    },
    roofMaterialMultipliers: {
      Metal: 1.2,
      Tile: 1.0,
      Concrete: 1.1,
      AsphaltShingle: 1.05,
    },
    roofInsulationMultipliers: {
      Poor: 1.2,
      Average: 1.0,
      Good: 0.8,
    },
    floorTypeMultipliers: {
      Marble: 1.08,
      Timber: 1.05,
      Concrete: 1.0,
      Carpeted: 0.95,
    },
    apartmentOrientation: {
      North: 0.9,
      East: 1.0,
      South: 1.2,
      West: 1.3,
    },
    applianceBTUAdditions: {
      Oven: 3000,
      Television: 500,
      Computer: 600,
    },
  };

  const convertedValue = totalBTU * outputUnitConversion[selectedUnit];

  const convertArea = (value) => {
    return measurementSystem === "feet"
      ? value * CONSTANTS.CONVERT_FEET_TO_METERS
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

  const calculateBTUForRoom = (room) => {
    let area = convertArea(parseFloat(room.size));
    let height = parseFloat(ceilingHeight);

    if (isNaN(area) || isNaN(height)) {
      return { btu: null, error: "Enter valid room size & ceiling height." };
    }

    let btu = area * CONSTANTS.BASE_BTU_PER_SQ_METER;
    if (height > 2.5)
      btu += CONSTANTS.HEIGHT_ADDITIONAL_BTU * ((height - 2.5) / 0.1);
    btu += CONSTANTS.BTU_PER_ADDITIONAL_PERSON * Math.max(0, numPeople - 1);
    if (room.name === "Kitchen") btu += CONSTANTS.KITCHEN_BTU_ADDITION;

    const diningRoomBtuByClimate = {
      "Average Europe": 3000,
      "Hot Middle East": 4000,
      "Cold Alaska": 2500,
    };

    const userSelectedClimate = "Hot Middle East";

    if (room.name === "Dining Room") {
      btu += diningRoomBtuByClimate[userSelectedClimate] || 3000;
    }

    // VRF efficiency adjustment (VRF systems use base calculation)
    const vrfEfficiencyFactor = isVRFSystem ? 1.0 : 1.0;
    btu *= vrfEfficiencyFactor;

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
      Timber: 1.05,
      Concrete: 1.0,
      Carpeted: 0.95,
    });

    applyMultiplier("sunExposure", {
      FullSunlight: 1.2,
      Average: 1,
      HeavilyShaded: 0.8,
    });

    applyMultiplier("climate", {
      HotMiddleEast: 1.2,
      AverageEurope: 1.0,
      ColdSAlaska: 0.8,
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
                slug: null,
                displayName: "No product available",
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
            slug: null,
            displayName: "No product available",
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
    const isVRF =
      acProducts.some(
        (p) =>
          p.category?.toLowerCase().includes("vrf") ||
          p.name?.toLowerCase().includes("vrf") ||
          p.tags?.includes("vrf") ||
          p.systemType === "vrf"
      ) || totalBTU > MAX_MINISPLIT_CAPACITY; // Assume VRF for large systems

    // VRF capacity validation (show warning but continue calculations)
    if (isVRF && totalBTU > MAX_VRF_TOTAL_CAPACITY) {
      setError(
        `⚠️ Warning: VRF system total capacity (${totalBTU.toLocaleString()} BTU) exceeds recommended ${MAX_VRF_TOTAL_CAPACITY.toLocaleString()} BTU limit. Consider splitting into multiple systems for optimal performance.`
      );
      // Continue with calculations despite warning
    } else if (!isVRF && totalBTU > MAX_MINISPLIT_CAPACITY) {
      setError(
        `⚠️ Warning: Minisplit system total capacity (${totalBTU.toLocaleString()} BTU) exceeds recommended ${MAX_MINISPLIT_CAPACITY.toLocaleString()} BTU limit. Consider using VRF system for larger applications.`
      );
      // Continue with calculations despite warning
    }

    setIsVRFSystem(isVRF);

    if (!condenser) {
      // Calculate required condenser BTU based on system type
      const multiplier = isVRF ? 1.0 : 0.8;
      const requiredBTU = totalBTU * multiplier;

      // For large systems, use wider acceptable range
      // Note: Current logic uses dynamic selection based on remaining capacity
      // minAcceptable and maxAcceptable ranges calculated but not currently used

      // Use condenserCandidates if available, otherwise fetch from API
      // This ensures we search from actual condenser products in the system
      let availableCondensers =
        condenserCandidates.length > 0 ? condenserCandidates : [];

      // If no condensers found in candidates, try fetching from database
      if (availableCondensers.length === 0) {
        try {
          // Fetch all available condensers from the /condensers/:btu endpoint
          // This endpoint returns condensers for a given BTU requirement
          const { data: condenserList } = await axios.get(
            `/api/products/condensers/${Math.round(requiredBTU)}`
          );
          if (Array.isArray(condenserList)) {
            availableCondensers = condenserList;
          }
        } catch (err) {
          console.log(
            "Could not fetch condensers from database, will use estimate"
          );
        }
      }

      // Sort condensers by BTU ascending to find the smallest suitable condenser
      availableCondensers.sort((a, b) => a.btu - b.btu);

      // Find the condenser closest to the required capacity
      let suitableCondenser = null;
      let minDiff = Infinity;
      for (const cond of availableCondensers) {
        const diff = Math.abs(cond.btu - requiredBTU);
        if (diff < minDiff) {
          minDiff = diff;
          suitableCondenser = cond;
        }
      }

      // If the closest is more than 10% undersized, create custom
      if (suitableCondenser && suitableCondenser.btu < requiredBTU * 0.9) {
        // Create custom
        const estimatedPrice = Math.round(requiredBTU * 0.065 * 100) / 100;
        selectedCondensers = [
          {
            _id: `condenser-custom-${requiredBTU}`,
            name: "Custom Condenser Required",
            model: `${Math.round(requiredBTU)} BTU ${
              isVRFSystem ? "VRF" : "Multi-System"
            } Condenser`,
            btu: Math.round(requiredBTU),
            price: estimatedPrice,
            discount: 0,
            slug: null,
          },
        ];
        sizingStatus = "custom";
      } else if (suitableCondenser) {
        selectedCondensers = [suitableCondenser];
      } else {
        // No condensers available, create custom
        const estimatedPrice = Math.round(requiredBTU * 0.065 * 100) / 100;
        selectedCondensers = [
          {
            _id: `condenser-custom-${requiredBTU}`,
            name: "Custom Condenser Required",
            model: `${Math.round(requiredBTU)} BTU ${
              isVRFSystem ? "VRF" : "Multi-System"
            } Condenser`,
            btu: Math.round(requiredBTU),
            price: estimatedPrice,
            discount: 0,
            slug: null,
          },
        ];
        sizingStatus = "custom";
      }

      // Calculate total BTU provided by selected condensers
      const totalCondenserBTU = selectedCondensers.reduce(
        (sum, c) => sum + c.btu,
        0
      );

      // Determine sizing status
      const percentage = (totalCondenserBTU / requiredBTU) * 100;
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

  const saveResultsToCart = () => {
    // Ensure condenser calculation has completed if condensers should be shown
    if (
      showCondenser &&
      (!selectedCondensers || selectedCondensers.length === 0)
    ) {
      alert("Please wait for calculations to complete before saving to cart.");
      return;
    }

    const addItemToCart = (product, quantity = 1) => {
      if (!product) return;

      const existingItem = cartItems.find((item) => item.btu === product.btu);
      if (existingItem) {
        ctxDispatch({
          type: "CART_ADD_ITEM",
          payload: {
            ...existingItem,
            quantity: existingItem.quantity + quantity,
          },
        });
      } else {
        ctxDispatch({
          type: "CART_ADD_ITEM",
          payload: { ...product, quantity },
        });
      }
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
          slug: null,
          displayName: "No product available",
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

    // Add all selected condensers to cart if available
    if (selectedCondensers && selectedCondensers.length > 0 && showCondenser) {
      selectedCondensers.forEach((condenser) => {
        addItemToCart(condenser, 1);
      });
    }

    navigate("/cart");
  };

  // Navigate to ROI Calculator with BTU data
  const handleCalculateROI = () => {
    // Calculate total equipment cost from products (indoor units)
    const totalIndoorUnitsCost =
      products.length > 0
        ? products.reduce((total, product) => {
            const price =
              product.price - (product.price * (product.discount || 0)) / 100;
            return total + price;
          }, 0)
        : 0;

    // Add condenser cost based on total BTU
    // For multi-split systems, one condenser is needed for all indoor units
    // Condenser cost: $4058.40 for 60000 BTU Multi-System Condenser
    const condenserCost = totalBTU > 0 ? 4058.4 : 0;

    // Total equipment cost = indoor units + condenser
    const totalEquipmentCost = totalIndoorUnitsCost + condenserCost;

    // Determine property type based on number of rooms
    let propertyType = "residential-single";
    if (rooms.length >= 10) {
      propertyType = "residential-multi";
    } else if (rooms.length >= 3) {
      // 3+ rooms = multi-unit (multiple AC units in same property)
      propertyType = "residential-multi";
    }

    // Estimate installation time based on rooms and BTU
    const estimatedDays = Math.max(
      1,
      Math.ceil(rooms.length * 0.7 + totalBTU / 10000)
    );

    // Calculate realistic project size for ROI calculator
    // Project size should represent the total scope value including labor and overhead
    // Formula: equipment cost / typical equipment percentage (20-30% of total project)
    // For residential-single: equipment is ~20% of total project value
    // For residential-multi: equipment is ~25% of total project value
    let estimatedProjectSize = totalEquipmentCost;

    if (propertyType === "residential-single") {
      // Equipment typically 20% of total project, so total = equipment / 0.20
      estimatedProjectSize = Math.max(
        1000,
        Math.round(totalEquipmentCost / 0.2)
      );
    } else if (propertyType === "residential-multi") {
      // Equipment typically 25% of total project, so total = equipment / 0.25
      estimatedProjectSize = Math.max(
        10000,
        Math.round(totalEquipmentCost / 0.25)
      );
    } else {
      // Industrial/commercial: equipment typically 30% of total project
      estimatedProjectSize = Math.max(
        50000,
        Math.round(totalEquipmentCost / 0.3)
      );
    }

    // Prepare BTU data to pass to ROI Calculator
    const btuData = {
      totalBTU,
      totalSquareFootage: rooms.reduce(
        (sum, room) => sum + (parseFloat(room.size) || 0),
        0
      ),
      numberOfRooms: rooms.length,
      recommendedUnits: products
        .filter((p) => p.model)
        .map((p) => ({
          type: p.model || "Split System",
          btu: p.btu || 0,
          estimatedCost: p.price || 0,
        })),
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

    // Navigate to ROI Calculator with state
    navigate("/roi-calculator", {
      state: {
        btuData,
        fromBTU: true,
      },
    });
  };

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cartItems")) || [];
    if (savedCart.length > 0) {
      ctxDispatch({ type: "CART_RESTORE", payload: savedCart });
    }
  }, [ctxDispatch]);

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
        {products.length > 0 && (
          <div className="alert alert-info mb-4">
            <strong>📊 System Type Detected:</strong>{" "}
            {isVRFSystem
              ? `VRF Heat Recovery System (${rooms.length} Zones)`
              : `Traditional Minisplit System (${rooms.length} Units)`}
            <br />
            <small className="text-muted">
              {isVRFSystem
                ? `Condenser sizing: 100% of total indoor capacity (1.0x ratio) - Supports up to ${MAX_VRF_INDOOR_UNITS} zones`
                : `Condenser sizing: 80% of total indoor capacity (0.8x diversity factor) - Supports up to ${MAX_MINISPLIT_UNITS} units`}
            </small>
            {isVRFSystem && (
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
            )}
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
            <h5>Rooms from Annotator:</h5>
            <ul className="list-group">
              {rooms.map((room, index) => (
                <li key={index} className="list-group-item">
                  <strong>{room.name}</strong> - {room.size} m²
                </li>
              ))}
            </ul>
          </div>
        )}
        <hr className="ms-2 mt-1 mb-5" style={{ width: "66%" }} />
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
              disabled={
                showCondenser &&
                (!selectedCondensers || selectedCondensers.length === 0)
              }
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
              {showCondenser &&
                (!selectedCondensers || selectedCondensers.length === 0) && (
                  <small className="d-block text-muted">Calculating...</small>
                )}
            </Button>
            <Table bordered hover className="mt-3 text-center">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room BTU</th>
                  <th>Optimal Product, Model</th>
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
                            {product.model || "No product available"}
                          </Link>
                        ) : (
                          "No product available"
                        )}
                      </td>
                      <td
                        className="product-btu table-fit-content"
                        data-label="Product BTU"
                      >
                        {product.name || "No product available"}
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
                {/* Add condenser rows if available */}
                {selectedCondensers &&
                  selectedCondensers.length > 0 &&
                  showCondenser &&
                  selectedCondensers.map((cond, index) => (
                    <tr
                      key={`condenser-${index}`}
                      className="condenser-row"
                      style={{ backgroundColor: "#f0f8ff" }}
                    >
                      <td
                        data-label="Room"
                        style={{ fontWeight: "bold", color: "#007bff" }}
                      >
                        {selectedCondensers.length > 1
                          ? `Condenser ${index + 1}`
                          : "Condenser"}
                      </td>
                      <td
                        data-label="Room BTU"
                        style={{ fontWeight: "bold", color: "#007bff" }}
                      >
                        {index === 0 ? (
                          <>
                            {(() => {
                              const roomBtuSum = btuResults.reduce(
                                (sum, btu) => sum + (btu || 0),
                                0
                              );
                              const multiplier =
                                hvacSystemType === "vrf" ? 1.0 : 0.8;
                              const condenserBtu = roomBtuSum * multiplier;
                              console.log("Condenser calculation:", {
                                roomBtuSum,
                                multiplier,
                                condenserBtu,
                                selectedCondenserBTU: cond.btu,
                              });
                              return `${condenserBtu.toLocaleString()} BTU`;
                            })()}
                          </>
                        ) : (
                          ""
                        )}
                      </td>
                      <td data-label="Product">
                        {cond.slug ? (
                          <Link
                            to={`/product/${cond.slug}`}
                            style={{ fontWeight: "bold", color: "#007bff" }}
                          >
                            {cond.name}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: "bold" }}>
                            {cond.name}
                          </span>
                        )}
                      </td>
                      <td
                        className="product-btu table-fit-content"
                        data-label="Product BTU"
                        style={{ fontWeight: "bold" }}
                      >
                        {cond.model ||
                          `${cond.btu} BTU ${
                            hvacSystemType === "vrf" ? "VRF" : "Multi-System"
                          } Condenser`}
                      </td>
                      <td
                        data-label="Product Price"
                        className="table-fit-content"
                        style={{
                          fontWeight: "bold",
                          color:
                            condenserSizingStatus === "custom"
                              ? "#ff8c00"
                              : "#007bff",
                        }}
                      >
                        {cond.price > 0
                          ? `$${(cond.discount > 0
                              ? cond.price - (cond.price * cond.discount) / 100
                              : cond.price
                            ).toFixed(2)}${
                              condenserSizingStatus === "custom"
                                ? " (est.)"
                                : ""
                            }`
                          : "Contact for price"}
                      </td>
                    </tr>
                  ))}
                <tr>
                  <td
                    colSpan="5"
                    className="total-results text-center"
                    style={{ color: "#007bff !important", fontWeight: "bold" }}
                  >
                    Total Cooling Load: {displayValue} {selectedUnit}
                  </td>
                </tr>
                <tr>
                  <td
                    data-label="Total"
                    className="total-results"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    Total
                  </td>
                  <td
                    data-label="Total Room Btu"
                    className="total-results"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    {totalBTU}
                  </td>
                  <td
                    data-label="Total Optimal Products"
                    className="total-results"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    {(optimalProductCount || 0) +
                      (selectedCondensers && showCondenser
                        ? selectedCondensers.length
                        : 0) || "No products available"}
                  </td>
                  <td
                    data-label="Total Product BTU"
                    className="total-results"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    {(() => {
                      const productsBTU = products.reduce(
                        (total, product) => total + (product.btu || 0),
                        0
                      );
                      const condensersBTU =
                        selectedCondensers && showCondenser
                          ? selectedCondensers.reduce(
                              (total, cond) => total + (cond.btu || 0),
                              0
                            )
                          : 0;
                      return (productsBTU + condensersBTU).toFixed(0);
                    })()}
                  </td>
                  <td
                    data-label="Total Product Price"
                    className="total-results"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    {products.length > 0 ||
                    (selectedCondensers &&
                      selectedCondensers.length > 0 &&
                      showCondenser)
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

                          const condensersTotal =
                            selectedCondensers && showCondenser
                              ? selectedCondensers.reduce((total, cond) => {
                                  const price =
                                    cond.price -
                                    (cond.price * (cond.discount || 0)) / 100;
                                  return total + price;
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
          <div className="d-flex justify-content-center gap-3 mt-3">
            <Button
              onClick={saveResultsToCart}
              variant="light"
              size="sm"
              className="go-to-btn btn-text w-auto py-2"
              disabled={
                showCondenser &&
                (!selectedCondensers || selectedCondensers.length === 0)
              }
            >
              <ShoppingCart size={20} />
              <span> Save to Cart</span>
              {showCondenser &&
                (!selectedCondensers || selectedCondensers.length === 0) && (
                  <small className="d-block text-muted">Calculating...</small>
                )}
            </Button>

            <Button
              onClick={handleCalculateROI}
              variant="success"
              size="sm"
              className="go-to-btn btn-text w-auto py-2"
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
            </Button>
          </div>
          {selectedCondensers &&
            selectedCondensers.length > 0 &&
            showCondenser && (
              <div
                className="text-center mt-2 p-3 rounded"
                style={{
                  backgroundColor:
                    condenserSizingStatus === "custom" ? "#fff3cd" : "#f0f8ff",
                }}
              >
                <strong className="text-primary fs-5">
                  Recommended {isVRFSystem ? "VRF" : "Minisplit"} Condenser:{" "}
                  {(
                    btuResults.reduce((total, btu) => total + (btu || 0), 0) *
                    (isVRFSystem ? 1.0 : 0.8)
                  ).toFixed(0)}{" "}
                  BTU
                </strong>
                {selectedCondensers.length > 1 && (
                  <div className="mt-2">
                    <span className="badge bg-primary">
                      Multiple Condensers Selected
                    </span>
                    <p className="small text-muted mb-0 mt-1">
                      {selectedCondensers.map(
                        (cond, index) =>
                          `${cond.name} - ${cond.btu} BTU${
                            index < selectedCondensers.length - 1 ? ", " : ""
                          }`
                      )}
                    </p>
                  </div>
                )}
                {condenserSizingStatus === "perfect" &&
                  selectedCondensers.length === 1 && (
                    <div className="mt-2">
                      <span className="badge bg-success">✓ Perfect Match</span>
                      <p className="small text-muted mb-0 mt-1">
                        {condenser.name} - {condenser.btu} BTU
                      </p>
                    </div>
                  )}
                {condenserSizingStatus === "oversized" &&
                  selectedCondensers.length === 1 && (
                    <div className="mt-2">
                      <span className="badge bg-info">
                        📈 Slightly Oversized
                      </span>
                      <p className="small text-muted mb-0 mt-1">
                        {condenser.name} - {condenser.btu} BTU
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
                      {selectedCondensers
                        .map((cond) => `${cond.name} - ${cond.btu} BTU`)
                        .join(", ")}
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
                      No stock product matches your{" "}
                      {selectedCondensers.reduce(
                        (sum, cond) => sum + cond.btu,
                        0
                      )}{" "}
                      BTU requirement
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
