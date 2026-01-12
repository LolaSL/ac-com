# VRF System Implementation Guide

## Overview

This document describes the VRF (Variable Refrigerant Flow) system support added to the AC Commerce platform. The implementation extends the existing minisplit ducted/ductless system to support enterprise-level VRF systems with multiple indoor units connected to a single outdoor condenser.

## New Features

### 1. AC System Types

Four system types are now supported:

- **Minisplit - Ducted**: Traditional ducted minisplit system with central ductwork
- **Minisplit - Ductless**: Wall-mounted ductless minisplit units (one per room)
- **VRF System - Ducted**: Multiple indoor units (ducted) connected to outdoor condenser
- **VRF System - Ductless**: Multiple ductless/mini-split indoor units connected to outdoor condenser

### 2. User Interface

#### EngineerViewPage.jsx

**AC Type Selector:**

```jsx
<select value={acType} onChange={(e) => setAcType(e.target.value)}>
  <option value="ducted">Minisplit - Ducted</option>
  <option value="ductless">Minisplit - Ductless</option>
  <option value="vrf-ducted">VRF System - Ducted</option>
  <option value="vrf-ductless">VRF System - Ductless</option>
</select>
```

**Toggle Buttons for VRF Systems:**

For `vrf-ducted`:

- Add VRF Condenser (Outdoor) - Places outdoor unit on plan
- Add VRF Indoor Unit (Ducted) - Places ducted indoor unit
- Add Comment - Adds labels/notes

For `vrf-ductless`:

- Add VRF Condenser (Outdoor) - Places outdoor unit on plan
- Add VRF Indoor Unit (Ductless) - Places ductless indoor unit
- Add Comment - Adds labels/notes

**Interactive Placement:**
Users can click on the PDF to:

1. Place outdoor condenser units (red squares with capacity in BTU)
2. Place indoor units (blue squares with room names)
3. Automatic refrigerant lines connect outdoor to all indoor units (red dashed lines)

### 3. Visual Representation

#### On Canvas (EngineerViewPage)

**Outdoor Condenser:**

- Large red rectangle with "Condenser" label
- Displays capacity (e.g., "48000 BTU")
- Thick red border

**Indoor Units (Ducted):**

- Blue rectangles with room names
- Smaller than outdoor units
- Shows unit identification

**Indoor Units (Ductless):**

- Blue rectangles with room names
- Similar size to minisplit units
- Shows unit identification

**Refrigerant Lines:**

- Red dashed lines connecting outdoor to each indoor unit
- Represents refrigerant flow paths

**Optional Ductwork (VRF-Ducted only):**

- Light blue ducts with dark blue borders
- Green diffusers for air distribution

#### In PDF Export (SaveAsPDF)

Same visual representation as canvas, with:

- Page 1: Current system mode (e.g., VRF-Ducted)
- Page 2: Alternate system mode (e.g., VRF-Ductless)
- Clear page labels for system identification
- Watermark for paid annotations

### 4. Data Structure

#### Annotation Object Enhancement

```javascript
{
  annotations: {
    rectangles: [...],      // Room boundaries
    lines: [...],           // Manual annotations
    comments: [...],        // Labels and notes
    hvac: {                 // For minisplit systems
      ducts: [...],
      diffusers: [...]
    },
    vrf: {                  // NEW: For VRF systems
      outdoorUnits: [
        {
          id: "outdoor-1234567890",
          xPercent: 0.2,      // Position on page (0-1)
          yPercent: 0.3,
          sizePercent: 0.12,  // Size relative to canvas
          capacity: 48000,    // Total BTU capacity
          unitsConnected: 4   // Number of indoor units
        }
      ],
      indoorUnits: [
        {
          id: "indoor-1234567891",
          xPercent: 0.4,
          yPercent: 0.5,
          sizePercent: 0.08,
          roomName: "Living Room",
          capacity: 12000     // Individual unit BTU
        }
      ]
    }
  },
  acType: "vrf-ducted"     // System type identifier
}
```

### 5. Calculation Utilities

File: `src/utils/vrfCalculations.js`

**Key Functions:**

#### `calculateTotalIndoorCapacity(indoorUnits)`

- Sums all indoor unit capacities
- Returns total system BTU

#### `validateVRFCapacity(outdoorCapacity, totalIndoorCapacity, oversizingRatio)`

- Validates outdoor unit can handle indoor load
- Default: 90% rule (outdoor ≥ indoor × 0.9)
- Returns validation result with message

#### `calculateRefrigerantLines(numberOfIndoorUnits)`

- Estimates refrigerant line requirements
- Accounts for main supply/return + branch lines
- Suggests pipe sizing

#### `estimateRoomBTU(roomArea, factors)`

- Calculates BTU requirement based on:
  - Room area (sq ft)
  - Climate (hot/moderate/cold)
  - Insulation quality
  - Sun exposure
- Returns nearest standard unit size

#### `selectOutdoorCondenserSize(totalIndoorCapacity)`

- Recommends outdoor unit size
- Ensures proper capacity with 90% minimum utilization

#### `generateSystemSummary(outdoorUnit, indoorUnits)`

- Creates comprehensive system overview
- Includes capacity validation
- Shows efficiency metrics

#### `calculateDuctSize(indoorUnitCapacity)`

- Determines ductwork dimensions
- Uses standard 400 FPM velocity
- Returns CFM, diameter, and area

### 6. Backend Considerations

**Annotation Model Update:**

```javascript
annotation: {
  vrf: {
    outdoorUnits: [{...}],
    indoorUnits: [{...}]
  },
  acType: String  // New field: 'ducted', 'ductless', 'vrf-ducted', 'vrf-ductless'
}
```

**PDF Generation:**

Backend should handle rendering VRF system:

- Draw outdoor condenser (red)
- Draw indoor units (blue)
- Draw refrigerant lines (red dashed)
- For VRF-Ducted: also render ductwork

### 7. Usage Workflow

#### Creating a VRF-Ducted System

1. Upload floor plan PDF
2. In Engineer View, select "VRF System - Ducted"
3. Click "Show HVAC Layer"
4. Click "Add VRF Condenser (Outdoor)" and place outdoor unit
5. Click "Add VRF Indoor Unit (Ducted)" and place indoor units in each room
6. Add comments for zone labels if needed
7. Click "Save HVAC Items"
8. Click "Save as PDF" to generate two-page document

#### Creating a VRF-Ductless System

1-4. Same as above, but select "VRF System - Ductless" 5. Click "Add VRF Indoor Unit (Ductless)" instead
6-8. Same as above

### 8. UI/UX Enhancements

**Legend Updates:**

For Minisplit-Ducted:

- ■ Ducts (Yellow/Orange)
- ● Diffusers (Green/Lime)

For VRF-Ducted:

- ■ Outdoor Condenser (Red)
- ■ Indoor Units (Blue) - Ducted
- --- Refrigerant Lines (Red Dashed)

For VRF-Ductless:

- ■ Outdoor Condenser (Red)
- ■ Indoor Units (Blue) - Ductless/Mini-split
- --- Refrigerant Lines (Red Dashed)

**Undo Button:**

- Renamed from "Cancel" to "Undo Last"
- Removes most recently added item (any type)
- Works with both HVAC and VRF systems

### 9. Technical Implementation

**Files Modified:**

1. **EngineerViewPage.jsx**

   - Added `overlayVRFSystem()` function
   - Extended acType state: `'ducted' | 'ductless' | 'vrf-ducted' | 'vrf-ductless'`
   - Added VRF button handlers (outdoor/indoor placement)
   - Updated UI with VRF options and legends
   - Enhanced undo logic for VRF units

2. **SaveAsPDF.jsx**

   - Added `drawVRFAnnotations()` function
   - Updated `drawAnnotations()` to call VRF renderer
   - Enhanced alternate mode calculation
   - Improved page labeling system

3. **New File: vrfCalculations.js**
   - VRF-specific calculation utilities
   - Capacity validation
   - System design helpers

### 10. Testing Checklist

- [ ] Select each AC Type and verify UI updates
- [ ] Add outdoor condenser to VRF system
- [ ] Add multiple indoor units
- [ ] Verify refrigerant lines connect properly
- [ ] Toggle HVAC layer on/off
- [ ] Undo functionality works for both HVAC and VRF items
- [ ] Save and load annotation with VRF data
- [ ] Generate PDF with VRF-Ducted system
- [ ] Verify alternate page (VRF-Ductless) generates correctly
- [ ] Check all legends display correctly
- [ ] Test with 4-room example system
- [ ] Verify watermark on paid PDFs

### 11. Future Enhancements

- [ ] VRF capacity validation in UI (warning if oversized)
- [ ] Automatic refrigerant line routing
- [ ] Zone/group assignment UI
- [ ] Load calculation per room
- [ ] Pipe sizing and material recommendations
- [ ] 3D visualization of VRF systems
- [ ] Export system specifications to report
- [ ] Integration with equipment database
- [ ] Cost estimation for VRF vs minisplit
- [ ] Performance comparisons

### 12. API Endpoints (Backend)

Existing endpoints should be updated to handle new acType values:

```http
GET  /api/annotations/:id
PUT  /api/annotations/:id          (save with new vrf field)
GET  /api/annotated-pdf/:id
POST /api/annotated-pdf/:id/generate (render PDF with VRF support)
```

### 13. Example Usage

```javascript
// Creating a VRF system with 4 rooms
const vrfSystem = {
  outdoorUnits: [
    {
      id: "outdoor-1234",
      xPercent: 0.1,
      yPercent: 0.1,
      capacity: 48000,
      sizePercent: 0.12,
    },
  ],
  indoorUnits: [
    {
      id: "indoor-1",
      roomName: "Living Room",
      capacity: 12000,
      xPercent: 0.3,
      yPercent: 0.3,
      sizePercent: 0.08,
    },
    {
      id: "indoor-2",
      roomName: "Bedroom 1",
      capacity: 12000,
      xPercent: 0.6,
      yPercent: 0.3,
      sizePercent: 0.08,
    },
    {
      id: "indoor-3",
      roomName: "Bedroom 2",
      capacity: 12000,
      xPercent: 0.3,
      yPercent: 0.6,
      sizePercent: 0.08,
    },
    {
      id: "indoor-4",
      roomName: "Kitchen",
      capacity: 12000,
      xPercent: 0.6,
      yPercent: 0.6,
      sizePercent: 0.08,
    },
  ],
};

// Validate system
import {
  validateVRFCapacity,
  generateSystemSummary,
} from "./utils/vrfCalculations";

const summary = generateSystemSummary(
  vrfSystem.outdoorUnits[0],
  vrfSystem.indoorUnits
);
console.log(summary.capacityValidation); // { isValid: true, ... }
```

---

## Summary

The VRF system implementation provides comprehensive support for professional HVAC system design with:

- Multiple system type options
- Interactive placement of outdoor/indoor units
- Visual refrigerant line connections
- Dual-page PDF export (current + alternate mode)
- Calculation utilities for system validation
- Enhanced user interface with proper legends

This enables engineers to design both traditional minisplit systems and modern VRF systems in a unified interface.
