# Multi-Flat Property Testing Guide

## Quick Start: Test Multi-Flat Condenser Logic

### Scenario Setup

To test the multi-flat condenser implementation, you need:

1. **Floorplan with Multiple ACs** in Annotator

   - Flat 1: ac-1.1, ac-1.2
   - Flat 2: ac-2.1, ac-2.2
   - Outdoor units: condenser-1, condenser-2

2. **Rooms for Each Flat**
   - Flat 1: Bedroom (15 m²), Living Room (20 m²)
   - Flat 2: Bedroom (14 m²), Kitchen (12 m²)

### Step-by-Step Test

#### Step 1: Annotate in Floorplan (Annotator Component)

```
1. Click "Add Annotation"
2. Label: "ac-1.1" → Flat 1, AC Unit 1
3. Label: "ac-1.2" → Flat 1, AC Unit 2
4. Label: "ac-2.1" → Flat 2, AC Unit 1
5. Label: "ac-2.2" → Flat 2, AC Unit 2
6. Label: "condenser-1" → Outdoor unit for Flat 1
7. Label: "condenser-2" → Outdoor unit for Flat 2
```

#### Step 2: Add Rooms (Same as Before)

```
Flat 1:
- Name: "Flat 1: Bedroom" or just "Bedroom"
- Size: 15 m²

- Name: "Flat 1: Living Room" or "Living Room"
- Size: 20 m²

Flat 2:
- Name: "Flat 2: Bedroom" or "Bedroom"
- Size: 14 m²

- Name: "Flat 2: Kitchen"
- Size: 12 m²
```

#### Step 3: Export to BTU Calculator

```
1. In Annotator: Click "Export to BTU Calculator"
2. Should see all 4 rooms + all annotations
3. BTU Calculator opens with:
   - Rooms loaded
   - AC annotations passed as acAnnotations prop
```

#### Step 4: Verify Multi-Flat Detection

**Browser Console Should Show:**

```javascript
"Multi-flat property detected - calculating per-flat condensers";
"Detected flats from annotations: ['Flat 1', 'Flat 2']";
```

**Check State:**

- Open DevTools → React Developer Tools → BtuCalculator component
- Verify:
  - `isMultiFlatProperty: true`
  - `detectedFlats: ["Flat 1", "Flat 2"]`

#### Step 5: Run Calculation

```
1. Click "Calculate BTU"
2. Choose HVAC type (VRF or Minisplit)
3. Adjust options as needed
4. Click "Calculate"
```

#### Step 6: Verify Results

**Expected Outcome:**

**Bedroom BTU Calculation:**

- Base: 15 m² × 25 BTU/m² = 375 base BTU
- Plus height, people multiplier, etc.
- ~8000-9000 BTU expected

**Living Room/Kitchen BTU:**

- Roughly proportional to room size

**Results Table Should Show:**

```
┌────────────────────────────────────────────────────────┐
│ Room              │ BTU    │ Product        │ Price     │
├────────────────────────────────────────────────────────┤
│ Flat 1: Bedroom   │ 9000  │ [Indoor Unit]  │ $xxx      │
│ Flat 1: Living    │ 12000 │ [Indoor Unit]  │ $xxx      │
│ Flat 1 Condenser  │ 16800 │ [Model 18K]    │ $xxx      │
├────────────────────────────────────────────────────────┤
│ Flat 2: Bedroom   │ 8400  │ [Indoor Unit]  │ $xxx      │
│ Flat 2: Kitchen   │ 6000  │ [Indoor Unit]  │ $xxx      │
│ Flat 2 Condenser  │ 11520 │ [Model 12K]    │ $xxx      │
└────────────────────────────────────────────────────────┘
```

**Key Indicators:**

- ✓ Two separate condenser rows (not one)
- ✓ Labels show "Flat 1 Condenser" and "Flat 2 Condenser"
- ✓ Each condenser has different BTU value
- ✓ Flat 1 condenser size depends on Flat 1 rooms
- ✓ Flat 2 condenser size depends on Flat 2 rooms

#### Step 7: Test Cart Integration

```
1. Click "Save to Cart"
2. Modal should appear
3. Click "Do Both" or "Just save to cart"
4. Check cart page:
   - Should have BOTH indoor units (4 total)
   - Should have BOTH condensers (2 types)
   - Total count: 6 items
```

**Cart Verification:**

```
Indoor Units:
- Flat 1 Bedroom Unit (qty 1)
- Flat 1 Living Room Unit (qty 1)
- Flat 2 Bedroom Unit (qty 1)
- Flat 2 Kitchen Unit (qty 1)

Condensers:
- Flat 1 Condenser (qty 1)
- Flat 2 Condenser (qty 1)

Total: 6 items (or consolidated if same product)
```

#### Step 8: Test ROI Calculation

```
1. Return to BTU Calculator
2. Click "Calculate ROI"
3. Modal appears
4. Click "Do Both" or "Just calculate ROI"
5. ROI page should show:
   - Both condenser costs in analysis
   - Installation costs for 2 separate systems
   - ROI based on complete installation
```

### Console Debugging Output

When everything works, console should show something like:

```javascript
// Initial detection
"BtuCalculator received rooms:" [4 room objects]
"Detected flats from annotations:" ["Flat 1", "Flat 2"]

// Calculation
"Multi-flat property detected - calculating per-flat condensers"

// Flat 1 condenser
"Could not fetch condensers for Flat 1, will use estimate" (or successful fetch)

// Flat 2 condenser
"Could not fetch condensers for Flat 2, will use estimate" (or successful fetch)

// Rendering
"Condenser calculation:" {
  index: 0,
  flatName: "Flat 1",
  condenserBtu: 16800,
  selectedCondenserBTU: 18000
}
"Condenser calculation:" {
  index: 1,
  flatName: "Flat 2",
  condenserBtu: 11520,
  selectedCondenserBTU: 12000
}
```

### Troubleshooting

#### Issue: Only One Condenser Shows

**Causes:**

1. Annotations not properly passed to BTU Calculator
2. `isMultiFlatProperty` still false
3. `detectedFlats` array empty

**Fix:**

```javascript
// In browser console:
// Check if annotations were passed
localStorage.getItem("btuData"); // Check if ac annotations in saved data

// Add to handleExport in Annotator.jsx to debug
console.log("AC Annotations being exported:", acAnnotations);
```

#### Issue: Wrong BTU per Flat

**Causes:**

1. Room grouping by flat not working
2. BTU calculation per room incorrect

**Fix:**

```javascript
// Add to handleCalculate in BtuCalculator.jsx
console.log("Flat BTUs before condenser selection:", flatBTUs);
console.log("Room groupings:", flatRooms);
```

#### Issue: Console Error "groupFlatsByAnnotations not defined"

**Cause:** Function not available in handleCalculate scope

**Fix:** Ensure `groupFlatsByAnnotations` is defined outside of handleCalculate (it is, around line 66)

#### Issue: Modal Not Navigating

**Status:** This was partially fixed in previous session. If still broken:

1. Check preventDefault() is on buttons
2. Check setTimeout delays in handleConfirmCombined
3. Clear browser cache and reload

### Performance Notes

- **Single Request Before:** 1 API call for condenser
- **Multi-Flat (2 flats):** 2 API calls for condensers
- **Multi-Flat (3 flats):** 3 API calls for condensers
- **Total Time:** Should still be <2 seconds for typical setup

Consider adding loading indicator for multi-flat scenarios.

### Expected Product Counts

For 2-flat property with typical rooms:

```
Single-Flat Scenario:
- 4 indoor units (one per room)
- 1 condenser
- Total products: 5

Multi-Flat Scenario:
- 4 indoor units (one per room)
- 2 condensers (one per flat)
- Total products: 6
```

If products consolidate (same model/BTU), counts may be lower in cart display.

---

## Integration Checklist

Before considering implementation complete, verify:

- [ ] Multi-flat detection works via annotations
- [ ] Separate condenser rows render correctly
- [ ] Each condenser has correct BTU value
- [ ] Cart contains all items (units + both condensers)
- [ ] ROI calculation includes both condensers
- [ ] Single-flat properties still work unchanged
- [ ] No console errors after calculation
- [ ] Modal navigation works (from previous session fixes)
- [ ] PDF export shows all condensers
- [ ] Pricing calculated independently per condenser
