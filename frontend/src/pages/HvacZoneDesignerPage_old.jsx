import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Container, Card, Button, ButtonGroup, Form, Row, Col, Modal, Badge } from 'react-bootstrap';
import { Store } from '../Store';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaDrawPolygon, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import * as pdfjsLib from 'pdfjs-dist';
import './HvacZoneDesignerPage.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function HvacZoneDesignerPage() {
  const { state, dispatch } = useContext(Store);
  const { adminInfo } = state;
  const containerRef = useRef(null);

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [scale] = useState(1);
  const [backgroundImage, setBackgroundImage] = useState(null);

  // HVAC zone state
  const [projectName, setProjectName] = useState('');
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [zoneStartPoint, setZoneStartPoint] = useState(null);
  const [currentZonePreview, setCurrentZonePreview] = useState(null);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  const [localZones, setLocalZones] = useState([]);

  // Equipment dialog state
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    type: 'FCU',
    label: '',
    btu: '',
    cfm: '',
    voltage: 220,
    frequency: 50,
    phase: '1',
    tolerance: 10,
    amperage: '',
  });

  const hvacEquipmentTypes = [
    { type: 'FCU', label: 'Fan Coil Unit', color: '#4A90E2' },
    { type: 'AHU', label: 'Air Handling Unit', color: '#5BA3F5' },
    { type: 'VAV', label: 'Variable Air Volume', color: '#6FB1F7' },
    { type: 'SMD', label: 'Smoke Detector', color: '#89C4F9' },
    { type: 'VRV', label: 'VRV Indoor Unit', color: '#4A90E2' },
    { type: 'DUCT', label: 'Ductwork', color: '#7BAEF5' },
  ];

  // Load zones on mount
  const loadZones = useCallback(async () => {
    try {
      dispatch({ type: 'HVAC_SET_LOADING', payload: true });
      const { data } = await axios.get('/api/hvac-zones', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
      });
      dispatch({ type: 'HVAC_SET_ZONES', payload: data });
      setLocalZones(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load HVAC zones');
    } finally {
      dispatch({ type: 'HVAC_SET_LOADING', payload: false });
    }
  }, [adminInfo, dispatch]);

  useEffect(() => {
    if (adminInfo) {
      loadZones();
    }
  }, [adminInfo, loadZones]);

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e) => {
    if (!isDrawingZone) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setZoneStartPoint({ x, y });
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawingZone || !zoneStartPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setCurrentZonePreview({
      x: Math.min(zoneStartPoint.x, x),
      y: Math.min(zoneStartPoint.y, y),
      width: Math.abs(x - zoneStartPoint.x),
      height: Math.abs(y - zoneStartPoint.y),
    });
  };

  const handleCanvasMouseUp = async (e) => {
    if (!isDrawingZone || !zoneStartPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const newZone = {
      x: Math.min(zoneStartPoint.x, x),
      y: Math.min(zoneStartPoint.y, y),
      width: Math.abs(x - zoneStartPoint.x),
      height: Math.abs(y - zoneStartPoint.y),
      equipment: [],
    };

    // Only save if zone has reasonable size
    if (newZone.width > 20 && newZone.height > 20) {
      await saveZone(newZone);
    }

    setZoneStartPoint(null);
    setCurrentZonePreview(null);
    setIsDrawingZone(false);
  };

  const saveZone = async (zoneData) => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name first');
      return;
    }

    try {
      dispatch({ type: 'HVAC_SET_LOADING', payload: true });
      const { data } = await axios.post(
        '/api/hvac-zones',
        {
          projectName,
          ...zoneData,
          floorPlanImage: backgroundImage,
        },
        {
          headers: { Authorization: `Bearer ${adminInfo.token}` },
        }
      );

      dispatch({ type: 'HVAC_ADD_ZONE', payload: data });
      setLocalZones([...localZones, data]);
      toast.success('HVAC zone created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save zone');
    } finally {
      dispatch({ type: 'HVAC_SET_LOADING', payload: false });
    }
  };

  const deleteZone = async (zoneId, index) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      await axios.delete(`/api/hvac-zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
      });

      dispatch({ type: 'HVAC_DELETE_ZONE', payload: zoneId });
      setLocalZones(localZones.filter((_, i) => i !== index));
      setSelectedZoneIndex(null);
      toast.success('Zone deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete zone');
    }
  };

  const addEquipmentToZone = async () => {
    if (!newEquipment.label || !newEquipment.btu || !newEquipment.cfm) {
      toast.error('Please fill in Equipment Label, BTU, and CFM');
      return;
    }

    if (selectedZoneIndex === null) {
      toast.error('No zone selected');
      return;
    }

    const selectedZone = localZones[selectedZoneIndex];
    if (!selectedZone._id) {
      toast.error('Zone must be saved before adding equipment');
      return;
    }

    try {
      const equipmentData = {
        ...newEquipment,
        x: selectedZone.x + 20,
        y: selectedZone.y + 20,
        width: 50,
        height: 35,
        airflow: [],
      };

      const { data } = await axios.post(
        `/api/hvac-zones/${selectedZone._id}/equipment`,
        equipmentData,
        {
          headers: { Authorization: `Bearer ${adminInfo.token}` },
        }
      );

      dispatch({ type: 'HVAC_UPDATE_ZONE', payload: data });
      const updatedZones = [...localZones];
      updatedZones[selectedZoneIndex] = data;
      setLocalZones(updatedZones);

      setShowEquipmentDialog(false);
      setNewEquipment({
        type: 'FCU',
        label: '',
        btu: '',
        cfm: '',
        voltage: 220,
        frequency: 50,
        phase: '1',
        tolerance: 10,
        amperage: '',
      });
      toast.success('Equipment added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add equipment');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    
    // Handle PDF files
    if (fileType === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); // Get first page
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png');
        setBackgroundImage(imageDataUrl);
        
        // Update canvas size to match PDF
        setCanvasSize({
          width: Math.max(viewport.width, 1200),
          height: Math.max(viewport.height, 800),
        });
        
        toast.success('PDF floor plan loaded successfully');
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF file');
      }
    }
    // Handle image files
    else if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
        toast.success('Image loaded successfully');
      };
      reader.readAsDataURL(file);
    }
    else {
      toast.error('Please upload a PDF or image file');
    }
  };

  // Render HVAC zones with blue diagonal hatching
  const renderHvacZones = () => {
    return localZones.map((zone, index) => (
      <g key={zone._id || `zone-${index}`}>
        {/* Diagonal hatch pattern definition */}
        <defs>
          <pattern
            id={`diagonalHatch-${index}`}
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#4A90E2"
              strokeWidth="1.5"
              opacity="0.6"
            />
          </pattern>
        </defs>

        {/* Blue shaded zone rectangle */}
        <rect
          x={zone.x * scale}
          y={zone.y * scale}
          width={zone.width * scale}
          height={zone.height * scale}
          fill={`url(#diagonalHatch-${index})`}
          fillOpacity="0.3"
          stroke="#4A90E2"
          strokeWidth="2"
          strokeDasharray="5,5"
          onClick={() => setSelectedZoneIndex(index)}
          style={{ cursor: 'pointer' }}
        />

        {/* Zone label */}
        <text
          x={(zone.x + 5) * scale}
          y={(zone.y + 15) * scale}
          fill="#003366"
          fontSize="12"
          fontWeight="bold"
        >
          {zone.projectName}
        </text>

        {/* Equipment within zone */}
        {zone.equipment &&
          zone.equipment.map((equip, eIdx) => (
            <g key={equip._id || `equip-${eIdx}`}>
              {/* Equipment rectangle */}
              <rect
                x={equip.x * scale}
                y={equip.y * scale}
                width={(equip.width || 50) * scale}
                height={(equip.height || 35) * scale}
                fill="#4A90E2"
                stroke="#003366"
                strokeWidth="2"
                rx="3"
              />

              {/* Equipment type label */}
              <text
                x={(equip.x + (equip.width || 50) / 2) * scale}
                y={(equip.y + (equip.height || 35) / 2) * scale}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {equip.type}
              </text>

              {/* Equipment specification callout box */}
              <g>
                <rect
                  x={(equip.x + (equip.width || 50) + 10) * scale}
                  y={(equip.y - 60) * scale}
                  width="140"
                  height="85"
                  fill="white"
                  stroke="#4A90E2"
                  strokeWidth="2"
                  rx="4"
                />
                <text
                  x={(equip.x + (equip.width || 50) + 15) * scale}
                  y={(equip.y - 50) * scale}
                  fill="#4A90E2"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {equip.label}
                </text>
                <text
                  x={(equip.x + (equip.width || 50) + 15) * scale}
                  y={(equip.y - 38) * scale}
                  fill="#333"
                  fontSize="9"
                >
                  {equip.btu} BTU
                </text>
                <text
                  x={(equip.x + (equip.width || 50) + 15) * scale}
                  y={(equip.y - 28) * scale}
                  fill="#333"
                  fontSize="9"
                >
                  {equip.cfm} CFM
                </text>
                <text
                  x={(equip.x + (equip.width || 50) + 15) * scale}
                  y={(equip.y - 18) * scale}
                  fill="#333"
                  fontSize="9"
                >
                  {equip.voltage}V/{equip.frequency}Hz/{equip.phase}Ph
                </text>
                <text
                  x={(equip.x + (equip.width || 50) + 15) * scale}
                  y={(equip.y - 8) * scale}
                  fill="#333"
                  fontSize="9"
                >
                  ±{equip.tolerance}%
                </text>
                {equip.amperage && (
                  <text
                    x={(equip.x + (equip.width || 50) + 15) * scale}
                    y={(equip.y + 2) * scale}
                    fill="#333"
                    fontSize="9"
                  >
                    {equip.amperage}A
                  </text>
                )}
              </g>

              {/* Airflow arrows */}
              {equip.airflow &&
                equip.airflow.map((flow, fIdx) => (
                  <g key={`flow-${fIdx}`}>
                    <defs>
                      <marker
                        id={`arrowhead-${index}-${eIdx}-${fIdx}`}
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3, 0 6" fill="#4A90E2" />
                      </marker>
                    </defs>
                    <line
                      x1={flow.x1 * scale}
                      y1={flow.y1 * scale}
                      x2={flow.x2 * scale}
                      y2={flow.y2 * scale}
                      stroke="#4A90E2"
                      strokeWidth="2"
                      markerEnd={`url(#arrowhead-${index}-${eIdx}-${fIdx})`}
                    />
                  </g>
                ))}
            </g>
          ))}
      </g>
    ));
  };

  // Render preview zone while drawing
  const renderPreviewZone = () => {
    if (!currentZonePreview) return null;

    return (
      <rect
        x={currentZonePreview.x * scale}
        y={currentZonePreview.y * scale}
        width={currentZonePreview.width * scale}
        height={currentZonePreview.height * scale}
        fill="rgba(74, 144, 226, 0.2)"
        stroke="#4A90E2"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    );
  };

  if (!adminInfo) {
    return (
      <Container className="py-5 text-center">
        <h3>Admin access required for HVAC Zone Designer</h3>
      </Container>
    );
  }

  return (
    <Container fluid className="hvac-zone-designer-page py-4">
      <h2 className="mb-4">HVAC Zone Designer</h2>

      {/* Project Info Card */}
      <Card className="mb-3">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Project Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Upload Floor Plan (PDF or Image)</Form.Label>
                <Form.Control type="file" accept="image/*,application/pdf" onChange={handleImageUpload} />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* HVAC Zone Tools */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">HVAC Zone Tools</h5>
            {selectedZoneIndex !== null && (
              <Badge bg="info">
                Zone {selectedZoneIndex + 1} selected -{' '}
                {localZones[selectedZoneIndex]?.equipment?.length || 0} equipment
              </Badge>
            )}
          </div>

          <ButtonGroup className="mb-2">
            <Button
              variant={isDrawingZone ? 'primary' : 'outline-primary'}
              onClick={() => setIsDrawingZone(!isDrawingZone)}
              disabled={!projectName.trim()}
            >
              <FaDrawPolygon /> {isDrawingZone ? 'Cancel Drawing' : 'Draw HVAC Zone'}
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setShowEquipmentDialog(true)}
              disabled={selectedZoneIndex === null}
            >
              <FaPlus /> Add Equipment
            </Button>
            <Button
              variant="outline-danger"
              onClick={() =>
                selectedZoneIndex !== null &&
                deleteZone(localZones[selectedZoneIndex]._id, selectedZoneIndex)
              }
              disabled={selectedZoneIndex === null}
            >
              <FaTrash /> Delete Zone
            </Button>
            <Button variant="outline-success" onClick={loadZones}>
              <FaSave /> Refresh
            </Button>
          </ButtonGroup>

          {!projectName.trim() && (
            <div className="text-muted small mt-2">
              ℹ️ Enter a project name to start drawing zones
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Canvas */}
      <Card>
        <Card.Body>
          <div
            className="canvas-container"
            ref={containerRef}
            style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <svg
              width={canvasSize.width * scale}
              height={canvasSize.height * scale}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                cursor: isDrawingZone ? 'crosshair' : 'default',
                backgroundColor: '#f8f9fa',
              }}
            >
              {/* Background image */}
              {backgroundImage && (
                <image
                  href={backgroundImage}
                  width={canvasSize.width * scale}
                  height={canvasSize.height * scale}
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.7"
                />
              )}

              {/* Render saved HVAC zones */}
              {renderHvacZones()}

              {/* Render preview zone while drawing */}
              {renderPreviewZone()}
            </svg>
          </div>
        </Card.Body>
      </Card>

      {/* Equipment Dialog */}
      <Modal show={showEquipmentDialog} onHide={() => setShowEquipmentDialog(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add HVAC Equipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Equipment Type *</Form.Label>
                  <Form.Select
                    value={newEquipment.type}
                    onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
                  >
                    {hvacEquipmentTypes.map((eq) => (
                      <option key={eq.type} value={eq.type}>
                        {eq.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Equipment Label *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="E-34 R 25"
                    value={newEquipment.label}
                    onChange={(e) => setNewEquipment({ ...newEquipment, label: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>BTU *</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="9600"
                    value={newEquipment.btu}
                    onChange={(e) => setNewEquipment({ ...newEquipment, btu: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>CFM *</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="320"
                    value={newEquipment.cfm}
                    onChange={(e) => setNewEquipment({ ...newEquipment, cfm: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Voltage</Form.Label>
                  <Form.Control
                    type="number"
                    value={newEquipment.voltage}
                    onChange={(e) => setNewEquipment({ ...newEquipment, voltage: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Frequency (Hz)</Form.Label>
                  <Form.Control
                    type="number"
                    value={newEquipment.frequency}
                    onChange={(e) =>
                      setNewEquipment({ ...newEquipment, frequency: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Phase</Form.Label>
                  <Form.Select
                    value={newEquipment.phase}
                    onChange={(e) => setNewEquipment({ ...newEquipment, phase: e.target.value })}
                  >
                    <option value="1">1Ph</option>
                    <option value="3">3Ph</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Tolerance (%)</Form.Label>
                  <Form.Control
                    type="number"
                    value={newEquipment.tolerance}
                    onChange={(e) =>
                      setNewEquipment({ ...newEquipment, tolerance: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amperage (A)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="24"
                    value={newEquipment.amperage}
                    onChange={(e) => setNewEquipment({ ...newEquipment, amperage: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEquipmentDialog(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={addEquipmentToZone}>
            <FaPlus /> Add Equipment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default HvacZoneDesignerPage;
