import React, { useContext, useEffect, useCallback } from "react";
import { Store } from "../Store";
import { Card, Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaEye, FaPrint, FaShoppingCart } from "react-icons/fa";
import printJS from "print-js";
import { toast } from "react-toastify";
import "./Recommendations.css";
import SystemSummary from "./shared/SystemSummary";
import DetectedSystems from "./shared/DetectedSystems";
import InstallationAccessories from "./shared/InstallationAccessories";
import { getName, getPrice } from "./shared/productHelpers";

export default function Recommendations() {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const navigate = useNavigate();

  // Extract BTU/ROI project data (must be before handlePrint)
  const btuProject =
    state?.roiData?.currentCalculation?.btuProjectData ||
    state?.btuData?.currentProject ||
    null;

  console.log('Recommendations - Full state:', state);
  console.log('Recommendations - state.btuData:', state?.btuData);
  console.log('Recommendations - state.btuData.currentProject:', state?.btuData?.currentProject);
  console.log('Recommendations - btuProject:', btuProject);

  const perRoomResults =
    Array.isArray(btuProject?.rooms) && btuProject.rooms.length > 0
      ? btuProject.rooms
      : null;

  console.log('Recommendations - perRoomResults:', perRoomResults);

  const handlePrint = useCallback(() => {
    if (!perRoomResults || perRoomResults.length === 0) {
      alert("No recommendation data available to print. Please complete a BTU calculation first.");
      return;
    }

    const printDate = new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Build room rows
    const roomRowsHtml = perRoomResults.map((room, i) => {
      const product = room.product || {};
      const productPrice = product.price
        ? product.discount
          ? (product.price - (product.price * product.discount) / 100).toFixed(2)
          : product.price.toFixed(2)
        : '—';
      
      return `
        <tr>
          <td>${room.name || `Room ${i + 1}`}</td>
          <td>${room.btu?.toLocaleString() || '—'}</td>
          <td>${product.name || product.model || '—'}</td>
          <td>${product.model || 'N/A'}</td>
          <td>${product.btu?.toLocaleString() || '—'}</td>
          <td>$${productPrice}</td>
        </tr>
      `;
    }).join('');

    // Calculate totals
    const totalBTU = perRoomResults.reduce((sum, room) => sum + (room.btu || 0), 0);
    const totalProductBTU = perRoomResults.reduce((sum, room) => sum + (room.product?.btu || 0), 0);
    const totalPrice = perRoomResults.reduce((sum, room) => {
      const product = room.product || {};
      if (product.price) {
        const price = product.discount
          ? product.price - (product.price * product.discount) / 100
          : product.price;
        return sum + price;
      }
      return sum;
    }, 0);

    const tableHtml = `
      <div class="print-container">
        <h1>HVAC System Quote</h1>
        <div class="print-meta">
          <p><strong>Generated:</strong> ${printDate}</p>
          <p><strong>Total Rooms:</strong> ${perRoomResults.length} | <strong>Total BTU:</strong> ${totalBTU.toLocaleString()} | <strong>Total Area:</strong> ${btuProject?.totalSquareFootage || 'N/A'} m²</p>
        </div>
        <table class="quote-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Room BTU</th>
              <th>Optimal Product</th>
              <th>Model</th>
              <th>Product BTU</th>
              <th>Product Price ($)</th>
            </tr>
          </thead>
          <tbody>
            ${roomRowsHtml}
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>${totalBTU.toLocaleString()}</strong></td>
              <td><strong>${perRoomResults.length}</strong></td>
              <td><strong>—</strong></td>
              <td><strong>${totalProductBTU.toLocaleString()}</strong></td>
              <td><strong>$${totalPrice.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="print-footer">
          <p>AC Commerce - Professional HVAC Solutions | www.accommerce.com</p>
        </div>
      </div>
    `;

    printJS({
      printable: tableHtml,
      type: "raw-html",
      header: null,
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          text-align: center;
          padding: 1.4rem 1rem;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0;
          border-radius: 14px 14px 0 0;
        }
        .print-meta {
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          border-bottom: 2px solid #667eea;
        }
        .print-meta p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: #495057;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff !important;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .print-footer {
          text-align: center;
          padding: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: #6c757d;
        }
      `,
    });
  }, [perRoomResults, btuProject]);

  // Add keyboard shortcut support (Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint]);

  const recommendedUnits = Array.isArray(btuProject?.recommendedUnits)
    ? btuProject.recommendedUnits
    : [];

  // Handler: Save to Cart
  const handleSaveToCart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!perRoomResults || perRoomResults.length === 0) {
      toast.error("No products available to add to cart. Please complete a BTU calculation first.");
      return;
    }

    const addItemToCart = (product, quantity = 1) => {
      if (!product || !product._id) return;

      const existItem = state.cart.cartItems.find((x) => x._id === product._id);
      const newQuantity = existItem ? existItem.quantity + quantity : quantity;

      ctxDispatch({
        type: "CART_ADD_ITEM",
        payload: { ...product, quantity: newQuantity },
      });
    };

    // Group products by BTU to avoid duplicates
    const productCount = {};
    perRoomResults.forEach((room) => {
      const product = room.product;
      if (!product || !product._id || product.isCondenser) return;

      const key = product._id;
      if (!productCount[key]) {
        productCount[key] = { product, quantity: 0 };
      }
      productCount[key].quantity += 1;
    });

    // Add indoor units to cart
    Object.values(productCount).forEach(({ product, quantity }) => {
      addItemToCart(product, quantity);
    });

    // Add condensers to cart
    const condensers = perRoomResults.filter(room => room.product?.isCondenser);
    condensers.forEach((room) => {
      const condenser = room.product;
      if (condenser && condenser._id) {
        // Make unique per flat if flatName exists
        const uniqueCond = condenser.flatName
          ? {
              ...condenser,
              _id: `${condenser._id}_${condenser.flatName.replace(/\s+/g, '_')}`,
              name: `${condenser.flatName}: ${condenser.name}`,
            }
          : condenser;
        addItemToCart(uniqueCond, 1);
      }
    });

    toast.success("Products added to cart successfully!");
    navigate("/cart");
  };

  // Handler: Calculate ROI
  const handleCalculateROI = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!btuProject) {
      toast.error("No BTU data available. Please complete a BTU calculation first.");
      return;
    }

    // BTU project already contains all necessary data
    ctxDispatch({
      type: "BTU_SET_CURRENT_PROJECT",
      payload: btuProject,
    });

    toast.success("Navigating to ROI Calculator...");
    // Pass BTU data in navigation state so ROI calculator can capture it
    navigate("/roi-calculator", {
      state: { btuData: btuProject, fromBTU: true }
    });
  };

  // Handler: Do Both (Save to Cart + Navigate to ROI)
  const handleDoBoth = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!perRoomResults || perRoomResults.length === 0) {
      toast.error("No products available. Please complete a BTU calculation first.");
      return;
    }

    const addItemToCart = (product, quantity = 1) => {
      if (!product || !product._id) return;

      const existItem = state.cart.cartItems.find((x) => x._id === product._id);
      const newQuantity = existItem ? existItem.quantity + quantity : quantity;

      ctxDispatch({
        type: "CART_ADD_ITEM",
        payload: { ...product, quantity: newQuantity },
      });
    };

    // Group products by BTU to avoid duplicates
    const productCount = {};
    perRoomResults.forEach((room) => {
      const product = room.product;
      if (!product || !product._id || product.isCondenser) return;

      const key = product._id;
      if (!productCount[key]) {
        productCount[key] = { product, quantity: 0 };
      }
      productCount[key].quantity += 1;
    });

    // Add indoor units to cart
    Object.values(productCount).forEach(({ product, quantity }) => {
      addItemToCart(product, quantity);
    });

    // Add condensers to cart
    const condensers = perRoomResults.filter(room => room.product?.isCondenser);
    condensers.forEach((room) => {
      const condenser = room.product;
      if (condenser && condenser._id) {
        // Make unique per flat if flatName exists
        const uniqueCond = condenser.flatName
          ? {
              ...condenser,
              _id: `${condenser._id}_${condenser.flatName.replace(/\s+/g, '_')}`,
              name: `${condenser.flatName}: ${condenser.name}`,
            }
          : condenser;
        addItemToCart(uniqueCond, 1);
      }
    });

    toast.success("Products added to cart! Navigating to ROI Calculator...");

    // Save BTU data to store
    ctxDispatch({
      type: "BTU_SET_CURRENT_PROJECT",
      payload: btuProject,
    });

    // Pass BTU data in navigation state so ROI calculator can capture it
    navigate("/roi-calculator", {
      state: { btuData: btuProject, fromBTU: true }
    });
  };

  return (
    <div className="recommendations-page-container">
      {/* Page Header */}
      <div className="recommendations-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1 style={{ 
              fontSize: '2.25rem', 
              fontWeight: '700', 
              marginBottom: '0.5rem',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              🎯 HVAC System Quote
            </h1>
            <p style={{ 
              fontSize: '1.1rem', 
              marginBottom: '0',
              opacity: 0.95
            }}>
              Complete installation guide with quote, product recommendations and required accessories
            </p>
            {/* Print-only metadata */}
            <div className="print-only-info">
              <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
                <strong>Generated:</strong> {new Date().toLocaleString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: '0.25rem 0 0 0' }}>
                AC Commerce - Professional HVAC Solutions | www.accommerce.com
              </p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button 
              variant="light" 
              onClick={() => navigate('/measurement')}
              style={{
                fontWeight: '600',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px'
              }}
            >
              ← Back to Measurement
            </Button>
            <Button 
              variant="light" 
              onClick={handlePrint}
              style={{
                fontWeight: '600',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              title="Print recommendations"
            >
              <FaPrint /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* ============================
          DETECTED SYSTEMS
      ============================= */}
      <DetectedSystems 
        btuProject={btuProject}
        perRoomResults={perRoomResults}
        recommendedUnits={recommendedUnits}
      />

      {/* ============================
          CALCULATED RECOMMENDATIONS
      ============================= */}
      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">
            ❄️ AC Unit Recommendations (Calculated)
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
                  <th>Product Model</th>
                  <th>View</th>
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
                      <td>{product.model || product.name || "—"}</td>
                      <td style={{ textAlign: 'center' }}>
                        {product.slug ? (
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '1.2rem', color: '#0d6efd' }}
                            title="View product details"
                          >
                            <FaEye />
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
              <strong>No recommendations available</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Please complete a BTU or ROI calculation first.
              </p>
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

          {/* ============================
              SYSTEM SUMMARY
          ============================= */}
          {perRoomResults && perRoomResults.length > 0 && (
            <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              <SystemSummary 
                btuProject={btuProject} 
                perRoomResults={perRoomResults} 
                recommendedUnits={recommendedUnits} 
              />
            </div>
          )}

          {/* Action Buttons */}
          {perRoomResults && perRoomResults.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mt-4">
              <Button
                onClick={handleSaveToCart}
                variant="info"
                className="w-75 w-md-auto py-2"
                style={{
                  fontWeight: '600',
                  padding: '0.7rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <FaShoppingCart size={18} />
                <span>Save to Cart</span>
              </Button>

              <Button
                onClick={handleCalculateROI}
                variant="primary"
                className="w-75 w-md-auto py-2"
                style={{
                  fontWeight: '600',
                  padding: '0.7rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span>Calculate ROI for this Project</span>
              </Button>

              <Button
                onClick={handleDoBoth}
                variant="success"
                className="w-75 w-md-auto py-2"
                style={{
                  fontWeight: '600',
                  padding: '0.7rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Do Both</span>
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ============================
          COMMON AC PARTS
      ============================= */}
      <InstallationAccessories 
        perRoomResults={perRoomResults}
        recommendedUnits={recommendedUnits}
      />


      </div>
  );
}