import { useState } from "react";
import { Modal, Button, Tabs, Tab } from "react-bootstrap";

const ModalLegend = () => {
  const [show, setShow] = useState(false);
  const handleShow = () => {
    setShow(true);
    setTimeout(() => {
      setShow(false);
    }, 60000);
  };

  return (
    <>
      <Button
        className="go-to-btn btn-text w-auto"
        size="sm"
        variant="btn-outline"
        onClick={handleShow}
      >
        Legend / Instructions
      </Button>
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        size="lg"
        fullscreen="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            📋 Measurement System: How to Use
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
          <Tabs defaultActiveKey="annotator" id="legend-tabs" className="mb-3">
            {/* ANNOTATOR TAB */}
            <Tab eventKey="annotator" title="🖼️ PDF Annotator">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">📌 Step 1: Upload PDF</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Supported: High-resolution PDF files (.pdf)</li>
                  <li>
                    PDFs should be flat/apartment drawings without modifications
                  </li>
                  <li>Works best with floor plans showing room layouts</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🔄 Step 2: Rotate PDF Drawing (if needed)
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Rotation Buttons:</strong> Dedicated to rotate the
                    uploaded PDF drawing (0°, 90°, 180°, 270°) before
                    annotations if PDF was uploaded with incorrect position
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🎯 Step 3: Mark AC Unit Locations
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>➕ Add Rectangle:</strong> Click on empty area where
                    AC unit should go
                  </li>
                  <li>
                    <strong>💬 Add Comment:</strong> Enter AC label (e.g.,
                    "ac-1", "ac-2" for multi-flat)
                  </li>
                  <li>
                    Recommended: Place AC rectangle above the door in the
                    drawing
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🔧 Step 4: Edit Shapes
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>🔄 Rotate Rectangle:</strong> Click on the rectangle
                  </li>
                  <li>
                    <strong>📌 Drag Rectangle:</strong> Click and drag (mouse)
                    or touch and drag (mobile)
                  </li>
                  <li>
                    <strong>🗑️ Delete Rectangle:</strong> Right-click (desktop)
                    or tap & hold (mobile)
                  </li>
                  <li>
                    <strong>🖱️ Pan Drawing:</strong> Arrow keys (← → ↑ ↓) to
                    move view
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ✅ Step 5: Extract Room Data
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Review the classified room data table below the canvas
                  </li>
                  <li>Edit room names, sizes if needed</li>
                  <li>
                    For multi-flat: Rename rooms with numbers (e.g., "LivingRoom
                    1", "LivingRoom 2")
                  </li>
                  <li>Delete duplicate or unwanted room entries</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🚀 Step 6: Export to BTU Calculator
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Export (n)"</strong> button to send rooms to
                    BTU Calculator
                  </li>
                  <li>
                    Multi-flat properties are automatically detected and
                    prefixed (Flat 1, Flat 2)
                  </li>
                  <li>Page will scroll to BTU Calculator automatically</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  💾 Optional: Save PDF
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Save PDF File"</strong> to store annotated
                    drawing
                  </li>
                  <li>
                    Click <strong>"Clear"</strong> to remove all annotations and
                    start over
                  </li>
                </ul>
              </div>
            </Tab>

            {/* BTU CALCULATOR TAB */}
            <Tab eventKey="btu" title="📐 BTU Calculator">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">📊 Step 1: Review Rooms</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>View rooms imported from Annotator</li>
                  <li>Each room shows area in m²</li>
                  <li>
                    Multi-flat properties show rooms prefixed with flat number
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ⚙️ Step 2: Set Calculation Parameters
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Measurement System:</strong> Choose meters or feet
                  </li>
                  <li>
                    <strong>Ceiling Height:</strong> Enter height in meters
                    (default: 2.5m)
                  </li>
                  <li>
                    <strong>Number of People:</strong> Set occupancy level
                  </li>
                  <li>
                    <strong>Multi-flat Property:</strong> Enable if you have
                    multiple separate units
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🌡️ Step 3: Select Environmental Conditions
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Outdoor Unit Location:</strong> Pitched roof, wall
                    brackets, hard ground
                  </li>
                  <li>
                    <strong>Insulation:</strong> Poor, average, or good
                  </li>
                  <li>
                    <strong>Climate:</strong> Hot, average, or cold
                  </li>
                  <li>
                    <strong>Sun Exposure:</strong> Full sun, average, or shaded
                  </li>
                  <li>
                    <strong>Window Type:</strong> Single, double, triple glazed
                  </li>
                  <li>
                    <strong>Wall Type, Roof, Floor:</strong> Various options
                    available
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  🧮 Step 4: Calculate BTU
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    Click <strong>"Calculate BTU"</strong> button
                  </li>
                  <li>System calculates required BTU for each room</li>
                  <li>Matches optimal AC units from product database</li>
                  <li>For multi-flat: Sizes separate condensers per flat</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  📈 Step 5: Review Results
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>BTU Results Table:</strong> Shows each room with
                    required BTU and matched product
                  </li>
                  <li>
                    <strong>Condenser Sizing:</strong> Displays outdoor
                    condenser(s) for your system
                  </li>
                  <li>
                    <strong>Per-Flat Cooling Load:</strong> For multi-flat,
                    shows separate totals per flat
                  </li>
                  <li>
                    <strong>System Type:</strong> VRF or Minisplit based on
                    requirements
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  💼 Step 6: Next Actions
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    <strong>Add to Cart:</strong> Save equipment selections to
                    shopping cart
                  </li>
                  <li>
                    <strong>Calculate ROI:</strong> Analyze cost savings vs
                    traditional HVAC
                  </li>
                  <li>
                    <strong>Print/Export:</strong> Generate reports for
                    reference
                  </li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">
                  ⚡ Multi-Flat Properties
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    System auto-detects 2+ flats from room duplicates or AC
                    annotations
                  </li>
                  <li>
                    Each flat gets <strong>separate condenser sizing</strong>
                  </li>
                  <li>Total cost includes all equipment for all flats</li>
                  <li>Per-flat cooling load shows individual requirements</li>
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
                  🎯 Multi-Flat Workflow:
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>Upload PDF with both flats visible</li>
                  <li>
                    Mark AC units with labels like "ac-1", "ac-2" (or system
                    auto-detects)
                  </li>
                  <li>
                    Rename rooms: "Kitchen 1"/"Kitchen 2", "LivingRoom
                    1"/"LivingRoom 2"
                  </li>
                  <li>
                    Export to BTU Calculator (shows Flat 1, Flat 2 prefixes)
                  </li>
                  <li>
                    Each flat gets separate equipment and condenser sizing
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
        </Modal.Body>
        <Modal.Footer>
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
