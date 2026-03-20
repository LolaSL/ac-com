// Example: List of common AC installation recommendations and spare parts
// You can expand or localize this list as needed for your market

export const COMMON_AC_RECOMMENDATIONS = [
  // ========== Mini Split AC ==========
  {
    category: "Mini Split AC",
    name: "Wall-Mounted Split AC (12,000 BTU)",
    description: "Standard indoor air handler for residential rooms.",
    typicalUse: "Living rooms, bedrooms, offices",
  },
  {
    category: "Mini Split AC",
    name: "Floor-Standing AC Unit (18,000 BTU)",
    description: "Freestanding unit for larger rooms or spaces.",
    typicalUse: "Server rooms, large offices, retail spaces",
  },

  // ========== Wall-Mounted AC ==========
  {
    category: "Wall-Mounted AC",
    name: "High-Wall Mounted AC (9,000 BTU)",
    description: "Compact wall unit for small to medium rooms.",
    typicalUse: "Bedrooms, small offices, apartments",
  },
  {
    category: "Wall-Mounted AC",
    name: "Wall-Mounted Inverter AC (18,000 BTU)",
    description: "Energy-efficient inverter for medium to large rooms.",
    typicalUse: "Living rooms, master bedrooms, open offices",
  },

  // ========== Cassette Indoor Unit ==========
  {
    category: "Cassette Indoor Unit",
    name: "Ceiling Cassette AC (24,000 BTU)",
    description: "Flush-mounted for commercial or large open spaces.",
    typicalUse: "Shops, restaurants, open-plan offices",
  },
  {
    category: "Cassette Indoor Unit",
    name: "4-Way Cassette AC (36,000 BTU)",
    description: "360-degree airflow distribution for large areas.",
    typicalUse: "Conference rooms, retail floors, lobbies",
  },

  // ========== Wind-Free TM Cooling ==========
  {
    category: "Wind-Free TM Cooling",
    name: "Wind-Free Wall Unit (12,000 BTU)",
    description: "Micro-hole dispersed cooling without direct wind.",
    typicalUse: "Bedrooms, nurseries, offices",
  },
  {
    category: "Wind-Free TM Cooling",
    name: "Wind-Free 2.0 (18,000 BTU)",
    description: "Advanced wind-free technology for larger spaces.",
    typicalUse: "Living rooms, master suites",
  },

  // ========== VRF Heat Recovery ==========
  {
    category: "VRF Heat Recovery",
    name: "VRF Outdoor Unit (High Capacity)",
    description: "Variable Refrigerant Flow for large commercial installations.",
    typicalUse: "Multi-floor buildings, hotels, large commercial spaces",
  },
  {
    category: "VRF Heat Recovery",
    name: "Inverter Outdoor Condenser (Multi-Split)",
    description: "Variable-speed compressor for energy efficiency.",
    typicalUse: "Supports multiple indoor units",
  },
  {
    category: "VRF Heat Recovery",
    name: "Single Split Outdoor Condenser",
    description: "Standard outdoor unit for single indoor unit.",
    typicalUse: "Residential single-room installations",
  },

  // ========== Controller ==========
  {
    category: "Controller",
    name: "Wi-Fi Smart Controller",
    description: "Enables app-based and remote control of AC units.",
    typicalUse: "Smart home integration, remote management",
  },
  {
    category: "Controller",
    name: "Wired Wall Controller",
    description: "Hard-wired thermostat and control panel.",
    typicalUse: "Ducted systems, commercial installations",
  },

  // ========== Fan Motor ==========
  {
    category: "Fan Motor",
    name: "Indoor Fan Motor",
    description: "Replacement motor for indoor unit blower fan.",
    typicalUse: "Repair of non-functioning indoor fans",
  },
  {
    category: "Fan Motor",
    name: "Outdoor Fan Motor",
    description: "Replacement motor for outdoor condenser fan.",
    typicalUse: "Repair of non-functioning outdoor fans",
  },

  // ========== Fans ==========
  {
    category: "Fans",
    name: "Cross-Flow Fan Blade",
    description: "Replacement blower wheel for indoor units.",
    typicalUse: "Indoor unit fan replacement",
  },
  {
    category: "Fans",
    name: "Axial Fan Blade (Outdoor)",
    description: "Replacement propeller fan for condenser units.",
    typicalUse: "Outdoor unit fan replacement",
  },

  // ========== Filters ==========
  {
    category: "Filters",
    name: "Air Filter Set (Washable)",
    description: "Replacement filters for indoor units.",
    typicalUse: "Regular maintenance, all indoor units",
  },
  {
    category: "Filters",
    name: "Carbon Activated Filter",
    description: "Odor and VOC removal filter.",
    typicalUse: "Air quality improvement, allergy relief",
  },

  // ========== Knobs ==========
  {
    category: "Knobs",
    name: "Temperature Control Knob",
    description: "Replacement dial for manual AC controls.",
    typicalUse: "Older window/wall units",
  },
  {
    category: "Knobs",
    name: "Mode Selection Knob",
    description: "Replacement knob for mode/fan speed selector.",
    typicalUse: "Manual control panel replacements",
  },

  // ========== Power Cords ==========
  {
    category: "Power Cords",
    name: "AC Power Cord (Standard)",
    description: "Replacement power cable for AC units.",
    typicalUse: "Damaged cord replacement, new installations",
  },
  {
    category: "Power Cords",
    name: "Heavy-Duty Power Cord (20A)",
    description: "High-capacity power cable for larger units.",
    typicalUse: "Commercial units, high-BTU systems",
  },

  // ========== Mounting & Installation ==========
  {
    category: "Mounting",
    name: "Wall Bracket for Outdoor Unit",
    description: "Heavy-duty bracket for mounting condenser on wall.",
    typicalUse: "Where ground space is limited",
  },
  {
    category: "Mounting",
    name: "Ground Stand for Outdoor Unit",
    description: "Elevated platform for ground-mounted condensers.",
    typicalUse: "Standard installations with available ground space",
  },
  {
    category: "Mounting",
    name: "Roof Mounting Frame",
    description: "Weatherproof frame for rooftop condenser installation.",
    typicalUse: "Flat roofs, commercial buildings",
  },
  {
    category: "Mounting",
    name: "Vibration Dampening Pads",
    description: "Rubber pads to reduce noise and vibration.",
    typicalUse: "All outdoor unit installations",
  },

  // ========== Refrigerant Piping ==========
  {
    category: "Refrigerant Piping",
    name: "Copper Refrigerant Pipe (Insulated)",
    description: "Pre-insulated copper pipe for refrigerant lines.",
    typicalUse: "Connects indoor and outdoor units",
  },
  {
    category: "Refrigerant Piping",
    name: "Refrigerant Line Set (Pre-charged)",
    description: "Pre-charged line set with quick-connect fittings.",
    typicalUse: "Quick installations, reduces installation time",
  },
  {
    category: "Refrigerant Piping",
    name: "Pipe Insulation Sleeve",
    description: "Additional insulation for refrigerant pipes.",
    typicalUse: "Long pipe runs, extreme climates",
  },
  {
    category: "Refrigerant Piping",
    name: "Flare Fittings & Connectors",
    description: "Quality brass fittings for secure connections.",
    typicalUse: "All refrigerant line connections",
  },

  // ========== Drainage ==========
  {
    category: "Drainage",
    name: "PVC Drain Pipe",
    description: "For condensate water drainage from indoor units.",
    typicalUse: "All split AC installations",
  },
  {
    category: "Drainage",
    name: "Condensate Pump",
    description: "Pumps water upward when gravity drainage isn't possible.",
    typicalUse: "Basement installations, below-grade units",
  },
  {
    category: "Drainage",
    name: "Float Switch for Drain",
    description: "Safety switch to prevent overflow.",
    typicalUse: "Critical installations, ceiling-mounted units",
  },
  {
    category: "Drainage",
    name: "Drain Line Insulation",
    description: "Prevents condensation on drain pipes.",
    typicalUse: "Humid climates, exposed drain lines",
  },

  // ========== Electrical ==========
  {
    category: "Electrical",
    name: "Dedicated Circuit Breaker (20A)",
    description: "Required for safe AC operation.",
    typicalUse: "Main panel to outdoor unit",
  },
  {
    category: "Electrical",
    name: "Electrical Cable (4-Wire)",
    description: "Heavy-duty cable for power connection.",
    typicalUse: "Connecting outdoor unit to electrical panel",
  },
  {
    category: "Electrical",
    name: "Disconnect Box",
    description: "Safety disconnect switch near outdoor unit.",
    typicalUse: "Required by code for outdoor units",
  },
  {
    category: "Electrical",
    name: "Control Wiring Kit",
    description: "Low-voltage wiring for indoor/outdoor communication.",
    typicalUse: "All split system installations",
  },
  {
    category: "Electrical",
    name: "Surge Protector for AC",
    description: "Protects AC system from electrical surges.",
    typicalUse: "Areas with frequent power fluctuations",
  },

  // ========== Accessories ==========
  {
    category: "Accessories",
    name: "Remote Control",
    description: "Wireless remote for indoor unit operation.",
    typicalUse: "All modern AC units",
  },
  {
    category: "Accessories",
    name: "Decorative Line Set Cover",
    description: "Covers exposed refrigerant pipes for aesthetics.",
    typicalUse: "Indoor pipe runs, visible installations",
  },

  // ========== Consumables ==========
  {
    category: "Consumables",
    name: "Refrigerant Gas (R410A or R32)",
    description: "For system charging and top-up.",
    typicalUse: "All new and serviced AC systems",
  },
  {
    category: "Consumables",
    name: "Insulation Tape",
    description: "For sealing pipe joints and insulation.",
    typicalUse: "All installations",
  },
  {
    category: "Consumables",
    name: "Vacuum Pump Oil",
    description: "For vacuum pump during installation.",
    typicalUse: "Professional installation, system evacuation",
  },
  {
    category: "Consumables",
    name: "Sealant & Caulking",
    description: "Seals penetrations and prevents air leaks.",
    typicalUse: "Wall penetrations, pipe entry points",
  },
  {
    category: "Consumables",
    name: "Copper Pipe Cleaner",
    description: "Chemical cleaner for copper pipe preparation.",
    typicalUse: "Flare connections, brazing preparation",
  },

  // ========== Spare Parts ==========
  {
    category: "Spare Parts",
    name: "AC Capacitor",
    description: "Common replacement part for outdoor units.",
    typicalUse: "Maintenance and repair",
  },
  {
    category: "Spare Parts",
    name: "Thermostat Sensor",
    description: "Temperature sensor for accurate control.",
    typicalUse: "Faulty or inaccurate temperature readings",
  },
  {
    category: "Spare Parts",
    name: "Contactor Relay",
    description: "Electromagnetic switch for compressor control.",
    typicalUse: "Compressor won't start, electrical failure",
  },
  {
    category: "Spare Parts",
    name: "PCB Control Board",
    description: "Main circuit board for AC unit control.",
    typicalUse: "System malfunction, electronic failure",
  },
  {
    category: "Spare Parts",
    name: "Pressure Switch",
    description: "Safety switch for refrigerant pressure monitoring.",
    typicalUse: "System protection, pressure-related faults",
  },
  {
    category: "Spare Parts",
    name: "Expansion Valve",
    description: "Controls refrigerant flow into evaporator.",
    typicalUse: "Poor cooling performance, frosting issues",
  },
];
