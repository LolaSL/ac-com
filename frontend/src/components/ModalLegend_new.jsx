import { useState, useRef, useCallback, useEffect } from "react";
import { Modal, Button, Tabs, Tab } from "react-bootstrap";
import "./ModalLegend_new.css";

import "./ModalLegend_new.css";const ModalLegend = () => {
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef(null);

  const handleShow = () => {
    setShow(true);
    setTimeout(() => setShow(false), 60000);
  };

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AC-Commerce: Measurement System Instructions</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 24px; }
            h5 { color: #0d6efd; margin-top: 18px; margin-bottom: 6px; }
            h6 { color: #0d6efd; margin-top: 14px; margin-bottom: 4px; font-size: 13px; }
            ul { margin: 0 0 8px 18px; padding: 0; }
            li { margin-bottom: 4px; line-height: 1.5; }
            strong { color: #111; }
            .section { border-top: 1px solid #dee2e6; margin-top: 20px; padding-top: 12px; }
            .footer { margin-top: 24px; font-size: 11px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h3 style="color:#dc3545">📋 AC-Commerce: Measurement System Instructions</h3>
          <p style="color:#6c757d;font-size:12px">Generated: ${new Date().toLocaleString()}</p>
          ${content.innerHTML}
          <div class="footer">AC-Commerce &mdash; Professional HVAC Solutions &mdash; www.accommerce.com</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }, []);

  // DOM-based search: runs after every render, filters <li> items and highlights matches
  useEffect(() => {
    const container = printRef.current;
    if (!container) return;
    const q = searchQuery.trim().toLowerCase();

    // Restore all items first
    container.querySelectorAll('li').forEach((li) => {
      li.style.display = '';
      if (li.dataset.originalHtml !== undefined) {
        li.innerHTML = li.dataset.originalHtml;
        delete li.dataset.originalHtml;
      }
    });

    if (!q) {
      // Show all section headers and paragraphs too
      container.querySelectorAll('h6, p').forEach((el) => (el.style.display = ''));
      return;
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');

    container.querySelectorAll('li').forEach((li) => {
      const text = li.textContent.toLowerCase();
      if (!text.includes(q)) {
        li.style.display = 'none';
      } else {
        // Highlight match inside the li
        if (li.dataset.originalHtml === undefined) {
          li.dataset.originalHtml = li.innerHTML;
        }
        li.innerHTML = li.dataset.originalHtml.replace(
          regex,
          '<mark style="background:#fef08a;padding:0">$1</mark>'
        );
      }
    });

    // Hide section headings whose entire list has no visible items
    container.querySelectorAll('h6').forEach((h6) => {
      let next = h6.nextElementSibling;
      let hasVisible = false;
      while (next && next.tagName !== 'H6') {
        if (next.tagName === 'UL') {
          const anyVisible = Array.from(next.querySelectorAll('li')).some(
            (li) => li.style.display !== 'none'
          );
          if (anyVisible) hasVisible = true;
        }
        next = next.nextElementSibling;
      }
      h6.style.display = hasVisible ? '' : 'none';
    });
  }, [searchQuery]);

  return (
    <>
      <button className="phv-trigger" onClick={handleShow}>
        📋 Legend / Instructions
      </button>
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        size="lg"
        fullscreen="sm"
        className="modal-legend"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            📋 Measurement System: How to Use
          </Modal.Title>
        </Modal.Header>

        {/* Search + Print bar — outside Modal.Body so sticky works reliably */}
        <div className="legend-search-bar">
          <input
            type="text"
            className="form-control form-control-sm legend-search-input"
            placeholder="🔍 Search instructions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-outline-secondary btn-sm legend-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >✕</button>
          )}
          <button
            className="btn btn-outline-primary btn-sm legend-print-btn"
            onClick={handlePrint}
            title="Print / Download instructions as reference"
          >🖨️ Print</button>
        </div>

        <Modal.Body>
          {/* Printable content ref */}
          <div ref={printRef}>
          <Tabs defaultActiveKey="annotator" id="legend-tabs" className="mb-3">
            {/* BUTTON LEGEND TAB */}
            <Tab eventKey="buttons" title="🔘 Button Legend">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">🖼️ PDF Designer Buttons</h6>
                <ul className="list-unstyled fs-6">
                  <li><strong>📤 Upload PDF:</strong> Select and upload a floor plan PDF file (accepts .pdf only)</li>
                  <li><strong>↶ Left / ↷ Right:</strong> Rotate the PDF drawing counter-clockwise or clockwise by 90° steps</li>
                  <li><strong>Reset (°):</strong> Appears only when PDF is rotated — resets back to original 0° orientation</li>
                  <li><strong>🔍 + / 🔍 −:</strong> Zoom in or out on the PDF canvas (range: 100%–400%)</li>
                  <li><strong>100% (zoom%):</strong> Shows current zoom level; click to reset zoom back to 100%</li>
                  <li><strong>Click on canvas:</strong> Opens a modal to enter an AC unit label and places an AC symbol at that position</li>
                  <li><strong>📌 Place mode (mobile only):</strong> Appears below the toolbar on small screens when a PDF is loaded. Tap to toggle — when active it turns blue and shows <em>"✅ Tap to place"</em>; only while active can you tap the canvas to place AC symbols. This prevents accidental placements while scrolling on touch screens.</li>
                  <li><strong>Drag air conditioner symbol:</strong> Click and drag (desktop) or touch and drag (mobile) to reposition an AC symbol</li>
                  <li><strong>Click air conditioner symbol (desktop):</strong> Rotates the air conditioner symbol 90° in place</li>
                  <li><strong>🗑️ Delete air conditioner symbol:</strong> <em>Desktop:</em> right-click the air conditioner symbol. <em>Mobile:</em> double-tap the air conditioner symbol (two taps within ~700 ms) or press and hold for ~800 ms</li>
                  <li><strong>Export to BTU (n rooms):</strong> Sends all extracted rooms to the BTU Calculator; disabled when no rooms are available</li>
                  <li><strong>Save:</strong> Saves the PDF with all AC symbols to the backend (shows "Saving..." while in progress)</li>
                  <li><strong>Clear:</strong> Removes all AC symbols, resets the canvas, and clears all session data</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">📋 Room Table Controls</h6>
                <ul className="list-unstyled fs-6">
                  <li><strong>Filter by room type:</strong> Text input to filter the room table by room name</li>
                  <li><strong>Sort dropdown:</strong> Sort table by Room Type, Width, Height, Area (sqft), or Area (sqm)</li>
                  <li><strong>Sort ASC/DESC:</strong> Toggle sort direction for the selected column</li>
                  <li><strong>Excel icon:</strong> Export the current filtered room table as a styled .xlsx file</li>
                  <li><strong>+ Add Room:</strong> Manually add a new room row to the table for a given file</li>
                  <li><strong>✏️ Edit / ✔ Save / ✖ Cancel:</strong> Inline edit controls for each room row</li>
                  <li><strong>↑ Move Up / ↓ Move Down:</strong> Reorder room rows within the table</li>
                  <li><strong>🗑️ Delete row:</strong> Remove a room entry from the table</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">📐 BTU Calculator Buttons</h6>
                <ul className="list-unstyled fs-6">
                  <li><strong>Calculate BTU:</strong> Runs the VRF BTU calculation for all rooms, saves results to the store, and navigates to the Recommendations page</li>
                  <li><strong>Clear:</strong> Resets all rooms, parameters, and environmental options back to defaults</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">🎯 Interaction Notes</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li><strong>Single Flat:</strong> Standard workflow — upload PDF, notate AC locations, export rooms, calculate BTU</li>
                  <li><strong>Multi-Flat:</strong> Label AC units with flat-specific numbers (ac-1.1, ac-2.1), rename rooms with flat numbers, system auto-detects separate units</li>
                  <li><strong>VRF System:</strong> All calculations use VRF technology with chain topology refrigerant connections</li>
                  <li><strong>Mobile:</strong> Pinch two fingers on the canvas to zoom in/out on small screens</li>
                </ul>
              </div>
            </Tab>

            {/* ANNOTATOR TAB */}
            <Tab eventKey="annotator" title="🖼️ PDF Designer">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">📌 Step 1: Upload PDF</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Supported: PDF files only (.pdf)</li>
                  <li>
                    PDFs should be floor plan drawings of flats or apartments
                  </li>
                  <li>Works best with clear floor plans showing room labels and dimensions</li>
                  <li>On upload the system automatically extracts and classifies rooms via OCR</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🔄 Step 2: Rotate PDF Drawing (if needed)
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>↶ Left:</strong> Rotate PDF counter-clockwise by 90°
                  </li>
                  <li>
                    <strong>↷ Right:</strong> Rotate PDF clockwise by 90°
                  </li>
                  <li>
                    <strong>Reset (°):</strong> Appears when PDF is not at 0° — click to restore original orientation
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🔍 Step 3: Zoom the Canvas (if needed)
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>🔍 +:</strong> Zoom in up to 400%
                  </li>
                  <li>
                    <strong>🔍 −:</strong> Zoom out (minimum 100%)
                  </li>
                  <li>
                    <strong>Zoom %:</strong> Shows current zoom; click to reset to 100%
                  </li>
                  <li>
                    <strong>Mobile pinch:</strong> Pinch two fingers on the canvas to zoom on small screens
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🎯 Step 4: Mark AC Unit Locations
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Click on the canvas</strong> at the position where an AC unit or condenser should go — a modal will appear to enter the label
                  </li>
                  <li>
                    <strong>📌 Place mode (mobile only):</strong> On small screens a <em>"📌 Place mode"</em> toggle bar appears below the toolbar after a PDF is loaded. Tap it to activate (turns blue / shows <em>"✅ Tap to place"</em>), then tap the canvas to place AC symbols. Tap the button again to deactivate and return to scroll-only mode.
                  </li>
                  <li>
                    <strong>Single Flat AC label:</strong> Enter e.g. "ac-1", "ac-2"
                  </li>
                  <li>
                    <strong>Multi-Flat AC label:</strong> Enter e.g. "ac-1.1", "ac-1.2" for flat 1; "ac-2.1", "ac-2.2" for flat 2
                  </li>
                  <li>
                    <strong>Single Flat Condenser label:</strong> Enter e.g. "condenser-1"
                  </li>
                  <li>
                    <strong>Multi-Flat Condenser label:</strong> Enter e.g. "condenser-1" for flat 1, "condenser-2" for flat 2
                  </li>
                  <li>
                    Recommended: Place AC air conditioner symbol above the room door; place Condenser air conditioner symbol near the flat entrance
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🔧 Step 5: Edit Shapes
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>🔄 Rotate Air Conditioner Symbol:</strong> Click on an existing air conditioner symbol to rotate it 90°
                  </li>
                  <li>
                    <strong>📌 Drag Air Conditioner Symbol:</strong> Click and drag (desktop) or touch and drag (mobile) to reposition
                  </li>
                  <li>
                    <strong>🗑️ Delete Air Conditioner Symbol:</strong> <em>Desktop:</em> right-click the air conditioner symbol. <em>Mobile:</em> double-tap (two quick taps on the same air conditioner symbol within ~700 ms) or press and hold for ~800 ms
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ✅ Step 6: Review & Edit Room Data
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>The room data table below the canvas is auto-filled by OCR on upload</li>
                  <li>Use the <strong>Filter</strong> input to find rooms by type</li>
                  <li>Use the <strong>Sort</strong> dropdown and ASC/DESC button to reorder the table</li>
                  <li>Click <strong>✏️ Edit</strong> on any row to rename a room or change its area; click ✔ to save or ✖ to cancel</li>
                  <li>Use <strong>↑ / ↓</strong> to reorder rows</li>
                  <li>Use <strong>🗑️</strong> to delete unwanted or duplicate rooms</li>
                  <li>Click <strong>+ Add Room</strong> to manually insert a new room entry</li>
                  <li>Click the <strong>Excel icon</strong> to download the room table as an .xlsx file</li>
                  <li>For multi-flat: rename rooms to distinguish flats (e.g., "Kitchen 1", "Kitchen 2")</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🚀 Step 7: Export to BTU Calculator
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Export to BTU (n rooms)"</strong> to send all filtered rooms to the BTU Calculator; the button is disabled when no valid rooms exist
                  </li>
                  <li>
                    Multi-flat properties are automatically detected and
                    prefixed (Flat 1, Flat 2)
                  </li>
                  <li>Page will scroll to VRF BTU Calculator automatically</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  💾 Optional: Save & Clear
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Save"</strong> to save the notated PDF and room data to the backend (button shows "Saving..." during operation)
                  </li>
                  <li>
                    Click <strong>"Clear"</strong> to remove all AC symbols, reset the canvas, and clear all saved session data
                  </li>
                </ul>
              </div>
            </Tab>

            {/* BTU CALCULATOR TAB */}
            <Tab eventKey="btu" title="📐 BTU Calculator">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">📊 Step 1: Review Rooms</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Rooms are auto-populated when you export from <strong>PDF Designer</strong></li>
                  <li>Each room shows its name and area (m² or ft²)</li>
                  <li>Multi-flat rooms arrive with a <em>"Flat N: "</em> prefix (e.g. "Flat 1: Kitchen")</li>
                  <li>Condenser labels from the PDF Designer are filtered out automatically — only habitable rooms are kept</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ⚙️ Step 2: Set Calculation Parameters
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Measurement System:</strong> Meters (m²) or Feet (ft²)
                  </li>
                  <li>
                    <strong>Ceiling Height (m):</strong> Default 2.5 m
                  </li>
                  <li>
                    <strong>Number of People:</strong> Occupancy level (each person adds ~600 BTU)
                  </li>
                  <li>
                    <strong>Multi-flat/Multi-unit property:</strong> Check this box to give each flat its own separate condenser. Auto-checked when multi-flat is detected from room-name prefixes or AC symbol labels
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🌡️ Step 3: Select Environmental Conditions
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Outdoor Unit Location:</strong> Roof, Wall Brackets, or Hard Ground
                  </li>
                  <li>
                    <strong>Wall Type:</strong> Brick Veneer, Double Brick, or Foam Cladding
                  </li>
                  <li>
                    <strong>Insulation:</strong> Poor, Average, or Good
                  </li>
                  <li>
                    <strong>Sun Exposure:</strong> Full Sunlight, Average, or Heavily Shaded
                  </li>
                  <li>
                    <strong>Climate:</strong> Average Europe, Hot Middle East, or Cold Alaska
                  </li>
                  <li>
                    <strong>Appliances:</strong> Oven, Television, Computer (adds heat load)
                  </li>
                  <li>
                    <strong>Window Type:</strong> Single Glazed, Double Glazed, Triple Glazed, or Louvered
                  </li>
                  <li>
                    <strong>Roof Type:</strong> Flat, Pitched, or Gable
                  </li>
                  <li>
                    <strong>Floor:</strong> Marble, Timber, Concrete, or Carpeted
                  </li>
                  <li>
                    <strong>Apartment Orientation:</strong> North, East, South, or West
                  </li>
                  <li>
                    <strong>Output Unit:</strong> BTU, Watt, or kW
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🧮 Step 4: Calculate &amp; Navigate
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Calculate BTU"</strong> — calculates BTU for each room, matches VRF products, saves results to the store, and navigates to the <strong>Recommendations</strong> page
                  </li>
                  <li>For multi-flat: sizes a separate VRF condenser for each flat</li>
                  <li>
                    Click <strong>"Clear"</strong> to reset all rooms, parameters, and environmental options back to defaults
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ⚡ Multi-Flat Auto-Detection
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Multi-flat is detected automatically from <em>room-name prefixes</em> ("Flat 1: Kitchen", "Flat 2: Kitchen") or from <em>AC symbol labels</em> (condenser-1 / condenser-2, ac-1.1 / ac-2.1)
                  </li>
                  <li>Duplicate room names alone do <strong>not</strong> indicate multi-flat — use the explicit labels above</li>
                  <li>
                    Each flat gets <strong>separate VRF condenser sizing</strong> with chain topology
                  </li>
                  <li>Refrigerant lines connect in chain: Condenser → AC1 → AC2 → ... per flat</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  📖 Understanding BTU Calculations
                </h6>
                <p className="text-gray-700 mb-3 fs-6">
                  BTU (British Thermal Unit) is a measure of heat. This
                  calculator provides an estimation based on common factors:
                </p>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Base Calculation:</strong> 600 BTU/m² used as a base
                    rule.
                  </li>
                  <li>
                    <strong>Outdoor Unit (Condenser) Location:</strong>
                    Desired location of outdoor unit.
                  </li>
                  <li>
                    <strong>Number of People:</strong> Each person adds ~600
                    BTU.
                  </li>
                  <li>
                    <strong>Wall Type:</strong> Materials and thickness affect
                    BTU.
                  </li>
                  <li>
                    <strong>Insulation Quality:</strong> Poor insulation
                    increases BTU needs.
                  </li>
                  <li>
                    <strong>Sun Exposure:</strong> More windows or
                    south/west-facing rooms need more cooling.
                  </li>
                  <li>
                    <strong>Window Type:</strong> Single-glazed windows allow
                    more heat than triple-glazed.
                  </li>
                  <li>
                    <strong>Apartment Orientation:</strong> South and west
                    orientations receive more sunlight.
                  </li>
                  <li>
                    <strong>Floor Type:</strong> Materials like marble or tile
                    can retain or reflect heat differently.
                  </li>
                  <li>
                    <strong>Roof Type:</strong> Flat roofs may increase heat
                    load compared to pitched or insulated ones.
                  </li>
                  <li>
                    <strong>Appliances:</strong> Kitchen and electronic devices
                    contribute additional heat load.
                  </li>
                  <li>
                    <strong>Climate Zone:</strong> BTU needs vary by temperature
                    and humidity region.
                  </li>
                </ul>
                <p className="fs-6 mt-3">
                  <strong className="text-red-600">Important:</strong> This is a
                  general estimate. Consult a licensed HVAC expert for precise
                  system sizing.
                </p>
              </div>
            </Tab>

            {/* TIPS TAB */}
            <Tab eventKey="tips" title="💡 Tips & Best Practices">
              <div className="mt-3">
                <h6 className="mb-2 text-success">✅ For Accurate Results:</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Upload clear, high-resolution floor plan PDFs</li>
                  <li>Mark all AC unit locations on the drawing</li>
                  <li>
                    For multi-flat: Clearly distinguish rooms by unit (rename
                    them with numbers)
                  </li>
                  <li>Enter accurate ceiling heights and room sizes</li>
                  <li>Select accurate climate and environmental conditions</li>
                </ul>

                <h6 className="mb-2 mt-3 text-success">
                  🎯 Multi-Flat Workflow (VRF):
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Upload PDF with both flats visible</li>
                  <li>
                    Mark AC units with labels like "ac-1", "ac-2" (system
                    auto-detects separate flats)
                  </li>
                  <li>
                    Rename rooms: "Kitchen 1"/"Kitchen 2", "LivingRoom
                    1"/"LivingRoom 2"
                  </li>
                  <li>
                    Export to BTU Calculator (shows Flat 1, Flat 2 prefixes)
                  </li>
                  <li>
                    Each flat gets separate VRF equipment and chain-connected refrigerant lines
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-success">🔍 Common Issues:</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Rooms not extracted:</strong> Check PDF is readable,
                    try higher quality
                  </li>
                  <li>
                    <strong>Duplicate rooms:</strong> Edit room names to
                    distinguish between flats
                  </li>
                  <li>
                    <strong>Wrong flat assignment:</strong> Rename rooms with
                    sequential numbers
                  </li>
                  <li>
                    <strong>No products matched:</strong> Check room area and
                    BTU calculations
                  </li>
                </ul>
              </div>
            </Tab>
          </Tabs>
          </div>{/* end printRef */}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="btn btn-outline-primary btn-sm"
            onClick={handlePrint}
            title="Print / Download instructions"
          >
            🖨️ Print / Save
          </Button>
          <Button
            className="go-to-btn btn-text w-auto"
            variant="btn-outline"
            size="sm"
            onClick={() => setShow(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalLegend;
