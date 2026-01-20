# Multi-Flat Implementation - Quick Reference

## What Was Fixed

**Problem:** Only one condenser rendered for 2-flat properties, sized by total BTU
**Solution:** Now calculates separate condenser for each flat based on that flat's BTU

## How It Works

1. **Annotations** (from Annotator): `ac-1.1, ac-1.2, condenser-1, condenser-2`
2. **Detection** (in BtuCalculator): Recognizes as 2-flat property
3. **Calculation**:
   - Flat 1 BTU (Rooms 1+2) × 0.8 = Flat 1 Condenser Size
   - Flat 2 BTU (Rooms 3+4) × 0.8 = Flat 2 Condenser Size
4. **Results**: Shows TWO separate condenser rows with different BTUs

## Expected Output

**Results Table:**

```
Flat 1: Bedroom         | 9000 BTU  | Indoor Unit
Flat 1: Living Room    | 12000 BTU | Indoor Unit
Flat 1 Condenser       | 16800 BTU | [18K Condenser]
---
Flat 2: Bedroom         | 8400 BTU  | Indoor Unit
Flat 2: Kitchen         | 6000 BTU  | Indoor Unit
Flat 2 Condenser       | 11520 BTU | [12K Condenser]
```

## Files Changed

- `frontend/src/components/BtuCalculator.jsx`
  - Lines 820-960: Per-flat condenser calculation
  - Lines 1705-1760: Table rendering with flat labels

## Testing (Quick)

```
1. Annotator: Label rooms and outdoor units
   - Flat 1: ac-1.1, ac-1.2, condenser-1
   - Flat 2: ac-2.1, ac-2.2, condenser-2

2. Export to BTU Calculator

3. Click "Calculate"

4. VERIFY:
   ✓ Two "Flat X Condenser" rows appear
   ✓ Different BTU values per row
   ✓ Labels show flat names clearly
```

## Console Check

Should see:

```javascript
"Multi-flat property detected - calculating per-flat condensers";
"Detected flats from annotations: ['Flat 1', 'Flat 2']";
```

## Known Limitations

- Requires AC annotation labels to detect flats
- Room-to-flat mapping works best with labeled rooms ("Flat 1: Bedroom")
- Currently calculates separately but no UI for bundle pricing

## Status

✅ Code written and syntax checked
✅ Logic implemented
⏳ Awaiting user testing

**Next:** Follow MULTI_FLAT_TEST_GUIDE.md for detailed testing steps

## If Something Breaks

1. Check browser console for errors
2. Verify annotations passed correctly
3. Look for "Multi-flat property detected" message
4. Check selectedCondensers array in React DevTools
5. Provide console output when reporting issues

---

See **MULTI_FLAT_TEST_GUIDE.md** for detailed step-by-step testing
See **MULTI_FLAT_IMPLEMENTATION.md** for technical details
