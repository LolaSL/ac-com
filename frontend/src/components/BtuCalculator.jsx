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

function BtuCalculator({ roomData }) {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();
  const componentRef = useRef();

  useEffect(() => {
    if (roomData?.length) {
      const formattedRooms = roomData.map((room) => ({
        name: room.name,
        size: room.size,
        btu: 0,
      }));
      setRooms(formattedRooms);
    }
  }, [roomData]);

  const handlePrint = () => {
    if (!rooms?.length || !btuResults?.length) return;

    // Calculate totals
    const totalBTU = btuResults.reduce((sum, btu) => sum + (btu || 0), 0);
    const totalProductBTU = products.reduce(
      (sum, product) => sum + (product.btu || 0),
      0
    );
    const totalPrice = products.length
      ? products.reduce((sum, product) => {
          const price =
            product.price - (product.price * (product.discount || 0)) / 100;
          return sum + price;
        }, 0)
      : 0;
    const optimalProductCount = products.filter((p) => p.model).length;

    // Build table HTML
    let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>Room</th>
          <th>Room BTU</th>
          <th>Optimal Product</th>
          <th>Product BTU</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${btuResults
          .map(
            (btu, i) => `
          <tr>
            <td>${rooms[i]?.name || ""}</td>
            <td>${btu}</td>
            <td>${products[i]?.model || ""}</td>
            <td>${products[i]?.btu || ""}</td>
            <td>${products[i]?.price || ""}</td>
          </tr>
        `
          )
          .join("")}
        <tr class="total-results bg-light">
          <td><strong>Total</strong></td>
          <td><strong>${totalBTU}</strong></td>
          <td><strong>${
            optimalProductCount || "No optimal product available"
          }</strong></td>
          <td><strong>${totalProductBTU.toFixed(0)}</strong></td>
          <td><strong>${
            products.length > 0 ? totalPrice.toFixed(2) : "No price available"
          }</strong></td>
        </tr>
      </tbody>
    </table>
  `;

    // Add condenser recommendation if needed
    if (showCondenser) {
      const recommendedCondenserBTU = (totalProductBTU * 0.8).toFixed(0);
      const condenserRow = `
      <tr class="text-center bg-info">
        <td colspan="5"><strong>Recommended Condenser: ${recommendedCondenserBTU} BTU</strong></td>
      </tr>
    `;
      tableHtml = tableHtml.replace("</tbody>", `${condenserRow}</tbody>`);
    }

    // Show table in React (optional)
    setShowTable(true);

    // Print table
    printJS({
      printable: tableHtml,
      type: "raw-html",
      header: "<h2>Product List</h2>",
      css: "../index.css",
      style: `
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
      thead { background: #eee; }
      .bg-light { background: #f8f9fa; }
      .bg-info { background: #cce5ff; }
      .total-results { font-weight: bold; }
    `,
    });
  };

  const cartItems = state?.cart?.cartItems || [];
  // eslint-disable-next-line no-unused-vars
  const [measurementSystem, setMeasurementSystem] = useState("meters");
  const [rooms, setRooms] = useState([{ name: "Bedroom 1", size: "", btu: 0 }]);
  const [ceilingHeight, setCeilingHeight] = useState("2.5");
  const [numPeople, setNumPeople] = useState(2);
  const [showCondenser, setShowCondenser] = useState(false);
  const [error, setError] = useState("");
  const [totalBTU, setTotalBTU] = useState(0);
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

  const handleOptionChange = (category, name) => {
    setOptions((prev) => ({
      ...prev,
      [category]: { ...prev[category], [name]: !prev[category][name] },
    }));
  };

  const handleRoomChange = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index][field] = value;
    setRooms(updatedRooms);
  };

  const addRoom = () => {
    setRooms([...rooms, { name: "Bedroom", size: "", btu: 0 }]);
  };

  const removeRoom = (index) => {
    setRooms(rooms.filter((_, i) => i !== index));
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

    const fetchedProducts = [];
    let totalBTU = 0;
    const selectedOptions = Object.fromEntries(
      Object.entries(options).map(([category, values]) => [
        category,
        Object.keys(values).filter((key) => values[key]),
      ])
    );

    const productRequests = rooms.map(async (room) => {
      const { btu, error } = calculateBTUForRoom(room);
      if (error) {
        setError(error);
        return null;
      }
      results.push(btu);
      totalBTU += btu;

      try {
        const { data } = await axios.get(`/api/products/btu/${btu}`, {
          params: selectedOptions,
        });

        return data && typeof data === "object" && data._id ? data : null;
      } catch (err) {
        console.error(`Product not found for room ${room.name}:`, err);
        return null;
      }
    });

    const productResults = await Promise.all(productRequests);
    fetchedProducts.push(...productResults.filter(Boolean));

    setBtuResults(results);
    setError("");

    setProducts(fetchedProducts.filter((p) => p !== null));

    setTotalBTU(totalBTU);

    const optimalProducts = fetchedProducts.filter((product) => {
      return (
        product.btu >= Math.min(...fetchedProducts.map((p) => p.btu)) &&
        product.btu <= Math.max(...fetchedProducts.map((p) => p.btu))
      );
    });

    const optimalProductCount = optimalProducts.length;

    setOptimalProductCount(optimalProductCount);

    if (totalBTU >= 10000) {
      setShowCondenser(true);
    } else {
      setShowCondenser(false);
    }
  };

  const displayValue = convertedValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const saveResultsToCart = () => {
    const addItemToCart = (product, quantity = 1) => {
      if (!product || !product.price || isNaN(product.btu)) {
        console.error("Invalid product data:", product);
        return;
      }

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

    if (!Array.isArray(rooms) || !Array.isArray(products)) {
      console.error("Invalid input: 'rooms' and 'products' must be arrays.");
      return;
    }

    if (rooms.length !== products.length) {
      console.error(
        "The number of rooms does not match the number of products."
      );
      return;
    }

    const productCount = {};

    rooms.forEach((room, index) => {
      const product = products[index];
      if (product && product._id) {
        if (!productCount[product.btu]) {
          productCount[product.btu] = { product, quantity: 0 };
        }
        productCount[product.btu].quantity += 1;
      } else {
        console.error(`Product at index ${index} is invalid`, product);
      }
    });

    Object.values(productCount).forEach(({ product, quantity }) => {
      addItemToCart(product, quantity);
    });

    navigate("/cart");
  };

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cartItems")) || [];
    if (savedCart.length > 0) {
      ctxDispatch({ type: "CART_RESTORE", payload: savedCart });
    }
  }, [ctxDispatch]);

  const handleClear = () => {
    setRooms([{ name: "Bedroom 1", size: "", btu: 0 }]);
    setCeilingHeight("2.5");
    setNumPeople(2);
    setMeasurementSystem();
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
    });

    setBtuResults([]);
    setProducts([]);
    setError("");
  };

  return (
    <div>
      <Container className="btu-calculator-container mt-4 mb-4 rounded ">
        <Form className="btu-form">
          <h3 className="mt-4 mb-4 text-center title">BTU Calculator</h3>
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

          {rooms.map((room, index) => (
            <Row key={index} className="my-4">
              <Col xs={12} md={6} lg={4} className="my-4">
                <Form.Group controlId={`roomType-${index}`}>
                  <Form.Label>Room Type {index + 1}:</Form.Label>
                  <Form.Control
                    as="select"
                    value={room.name}
                    onChange={(e) =>
                      handleRoomChange(index, "name", e.target.value)
                    }
                  >
                    <option>Bedroom 1</option>
                    <option>Bedroom 2</option>
                    <option>Bedroom 3</option>
                    <option>Bedroom 4</option>
                    <option>Bedroom 5</option>
                    <option>Bathroom</option>
                    <option>Dining Room</option>
                    <option>Family Room</option>
                    <option>Living Room</option>
                    <option>Kitchen</option>
                    <option>Loft</option>
                    <option>Terrace</option>
                    <option>Single Storey</option>
                    <option>Double Storey</option>
                    <option>Split Level House</option>
                    <option>Entire First Floor</option>
                    <option>Entire Second Floor And Above</option>
                    <option>Open Office Area</option>
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={12} md={6} lg={4} className="my-4">
                <Form.Group controlId={`roomSize-${index}`}>
                  <Form.Label>Room Size ({measurementSystem}²):</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder={`Enter room size in ${
                      measurementSystem === "meters" ? "m²" : "ft²"
                    }`}
                    value={room.size}
                    onChange={(e) =>
                      handleRoomChange(index, "size", e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
              <Button
                variant="primary"
                onClick={() => removeRoom(index)}
                className="btn-add mb-3 mt-4"
              >
                Clean <i className="fas fa-trash"></i>
              </Button>
            </Row>
          ))}

          <Button
            variant="primary"
            onClick={addRoom}
            className="btn-add mb-3 mt-4"
          >
            Add Desired Room
          </Button>
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

          <Button
            variant="secondary"
            onClick={handleClear}
            className="mt-4 mb-4"
          >
            Clear
          </Button>

          {error && (
            <div className="btu-error">
              {getError({ response: { data: { message: error } } })}
            </div>
          )}
        </Form>
      </Container>
      {btuResults.length > 0 && (
        <Container className="btu-results mt-4">
          <h3 className="text-center">BTU Results</h3>
          <Button
            variant="light"
            size="sm"
            className="go-to-btn btn-text  w-auto pt-2"
            onClick={() => {
              handlePrint();
            }}
          >
            Print Table
          </Button>

          <div ref={componentRef}>
            <div id="table-responsive" className="table">
              <Table bordered hover className="table-responsive-md">
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
                        <td data-label="Optimal Product">
                          {product.slug ? (
                            <Link
                              to={`/product/${product.slug}`}
                              className="link-product-details"
                            >
                              {product.model || "N/A"}
                            </Link>
                          ) : (
                            "No product available"
                          )}
                        </td>
                        <td data-label="Product BTU">
                          {product.name || "No product available"}
                        </td>
                        <td data-label="Product Price">
                          {product.discount > 0
                            ? (
                                product.price -
                                (product.price * product.discount) / 100
                              ).toFixed(2)
                            : product.price
                            ? product.price.toFixed(2)
                            : "No price available"}
                        </td>
                      </tr>
                    );
                  }}
                />{" "}
                <tr>
                  <td
                    colSpan="5"
                    className="total-results text-center"
                    style={{ fontWeight: "bold", fontSize: "1.1em" }}
                  >
                    Total Cooling Load: {displayValue} {selectedUnit}
                  </td>
                </tr>
                <tr>
                  <td data-label="Total" className="total-results bg-light">
                    <strong>Total</strong>
                  </td>
                  <td
                    data-label="Total Room Btu"
                    className="total-results bg-light"
                  >
                    <strong>{totalBTU}</strong>
                  </td>
                  <td
                    data-label="Total Optimal Products"
                    className="total-results bg-light"
                  >
                    <strong>
                      {optimalProductCount || "No optimal product available"}
                    </strong>
                  </td>
                  <td
                    data-label="Total Product BTU"
                    className="total-results bg-light"
                  >
                    <strong>
                      {products
                        .reduce(
                          (total, product) => total + (product.btu || 0),
                          0
                        )
                        .toFixed(0)}
                    </strong>
                  </td>
                  <td
                    data-label="Total Product Price"
                    className="total-results bg-light"
                  >
                    <strong>
                      {products.length > 0
                        ? products
                            .reduce((total, product) => {
                              const price =
                                product.price -
                                (product.price * (product.discount || 0)) / 100;
                              return total + price;
                            }, 0)
                            .toFixed(2)
                        : "No price available"}
                    </strong>
                  </td>
                </tr>
              </Table>
            </div>
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Button
              variant="primary"
              onClick={saveResultsToCart}
              className="go-to-btn btn-text mt-2 mb-4"
            >
              Save to Cart
            </Button>
          </div>
          {setShowCondenser && (
            <tr className="text-center">
              <td colSpan="5" className="text-center bg-light ">
                <strong>
                  <strong className="text-primary fs-5">
                    Recommended Condenser:{" "}
                    {(
                      products.reduce(
                        (total, product) => total + (product.btu || 0),
                        0
                      ) * 0.8
                    ).toFixed(0)}{" "}
                    BTU
                  </strong>
                </strong>
              </td>
            </tr>
          )}
        </Container>
      )}
    </div>
  );
}

export default BtuCalculator;
