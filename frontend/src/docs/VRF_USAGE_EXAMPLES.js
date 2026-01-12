/**
 * VRF System Implementation - Example Usage
 * 
 * This file demonstrates how to use the new VRF system features
 * in the AC Commerce platform for designing HVAC systems.
 */

// ============================================================================
// EXAMPLE 1: Creating a 4-Room VRF-Ducted System
// ============================================================================

/**
 * Scenario: Design a VRF system for a 4-room apartment
 * - Living Room: 300 sq ft
 * - Bedroom 1: 150 sq ft
 * - Bedroom 2: 150 sq ft
 * - Kitchen: 200 sq ft
 */

import VRFCalculations from './utils/vrfCalculations';

// Step 1: Calculate BTU requirements for each room
const livingRoomBTU = VRFCalculations.estimateRoomBTU(300, {
    climate: 'moderate',
    insulation: 'average',
    sunExposure: 'high' // Living room has big windows
});
console.log('Living Room BTU:', livingRoomBTU); // 18000

const bedroom1BTU = VRFCalculations.estimateRoomBTU(150, {
    climate: 'moderate',
    insulation: 'average',
    sunExposure: 'low'
});
console.log('Bedroom 1 BTU:', bedroom1BTU); // 12000

const bedroom2BTU = VRFCalculations.estimateRoomBTU(150, {
    climate: 'moderate',
    insulation: 'average',
    sunExposure: 'low'
});
console.log('Bedroom 2 BTU:', bedroom2BTU); // 12000

const kitchenBTU = VRFCalculations.estimateRoomBTU(200, {
    climate: 'moderate',
    insulation: 'good', // Modern kitchen with insulated windows
    sunExposure: 'moderate'
});
console.log('Kitchen BTU:', kitchenBTU); // 12000

// Step 2: Create annotation object with VRF data
const vrfAnnotation = {
    annotations: {
        rectangles: [
            // Floor plan rectangles for rooms
            {
                id: 'room-living',
                xPercent: 0.2,
                yPercent: 0.3,
                widthPercent: 0.4,
                heightPercent: 0.4,
                fill: 'rgba(200, 200, 200, 0.2)'
            },
            // ... other rooms
        ],
        comments: [
            {
                id: 'label-living',
                xPercent: 0.35,
                yPercent: 0.5,
                text: 'Living Room'
            },
            // ... other labels
        ],
        vrf: {
            outdoorUnits: [
                {
                    id: 'outdoor-1',
                    xPercent: 0.05,
                    yPercent: 0.05,
                    sizePercent: 0.12,
                    capacity: 48000, // Will be selected by system
                    unitsConnected: 4
                }
            ],
            indoorUnits: [
                {
                    id: 'indoor-living',
                    xPercent: 0.3,
                    yPercent: 0.4,
                    sizePercent: 0.08,
                    roomName: 'Living Room',
                    capacity: livingRoomBTU
                },
                {
                    id: 'indoor-bed1',
                    xPercent: 0.7,
                    yPercent: 0.25,
                    sizePercent: 0.08,
                    roomName: 'Bedroom 1',
                    capacity: bedroom1BTU
                },
                {
                    id: 'indoor-bed2',
                    xPercent: 0.7,
                    yPercent: 0.55,
                    sizePercent: 0.08,
                    roomName: 'Bedroom 2',
                    capacity: bedroom2BTU
                },
                {
                    id: 'indoor-kitchen',
                    xPercent: 0.3,
                    yPercent: 0.8,
                    sizePercent: 0.08,
                    roomName: 'Kitchen',
                    capacity: kitchenBTU
                }
            ]
        }
    },
    acType: 'vrf-ducted'
};

// Step 3: Validate the system
const totalIndoorCapacity = VRFCalculations.calculateTotalIndoorCapacity(
    vrfAnnotation.annotations.vrf.indoorUnits
);
console.log('Total Indoor Capacity:', totalIndoorCapacity); // 54000 BTU

const validation = VRFCalculations.validateVRFCapacity(
    48000, // Outdoor capacity
    totalIndoorCapacity
);
console.log('Validation:', validation);
// {
//   isValid: false,
//   message: "Outdoor unit (48000 BTU) is undersized. Minimum recommended: 48600 BTU"
// }

// Step 4: Adjust outdoor unit and validate again
const recommendedOutdoor = VRFCalculations.selectOutdoorCondenserSize(totalIndoorCapacity);
console.log('Recommended Outdoor Unit:', recommendedOutdoor); // 60000

vrfAnnotation.annotations.vrf.outdoorUnits[0].capacity = recommendedOutdoor;

const validationFinal = VRFCalculations.validateVRFCapacity(
    recommendedOutdoor,
    totalIndoorCapacity
);
console.log('Final Validation:', validationFinal);
// {
//   isValid: true,
//   message: "System capacity is properly sized",
//   utilizationRatio: "90.0%"
// }

// Step 5: Get system summary
const systemSummary = VRFCalculations.generateSystemSummary(
    vrfAnnotation.annotations.vrf.outdoorUnits[0],
    vrfAnnotation.annotations.vrf.indoorUnits
);
console.log('System Summary:', systemSummary);
// {
//   outdoorCapacity: 60000,
//   numberOfIndoorUnits: 4,
//   totalIndoorCapacity: 54000,
//   capacityValidation: { isValid: true, ... },
//   refrigerantLines: { mainSupplyVaporLine: 1, ... },
//   systemType: "VRF",
//   estimatedEfficiency: "90.0%"
// }

// ============================================================================
// EXAMPLE 2: VRF-Ductless System (Alternate Mode in PDF Export)
// ============================================================================

/**
 * When user exports to PDF, the system automatically creates:
 * Page 1: VRF-Ducted (current selection)
 * Page 2: VRF-Ductless (alternate mode) with same outdoor/indoor units
 * 
 * The visual representation changes:
 * - Ducted: Shows ducts and diffusers inside rooms
 * - Ductless: Shows only outdoor/indoor units with wall-mounted emphasis
 */

// ============================================================================
// EXAMPLE 3: Ductwork Sizing for VRF-Ducted System
// ============================================================================

// For the living room (18000 BTU) in ducted mode
const livingRoomDuctSize = VRFCalculations.calculateDuctSize(livingRoomBTU);
console.log('Living Room Duct Sizing:', livingRoomDuctSize);
// {
//   estimatedCFM: 1500,
//   estimatedDuctDiameter: "17.4\"",
//   recommendedVelocity: "400 FPM",
//   ductArea: "236.57 sq in"
// }

// For kitchen (12000 BTU)
const kitchenDuctSize = VRFCalculations.calculateDuctSize(kitchenBTU);
console.log('Kitchen Duct Sizing:', kitchenDuctSize);
// {
//   estimatedCFM: 1000,
//   estimatedDuctDiameter: "14.3\"",
//   recommendedVelocity: "400 FPM",
//   ductArea: "160.52 sq in"
// }

// ============================================================================
// EXAMPLE 4: Refrigerant Line Requirements
// ============================================================================

const lineRequirements = VRFCalculations.calculateRefrigerantLines(4);
console.log('Refrigerant Line Requirements:', lineRequirements);
// {
//   mainSupplyVaporLine: 1,
//   mainReturnLiquidLine: 1,
//   additionalBranchLines: 1,
//   totalLines: 3,
//   estimatedPipeSize: "3/4\" - 1\""
// }

// ============================================================================
// EXAMPLE 5: React Component Usage
// ============================================================================

/**
 * In EngineerViewPage.jsx:
 * 
 * 1. User selects "VRF System - Ducted" from AC Type dropdown
 * 2. User clicks "Add VRF Condenser (Outdoor)"
 * 3. User clicks on PDF → prompt appears for capacity
 * 4. Outdoor unit is placed at click location
 * 5. User clicks "Add VRF Indoor Unit (Ducted)" multiple times
 * 6. User clicks on each room location → prompt for room name
 * 7. Indoor units are placed, refrigerant lines auto-drawn
 * 8. User clicks "Save HVAC Items" to save annotation
 * 9. User clicks "Save as PDF" to generate 2-page document:
 *    - Page 1: VRF-Ducted with ductwork visualization
 *    - Page 2: VRF-Ductless (same system, different view)
 * 
 * The backend automatically stores:
 * {
 *   annotations: {
 *     vrf: { outdoorUnits: [...], indoorUnits: [...] }
 *   },
 *   acType: 'vrf-ducted'
 * }
 */

// ============================================================================
// EXAMPLE 6: Switching System Types
// ============================================================================

/**
 * UI Flow for switching from Minisplit to VRF:
 * 
 * Before:
 *   acType = 'ducted'
 *   annotations.hvac = { ducts: [...], diffusers: [...] }
 * 
 * After selecting 'vrf-ducted':
 *   acType = 'vrf-ducted'
 *   UI buttons change to: "Add VRF Condenser" and "Add VRF Indoor Unit"
 *   Legend updates to show VRF symbols
 *   Can now add: outdoorUnits and indoorUnits
 * 
 * Previously added ducts/diffusers persist in hvac field
 * (Can be combined or replaced)
 */

// ============================================================================
// EXAMPLE 7: System Validation Before Save
// ============================================================================

const preValidateSystem = (annotation) => {
    if (!annotation.annotations.vrf) {
        console.warn('No VRF data found');
        return;
    }

    const { outdoorUnits, indoorUnits } = annotation.annotations.vrf;

    if (outdoorUnits.length === 0) {
        console.error('At least one outdoor unit required');
        return false;
    }

    if (indoorUnits.length === 0) {
        console.error('At least one indoor unit required');
        return false;
    }

    const totalIndoor = VRFCalculations.calculateTotalIndoorCapacity(indoorUnits);

    outdoorUnits.forEach((outdoor, idx) => {
        const validation = VRFCalculations.validateVRFCapacity(
            outdoor.capacity,
            totalIndoor
        );

        if (!validation.isValid) {
            console.warn(`Outdoor unit ${idx + 1}: ${validation.message}`);
        }
    });

    return true;
};

preValidateSystem(vrfAnnotation); // Performs validation

// ============================================================================
// EXAMPLE 8: Exporting System Design Report
// ============================================================================

const generateDesignReport = (annotation) => {
    const vrf = annotation.annotations.vrf;
    const summary = VRFCalculations.generateSystemSummary(
        vrf.outdoorUnits[0],
        vrf.indoorUnits
    );

    const report = `
    HVAC SYSTEM DESIGN REPORT
    ========================
    
    System Type: ${annotation.acType}
    
    OUTDOOR CONDENSER:
    - Capacity: ${summary.outdoorCapacity} BTU
    - Location: (${(vrf.outdoorUnits[0].xPercent * 100).toFixed(1)}%, ${(vrf.outdoorUnits[0].yPercent * 100).toFixed(1)}%)
    
    INDOOR UNITS:
    ${vrf.indoorUnits.map((unit, idx) => `
    Unit ${idx + 1}: ${unit.roomName}
    - Capacity: ${unit.capacity} BTU
    - Location: (${(unit.xPercent * 100).toFixed(1)}%, ${(unit.yPercent * 100).toFixed(1)}%)
    `).join('')}
    
    SYSTEM VALIDATION:
    - Total Indoor Capacity: ${summary.totalIndoorCapacity} BTU
    - Capacity Status: ${summary.capacityValidation.isValid ? 'VALID' : 'INVALID'}
    - System Utilization: ${summary.estimatedEfficiency}
    - Message: ${summary.capacityValidation.message}
    
    REFRIGERANT REQUIREMENTS:
    - Main Lines: 2 (Supply/Return)
    - Additional Branch Lines: ${summary.refrigerantLines.additionalBranchLines}
    - Total Lines: ${summary.refrigerantLines.totalLines}
    - Recommended Pipe Size: ${summary.refrigerantLines.estimatedPipeSize}
  `;

    return report;
};

console.log(generateDesignReport(vrfAnnotation));

// ============================================================================
// KEY POINTS FOR DEVELOPERS
// ============================================================================

/*
1. STATE MANAGEMENT:
   - acType can be: 'ducted', 'ductless', 'vrf-ducted', 'vrf-ductless'
   - Use acType.startsWith('vrf') to check if VRF system
   
2. DATA STRUCTURE:
   - hvac field: For minisplit systems
   - vrf field: For VRF systems
   - Can coexist (user might switch types)
   
3. RENDERING:
   - overlayVRFSystem() draws outdoor/indoor units and refrigerant lines
   - drawVRFAnnotations() renders to PDF canvas
   - Automatic line routing connects outdoor to all indoor units
   
4. UTILITIES:
   - Import from utils/vrfCalculations.js
   - All functions pure (no side effects)
   - Return clear, typed objects
   
5. PDF EXPORT:
   - Automatically creates 2 pages
   - Page 1: Current system type (e.g., vrf-ducted)
   - Page 2: Alternate type (e.g., vrf-ductless)
   - Same outdoor/indoor units, different ductwork visualization
   
6. VALIDATION:
   - Always validate before saving
   - Use validateVRFCapacity() to check system sizing
   - Show user-friendly error messages
   
7. USER PROMPTS:
   - "Add VRF Condenser": prompt("Enter outdoor unit capacity (e.g., 48000):")
   - "Add VRF Indoor Unit": prompt("Enter room/zone name (e.g., Living Room):")
*/
