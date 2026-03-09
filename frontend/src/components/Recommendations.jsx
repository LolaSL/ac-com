import React, { useContext } from "react";
import { Store } from "../Store";
import { Card, Table } from "react-bootstrap";
import "./Recommendations.css";
import { COMMON_AC_RECOMMENDATIONS } from "./acRecommendationData.js";

export default function Recommendations() {
  const { state } = useContext(Store);

  // Extract BTU/ROI project data
  const btuProject =
    state?.roiData?.currentCalculation?.btuProjectData ||
    state?.btuData?.currentProject ||
    null;

  const perRoomResults =
    Array.isArray(btuProject?.rooms) && btuProject.rooms.length > 0
      ? btuProject.rooms
      : null;

  const recommendedUnits = Array.isArray(btuProject?.recommendedUnits)
    ? btuProject.recommendedUnits
    : [];

  // Helper: safely extract name
  const getName = (obj) =>
    obj?.name ||
    obj?.model ||
    obj?.productName ||
    obj?.type ||
    "—";

  // Helper: safely extract price
  const getPrice = (obj) => {
    const price =
      obj?.price ??
      obj?.cost ??
      obj?.minPrice ??
      obj?.maxPrice ??
      obj?.estimatedCost;

    if (price === undefined || price === null) return "—";

    const num = Number(price);
    if (isNaN(num)) return "—";

    return `$${num.toLocaleString()}`;
  };

  return (
    <div>
      {/* ============================
          CALCULATED RECOMMENDATIONS
      ============================= */}
      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">
            AC Unit Recommendations (Calculated)
          </Card.Title>

          {/* --- Per-room results table --- */}
          {perRoomResults ? (
            <Table
              className="recommendations-table"
              striped
              bordered
              hover
              responsive
            >
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Room Size</th>
                  <th>Room BTU</th>
                  <th>Optimal Product</th>
                  <th>Product BTU</th>
                  <th>Product Price ($)</th>
                  <th>Product Slug</th>
                  <th>Product Link</th>
                </tr>
              </thead>
              <tbody>
                {perRoomResults.map((room, idx) => {
                  // fallback: if room.product doesn't exist, use room itself
                  const product = room.product || room;

                  return (
                    <tr key={idx}>
                      <td>{room.name || `Room ${idx + 1}`}</td>
                      <td>{room.size}</td>
                      <td>{room.btu}</td>
                      <td>{getName(product)}</td>
                      <td>{product.btu || "—"}</td>
                      <td>{getPrice(product)}</td>
                      <td>{product.slug || "—"}</td>
                      <td>
                        {product.slug ? (
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : recommendedUnits.length === 0 ? (
            <div className="recommendations-empty">
              No recommendations available. Please complete a BTU or ROI
              calculation first.
            </div>
          ) : (
            /* --- Recommended units table --- */
            <Table
              className="recommendations-table"
              striped
              bordered
              hover
              responsive
            >
              <thead>
                <tr>
                  <th>Name</th>
                  <th>BTU</th>
                  <th>Price</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {recommendedUnits.map((unit, idx) => (
                  <tr key={idx}>
                    <td>{getName(unit)}</td>
                    <td>{unit.btu || "—"}</td>
                    <td>{getPrice(unit)}</td>
                    <td>{unit.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ============================
          COMMON AC PARTS
      ============================= */}
      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">
            Common AC Installations & Spare Parts
          </Card.Title>

          <Table
            className="recommendations-table"
            striped
            bordered
            hover
            responsive
          >
            <thead>
              <tr>
                <th>Category</th>
                <th>Name</th>
                <th>Description</th>
                <th>Typical Use</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_AC_RECOMMENDATIONS.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.category}</td>
                  <td>{item.name}</td>
                  <td>{item.description}</td>
                  <td>{item.typicalUse}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}