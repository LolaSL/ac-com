
import React, { useContext } from "react";
import { Store } from "../Store";
import { Card, Table } from "react-bootstrap";
import "./Recommendations.css";
import { COMMON_AC_RECOMMENDATIONS } from "./acRecommendationData.js";
import "./Recommendations.css";

export default function Recommendations() {
  const { state } = useContext(Store);
  // Try to get recommended units from ROI or BTU data

  // Prefer per-room BTU results if available
  const btuProject = state?.roiData?.currentCalculation?.btuProjectData || state?.btuData?.currentProject;
  const perRoomResults = btuProject?.rooms && btuProject?.rooms.length > 0 ? btuProject.rooms : null;
  const recommendedUnits = btuProject?.recommendedUnits || [];

  return (
    <div>

      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">AC Unit Recommendations (Calculated)</Card.Title>
          {perRoomResults ? (
            <Table className="recommendations-table" striped bordered hover responsive>
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
                  const product = room.product || {};
                  return (
                    <tr key={idx}>
                      <td>{room.name}</td>
                      <td>{room.size}</td>
                      <td>{room.btu}</td>
                      <td>{product.name || "No product available"}</td>
                      <td>{product.btu || "No product available"}</td>
                      <td>
                        {product.price
                          ? product.discount > 0
                            ? (product.price - (product.price * product.discount) / 100).toFixed(2)
                            : product.price.toFixed(2)
                          : "No price available"}
                      </td>
                      <td>{product.slug || "—"}</td>
                      <td>
                        {product.slug ? (
                          <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">View</a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : recommendedUnits.length === 0 ? (
            <div className="recommendations-empty">
              No recommendations available. Please complete a BTU or ROI calculation first.
            </div>
          ) : (
            <Table className="recommendations-table" striped bordered hover responsive>
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
                    <td>{unit.name || unit.type || "—"}</td>
                    <td>{unit.btu}</td>
                    <td>
                      {unit.price
                        ? `$${unit.price.toLocaleString()}`
                        : unit.estimatedCost
                        ? `$${unit.estimatedCost.toLocaleString()}`
                        : "—"}
                    </td>
                    <td>{unit.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">Common AC Installations & Spare Parts</Card.Title>
          <Table className="recommendations-table" striped bordered hover responsive>
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
