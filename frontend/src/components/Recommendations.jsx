import React, { useContext, useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
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
      alert(t("recommendations.toasts.printNoData"));
      return;
    }

    const printDate = new Date().toLocaleString(i18n.language, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Build room rows — include ALL rows (condensers too) so the printable
    // quote matches what the app shows. Totals still sum only non-condenser
    // room BTU / product BTU to avoid double-counting the outdoor unit.
    const nonCondenserRows = visibleRoomResults.filter(r => !r.product?.isCondenser);
    const roomBtuLabel = isBoth
      ? t("recommendations.table.roomLoadBoth")
      : t("recommendations.table.roomBtu");
    const roomRowsHtml = visibleRoomResults.map((room, i) => {
      const product = room.product || {};
      const isCondenserRow = !!product.isCondenser;
      const productPrice = product.price
        ? product.discount
          ? (product.price - (product.price * product.discount) / 100).toFixed(2)
          : product.price.toFixed(2)
        : '—';
      // Condenser rows don't have a room BTU — show em-dash for cool side and
      // the combined heat/system BTU (or the product's own BTU) when available.
      let roomBtuCell;
      if (isCondenserRow) {
        const heat = room.heatBtu || product.heatingBtu || product.btu;
        roomBtuCell = isBoth
          ? `— / ${(heat || 0).toLocaleString()}`
          : (heat ? heat.toLocaleString() : '—');
      } else {
        roomBtuCell = isBoth && (room.coolBtu != null || room.heatBtu != null)
          ? `${(room.coolBtu || 0).toLocaleString()} / ${(room.heatBtu || 0).toLocaleString()}`
          : (room.btu?.toLocaleString() || '—');
      }

      const rowLabel = isCondenserRow
        ? (room.name || t("recommendations.print.condenserDefault"))
        : (room.name || t("recommendations.print.roomDefault", { n: i + 1 }));

      return `
        <tr${isCondenserRow ? ' class="condenser-row"' : ''}>
          <td>${rowLabel}</td>
          <td>${roomBtuCell}</td>
          <td>${product.name || product.model || '—'}</td>
          <td>${product.model || 'N/A'}</td>
          <td>${(product.coolingBtu || product.btu)?.toLocaleString() || '—'}${product.heatingBtu && isBoth ? ` (${t("recommendations.table.heatPrefix")} ${product.heatingBtu.toLocaleString()})` : ''}</td>
          <td>$${productPrice}</td>
        </tr>
      `;
    }).join('');

    // Calculate totals — sum non-condenser room BTU (room load) and
    // non-condenser product BTU. Price total includes ALL products
    // (indoor + outdoor condenser) so the quote reflects real cost.
    const totalBTU = nonCondenserRows.reduce((sum, room) => sum + (room.btu || 0), 0);
    const totalProductBTU = nonCondenserRows.reduce((sum, room) => sum + (room.product?.btu || 0), 0);
    const totalPrice = visibleRoomResults.reduce((sum, room) => {
      const product = room.product || {};
      if (product.price) {
        const price = product.discount
          ? product.price - (product.price * product.discount) / 100
          : product.price;
        return sum + price;
      }
      return sum;
    }, 0);

    const systemModeLabel = btuProject?.systemMode === 'recovery'
      ? t("recommendations.systemMode.recovery")
      : btuProject?.systemMode === 'heatpump'
      ? t("recommendations.systemMode.heatpump")
      : t("recommendations.systemMode.cooling");

    const tableHtml = `
      <div class="print-container">
        <h1>${t("recommendations.hero.title")}</h1>
        <div class="print-meta">
          <p><strong>${t("recommendations.print.generated")}</strong> ${printDate}</p>
          <p>
            <strong>${t("recommendations.systemMode.label")}</strong> ${systemModeLabel} |
            <strong>${t("recommendations.print.totalRooms")}</strong> ${visibleRoomResults.length} |
            <strong>${t("recommendations.print.totalBtu")}</strong> ${totalBTU.toLocaleString()} |
            <strong>${t("recommendations.print.totalArea")}</strong> ${btuProject?.totalSquareFootage || t("recommendations.systemSummary.na")} m²
          </p>
          ${
            isBoth
              ? `<p><strong>${t("recommendations.print.coolingLoad")}</strong> ${(btuProject?.totalCoolingBTU || 0).toLocaleString()} BTU |
                    <strong>${t("recommendations.print.heatingLoad")}</strong> ${(btuProject?.totalHeatingBTU || 0).toLocaleString()} BTU
                    <span style="color:#666; font-size:0.85em"> ${t("recommendations.systemMode.sizedNote")}</span></p>`
              : ''
          }
        </div>
        <table class="quote-table">
          <colgroup>
            <col class="col-room" />
            <col class="col-roombtu" />
            <col class="col-product" />
            <col class="col-model" />
            <col class="col-pbtu" />
            <col class="col-price" />
          </colgroup>
          <thead>
            <tr>
              <th>${t("recommendations.table.room")}</th>
              <th>${roomBtuLabel}</th>
              <th>${t("recommendations.table.optimalProduct")}</th>
              <th>${t("recommendations.table.model")}</th>
              <th>${t("recommendations.table.productBtu")}</th>
              <th>${t("recommendations.print.productPrice")}</th>
            </tr>
          </thead>
          <tbody>
            ${roomRowsHtml}
            <tr class="total-row">
              <td><strong>${t("recommendations.print.total")}</strong></td>
              <td><strong>${totalBTU.toLocaleString()}</strong></td>
              <td><strong>${nonCondenserRows.length}</strong></td>
              <td><strong>—</strong></td>
              <td><strong>${totalProductBTU.toLocaleString()}</strong></td>
              <td><strong>$${totalPrice.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="print-footer">
          <p>${t("recommendations.print.footer")}</p>
        </div>
      </div>
    `;

    const printStyle = `
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: #f5f6fa; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
          background-color: #0f3460;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
          color: #fff !important;
          text-align: center;
          padding: 1.4rem 1rem;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0;
          border-radius: 14px 14px 0 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
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
          table-layout: fixed;
        }
        .quote-table col.col-room     { width: 16%; }
        .quote-table col.col-roombtu  { width: 15%; }
        .quote-table col.col-product  { width: 22%; }
        .quote-table col.col-model    { width: 15%; }
        .quote-table col.col-pbtu     { width: 16%; }
        .quote-table col.col-price    { width: 16%; }
        th {
          background-color: #0f3460;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
          color: #fff !important;
          padding: 12px 14px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: center;
          word-break: break-word;
          overflow-wrap: anywhere;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        td {
          padding: 10px 14px;
          text-align: center;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.88rem;
          color: #1f2937;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        tbody tr:hover {
          background: #eff6ff;
        }
        tbody tr.condenser-row {
          background: #eef4ff !important;
        }
        tbody tr.condenser-row td:first-child {
          font-style: italic;
          color: #0f3460;
        }
        .total-row td {
          background-color: #0f3460;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
          color: #fff !important;
          font-weight: 700;
          font-size: 0.9rem;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .total-row td strong { color: #fff !important; }
        .print-footer {
          text-align: center;
          padding: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: #6c757d;
        }
      `;

    // iOS (iPhone/iPad) — including Chrome iOS (CriOS) — has known issues
    // with print-js hidden-iframe raw-html printing (renders blank page).
    // Detect iOS/iPadOS and use a new-window fallback that we control end-to-end.
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as MacIntel with touch support
      (ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document);

    if (isIOS) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(t("recommendations.toasts.popupBlocked"));
        return;
      }
      const doc = printWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<!-- Force a wider layout viewport so the 6-column quote table lays out
     at desktop width on iOS. Without this, Chrome iOS lays it out at the
     phone's 428px width and the last two columns (Product BTU / Price)
     get clipped off the printed page. -->
<meta name="viewport" content="width=1024, initial-scale=1" />
<title>${t("recommendations.hero.title")}</title>
<style>${printStyle}
@page { size: A4 landscape; margin: 8mm; }
/* Screen-only "Back" bar so iOS users can return to the app after
   printing/saving the PDF — the new tab has no browser back history. */
.ios-print-topbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #0f3460;
  color: #fff;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.ios-print-topbar button {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  background: #fff;
  color: #0f3460;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(255,255,255,0.3);
}
.ios-print-topbar button:active { transform: scale(0.96); }
.ios-print-topbar .title { font-size: 14px; font-weight: 600; opacity: 0.95; }
@media print {
  html, body { width: 100%; background: #fff !important; }
  .ios-print-topbar { display: none !important; }
  .print-container { box-shadow: none !important; margin: 0 auto !important; max-width: 100% !important; border-radius: 0 !important; }
  .print-container > h1 { border-radius: 0 !important; padding: 0.9rem !important; font-size: 1.15rem !important; }
  .print-meta { padding: 0.5rem 0.75rem !important; }
  .print-meta p { font-size: 0.72rem !important; }
  .quote-table { width: 100% !important; margin: 0.5rem 0 0 !important; box-shadow: none !important; border-radius: 0 !important; page-break-inside: auto; }
  .quote-table th { padding: 6px 4px !important; font-size: 0.62rem !important; letter-spacing: 0.02em !important; }
  .quote-table td { padding: 5px 4px !important; font-size: 0.66rem !important; }
  .total-row td { font-size: 0.7rem !important; }
  .print-footer { font-size: 0.65rem !important; padding: 0.5rem !important; }
  tr { page-break-inside: avoid; }
}
</style>
</head>
<body>
<div class="ios-print-topbar" role="toolbar" aria-label="Print controls">
  <button type="button" id="ios-print-back" aria-label="${t("recommendations.print.backToApp")}">&larr; ${t("recommendations.print.backToApp")}</button>
  <span class="title">${t("recommendations.hero.title")}</span>
  <button type="button" id="ios-print-again" style="margin-left:auto;">${t("recommendations.print.printAgain")}</button>
</div>
${tableHtml}
<script>
  (function () {
    var closeTab = function () {
      try { window.close(); } catch (e) {}
      // Fallback: if the tab can't be closed programmatically on iOS Chrome,
      // send the user back in history or to the app root.
      setTimeout(function () {
        if (!window.closed) {
          try { window.history.back(); } catch (e) {}
          setTimeout(function () {
            if (!window.closed) {
              window.location.replace(${JSON.stringify(window.location.origin + '/')});
            }
          }, 150);
        }
      }, 120);
    };
    var backBtn = document.getElementById('ios-print-back');
    if (backBtn) backBtn.addEventListener('click', closeTab);
    var againBtn = document.getElementById('ios-print-again');
    if (againBtn) againBtn.addEventListener('click', function () { window.print(); });
  })();
<\/script>
</body>
</html>`);
      doc.close();

      const triggerPrint = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (_) { /* noop */ }
      };
      // Wait for full load (images/fonts) before printing on iOS WebKit
      if (printWindow.document.readyState === 'complete') {
        setTimeout(triggerPrint, 400);
      } else {
        printWindow.addEventListener('load', () => setTimeout(triggerPrint, 400));
      }
      return;
    }

    printJS({
      printable: tableHtml,
      type: "raw-html",
      header: null,
      style: printStyle,
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
      toast.error(t("recommendations.toasts.noCartData"));
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
      toast.warn(t("recommendations.toasts.noPurchasable"));
      return;
    }

    toast.success(t("recommendations.toasts.addedToCart", { count: addedCount }));
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
      btuProject?.systemMode === 'recovery' ? t("recommendations.systemMode.recovery") :
      btuProject?.systemMode === 'heatpump' ? t("recommendations.systemMode.heatpump") :
      t("recommendations.systemMode.cooling");
    const summary = visibleRoomResults
      ? t("recommendations.share.summary", {
          modeLabel,
          count: visibleRoomResults.length,
          btu: btuProject?.totalBTU?.toLocaleString() || "-",
        })
      : t("recommendations.share.fallbackSummary");

    return {
      title: t("recommendations.share.pageTitle"),
      text: summary,
      url: window.location.href,
    };
  }, [visibleRoomResults, btuProject, t]);

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
        toast.success(t("recommendations.toasts.linkCopied"));
      } else {
        toast.error(t("recommendations.toasts.copyFailed"));
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
          <h1 className="rec-hero__title">{t("recommendations.hero.title")}</h1>
          <p className="rec-hero__sub">{t("recommendations.hero.subtitle")}</p>
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
            <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{t("recommendations.noData.title")}</h4>
            <p style={{ color: '#6c757d', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {t("recommendations.noData.description")}
            </p>
            <Button variant="primary" onClick={() => navigate('/measurement')}>
              {t("recommendations.noData.button")}
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
            AC-Commerce - Professional HVAC Solutions 
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
              <span className="button-text-long">{t("recommendations.actions.backLong")}</span>
              <span className="button-text-short">{t("recommendations.actions.backShort")}</span>
            </Button>
            <Button 
              variant="primary"
              onClick={handlePrint}
              className="rec-action-btn rec-action-btn--print"
              title={t("recommendations.actions.printTitle")}
            >
              <FaPrint /> <span>{t("recommendations.actions.print")}</span>
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
              ? t("recommendations.cardTitle.recovery")
              : t("recommendations.cardTitle.heatpump")}
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
              <strong>{t("recommendations.systemMode.label")}</strong>{' '}
              {btuProject.systemMode === 'recovery'
                ? t("recommendations.systemMode.recovery")
                : t("recommendations.systemMode.heatpump")}
              {isBoth && (
                <>
                  {' · '}<strong>{t("recommendations.systemMode.coolLoad")}</strong>{' '}
                  {(btuProject.totalCoolingBTU || 0).toLocaleString()} BTU
                  {' · '}<strong>{t("recommendations.systemMode.heatLoad")}</strong>{' '}
                  <span style={{ color: '#c0392b' }}>
                    {(btuProject.totalHeatingBTU || 0).toLocaleString()} BTU
                  </span>
                  {' '}<span style={{ color: '#666' }}>
                    {t("recommendations.systemMode.sizedNote")}
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
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.room")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.size")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>
                    {isBoth ? t("recommendations.table.roomLoadBoth") : t("recommendations.table.roomBtu")}
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.optimalProduct")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.productBtu")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.price")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.model")}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#1a1a2e', fontWeight: '700' }}>{t("recommendations.table.view")}</th>
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
                          {(product.coolingBtu || product.btu)?.toLocaleString() || "—"}
                          {product.heatingBtu && isBoth ? (
                            <div style={{ fontSize: '0.75em', color: '#c0392b' }}>
                              {t("recommendations.table.heatPrefix")} {product.heatingBtu.toLocaleString()}
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
                              title={t("recommendations.table.view")}
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
              <strong>{t("recommendations.empty.title")}</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                {t("recommendations.empty.description")}
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
                  <th>{t("recommendations.table.name")}</th>
                  <th>{t("recommendations.table.btu")}</th>
                  <th>{t("recommendations.table.price")}</th>
                  <th>{t("recommendations.table.quantity")}</th>
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
                <span>{t("recommendations.actions.saveToCart")}</span>
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
                <span>{t("recommendations.actions.share")}</span>
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
          <Modal.Title>{t("recommendations.shareModal.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-grid gap-2">
            <Button variant="success" onClick={() => handleShareOption("whatsapp")}>{t("recommendations.shareModal.whatsapp")}</Button>
            <Button variant="info" onClick={() => handleShareOption("telegram")}>{t("recommendations.shareModal.telegram")}</Button>
            <Button variant="secondary" onClick={() => handleShareOption("email")}>{t("recommendations.shareModal.email")}</Button>
            <Button variant="outline-primary" onClick={() => handleShareOption("copy")}>{t("recommendations.shareModal.copyLink")}</Button>
          </div>
        </Modal.Body>
      </Modal>

        </>) } {/* End btuProject && */}

      </div>{/* End rec-inner */}
    </div>
  );
}