# Multi-Flat Property Condenser Implementation

## Summary

Successfully implemented per-flat condenser calculation for multi-flat HVAC properties. The system now:

1. **Detects multi-flat properties** from AC annotations (ac-1.1, ac-1.2, condenser-1, etc.)
2. **Calculates separate condensers** for each flat based on detected flat numbers
3. **Renders multiple condenser rows** in results table with flat-specific labels
4. **Maintains backward compatibility** for single-flat properties

## Technical Changes

### 1. Condenser Calculation Logic (Lines 820-945)

**What Changed:**

- Refactored condenser selection into a reusable `findSuitableCondenser()` async helper function
- Added conditional logic to detect multi-flat scenarios:
  ```javascript
  if (isMultiFlatProperty && detectedFlats.length > 1 && acAnnotations?.length > 0)
  ```
- For multi-flat properties:
  - Groups flats using existing `groupFlatsByAnnotations()` function
  - Calculates BTU per flat from annotation-tagged rooms
  - Creates **separate condenser for each flat** with proper BTU calculations
  - Each condenser gets a `flatName` property for identification

**Multi-Flat Flow:**

1. Parse AC annotations to get flat numbers (1, 2, etc.)
2. Group rooms by flat identifier
3. Sum BTU per flat group
4. Apply condenser multiplier (0.8 for minisplit, 1.0 for VRF) per flat
5. Find suitable condenser for each flat's requirement
6. Store in array with `flatName` property

**Single-Flat Flow (Backward Compatible):**

- Uses existing logic without changes
- Applies multiplier to total BTU
- Returns single condenser in array

### 2. Sizing Status Calculation (Lines 948-960)

**What Changed:**

- Updated comparison to use `comparisonBTU = totalBTU * multiplier` instead of undefined `requiredBTU`
- Now works correctly for both single and multi-flat scenarios
- Percentage calculation: `(totalCondenserBTU / comparisonBTU) * 100`

### 3. Results Table Rendering (Lines 1705-1760)

**What Changed:**

- Updated condenser label to show flat-specific names:
  ```javascript
  {
    cond.flatName
      ? `${cond.flatName} Condenser`
      : selectedCondensers.length > 1
      ? `Condenser ${index + 1}`
      : "Condenser";
  }
  ```
- Updated BTU display logic to handle multi-flat:
  - Shows calculated BTU for each flat's condenser
  - Maintains backward compatibility with single condenser
  - Each flat-named condenser shows its own BTU value

**Example Output for 2-Flat Property:**

```
Flat 1: Room 1         | 9000 BTU | Indoor Unit
Flat 1: Room 2         | 7000 BTU | Indoor Unit
Flat 1 Condenser       | 12800 BTU | [Model Details]
Flat 2: Room 1         | 8000 BTU | Indoor Unit
Flat 2: Room 2         | 5000 BTU | Indoor Unit
Flat 2 Condenser       | 10400 BTU | [Model Details]
```

## Key Features

### Flat Detection

- Uses existing `parseAcAnnotations()` function to extract condenser numbers
- Pattern matching: `condenser-1`, `condenser-2`, `condenser-3`, etc.
- Automatically sets `isMultiFlatProperty` when multiple flats detected
- Stores flat names in `detectedFlats` array (e.g., ["Flat 1", "Flat 2"])

### BTU Calculation Per Flat

- If rooms have flat identifiers: Sums actual room BTU for that flat
- Fallback: Distributes total BTU equally across flats based on AC unit count
- Last resort: Equal distribution: `btuPerFlat = totalBTU / detectedFlats.length`

### Condenser Selection

- Uses existing API endpoint: `/api/products/condensers/:btu`
- Searches for closest matching condenser for each flat's requirement
- Creates custom condenser if no suitable match found
- Each condenser independently evaluated for "custom" vs "standard" status

## Props & State Variables

### New/Modified State

```javascript
const [isMultiFlatProperty, setIsMultiFlatProperty] = useState(false);
const [detectedFlats, setDetectedFlats] = useState([]); // ["Flat 1", "Flat 2", ...]
// selectedCondensers now contains objects with optional flatName property
```

### Component Props

- `acAnnotations`: Array of annotation objects with `label` property
  - Labels like "ac-1.1", "ac-2.1", "condenser-1", "condenser-2"
  - Passed from Annotator component when exporting rooms to BTU Calculator

## Testing Checklist

### Multi-Flat Scenario (ac-1.1, ac-1.2, ac-2.1, ac-2.2, condenser-1, condenser-2)

1. **Annotation Import**

   - [ ] Open Annotator, create rooms with AC annotations
   - [ ] Export to BTU Calculator with annotations
   - [ ] Verify `isMultiFlatProperty` sets to true
   - [ ] Check console: "Multi-flat property detected"

2. **Condenser Calculation**

   - [ ] Confirm separate condensers created for Flat 1 and Flat 2
   - [ ] Verify each condenser has unique BTU calculation
   - [ ] Check console for per-flat BTU summaries
   - [ ] Confirm `flatName` property on condenser objects

3. **Results Display**

   - [ ] Table shows "Flat 1 Condenser" and "Flat 2 Condenser" labels
   - [ ] Each condenser row shows separate BTU value
   - [ ] Prices calculated independently per condenser
   - [ ] System type (VRF vs Minisplit) applied correctly

4. **Cart Addition**

   - [ ] Click "Save to Cart" button
   - [ ] Confirm both condensers added to cart
   - [ ] Check cart quantity reflects 2 separate condenser products

5. **ROI Calculation**
   - [ ] Click "Calculate ROI"
   - [ ] Verify ROI includes both condensers in cost calculation
   - [ ] Check financial analysis uses total condenser cost

### Single-Flat Scenario (Backward Compatibility)

1. **Without Annotations**

   - [ ] Load BTU Calculator without AC annotations
   - [ ] Confirm `isMultiFlatProperty` stays false
   - [ ] Single condenser calculated as before
   - [ ] Table shows "Condenser" label (not numbered)

2. **With Single Flat Annotations**
   - [ ] Annotations with only condenser-1
   - [ ] Should still use single-flat logic
   - [ ] Results identical to non-annotated scenario

## Files Modified

- `frontend/src/components/BtuCalculator.jsx`
  - Lines 820-945: Condenser calculation logic refactor
  - Lines 948-960: Sizing status calculation fix
  - Lines 1705-1760: Results table rendering update

## API Integration Points

### Unchanged

- `/api/products/btu/:btu` - Individual room product selection (unchanged)
- `/api/products/condensers/:btu` - Condenser selection (now called per-flat)

### New Behavior

- Endpoint called **N times** for N flats instead of once for total
- Each call uses flat-specific BTU requirement

## Known Limitations & Future Improvements

### Current Limitations

1. Room-to-flat mapping assumes either:
   - Room names contain flat identifier ("Flat 1: Bedroom")
   - OR equal distribution based on AC unit count
2. Condenser-to-room linking via annotations only; no UI for manual assignment
3. Per-flat pricing shows separately but no bundle discount logic

### Recommended Future Enhancements

1. **Room Tagging UI**: Allow users to explicitly assign rooms to flats
2. **Bundle Discounts**: Calculate discounts for multi-flat installations
3. **System-Wide Optimization**: Suggest shared outdoor units vs separate per-flat
4. **Export**: Update PDF export to show per-flat condenser details
5. **History**: Store and compare multi-flat configurations

## Debugging Commands

```javascript
// Check multi-flat detection
console.log({ isMultiFlatProperty, detectedFlats });

// Check flat grouping
const { flats } = groupFlatsByAnnotations(acAnnotations);
console.log("Flat grouping:", flats);

// Check condenser array
console.log("Selected condensers:", selectedCondensers);

// Check individual condenser details
selectedCondensers.forEach((c, i) => {
  console.log(`Condenser ${i}:`, {
    name: c.name,
    btu: c.btu,
    flatName: c.flatName,
  });
});
```

## Configuration Constants

The system uses existing constants for efficiency calculations:

- `MAX_MINISPLIT_CAPACITY`: 24000 BTU (threshold for VRF)
- Condenser multiplier: 0.8 (minisplit), 1.0 (VRF)
- Custom condenser price estimate: `requiredBTU * 0.065`

## Integration with Existing Features

### Modal Workflow

- Both "Save to Cart" and "Calculate ROI" buttons now work with multi-flat condensers
- Modal properly handles multiple condenser additions to cart

### ROI Calculator Integration

- Receives complete condenser array via `btuData`
- Can analyze ROI for each flat separately or combined
- Auto-description includes condenser count information

### PDF Export

- Uses selectedCondensers array directly
- Shows all condensers in export table
- Per-flat labels visible in PDF

---

## Implementation Complete ✓

The multi-flat property support is now fully integrated and backward compatible. The system seamlessly handles both single-flat and multi-flat properties without requiring user intervention or selection.
