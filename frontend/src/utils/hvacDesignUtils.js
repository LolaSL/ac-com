// Shared HVAC Design Utilities
// Equipment catalog matching EngineerViewPage standards

export const HVAC_EQUIPMENT_CATALOG = {
  // Ductwork types
  SUPPLY_DUCT: {
    type: 'supply-duct',
    label: 'Supply Duct',
    category: 'ductwork',
    fill: 'rgba(0,120,255,0.45)',
    stroke: '#0055CC',
    defaultWidth: 0.08,
    defaultHeight: 0.02,
  },
  RETURN_DUCT: {
    type: 'return-duct',
    label: 'Return Duct',
    category: 'ductwork',
    fill: 'rgba(255,120,50,0.40)',
    stroke: '#CC4400',
    defaultWidth: 0.08,
    defaultHeight: 0.02,
  },
  FLEX_DUCT: {
    type: 'flex-duct',
    label: 'Flex Duct',
    category: 'ductwork',
    fill: 'rgba(150,150,150,0.35)',
    stroke: '#888',
    defaultWidth: 0.06,
    defaultHeight: 0.015,
  },
  EXHAUST_DUCT: {
    type: 'exhaust-duct',
    label: 'Exhaust Duct',
    category: 'ductwork',
    fill: 'rgba(34,180,34,0.40)',
    stroke: '#228B22',
    defaultWidth: 0.08,
    defaultHeight: 0.02,
  },
  INSULATED_DUCT: {
    type: 'insulated-duct',
    label: 'Insulated Duct',
    category: 'ductwork',
    fill: 'rgba(255,180,50,0.45)',
    stroke: '#CC9900',
    defaultWidth: 0.08,
    defaultHeight: 0.02,
  },

  // Diffusers and Grilles
  SUPPLY_4WAY: {
    type: 'supply-4way',
    label: '4-Way Diffuser',
    category: 'diffuser',
    shape: 'square',
    defaultSize: 0.04,
    airflow: 400,
    color: '#0055CC',
  },
  ROUND_DIFFUSER: {
    type: 'round-diffuser',
    label: 'Round Diffuser',
    category: 'diffuser',
    shape: 'circle',
    defaultSize: 0.04,
    airflow: 250,
    color: '#0055CC',
  },
  LINEAR_SLOT: {
    type: 'linear-slot',
    label: 'Linear Slot',
    category: 'diffuser',
    shape: 'linear',
    defaultSize: 0.03,
    airflow: 300,
    color: '#0055CC',
  },
  RETURN_GRILLE: {
    type: 'return-grille',
    label: 'Return Grille',
    category: 'diffuser',
    shape: 'square',
    defaultSize: 0.04,
    airflow: 350,
    color: '#CC4400',
  },
  EXHAUST_GRILLE: {
    type: 'exhaust-grille',
    label: 'Exhaust Grille',
    category: 'diffuser',
    shape: 'square',
    defaultSize: 0.04,
    airflow: 200,
    color: '#228B22',
  },
  JET_DIFFUSER: {
    type: 'jet-diffuser',
    label: 'Jet Diffuser',
    category: 'diffuser',
    shape: 'jet',
    defaultSize: 0.035,
    airflow: 500,
    color: '#0066FF',
  },
  WALL_DIFFUSER: {
    type: 'wall-diffuser',
    label: 'Wall Diffuser',
    category: 'diffuser',
    shape: 'wall',
    defaultSize: 0.036,
    airflow: 300,
    color: '#0055CC',
  },
  TRANSFER_GRILLE: {
    type: 'transfer-grille',
    label: 'Transfer Grille',
    category: 'diffuser',
    shape: 'square',
    defaultSize: 0.036,
    airflow: 150,
    color: '#888888',
  },
  DRAIN_POINT: {
    type: 'drain-point',
    label: 'Drain Point',
    category: 'accessory',
    shape: 'drain',
    defaultSize: 0.03,
    airflow: 0,
    color: '#666666',
  },

  // Dampers
  FIRE_DAMPER: {
    type: 'fire-damper',
    label: 'Fire Damper',
    category: 'damper',
    defaultSize: 0.025,
    color: '#FF4444',
  },
  VOLUME_DAMPER: {
    type: 'volume-damper',
    label: 'Volume Damper',
    category: 'damper',
    defaultSize: 0.025,
    color: '#4444FF',
  },

  // Indoor Units (from your original types)
  FCU: {
    type: 'FCU',
    label: 'Fan Coil Unit',
    category: 'unit',
    defaultWidth: 0.05,
    defaultHeight: 0.035,
    color: '#4A90E2',
  },
  AHU: {
    type: 'AHU',
    label: 'Air Handling Unit',
    category: 'unit',
    defaultWidth: 0.06,
    defaultHeight: 0.04,
    color: '#5BA3F5',
  },
  VAV: {
    type: 'VAV',
    label: 'Variable Air Volume',
    category: 'unit',
    defaultWidth: 0.04,
    defaultHeight: 0.03,
    color: '#6FB1F7',
  },
  VRV: {
    type: 'VRV',
    label: 'VRV Indoor Unit',
    category: 'unit',
    defaultWidth: 0.05,
    defaultHeight: 0.035,
    color: '#4A90E2',
  },
  SMD: {
    type: 'SMD',
    label: 'Smoke Detector',
    category: 'accessory',
    defaultSize: 0.02,
    color: '#FF6B6B',
  },
};

// Group equipment by category for toolbar organization
export const EQUIPMENT_BY_CATEGORY = {
  ductwork: ['SUPPLY_DUCT', 'RETURN_DUCT', 'FLEX_DUCT', 'EXHAUST_DUCT', 'INSULATED_DUCT'],
  diffuser: ['SUPPLY_4WAY', 'ROUND_DIFFUSER', 'LINEAR_SLOT', 'RETURN_GRILLE', 'EXHAUST_GRILLE', 'JET_DIFFUSER', 'WALL_DIFFUSER', 'TRANSFER_GRILLE'],
  damper: ['FIRE_DAMPER', 'VOLUME_DAMPER'],
  unit: ['FCU', 'AHU', 'VAV', 'VRV'],
  accessory: ['DRAIN_POINT', 'SMD'],
};

// Render PDF to canvas (shared between EngineerView and HvacZoneDesigner)
export const renderPdfToCanvas = async (pdfFile, scale = 1.5, pdfjsLib) => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return {
    canvas,
    width: viewport.width,
    height: viewport.height,
    imageDataUrl: canvas.toDataURL('image/png'),
  };
};

// Auto-place equipment around a zone (simplified version of EngineerView logic)
export const autoPlaceEquipmentInZone = (zone, equipmentType) => {
  const equipment = [];
  const ts = Date.now();
  
  const centerX = zone.x + zone.width / 2;
  const centerY = zone.y + zone.height / 2;
  
  const config = HVAC_EQUIPMENT_CATALOG[equipmentType];
  if (!config) return equipment;
  
  // Place equipment based on type
  if (config.category === 'ductwork') {
    // Horizontal duct at top of zone
    equipment.push({
      id: `auto-${ts}-1`,
      type: config.type,
      x: zone.x + zone.width * 0.1,
      y: zone.y + zone.height * 0.2,
      width: zone.width * 0.8,
      height: config.defaultHeight * 100,
      ...config,
    });
  } else if (config.category === 'diffuser') {
    // Place diffusers in grid pattern
    const positions = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.25, y: 0.75 },
      { x: 0.75, y: 0.75 },
    ];
    
    positions.forEach((pos, i) => {
      equipment.push({
        id: `auto-${ts}-${i}`,
        type: config.type,
        x: zone.x + zone.width * pos.x,
        y: zone.y + zone.height * pos.y,
        size: config.defaultSize * 100,
        shape: config.shape,
        airflow: config.airflow,
        ...config,
      });
    });
  } else if (config.category === 'unit') {
    // Place unit at center
    equipment.push({
      id: `auto-${ts}-1`,
      type: config.type,
      x: centerX - (config.defaultWidth * 100) / 2,
      y: centerY - (config.defaultHeight * 100) / 2,
      width: config.defaultWidth * 100,
      height: config.defaultHeight * 100,
      ...config,
    });
  }
  
  return equipment;
};

// Calculate BTU requirements for a zone
export const calculateZoneBTU = (zone, climate = 'moderate') => {
  const areaSquareFeet = (zone.width * zone.height) / 144; // Assuming units are in pixels, rough conversion
  
  const btuPerSqFt = {
    hot: 35,
    moderate: 25,
    cold: 20,
  };
  
  return Math.round(areaSquareFeet * (btuPerSqFt[climate] || 25));
};

// Generate equipment label (e.g., SD-1, RD-1, etc.)
export const generateEquipmentLabel = (equipmentType, index) => {
  const prefixes = {
    'supply-duct': 'SD',
    'return-duct': 'RD',
    'flex-duct': 'FD',
    'supply-4way': 'S4W',
    'round-diffuser': 'RND',
    'fire-damper': 'FD',
    'volume-damper': 'VD',
    'FCU': 'FCU',
    'AHU': 'AHU',
    'VAV': 'VAV',
    'VRV': 'VRV',
  };
  
  const prefix = prefixes[equipmentType] || 'EQ';
  return `${prefix}-${index}`;
};
