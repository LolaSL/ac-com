import React, { useContext, useEffect, useCallback, useState } from "react";
import { Store } from "../Store";
import { Card, Table, Button, Modal } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaPrint, FaShoppingCart, FaStar, FaShareAlt } from "react-icons/fa";
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
  const [showShareModal, setShowShareModal] = useState(false);

  // Extract BTU/ROI project data (must be before handlePrint)
  const btuProject =
    state?.roiData?.currentCalculation?.btuProjectData ||
    state?.btuData?.currentProject ||
    null;

  const perRoomResults =
    Array.isArray(btuProject?.rooms) && btuProject.rooms.length > 0
      ? btuProject.rooms
      : null;

  // Show all rows including condensers — they are only added to btuData.rooms when warranted
  const visibleRoomResults = perRoomResults;

  // Component-level mode flags (used in both JSX and the print callback)
  const isBoth = btuProject?.systemMode === 'heatpump' || btuProject?.systemMode === 'recovery';

  const handlePrint = useCallback(() => {
    if (!visibleRoomResults || visibleRoomResults.length === 0) {
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

    // Build room rows — exclude condenser rows to avoid double-counting
    const nonCondenserRows = visibleRoomResults.filter(r => !r.product?.isCondenser);
    const roomBtuLabel = isBoth
      ? 'Room Load (Cool / Heat BTU)'
      : 'Room BTU';
    const roomRowsHtml = nonCondenserRows.map((room, i) => {
      const product = room.product || {};
      const productPrice = product.price
        ? product.discount
          ? (product.price - (product.price * product.discount) / 100).toFixed(2)
          : product.price.toFixed(2)
        : '—';
      const roomBtuCell = isBoth && (room.coolBtu != null || room.heatBtu != null)
        ? `${(room.coolBtu || 0).toLocaleString()} / ${(room.heatBtu || 0).toLocaleString()}`
        : (room.btu?.toLocaleString() || '—');

      return `
        <tr>
          <td>${room.name || `Room ${i + 1}`}</td>
          <td>${roomBtuCell}</td>
          <td>${product.name || product.model || '—'}</td>
          <td>${product.model || 'N/A'}</td>
          <td>${(product.coolingBtu || product.btu)?.toLocaleString() || '—'}${product.heatingBtu && isBoth ? ` (Heat: ${product.heatingBtu.toLocaleString()})` : ''}</td>
          <td>$${productPrice}</td>
        </tr>
      `;
    }).join('');

    // Calculate totals
    const totalBTU = nonCondenserRows.reduce((sum, room) => sum + (room.btu || 0), 0);
    const totalProductBTU = nonCondenserRows.reduce((sum, room) => sum + (room.product?.btu || 0), 0);
    const totalPrice = nonCondenserRows.reduce((sum, room) => {
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
          <p>
            <strong>System Mode:</strong> ${
              btuProject?.systemMode === 'recovery'
                ? 'Cooling & Heat Recovery'
                : btuProject?.systemMode === 'heatpump'
                ? 'Cooling or Heating (heat pump)'
                : 'Cooling'
            } |
            <strong>Total Rooms:</strong> ${visibleRoomResults.length} |
            <strong>Total BTU:</strong> ${totalBTU.toLocaleString()} |
            <strong>Total Area:</strong> ${btuProject?.totalSquareFootage || 'N/A'} m²
          </p>
          ${
            isBoth
              ? `<p><strong>Cooling Load:</strong> ${(btuProject?.totalCoolingBTU || 0).toLocaleString()} BTU |
                    <strong>Heating Load:</strong> ${(btuProject?.totalHeatingBTU || 0).toLocaleString()} BTU
                    <span style="color:#666; font-size:0.85em"> (system sized on the larger of the two per room)</span></p>`
              : ''
          }
        </div>
        <table class="quote-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>${roomBtuLabel}</th>
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
              <td><strong>${nonCondenserRows.length}</strong></td>
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
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
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
          border-bottom: 2px solid #1a1a2e;
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
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
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
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
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
  }, [visibleRoomResults, isBoth, btuProject?.systemMode, btuProject?.totalSquareFootage, btuProject?.totalCoolingBTU, btuProject?.totalHeatingBTU]);

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

    if (!visibleRoomResults || visibleRoomResults.length === 0) {
      toast.error("No products available to add to cart. Please complete a BTU calculation first.");
      return;
    }

    // Check if product is a real (purchasable) product vs a placeholder
    const isRealProduct = (product) => {
      if (!product || !product._id) return false;
      if (String(product._id).startsWith('placeholder-')) return false;
      if (product.category === 'Placeholder') return false;
      if (product.price === null || product.price === undefined || product.price <= 0) return false;
      return true;
    };

    // Normalize product to include all cart-required fields
    const normalizeForCart = (product) => ({
      ...product,
      price: typeof product.price === 'number' ? product.price : 0,
      discount: typeof product.discount === 'number' ? product.discount : 0,
      countInStock: product.countInStock ?? 99,
      image: product.image || '/images/p1.jpg',
      slug: product.slug || product._id,
    });

    const addItemToCart = (product, quantity = 1) => {
      if (!isRealProduct(product)) return;

      const normalized = normalizeForCart(product);
      const existItem = state.cart.cartItems.find((x) => x._id === normalized._id);
      const newQuantity = existItem ? existItem.quantity + quantity : quantity;

      ctxDispatch({
        type: "CART_ADD_ITEM",
        payload: { ...normalized, quantity: newQuantity },
      });
    };

    // Group products by _id to avoid duplicates
    const productCount = {};
    visibleRoomResults.forEach((room) => {
      const product = room.product;
      if (!isRealProduct(product) || product.isCondenser) return;

      const key = product._id;
      if (!productCount[key]) {
        productCount[key] = { product, quantity: 0 };
      }
      productCount[key].quantity += 1;
    });

    // Add indoor units to cart
    let addedCount = 0;
    Object.values(productCount).forEach(({ product, quantity }) => {
      addItemToCart(product, quantity);
      addedCount++;
    });

    // Add condensers to cart (only if user annotated one)
    const condensers = visibleRoomResults.filter(room => room.product?.isCondenser);
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
        addedCount++;
      }
    });

    if (addedCount === 0) {
      toast.warn("No purchasable products found. Products may not be available in the store yet.");
      return;
    }

    toast.success(`${addedCount} product(s) added to cart!`);
    navigate("/cart");
  };

  // Handler: Calculate ROI
  // const handleCalculateROI = (e) => {
  //   if (e) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }

  //   if (!btuProject) {
  //     toast.error("No BTU data available. Please complete a BTU calculation first.");
  //     return;
  //   }

  //   // BTU project already contains all necessary data
  //   ctxDispatch({
  //     type: "BTU_SET_CURRENT_PROJECT",
  //     payload: btuProject,
  //   });

  //   toast.success("Navigating to ROI Calculator...");
  //   // Pass BTU data in navigation state so ROI calculator can capture it
  //   navigate("/roi-calculator", {
  //     state: { btuData: btuProject, fromBTU: true }
  //   });
  // };

  // Handler: Do Both (Save to Cart + Navigate to ROI)
  // const handleDoBoth = (e) => {
  //   if (e) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }

  //   if (!perRoomResults || perRoomResults.length === 0) {
  //     toast.error("No products available. Please complete a BTU calculation first.");
  //     return;
  //   }

  //   // Check if product is a real (purchasable) product vs a placeholder
  //   const isRealProduct = (product) => {
  //     if (!product || !product._id) return false;
  //     if (String(product._id).startsWith('placeholder-')) return false;
  //     if (product.category === 'Placeholder') return false;
  //     if (product.price === null || product.price === undefined || product.price <= 0) return false;
  //     return true;
  //   };

  //   // Normalize product to include all cart-required fields
  //   const normalizeForCart = (product) => ({
  //     ...product,
  //     price: typeof product.price === 'number' ? product.price : 0,
  //     discount: typeof product.discount === 'number' ? product.discount : 0,
  //     countInStock: product.countInStock ?? 99,
  //     image: product.image || '/images/p1.jpg',
  //     slug: product.slug || product._id,
  //   });

  //   const addItemToCart = (product, quantity = 1) => {
  //     if (!isRealProduct(product)) return;

  //     const normalized = normalizeForCart(product);
  //     const existItem = state.cart.cartItems.find((x) => x._id === normalized._id);
  //     const newQuantity = existItem ? existItem.quantity + quantity : quantity;

  //     ctxDispatch({
  //       type: "CART_ADD_ITEM",
  //       payload: { ...normalized, quantity: newQuantity },
  //     });
  //   };

  //   // Group products by _id to avoid duplicates
  //   const productCount = {};
  //   perRoomResults.forEach((room) => {
  //     const product = room.product;
  //     if (!isRealProduct(product) || product.isCondenser) return;

  //     const key = product._id;
  //     if (!productCount[key]) {
  //       productCount[key] = { product, quantity: 0 };
  //     }
  //     productCount[key].quantity += 1;
  //   });

  //   // Add indoor units to cart
  //   let addedCount = 0;
  //   Object.values(productCount).forEach(({ product, quantity }) => {
  //     addItemToCart(product, quantity);
  //     addedCount++;
  //   });

  //   // Add condensers to cart
  //   const condensers = perRoomResults.filter(room => room.product?.isCondenser);
  //   condensers.forEach((room) => {
  //     const condenser = room.product;
  //     if (condenser && condenser._id) {
  //       // Make unique per flat if flatName exists
  //       const uniqueCond = condenser.flatName
  //         ? {
  //             ...condenser,
  //             _id: `${condenser._id}_${condenser.flatName.replace(/\s+/g, '_')}`,
  //             name: `${condenser.flatName}: ${condenser.name}`,
  //           }
  //         : condenser;
  //       addItemToCart(uniqueCond, 1);
  //       addedCount++;
  //     }
  //   });

  //   if (addedCount > 0) {
  //     toast.success(`${addedCount} product(s) added to cart! Navigating to ROI Calculator...`);
  //   } else {
  //     toast.info("No purchasable products to add. Navigating to ROI Calculator...");
  //   }

  //   // Save BTU data to store
  //   ctxDispatch({
  //     type: "BTU_SET_CURRENT_PROJECT",
  //     payload: btuProject,
  //   });

  //   // Pass BTU data in navigation state so ROI calculator can capture it
  //   navigate("/roi-calculator", {
  //     state: { btuData: btuProject, fromBTU: true }
  //   });
  // };

  const getSharePayload = useCallback(() => {
    const modeLabel =
      btuProject?.systemMode === 'recovery' ? 'Cooling & Heat Recovery' :
      btuProject?.systemMode === 'heatpump' ? 'Cooling or Heating (heat pump)' :
      'Cooling';
    const summary = visibleRoomResults
      ? `${modeLabel} system: ${visibleRoomResults.length} units, ${btuProject?.totalBTU?.toLocaleString() || "-"} BTU total`
      : "AC Unit Recommendations";

    return {
      title: "AC Commerce - System Recommendations",
      text: summary,
      url: window.location.href,
    };
  }, [visibleRoomResults, btuProject]);

  const copyToClipboard = useCallback(async (value) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
  }, []);

  const handleShare = async () => {
    const payload = getSharePayload();

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch {
      // no-op, fallback modal opens below
    }

    setShowShareModal(true);
  };

  const handleShareOption = async (type) => {
    const payload = getSharePayload();
    const encodedUrl = encodeURIComponent(payload.url);
    const encodedText = encodeURIComponent(`${payload.title}\n${payload.text}\n${payload.url}`);

    if (type === "copy") {
      const copied = await copyToClipboard(payload.url);
      if (copied) {
        toast.success("Link copied to clipboard!");
      } else {
        toast.error("Could not copy link.");
      }
      setShowShareModal(false);
      return;
    }

    if (type === "whatsapp") {
      window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer");
    }

    if (type === "telegram") {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(payload.text)}`, "_blank", "noopener,noreferrer");
    }

    if (type === "email") {
      window.open(`mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodedText}`, "_self");
    }

    setShowShareModal(false);
  };

  return (
    <div className="recommendations-page-container">
      {/* Page Header */}
      <div className="recommendations-header">
        <div className="rec-hero__inner">
          <div className="rec-hero__icon"><FaStar /></div>
          <h1 className="rec-hero__title">HVAC System Quote</h1>
          <p className="rec-hero__sub">Complete installation guide with quote, product recommendations and required accessories</p>
        </div>
      </div>

      <div className="rec-inner">

        {/* No data — guide user to run a calculation first */}
        {!btuProject && (
          <div style={{
            textAlign: 'center', padding: '3rem 1rem', background: '#f8f9fa',
            borderRadius: '12px', border: '1px solid #dee2e6', margin: '2rem 0',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🧮</div>
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No calculation results yet</h4>
            <p style={{ color: '#6c757d', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Upload a floor plan, annotate your rooms, and run a BTU calculation to see your personalised AC system recommendations here.
            </p>
            <Button variant="primary" onClick={() => navigate('/measurement')}>
              ← Go to Measurement Tool
            </Button>
          </div>
        )}
        {/* Print-only metadata */}
        {btuProject && (
        <>
        <div className="print-only-info" style={{ display: 'none' }}>
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

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div />
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary"
              onClick={() => navigate('/measurement')}
              className="rec-action-btn"
            >
              <span className="button-text-long">← Back to Measurement</span>
              <span className="button-text-short">← Back</span>
            </Button>
            <Button 
              variant="primary"
              onClick={handlePrint}
              className="rec-action-btn rec-action-btn--print"
              title="Print recommendations"
            >
              <FaPrint /> <span>Print</span>
            </Button>
          </div>
        </div>

      {/* ============================
          DETECTED SYSTEMS
      ============================= */}
      <DetectedSystems 
        btuProject={btuProject}
        perRoomResults={visibleRoomResults}
        recommendedUnits={recommendedUnits}
      />

      {/* ============================
          CALCULATED RECOMMENDATIONS
      ============================= */}
      <Card className="recommendations-card">
        <Card.Body>
          <Card.Title className="card-title">
            {btuProject?.systemMode === 'recovery'
              ? '❄️🔥 Heat-Recovery System Recommendations (Cooling & Heat Recovery)'
              : '❄️🔥 Heat-Pump Recommendations (Cooling or Heating)'}
          </Card.Title>

          {/* System-mode summary banner */}
          {btuProject?.systemMode && (
            <div
              style={{
                background: btuProject.systemMode === 'recovery'
                  ? 'rgba(102, 126, 234, 0.08)'
                  : 'rgba(52, 152, 219, 0.08)',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '10px',
                fontSize: '0.85rem',
                color: '#1a1a2e',
              }}
            >
              <strong>System Mode:</strong>{' '}
              {btuProject.systemMode === 'recovery'
                ? 'Cooling & Heat Recovery'
                : 'Cooling or Heating (heat pump)'}
              {isBoth && (
                <>
                  {' · '}<strong>Cool load:</strong>{' '}
                  {(btuProject.totalCoolingBTU || 0).toLocaleString()} BTU
                  {' · '}<strong>Heat load:</strong>{' '}
                  <span style={{ color: '#c0392b' }}>
                    {(btuProject.totalHeatingBTU || 0).toLocaleString()} BTU
                  </span>
                  {' '}<span style={{ color: '#666' }}>
                    (each room sized on the larger of the two)
                  </span>
                </>
              )}
            </div>
          )}

          {/* --- Per-room results table --- */}
          {visibleRoomResults ? (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6', background: 'rgba(102, 126, 234, 0.1)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>Room</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>Size</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>
                    {isBoth ? 'Room Load (Cool / Heat BTU)' : 'Room BTU'}
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>Optimal Product</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>Product BTU</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>Price ($)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>Model</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#1a1a2e', fontWeight: '700' }}>View</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Number duplicate room names (e.g., Bedroom → Bedroom 1, Bedroom 2)
                  const nameCounts = {};
                  visibleRoomResults.forEach(r => {
                    const n = r.name || 'Room';
                    nameCounts[n] = (nameCounts[n] || 0) + 1;
                  });
                  const nameIndex = {};
                  return visibleRoomResults.map((room, idx) => {
                    const product = room.product || room;
                    const baseName = room.name || `Room ${idx + 1}`;
                    let displayName = baseName;
                    if (nameCounts[baseName] > 1) {
                      nameIndex[baseName] = (nameIndex[baseName] || 0) + 1;
                      displayName = `${baseName} ${nameIndex[baseName]}`;
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '5px 8px' }}>{displayName}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>{room.size}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                          {isBoth && (room.coolBtu != null || room.heatBtu != null) ? (
                            <>
                              {(room.coolBtu || 0).toLocaleString()}
                              {' / '}
                              <span style={{ color: '#c0392b' }}>
                                {(room.heatBtu || 0).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            room.btu?.toLocaleString?.() ?? room.btu
                          )}
                        </td>
                        <td style={{ padding: '5px 8px' }}>
                          <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getName(product)}>{getName(product)}</div>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                          {(product.coolingBtu || product.btu) || "—"}
                          {product.heatingBtu && isBoth ? (
                            <div style={{ fontSize: '0.75em', color: '#888' }}>
                              Heat: {product.heatingBtu.toLocaleString()}
                            </div>
                          ) : null}
                        </td>
                        <td
                          style={{
                            padding: '5px 8px',
                            textAlign: 'right',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            color: '#1a1a2e',
                            WebkitTextFillColor: '#1a1a2e',
                          }}
                          data-apple-data-detectors="false"
                        >
                          <span style={{ color: '#1a1a2e', WebkitTextFillColor: '#1a1a2e' }}>
                            {getPrice(product)}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px' }}>{product.model || product.name || "—"}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          {product.slug ? (
                            <Link
                              to={`/product/${product.slug}`}
                              style={{ fontSize: '1.2rem', color: '#0d6efd' }}
                              title="View product details"
                            >
                              <FaEye />
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  });
                  })()}
              </tbody>
            </table>
            </div>
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
                    <td
                      style={{ whiteSpace: 'nowrap', color: '#1a1a2e', WebkitTextFillColor: '#1a1a2e' }}
                      data-apple-data-detectors="false"
                    >
                      <span style={{ color: '#1a1a2e', WebkitTextFillColor: '#1a1a2e' }}>
                        {getPrice(unit)}
                      </span>
                    </td>
                    <td>{unit.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {/* ============================
              SYSTEM SUMMARY
          ============================= */}
          {visibleRoomResults && visibleRoomResults.length > 0 && (
            <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              <SystemSummary 
                btuProject={btuProject} 
                perRoomResults={visibleRoomResults} 
                recommendedUnits={recommendedUnits} 
              />
            </div>
          )}

          {/* Action Buttons */}
          {visibleRoomResults && visibleRoomResults.length > 0 && (
            <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mt-4 rec-mobile-inline-actions">
              <Button
                onClick={handleSaveToCart}
                variant="info"
                className=" w-auto py-2"
                style={{
                  fontWeight: '600',
                  padding: '0.7rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'white'
                }}
              >
                <FaShoppingCart size={18} />
                <span>Save to Cart</span>
              </Button>

              {/* <Button
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
              </Button> */}

              <Button
                onClick={handleShare}
                variant="outline-secondary"
                className=" w-auto py-2"
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
                <FaShareAlt size={16} />
                <span>Share</span>
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ============================
          COMMON AC PARTS
      ============================= */}
      <InstallationAccessories 
        perRoomResults={visibleRoomResults}
        recommendedUnits={recommendedUnits}
      />

      <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Share Recommendations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-grid gap-2">
            <Button variant="success" onClick={() => handleShareOption("whatsapp")}>Share via WhatsApp</Button>
            <Button variant="info" onClick={() => handleShareOption("telegram")}>Share via Telegram</Button>
            <Button variant="secondary" onClick={() => handleShareOption("email")}>Share via Email</Button>
            <Button variant="outline-primary" onClick={() => handleShareOption("copy")}>Copy Link</Button>
          </div>
        </Modal.Body>
      </Modal>

        </>) } {/* End btuProject && */}

      </div>{/* End rec-inner */}
    </div>
  );
}