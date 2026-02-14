import { useState } from "react";
import { Modal, Button, Tabs, Tab } from "react-bootstrap";
import "./ModalLegend_new.css";

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
        className="modal-legend"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-danger text-bold">
            📋 Measurement System: How to Use
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="annotator" id="legend-tabs" className="mb-3">
            {/* BUTTON LEGEND TAB */}
            <Tab eventKey="buttons" title="🔘 Button Legend">
              <div className="mt-3">
                <h6 className="mb-2 text-primary">🖼️ PDF Annotator Buttons</h6>
                <ul className="list-unstyled fs-6">
                  <li><strong>📤 Upload PDF:</strong> Select and upload floor plan PDF</li>
                  <li><strong>🔄 Rotate 0°/90°/180°/270°:</strong> Rotate PDF if uploaded incorrectly</li>
                  <li><strong>➕ Add Rectangle:</strong> Place AC unit locations on drawing</li>
                  <li><strong>💬 Add Comment:</strong> Label AC units (e.g., "ac-1", "ac-2")</li>
                  <li><strong>🔄 Rotate Shape:</strong> Rotate selected rectangle</li>
                  <li><strong>📌 Drag Shape:</strong> Move rectangle position</li>
                  <li><strong>🗑️ Delete Shape:</strong> Right-click or tap & hold to remove</li>
                  <li><strong>📊 Extract Rooms:</strong> Process drawing to identify rooms</li>
                  <li><strong>🚀 Export (n):</strong> Send rooms to BTU Calculator</li>
                  <li><strong>💾 Save PDF File:</strong> Download annotated PDF</li>
                  <li><strong>🧹 Clear:</strong> Remove all annotations</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">📐 BTU Calculator Buttons</h6>
                <ul className="list-unstyled fs-6">
                  <li><strong>⚙️ Settings:</strong> Adjust calculation parameters</li>
                  <li><strong>🧮 Calculate BTU:</strong> Run BTU calculations</li>
                  <li><strong>➕ Add to Cart:</strong> Save equipment to shopping cart</li>
                  <li><strong>📈 Calculate ROI:</strong> Analyze cost savings</li>
                  <li><strong>🖨️ Print/Export:</strong> Generate reports</li>
                  <li><strong>🔄 Reset:</strong> Clear all inputs</li>
                </ul>

                <h6 className="mb-2 mt-3 text-primary">🎯 Interaction Notes</h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li><strong>Single Flat:</strong> Standard workflow - annotate one flat, calculate BTU</li>
                  <li><strong>Multi-Flat:</strong> Label AC units with numbers (ac-1, ac-2), rename rooms with flat numbers, system auto-detects separate units</li>
                  <li><strong>VRF System:</strong> All calculations use VRF technology with chain topology refrigerant connections</li>
                </ul>
              </div>
            </Tab>

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
                    "ac-1", "ac-2" for single flat VRF systems)
                  </li>
                  <li>
                    <strong>💬 Add Comment:</strong> Enter AC label (e.g.,
                    "ac-1.1", "ac-1.2" for flat 1, "ac-2.1", "ac-2.2" for flat 2 and etc. in multi-flat VRF systems)
                  </li>
                     <li>
                    <strong>💬 Add Comment:</strong> Enter Condenser label (e.g.,
                    "condenser-1" for single flat VRF systems)
                  </li>
                     <li>
                    <strong>💬 Add Comment:</strong> Enter Condenser label (e.g.,
                    "condenser-1" for flat 1, "condenser-2" for flat 2 and etc. in multi-flat VRF systems)
                  </li>
                  <li>
                    Recommended: Place AC rectangle above the door in the
                    drawing
                  </li>
                    <li>
                    Recommended: Place Condenser rectangle near flat/apartment in the
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
                    Click <strong>"Export rooms to BTU Calculator(n)"</strong> button to send rooms to
                    VRF BTU Calculator
                  </li>
                  <li>
                    Multi-flat properties are automatically detected and
                    prefixed (Flat 1, Flat 2)
                  </li>
                  <li>Page will scroll to VRF BTU Calculator automatically</li>
                  <li>System prepares chain topology refrigerant connections</li>
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
                  <li>System calculates required BTU for each room using VRF technology</li>
                  <li>Matches optimal VRF AC units from product database</li>
                  <li>For multi-flat: Sizes separate VRF condensers per flat with chain connections</li>
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
                    <strong>System Type:</strong> VRF (Variable Refrigerant Flow) - advanced technology for efficient cooling
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
                  ⚡ Multi-Flat Properties (VRF Systems)
                </h6>
                <ul className="list-disc ml-4 space-y-1 fs-6">
                  <li>
                    System auto-detects 2+ flats from room duplicates or AC
                    annotations (ac-1, ac-2, etc.)
                  </li>
                  <li>
                    Each flat gets <strong>separate VRF condenser sizing</strong> with chain topology
                  </li>
                  <li>Refrigerant lines connect in chain: Condenser → AC1 → AC2 → ... per flat</li>
                  <li>Total cost includes all VRF equipment for all flats</li>
                  <li>Per-flat cooling load shows individual VRF requirements</li>
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
