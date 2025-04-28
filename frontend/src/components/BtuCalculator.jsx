import React, { useState, useEffect } from "react";
import {
  Container,
  Image,
  Row,
  Col,
  Form,
  Button,
  Table,
} from "react-bootstrap";
import axios from "axios";
import { Link } from "react-router-dom";
import { getError } from "../utils";
import { useContext } from "react";
import { Store } from "../Store";
import { useNavigate } from "react-router-dom";
import CheckboxGroup from "./CheckboxGroup";

function BtuCalculator() {
  const { state, dispatch: ctxDispatch } = useContext(Store);

  const navigate = useNavigate();

  const cartItems = state?.cart?.cartItems || [];
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [areaFeet, setAreaFeet] = useState(0);
  const [areaMeters, setAreaMeters] = useState(0);
  const [measurementSystem, setMeasurementSystem] = useState("meters");
  const [rooms, setRooms] = useState([{ name: "Bedroom 1", size: "", btu: 0 }]);
  const [ceilingHeight, setCeilingHeight] = useState("2.5");
  const [numPeople, setNumPeople] = useState(2);
  const [showCondenser, setShowCondenser] = useState(false);
  const [error, setError] = useState("");
  const [totalBTU, setTotalBTU] = useState(0);
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
      AverageWarsaw: false,
      HotTelAviv: false,
      ColdStockholm: false,
    },
  });

  const [btuResults, setBtuResults] = useState([]);
  const [products, setProducts] = useState([]);

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
  };

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

  const calculateArea = (e) => {
    e.preventDefault();
    const h = parseFloat(height);
    const w = parseFloat(width);
    if (isNaN(h) || isNaN(w)) return;

    const area = h * w;
    setAreaFeet(
      measurementSystem === "feet"
        ? area
        : area / CONSTANTS.CONVERT_FEET_TO_METERS
    );
    setAreaMeters(
      measurementSystem === "meters"
        ? area
        : area * CONSTANTS.CONVERT_FEET_TO_METERS
    );
  };

  const handleRoomChange = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index][field] = value;
    setRooms(updatedRooms);
  };

  const addRoom = () => {
    setRooms([...rooms, { name: "", size: "", btu: 0 }]);
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

    const applyMultiplier = (category, multipliers) => {
      Object.keys(multipliers).forEach((key) => {
        if (options[category][key]) btu *= multipliers[key];
      });
    };

    applyMultiplier("insulation", { Poor: 1.2, Average: 1.1, Good: 0.9 });
    applyMultiplier("sunExposure", { FullSunlight: 1.2, HeavilyShaded: 0.9 });
    applyMultiplier("climate", { Hot: 1.2, Cold: 0.8, Average: 1.0 });
    applyMultiplier("typeOfWall", {
      BrickVeneer: 1.1,
      DoubleBrick: 0.9,
      FoarmCladding: 0.8,
    });
    applyMultiplier(
      "OutdoorUnitLocation",
      CONSTANTS.OUTDOOR_LOCATION_BTU_ADJUSTMENTS
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
        AverageWarsaw: false,
        HotTelAviv: false,
        ColdStockholm: false,
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
          <Row className="my-4">
            <Col xs={12} md={6} lg={8}>
              <Form.Group controlId="measurementSystem">
                <Form.Label className="fw-bold">Calculate Area </Form.Label>
                <Form.Control
                  as="select"
                  value={measurementSystem}
                  onChange={(e) => setMeasurementSystem(e.target.value)}
                >
                  <option value="meters">Square Meters (m²)</option>
                  <option value="feet">Square Feet (ft²)</option>
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>
          <Row className="my-4">
            <Col xs={12} md={6} lg={8}>
              <Form.Group controlId="height">
                <Form.Label>
                  Height ({measurementSystem === "meters" ? "m" : "ft"}):
                </Form.Label>
                <Form.Control
                  type="number"
                  placeholder={`Enter height in ${
                    measurementSystem === "meters" ? "meters" : "feet"
                  }`}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="my-4">
            <Col xs={12} md={6} lg={8}>
              <Form.Group controlId="width">
                <Form.Label>
                  Width ({measurementSystem === "meters" ? "m" : "ft"}):
                </Form.Label>
                <Form.Control
                  type="number"
                  placeholder={`Enter width in ${
                    measurementSystem === "meters" ? "meters" : "feet"
                  }`}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Button
            variant="primary"
            onClick={calculateArea}
            className="btn-calculate mt-2 mb-4 w-70"
          >
            Calculate Area
          </Button>
          {areaFeet > 0 && (
            <div className="result mt-4 mb-4">
              <h3 className="mb-3 mt-3">Results:</h3>
              <p>Area in Square Feet: {areaFeet.toFixed(2)} sq ft</p>
              <p>Area in Square Meters: {areaMeters.toFixed(2)} sq m</p>
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
                    <option>Living Room</option>
                    <option>Kitchen</option>
                    <option>Bathroom</option>
                    <option>Terrace</option>
                    <option>Loft</option>
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
                className="btn btn-sm mb-4  my-4"
              >
                <i className="fas fa-trash"></i>
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
          <hr className="ms-2 mt-1 mb-5" style={{ width: "66%" }}></hr>
          <CheckboxGroup
            title="Outdoor Unit (Condenser) Location"
            name="OutdoorUnitLocation"
            options={options.OutdoorUnitLocation}
            onChange={handleOutdoorUnitLocationChange}
          />

          <CheckboxGroup
            title="Type of Wall"
            name="typeOfWall"
            options={options.typeOfWall}
            onChange={handleWallChange}
          />

          <CheckboxGroup
            title="Insulation Condition"
            name="insulation"
            options={options.insulation}
            onChange={handleInsulationChange}
          />

          <CheckboxGroup
            title="Sun Exposure"
            name="sunExposure"
            options={options.sunExposure}
            onChange={handleSunExposureChange}
          />

          <CheckboxGroup
            title="Climate"
            name="climate"
            options={options.climate}
            onChange={handleClimateChange}
          />

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
          <div className="table-responsive">
            <Table bordered hover className="table-responsive-md">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room BTU</th>
                  <th>Optimal Product</th>
                  <th>Product BTU</th>
                  <th>Product Price, ($)</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => {
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
                            <Image
                              src={product.image || "/images/placeholder.png"}
                              alt={product.name || "No product available"}
                              style={{
                                width: "50px",
                                height: "auto",
                                backgroundColor: "grey",
                              }}
                              className="responsive rounded"
                            />
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
                })}
                <tr>
                  <td data-label="Total" className="total-results bg-warning">
                    <strong>Total</strong>
                  </td>
                  <td
                    data-label="Total Room Btu"
                    className="total-results bg-warning"
                  >
                    <strong>{totalBTU}</strong>
                  </td>
                  <td
                    data-label="Total Optimal Products"
                    className="total-results bg-warning"
                  >
                    <strong>
                      {optimalProductCount || "No optimal product available"}
                    </strong>
                  </td>
                  <td
                    data-label="Total Product BTU"
                    className="total-results bg-warning"
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
                    className="total-results bg-warning"
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
              </tbody>
            </Table>
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Button
              variant="primary"
              onClick={saveResultsToCart}
              className="mt-2 mb-4"
            >
              Save to Cart
            </Button>
          </div>
          {showCondenser && (
            <tr className="text-center">
              <td colSpan="5" className="text-center bg-info ">
                <strong>
                  <strong>
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
