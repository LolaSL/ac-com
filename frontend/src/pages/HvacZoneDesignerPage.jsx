import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Container, Card, Button, ButtonGroup, Form, Row, Col, Modal, Badge, Dropdown } from 'react-bootstrap';
import { Store } from '../Store';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaDrawPolygon, FaPlus, FaTrash, FaSave, FaDownload, FaUndo } from 'react-icons/fa';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import {  drawCanvasLegend} from '../utils/annotationUtils.js';
import { HVAC_EQUIPMENT_CATALOG, EQUIPMENT_BY_CATEGORY, renderPdfToCanvas } from '../utils/hvacDesignUtils.js';
import './HvacZoneDesignerPage.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function HvacZoneDesignerPage() {
  const { state, dispatch } = useContext(Store);
  const { adminInfo } = state;
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isLoadingZones = useRef(false);

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [pdfScale] = useState(1.5);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  // Project state
  const [projectName, setProjectName] = useState('');
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  const [localZones, setLocalZones] = useState([]);

  // Drawing state
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [zoneStartPoint, setZoneStartPoint] = useState(null);
  const [currentZonePreview, setCurrentZonePreview] = useState(null);
  const [addMode, setAddMode] = useState(null); // Equipment placement mode
  const [showHVAC] = useState(true); // Toggle not implemented yet

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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState(null);
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const [touchStartPoint, setTouchStartPoint] = useState(null);
  const [touchMoved, setTouchMoved] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load zones on mount
  const loadZones = useCallback(async (showToast = false) => {
    // Prevent multiple simultaneous loads
    if (isLoadingZones.current) {
      console.log('Load already in progress, skipping');
      return;
    }
    
    isLoadingZones.current = true;
    
    try {
      dispatch({ type: 'HVAC_SET_LOADING', payload: true });
      const { data } = await axios.get('/api/hvac-zones', {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
      });
      
      console.log('Loaded zones from server:', data);
      
      // Verify all zones have _id
      const validZones = data.filter(zone => zone && zone._id);
      if (validZones.length !== data.length) {
        console.warn('Some zones missing _id:', data);
        if (showToast) {
          toast.warning(`${data.length - validZones.length} invalid zones filtered out`);
        }
      }
      
      dispatch({ type: 'HVAC_SET_ZONES', payload: validZones });
      setLocalZones(validZones);
      
      if (showToast) {
        toast.success(`${validZones.length} zone(s) loaded`);
      }
    } catch (error) {
      console.error('Load zones error:', error);
      toast.error(error.response?.data?.message || 'Failed to load HVAC zones');
    } finally {
      dispatch({ type: 'HVAC_SET_LOADING', payload: false });
      isLoadingZones.current = false;
    }
  }, [adminInfo.token, dispatch]);

  useEffect(() => {
    if (adminInfo) {
      loadZones(false);
    }
  }, [adminInfo, loadZones]);

  // Draw equipment specification callout
  const drawSpecsCallout = useCallback((ctx, equip, x, y) => {
    const boxWidth = 200;
    const boxHeight = 120;
    
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 3;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    
    ctx.fillStyle = '#4A90E2';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(equip.label || equip.type, x + 5, y + 22);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    if (equip.btu) ctx.fillText(`${equip.btu} BTU`, x + 5, y + 40);
    if (equip.cfm) ctx.fillText(`${equip.cfm} CFM`, x + 5, y + 58);
    if (equip.voltage) ctx.fillText(`${equip.voltage}V/${equip.frequency}Hz/${equip.phase}Ph`, x + 5, y + 76);
    if (equip.tolerance) ctx.fillText(`±${equip.tolerance}%`, x + 5, y + 94);
    if (equip.amperage) ctx.fillText(`${equip.amperage}A`, x + 5, y + 112);
    
    ctx.restore();
  }, []);

  // Draw zone with diagonal hatching
  const drawZone = useCallback((ctx, zone, isSelected) => {
    ctx.save();

    // Create diagonal hatch pattern
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 8;
    patternCanvas.height = 8;
    const patternCtx = patternCanvas.getContext('2d');
    
    patternCtx.strokeStyle = '#4A90E2';
    patternCtx.lineWidth = 1.5;
    patternCtx.globalAlpha = 0.6;
    patternCtx.beginPath();
    patternCtx.moveTo(0, 0);
    patternCtx.lineTo(8, 8);
    patternCtx.stroke();
    
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    
    // Draw zone rectangle
    ctx.fillStyle = pattern;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.globalAlpha = 1;
    
    // Draw border
    ctx.strokeStyle = isSelected ? '#FF6B00' : '#4A90E2';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    ctx.setLineDash([]);
    
    // Draw zone label
    ctx.fillStyle = '#003366';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(zone.projectName || 'Zone', zone.x + 5, zone.y + 18);
    
    ctx.restore();
  }, []);

  // Draw equipment using EngineerViewPage-style rendering
  const drawEquipment = useCallback((ctx, equip, zone) => {
    ctx.save();
    
    const config = Object.values(HVAC_EQUIPMENT_CATALOG).find(c => c.type === equip.type);
    if (!config) {
      console.warn('Unknown equipment type:', equip.type);
      ctx.restore();
      return;
    }

    if (config.category === 'ductwork') {
      // Draw duct
      ctx.fillStyle = equip.fill || config.fill;
      ctx.strokeStyle = equip.stroke || config.stroke;
      ctx.lineWidth = 3;
      ctx.fillRect(equip.x, equip.y, equip.width || 80, equip.height || 35);
      ctx.strokeRect(equip.x, equip.y, equip.width || 80, equip.height || 35);
      
      // Label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(equip.label || equip.type, equip.x + 2, equip.y - 6);
    } else if (config.category === 'diffuser') {
      // Draw diffuser symbol
      const size = equip.size || config.defaultSize * 180;
      const cx = equip.x;
      const cy = equip.y;
      
      const equipColor = equip.color || config.color;
      ctx.strokeStyle = equipColor;
      ctx.fillStyle = equipColor + '33'; // Add alpha transparency
      ctx.lineWidth = 2;
      
      if (config.shape === 'square' || equip.shape === 'square') {
        ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
        ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
        // Draw cross for 4-way
        ctx.beginPath();
        ctx.moveTo(cx - size / 2, cy);
        ctx.lineTo(cx + size / 2, cy);
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx, cy + size / 2);
        ctx.stroke();
      } else if (config.shape === 'circle' || equip.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (config.shape === 'linear' || equip.shape === 'linear') {
        // Linear slot diffuser
        ctx.fillRect(cx - size * 2, cy - size / 4, size * 4, size / 2);
        ctx.strokeRect(cx - size * 2, cy - size / 4, size * 4, size / 2);
      } else if (config.shape === 'jet' || equip.shape === 'jet') {
        // Jet diffuser - directional arrow
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Arrow indicating jet direction
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 4, cy);
        ctx.lineTo(cx, cy + size / 2);
        ctx.lineTo(cx - size / 4, cy);
        ctx.closePath();
        ctx.fillStyle = equipColor;
        ctx.fill();
      } else if (config.shape === 'wall' || equip.shape === 'wall') {
        // Wall diffuser - rectangle with lines
        ctx.fillRect(cx - size, cy - size / 3, size * 2, size / 1.5);
        ctx.strokeRect(cx - size, cy - size / 3, size * 2, size / 1.5);
        // Horizontal lines
        const lineCount = 3;
        for (let i = 1; i <= lineCount; i++) {
          const lineY = cy - size / 3 + (size / 1.5 / (lineCount + 1)) * i;
          ctx.beginPath();
          ctx.moveTo(cx - size, lineY);
          ctx.lineTo(cx + size, lineY);
          ctx.stroke();
        }
      } else {
        // Default: circle
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      // CFM label
      if (equip.cfm || config.airflow) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${equip.cfm || config.airflow} CFM`, cx, cy + size / 2 + 20);
      }
    } else if (config.category === 'unit') {
      // Draw equipment unit
      const w = equip.width || 80;
      const h = equip.height || 60;
      
      ctx.fillStyle = config.color;
      ctx.strokeStyle = '#003366';
      ctx.lineWidth = 3;
      ctx.fillRect(equip.x, equip.y, w, h);
      ctx.strokeRect(equip.x, equip.y, w, h);
      
      // Type label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(equip.type, equip.x + w / 2, equip.y + h / 2 + 5);
      
      // Specs callout box
      drawSpecsCallout(ctx, equip, equip.x + w + 10, equip.y - 60);
    } else if (config.category === 'damper') {
      // Draw damper symbol
      const size = equip.size || config.defaultSize * 180;
      const cx = equip.x;
      const cy = equip.y;
      
      const equipColor = equip.color || config.color;
      ctx.strokeStyle = equipColor;
      ctx.fillStyle = equipColor + '33'; // Add alpha
      ctx.lineWidth = 2;
      
      // Draw diamond shape for damper
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(cx + size / 2, cy);
      ctx.lineTo(cx, cy + size / 2);
      ctx.lineTo(cx - size / 2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(equip.label || config.label.split(' ')[0], cx, cy + size / 2 + 20);
    } else if (config.category === 'accessory') {
      // Draw accessory symbols (drain points, smoke detectors, etc.)
      const size = equip.size || config.defaultSize * 180;
      const cx = equip.x;
      const cy = equip.y;
      
      const equipColor = equip.color || config.color;
      ctx.strokeStyle = equipColor;
      ctx.fillStyle = equipColor + '55';
      ctx.lineWidth = 2;
      
      // Default: draw as small circle
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Add label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(equip.label || config.type, cx, cy + size / 2 + 18);
    }
    
    ctx.restore();
  }, [drawSpecsCallout]);

  // Render canvas with zones and equipment
  useEffect(() => {
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply zoom and pan transformations
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw background image if exists
      if (backgroundImage) {
        const img = new Image();
        img.onload = () => {
          // Draw at natural dimensions to preserve aspect ratio
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
          drawZonesAndEquipment(ctx);
        };
        img.src = backgroundImage;
      } else {
        drawZonesAndEquipment(ctx);
      }
    };

    const drawZonesAndEquipment = (ctx) => {
      // Draw zones with blue diagonal hatching
      localZones.forEach((zone, index) => {
        drawZone(ctx, zone, index === selectedZoneIndex);
        
        // Draw equipment within zone
        if (zone.equipment && showHVAC) {
          zone.equipment.forEach((equip) => {
            drawEquipment(ctx, equip, zone);
          });
        }
      });

      // Draw preview zone while drawing
      if (currentZonePreview && isDrawingZone) {
        ctx.save();
        ctx.fillStyle = 'rgba(74, 144, 226, 0.2)';
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(currentZonePreview.x, currentZonePreview.y, currentZonePreview.width, currentZonePreview.height);
        ctx.strokeRect(currentZonePreview.x, currentZonePreview.y, currentZonePreview.width, currentZonePreview.height);
        ctx.restore();
      }

      // Draw legend
      if (showHVAC && localZones.some(z => z.equipment && z.equipment.length > 0)) {
        drawCanvasLegend(ctx, 'vrf-ducted', { pdfScale });
      }
      
      ctx.restore();
    };

    renderCanvas();
  }, [localZones, backgroundImage, currentZonePreview, isDrawingZone, selectedZoneIndex, showHVAC, pdfScale, zoom, pan, drawEquipment, drawZone]);

  // Handle PDF/Image upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
      try {
        setPdfFile(file);
        const result = await renderPdfToCanvas(file, pdfScale, pdfjsLib);
        setBackgroundImage(result.imageDataUrl);
        // Set canvas to PDF's actual dimensions to preserve aspect ratio
        setCanvasSize({
          width: result.width,
          height: result.height,
        });
        toast.success('PDF floor plan loaded successfully');
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF file');
      }
    } else if (fileType.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          setCanvasSize({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
          setBackgroundImage(event.target.result);
          toast.success('Image loaded successfully');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please upload a PDF or image file');
    }
  };

  // Canvas mouse handlers
  // Helper: Convert screen coordinates to canvas coordinates (accounting for zoom/pan and CSS scaling)
  const screenToCanvas = (screenX, screenY, rect) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Account for CSS scaling (canvas actual size vs displayed size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Transform screen coordinates to canvas coordinates
    const x = ((screenX - rect.left) * scaleX - pan.x) / zoom;
    const y = ((screenY - rect.top) * scaleY - pan.y) / zoom;
    return { x, y };
  };

  const handleCanvasMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const coords = screenToCanvas(e.clientX, e.clientY, rect);
    
    if (isDrawingZone) {
      setZoneStartPoint(coords);
    } else if (addMode) {
      // Equipment placement mode
      handleEquipmentPlacement(e);
    } else if (e.shiftKey || e.ctrlKey) {
      // Pan mode when holding shift/ctrl
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    if (isPanning && lastPanPoint) {
      // Pan the canvas
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (!isDrawingZone || !zoneStartPoint) return;

    const coords = screenToCanvas(e.clientX, e.clientY, rect);

    setCurrentZonePreview({
      x: Math.min(zoneStartPoint.x, coords.x),
      y: Math.min(zoneStartPoint.y, coords.y),
      width: Math.abs(coords.x - zoneStartPoint.x),
      height: Math.abs(coords.y - zoneStartPoint.y),
    });
  };

  const handleCanvasMouseUp = async (e) => {
    setIsPanning(false);
    setLastPanPoint(null);
    
    if (!isDrawingZone || !zoneStartPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const coords = screenToCanvas(e.clientX, e.clientY, rect);

    const newZone = {
      x: Math.min(zoneStartPoint.x, coords.x),
      y: Math.min(zoneStartPoint.y, coords.y),
      width: Math.abs(coords.x - zoneStartPoint.x),
      height: Math.abs(coords.y - zoneStartPoint.y),
      equipment: [],
    };

    if (newZone.width > 20 && newZone.height > 20) {
      await saveZone(newZone);
    }

    setZoneStartPoint(null);
    setCurrentZonePreview(null);
    setIsDrawingZone(false);
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    
    if (e.touches.length === 2) {
      // Two-finger pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setLastTouchDistance(distance);
      setTouchMoved(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = screenToCanvas(touch.clientX, touch.clientY, rect);
      
      // Store initial touch point for tap detection
      setTouchStartPoint({ x: touch.clientX, y: touch.clientY, canvasX: coords.x, canvasY: coords.y });
      setTouchMoved(false);
      
      if (isDrawingZone) {
        setZoneStartPoint(coords);
        setIsPanning(false); // Disable panning when drawing zone
        setLastPanPoint(null);
      } else if (addMode) {
        // Equipment placement via touch
        handleEquipmentPlacementTouch(touch, rect);
        setIsPanning(false);
        setLastPanPoint(null);
      } else {
        // Start panning
        setIsPanning(true);
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Detect if touch moved (for tap detection)
    if (e.touches.length === 1 && touchStartPoint) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPoint.x);
      const dy = Math.abs(touch.clientY - touchStartPoint.y);
      if (dx > 10 || dy > 10) {
        setTouchMoved(true);
      }
    }
    
    if (e.touches.length === 2 && lastTouchDistance) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const delta = distance - lastTouchDistance;
      const zoomFactor = 1 + (delta * 0.01);
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 5);
      setZoom(newZoom);
      setLastTouchDistance(distance);
      setTouchMoved(true);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (isDrawingZone && zoneStartPoint) {
        // Draw zone preview - prioritize over panning
        const coords = screenToCanvas(touch.clientX, touch.clientY, rect);
        setCurrentZonePreview({
          x: Math.min(zoneStartPoint.x, coords.x),
          y: Math.min(zoneStartPoint.y, coords.y),
          width: Math.abs(coords.x - zoneStartPoint.x),
          height: Math.abs(coords.y - zoneStartPoint.y),
        });
      } else if (isPanning && lastPanPoint && !isDrawingZone) {
        // Pan with one finger (only when not drawing zone)
        const dx = touch.clientX - lastPanPoint.x;
        const dy = touch.clientY - lastPanPoint.y;
        setPan({ x: pan.x + dx, y: pan.y + dy });
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    }
  };

  const handleTouchEnd = async (e) => {
    e.preventDefault();
    
    setLastTouchDistance(null);
    
    if (e.touches.length === 0) {
      // Check if this was a simple tap (no movement)
      if (!touchMoved && touchStartPoint && !isDrawingZone && !addMode) {
        // Simple tap - select zone
        console.log('Touch tap - coords:', touchStartPoint, 'zones:', localZones.map((z, i) => ({
          index: i,
          _id: z._id,
          bounds: { x: z.x, y: z.y, width: z.width, height: z.height }
        })));
        
        const clickedZoneIndex = localZones.findIndex(zone => 
          touchStartPoint.canvasX >= zone.x && 
          touchStartPoint.canvasX <= zone.x + zone.width &&
          touchStartPoint.canvasY >= zone.y && 
          touchStartPoint.canvasY <= zone.y + zone.height
        );
        
        console.log('Tapped zone index:', clickedZoneIndex);
        
        setSelectedZoneIndex(clickedZoneIndex !== -1 ? clickedZoneIndex : null);
        if (clickedZoneIndex !== -1) {
          const zone = localZones[clickedZoneIndex];
          toast.info(`Zone ${clickedZoneIndex + 1} selected - Tap Delete to remove${zone._id ? '' : ' (⚠ Not saved)'}`);
        }
      }
      
      setIsPanning(false);
      setLastPanPoint(null);
      setTouchStartPoint(null);
      setTouchMoved(false);
      
      if (isDrawingZone && zoneStartPoint && currentZonePreview) {
        // Complete zone drawing
        if (currentZonePreview.width > 20 && currentZonePreview.height > 20) {
          await saveZone(currentZonePreview);
        }
        setZoneStartPoint(null);
        setCurrentZonePreview(null);
        setIsDrawingZone(false);
      }
    }
  };

  // Handle equipment placement via touch
  const handleEquipmentPlacementTouch = (touch, rect) => {
    if (!addMode || selectedZoneIndex === null) {
      toast.warn('Please select a zone first');
      return;
    }

    const coords = screenToCanvas(touch.clientX, touch.clientY, rect);
    const selectedZone = localZones[selectedZoneIndex];
    const config = HVAC_EQUIPMENT_CATALOG[addMode];
    
    if (!config) {
      toast.error('Invalid equipment type');
      setAddMode(null);
      return;
    }

    // Use same placement logic as mouse
    placeEquipment(coords.x, coords.y, selectedZone, config);
  };

  // Equipment placement handler
  const handleEquipmentPlacement = (e) => {
    if (!addMode || selectedZoneIndex === null) {
      toast.warn('Please select a zone first');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const coords = screenToCanvas(e.clientX, e.clientY, rect);
    const selectedZone = localZones[selectedZoneIndex];
    const config = HVAC_EQUIPMENT_CATALOG[addMode];
    
    if (!config) {
      toast.error('Invalid equipment type');
      setAddMode(null);
      return;
    }

    placeEquipment(coords.x, coords.y, selectedZone, config);
  };

  // Common equipment placement logic for both mouse and touch
  const placeEquipment = (x, y, selectedZone, config) => {
    console.log('Placing equipment:', { type: config.type, category: config.category, x, y });
    
    // Relaxed boundary check - allow equipment near edges (they can extend slightly beyond)
    // Only check that click point is reasonably within zone (with 20px margin for edge placement)
    const margin = 20;
    const isUnit = config.category === 'unit';
    
    // Units need stricter bounds since they're larger
    if (isUnit) {
      const unitWidth = (config.defaultWidth * 100) || 50;
      const unitHeight = (config.defaultHeight * 100) || 35;
      
      if (x < selectedZone.x + margin || 
          x > selectedZone.x + selectedZone.width - unitWidth - margin ||
          y < selectedZone.y + margin || 
          y > selectedZone.y + selectedZone.height - unitHeight - margin) {
        toast.warn('Equipment too close to zone edge - move placement point inward');
        setAddMode(null);
        return;
      }
    } else {
      // For ducts, diffusers, dampers - just ensure click is in zone
      // They can extend beyond zone edges which is normal for HVAC layouts
      if (x < selectedZone.x - margin || x > selectedZone.x + selectedZone.width + margin ||
          y < selectedZone.y - margin || y > selectedZone.y + selectedZone.height + margin) {
        toast.warn('Click within the zone area to place equipment');
        setAddMode(null);
        return;
      }
    }

    // Generate auto-label based on equipment count
    const existingEquipCount = selectedZone.equipment?.length || 0;
    const autoLabel = `${config.type}-${existingEquipCount + 1}`;

    const newEquip = {
      type: config.type,
      label: autoLabel,
      x,
      y,
    };

    if (config.category === 'ductwork') {
      newEquip.width = config.defaultWidth * 100;
      newEquip.height = config.defaultHeight * 100;
      newEquip.fill = config.fill;
      newEquip.stroke = config.stroke;
    } else if (config.category === 'diffuser') {
      newEquip.size = config.defaultSize * 100;
      newEquip.shape = config.shape;
      newEquip.airflow = config.airflow;
      newEquip.cfm = config.airflow;
      newEquip.color = config.color; // Add color for rendering
    } else if (config.category === 'damper') {
      newEquip.size = config.defaultSize * 100;
      newEquip.color = config.color; // Add color for rendering
    } else if (config.category === 'accessory') {
      newEquip.size = config.defaultSize * 100;
      newEquip.shape = config.shape;
      newEquip.color = config.color; // Add color for rendering
    } else if (config.category === 'unit') {
      newEquip.width = config.defaultWidth * 100;
      newEquip.height = config.defaultHeight * 100;
      // Open dialog for specs
      setNewEquipment({
        type: config.type,
        label: autoLabel,
        btu: '',
        cfm: '',
        voltage: 220,
        frequency: 50,
        phase: '1',
        tolerance: 10,
        amperage: '',
        x,
        y,
        width: newEquip.width,
        height: newEquip.height,
      });
      setShowEquipmentDialog(true);
      setAddMode(null);
      return;
    }

    console.log('Equipment data to save:', newEquip);
    addEquipmentToZoneDirectly(newEquip);
    setAddMode(null);
  };

  // Add equipment directly (for ducts, diffusers, dampers)
  const addEquipmentToZoneDirectly = async (equipData) => {
    if (selectedZoneIndex === null) return;

    const selectedZone = localZones[selectedZoneIndex];
    if (!selectedZone._id) {
      toast.error('Zone must be saved before adding equipment');
      return;
    }

    try {
      const { data } = await axios.post(
        `/api/hvac-zones/${selectedZone._id}/equipment`,
        equipData,
        {
          headers: { Authorization: `Bearer ${adminInfo.token}` },
        }
      );

      dispatch({ type: 'HVAC_UPDATE_ZONE', payload: data });
      const updatedZones = [...localZones];
      updatedZones[selectedZoneIndex] = data;
      setLocalZones(updatedZones);
      toast.success('Equipment added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add equipment');
    }
  };

  // Undo last equipment addition
  const undoLastEquipment = async () => {
    if (selectedZoneIndex === null) {
      toast.warn('Please select a zone first');
      return;
    }

    const selectedZone = localZones[selectedZoneIndex];
    if (!selectedZone._id) {
      toast.error('Zone must be saved');
      return;
    }

    if (!selectedZone.equipment || selectedZone.equipment.length === 0) {
      toast.info('No equipment to remove');
      return;
    }

    // Get the last equipment item
    const lastEquipment = selectedZone.equipment[selectedZone.equipment.length - 1];
    
    if (!window.confirm(`Remove ${lastEquipment.label || lastEquipment.type}?`)) return;

    try {
      const { data } = await axios.delete(
        `/api/hvac-zones/${selectedZone._id}/equipment/${lastEquipment._id}`,
        {
          headers: { Authorization: `Bearer ${adminInfo.token}` },
        }
      );

      dispatch({ type: 'HVAC_UPDATE_ZONE', payload: data });
      const updatedZones = [...localZones];
      updatedZones[selectedZoneIndex] = data;
      setLocalZones(updatedZones);
      toast.success('Last equipment removed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove equipment');
    }
  };

  // Save zone
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

      // Verify the zone has an _id before adding to local state
      if (data && data._id) {
        dispatch({ type: 'HVAC_ADD_ZONE', payload: data });
        const updatedZones = [...localZones, data];
        setLocalZones(updatedZones);
        // Auto-select the newly created zone
        setSelectedZoneIndex(updatedZones.length - 1);
        toast.success('HVAC zone created and selected - click equipment buttons to add items');
      } else {
        throw new Error('Invalid zone data returned from server');
      }
    } catch (error) {
      console.error('Save zone error:', error);
      toast.error(error.response?.data?.message || 'Failed to save zone');
    } finally {
      dispatch({ type: 'HVAC_SET_LOADING', payload: false });
    }
  };

  // Delete zone
  const deleteZone = async (zoneId, index) => {
    if (!zoneId) {
      toast.error('Cannot delete unsaved zone. Please refresh the page.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      console.log('Deleting zone:', zoneId);
      await axios.delete(`/api/hvac-zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${adminInfo.token}` },
      });

      dispatch({ type: 'HVAC_DELETE_ZONE', payload: zoneId });
      setLocalZones(localZones.filter((_, i) => i !== index));
      setSelectedZoneIndex(null);
      toast.success('Zone deleted successfully');
    } catch (error) {
      console.error('Delete zone error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete zone');
    }
  };

  // Delete all zones
  const deleteAllZones = async () => {
    if (localZones.length === 0) {
      toast.info('No zones to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ALL ${localZones.length} zone(s)? This cannot be undone.`)) return;

    try {
      let deletedCount = 0;
      let failedCount = 0;
      
      for (const zone of localZones) {
        if (zone._id) {
          try {
            await axios.delete(`/api/hvac-zones/${zone._id}`, {
              headers: { Authorization: `Bearer ${adminInfo.token}` },
            });
            dispatch({ type: 'HVAC_DELETE_ZONE', payload: zone._id });
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete zone ${zone._id}:`, error);
            failedCount++;
          }
        }
      }
      
      setLocalZones([]);
      setSelectedZoneIndex(null);
      
      if (failedCount === 0) {
        toast.success(`All ${deletedCount} zone(s) deleted successfully`);
      } else {
        toast.warning(`Deleted ${deletedCount} zone(s), ${failedCount} failed. Refreshing...`);
        await loadZones(false);
      }
    } catch (error) {
      console.error('Delete all zones error:', error);
      toast.error('Failed to delete all zones');
      await loadZones(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Add equipment with specs dialog
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
      const { data } = await axios.post(
        `/api/hvac-zones/${selectedZone._id}/equipment`,
        newEquipment,
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

  // Export to PDF
  const exportToPDF = async () => {
    if (!pdfFile && !backgroundImage) {
      toast.error('Please upload a floor plan first');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/png');
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([canvas.width, canvas.height]);
      const pngImage = await pdfDoc.embedPng(imageData);
      
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName || 'hvac-design'}.pdf`;
      link.click();
      
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
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
      <h2 className="mb-4">HVAC Zone Designer - Professional</h2>

      {/* Project Info */}
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
                <Form.Control type="file" accept="image/*,application/pdf" onChange={handleFileUpload} />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Professional Toolbar */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">HVAC Design Tools</h5>
            {selectedZoneIndex !== null && (
              <Badge bg="info">
                Zone {selectedZoneIndex + 1} - {localZones[selectedZoneIndex]?.equipment?.length || 0} equipment
                {!localZones[selectedZoneIndex]?._id && <span className="ms-1">(⚠ Not saved)</span>}
              </Badge>
            )}
          </div>

          {/* Zone Tools */}
          <div className="mb-3">
            <label className="d-block mb-2 fw-bold">Zone Management</label>
            <div className="d-flex flex-column gap-2">
              <div className={isMobile ? 'd-grid' : ''} style={isMobile ? {gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px'} : undefined}>
                {isMobile ? (
                  <>
                    <Button
                      variant={isDrawingZone ? 'primary' : 'outline-primary'}
                      onClick={() => setIsDrawingZone(!isDrawingZone)}
                      disabled={!projectName.trim()}
                      size="sm"
                    >
                      <FaDrawPolygon /> Draw
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => {
                        if (selectedZoneIndex !== null) {
                          const zone = localZones[selectedZoneIndex];
                          if (!zone || !zone._id) {
                            toast.error('Cannot delete this zone. Please refresh and try again.');
                            return;
                          }
                          deleteZone(zone._id, selectedZoneIndex);
                        }
                      }}
                      disabled={
                        selectedZoneIndex === null || 
                        !localZones[selectedZoneIndex]?._id
                      }
                      size="sm"
                      title={
                        selectedZoneIndex !== null && !localZones[selectedZoneIndex]?._id
                          ? 'Zone must be saved before deletion'
                          : 'Delete selected zone'
                      }
                    >
                      <FaTrash /> Delete
                    </Button>
                    <Button 
                      variant="outline-success" 
                      onClick={() => loadZones(true)}
                      size="sm"
                    >
                      <FaSave /> Refresh
                    </Button>
                    <Button 
                      variant="outline-info" 
                      onClick={exportToPDF}
                      size="sm"
                    >
                      <FaDownload /> Export
                    </Button>
                  </>
                ) : (
                  <ButtonGroup>
                    <Button
                      variant={isDrawingZone ? 'primary' : 'outline-primary'}
                      onClick={() => setIsDrawingZone(!isDrawingZone)}
                      disabled={!projectName.trim()}
                    >
                      <FaDrawPolygon /> Draw HVAC Zone
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => {
                        if (selectedZoneIndex !== null) {
                          const zone = localZones[selectedZoneIndex];
                          if (!zone || !zone._id) {
                            toast.error('Cannot delete this zone. Please refresh and try again.');
                            return;
                          }
                          deleteZone(zone._id, selectedZoneIndex);
                        }
                      }}
                      disabled={
                        selectedZoneIndex === null || 
                        !localZones[selectedZoneIndex]?._id
                      }
                      title={
                        selectedZoneIndex !== null && !localZones[selectedZoneIndex]?._id
                          ? 'Zone must be saved before deletion'
                          : 'Delete selected zone'
                      }
                    >
                      <FaTrash /> Delete Zone
                    </Button>
                    <Button 
                      variant="outline-success" 
                      onClick={() => loadZones(true)}
                    >
                      <FaSave /> Refresh
                    </Button>
                    <Button 
                      variant="outline-info" 
                      onClick={exportToPDF}
                    >
                      <FaDownload /> Export PDF
                    </Button>
                  </ButtonGroup>
                )}
              </div>
              
              {/* Undo Last Equipment - Secondary Action */}
              {selectedZoneIndex !== null && localZones[selectedZoneIndex]?.equipment?.length > 0 && (
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={undoLastEquipment}
                  className={isMobile ? 'w-100' : 'align-self-start'}
                  title="Remove the last added equipment from selected zone"
                >
                  <FaUndo /> Undo Last Equipment ({localZones[selectedZoneIndex].equipment.length})
                </Button>
              )}
              
              {/* Delete All Zones - Secondary Action */}
              {localZones.length > 1 && (
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={deleteAllZones}
                  className={isMobile ? 'w-100' : 'align-self-start'}
                >
                  <FaTrash /> Delete All {localZones.length} Zones
                </Button>
              )}
            </div>
            
            {isMobile && selectedZoneIndex === null && (
              <small className="text-muted d-block mt-2">
                💡 Tap a zone on the canvas to select it, then tap Delete
              </small>
            )}
            {isMobile && selectedZoneIndex !== null && !localZones[selectedZoneIndex]?._id && (
              <small className="text-warning d-block mt-2">
                ⚠️ This zone is not saved yet. Refresh to reload saved zones.
              </small>
            )}
          </div>

          {/* Ductwork Tools */}
          <div className="mb-3">
            <label className="d-block mb-2 fw-bold">Ductwork</label>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-primary">
                  {addMode && EQUIPMENT_BY_CATEGORY.ductwork.includes(addMode) 
                    ? HVAC_EQUIPMENT_CATALOG[addMode]?.label 
                    : 'Select Duct'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {EQUIPMENT_BY_CATEGORY.ductwork.map(key => (
                    <Dropdown.Item 
                      key={key}
                      active={addMode === key}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                    >
                      {HVAC_EQUIPMENT_CATALOG[key].label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <ButtonGroup>
                {EQUIPMENT_BY_CATEGORY.ductwork.map(key => {
                  const config = HVAC_EQUIPMENT_CATALOG[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={addMode === key ? 'primary' : 'outline-primary'}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                      disabled={selectedZoneIndex === null}
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            )}
          </div>

          {/* Diffuser Tools */}
          <div className="mb-3">
            <label className="d-block mb-2 fw-bold">Diffusers & Grilles</label>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-secondary">
                  {addMode && EQUIPMENT_BY_CATEGORY.diffuser.includes(addMode)
                    ? HVAC_EQUIPMENT_CATALOG[addMode]?.label
                    : 'Select Diffuser'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {EQUIPMENT_BY_CATEGORY.diffuser.map(key => (
                    <Dropdown.Item
                      key={key}
                      active={addMode === key}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                    >
                      {HVAC_EQUIPMENT_CATALOG[key].label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <ButtonGroup className="flex-wrap">
                {EQUIPMENT_BY_CATEGORY.diffuser.map(key => {
                  const config = HVAC_EQUIPMENT_CATALOG[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={addMode === key ? 'secondary' : 'outline-secondary'}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                      disabled={selectedZoneIndex === null}
                      className="mb-1"
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            )}
          </div>

          {/* Unit Tools */}
          <div className="mb-3">
            <label className="d-block mb-2 fw-bold">Indoor Units</label>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-info">
                  {addMode && EQUIPMENT_BY_CATEGORY.unit.includes(addMode)
                    ? HVAC_EQUIPMENT_CATALOG[addMode]?.label
                    : 'Select Unit'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {EQUIPMENT_BY_CATEGORY.unit.map(key => (
                    <Dropdown.Item
                      key={key}
                      active={addMode === key}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                    >
                      {HVAC_EQUIPMENT_CATALOG[key].label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <ButtonGroup>
                {EQUIPMENT_BY_CATEGORY.unit.map(key => {
                  const config = HVAC_EQUIPMENT_CATALOG[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={addMode === key ? 'info' : 'outline-info'}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                      disabled={selectedZoneIndex === null}
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            )}
          </div>

          {/* Damper Tools */}
          <div className="mb-2">
            <label className="d-block mb-2 fw-bold">Dampers & Controls</label>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-warning">
                  {addMode && EQUIPMENT_BY_CATEGORY.damper.includes(addMode)
                    ? HVAC_EQUIPMENT_CATALOG[addMode]?.label
                    : 'Select Damper'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {EQUIPMENT_BY_CATEGORY.damper.map(key => (
                    <Dropdown.Item
                      key={key}
                      active={addMode === key}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                    >
                      {HVAC_EQUIPMENT_CATALOG[key].label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <ButtonGroup>
                {EQUIPMENT_BY_CATEGORY.damper.map(key => {
                  const config = HVAC_EQUIPMENT_CATALOG[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={addMode === key ? 'warning' : 'outline-warning'}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                      disabled={selectedZoneIndex === null}
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            )}
          </div>

          {/* Accessory Tools */}
          <div className="mb-2">
            <label className="d-block mb-2 fw-bold">Accessories</label>
            {isMobile ? (
              <Dropdown>
                <Dropdown.Toggle size="sm" variant="outline-info">
                  {addMode && EQUIPMENT_BY_CATEGORY.accessory.includes(addMode)
                    ? HVAC_EQUIPMENT_CATALOG[addMode]?.label
                    : 'Select Accessory'}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {EQUIPMENT_BY_CATEGORY.accessory.map(key => (
                    <Dropdown.Item
                      key={key}
                      active={addMode === key}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                    >
                      {HVAC_EQUIPMENT_CATALOG[key].label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <ButtonGroup>
                {EQUIPMENT_BY_CATEGORY.accessory.map(key => {
                  const config = HVAC_EQUIPMENT_CATALOG[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={addMode === key ? 'info' : 'outline-info'}
                      onClick={() => setAddMode(addMode === key ? null : key)}
                      disabled={selectedZoneIndex === null}
                    >
                      {config.label}
                    </Button>
                  );
                })}
              </ButtonGroup>
            )}
          </div>

          {!projectName.trim() && (
            <div className="text-muted small mt-2">
              ℹ️ Enter a project name to start drawing zones
            </div>
          )}
          {projectName.trim() && selectedZoneIndex === null && localZones.length === 0 && (
            <div className="alert alert-info py-2 mt-2 small">
              <strong>Step 1:</strong> Click "Draw HVAC Zone" above, then drag on canvas to create a zone
            </div>
          )}
          {projectName.trim() && selectedZoneIndex === null && localZones.length > 0 && (
            <div className="alert alert-warning py-2 mt-2 small">
              <strong>Please select a zone</strong> by clicking it on the canvas before adding equipment
            </div>
          )}
          {projectName.trim() && selectedZoneIndex !== null && (
            <div className="alert alert-success py-2 mt-2 small">
              <strong>Zone {selectedZoneIndex + 1} selected!</strong> Click equipment buttons above, then click on the zone to place items
            </div>
          )}
          {addMode && (
            <div className="alert alert-info mt-2 py-2">
              <strong>Active:</strong> {HVAC_EQUIPMENT_CATALOG[addMode]?.label} - Click on the selected zone to place
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Canvas */}
      <Card>
        <Card.Body>
          {/* Mobile instructions */}
          {isMobile && localZones.length > 0 && !isDrawingZone && !addMode && (
            <div className="alert alert-info py-2 mb-2 small">
              📱 <strong>Tap a zone</strong> to select it (turns orange), then tap <strong>Delete</strong> button above
            </div>
          )}
          
          {/* Zoom Controls */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className={isMobile ? 'd-grid w-100' : 'd-flex gap-2 align-items-center'} style={isMobile ? {gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px'} : undefined}>
              {isMobile ? (
                <>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomOut} 
                    title="Zoom Out"
                    size="sm"
                  >
                    −
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomReset} 
                    title="Reset Zoom"
                    size="sm"
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomIn} 
                    title="Zoom In"
                    size="sm"
                  >
                    +
                  </Button>
                </>
              ) : (
                <ButtonGroup size="sm">
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomOut} 
                    title="Zoom Out"
                    style={{minWidth: '60px'}}
                  >
                    −
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomReset} 
                    title="Reset Zoom"
                    style={{minWidth: '60px'}}
                  >
                    {Math.round(zoom * 100)}%
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleZoomIn} 
                    title="Zoom In"
                    style={{minWidth: '60px'}}
                  >
                    +
                  </Button>
                </ButtonGroup>
              )}
              {zoom !== 1 && (
                <small className="text-muted">
                  {isMobile ? 'Pinch to zoom' : 'Shift+Drag to pan'}
                </small>
              )}
            </div>
            <div>
              <Badge bg="secondary">{localZones.length} Zone{localZones.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
          
          <div className="canvas-wrapper" ref={containerRef}>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={(e) => {
                if (!isDrawingZone && !addMode && !isPanning) {
                  // Zone selection
                  const rect = e.currentTarget.getBoundingClientRect();
                  const coords = screenToCanvas(e.clientX, e.clientY, rect);
                  
                  console.log('Canvas click - coords:', coords, 'zones:', localZones.map((z, i) => ({
                    index: i,
                    _id: z._id,
                    bounds: { x: z.x, y: z.y, width: z.width, height: z.height }
                  })));
                  
                  const clickedZoneIndex = localZones.findIndex(zone => 
                    coords.x >= zone.x && coords.x <= zone.x + zone.width &&
                    coords.y >= zone.y && coords.y <= zone.y + zone.height
                  );
                  
                  console.log('Clicked zone index:', clickedZoneIndex);
                  
                  setSelectedZoneIndex(clickedZoneIndex !== -1 ? clickedZoneIndex : null);
                  if (clickedZoneIndex !== -1) {
                    const zone = localZones[clickedZoneIndex];
                    toast.info(`Zone ${clickedZoneIndex + 1} selected${zone._id ? '' : ' (⚠ Not saved)'}`);
                  }
                }
              }}
              style={{
                cursor: isPanning ? 'grabbing' : isDrawingZone ? 'crosshair' : addMode ? 'crosshair' : 'grab',
                border: '1px solid #ddd',
                backgroundColor: '#f8f9fa',
                touchAction: 'none',
              }}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Equipment Specs Dialog */}
      <Modal show={showEquipmentDialog} onHide={() => setShowEquipmentDialog(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add HVAC Equipment with Specifications</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Equipment Type</Form.Label>
                  <Form.Control type="text" value={newEquipment.type} readOnly />
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
