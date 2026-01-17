# ROI Calculator - Backend Integration Documentation

## Overview

The ROI Calculator has been fully integrated with the backend, Store context, authentication, and BTU Calculator for a complete enterprise experience.

## Changes Implemented

### 1. Backend Integration

#### New Model: `roiCalculationModel.js`

Located at: `backend/models/roiCalculationModel.js`

Schema fields:

- `userId` - Reference to authenticated user
- `name` - Calculation name
- `description` - Optional description
- Input parameters (projectSize, installationTime, teamSize, etc.)
- Calculated results (savingsPerProject, ROI, paybackMonths)
- `linkedBtuProjectId` - Link to BTU Calculator project
- `linkedProductIds` - Link to products from quotes
- `isPinned` - Favorite/pin status
- `isPublic` - Share calculations with team
- `tags` - Searchable tags for organization

#### New Routes: `roiCalculationRoutes.js`

Located at: `backend/routes/roiCalculationRoutes.js`

**Endpoints:**

- `GET /api/roi-calculations` - Get user's calculations (paginated)
- `GET /api/roi-calculations/:id` - Get single calculation
- `POST /api/roi-calculations` - Create new calculation
- `PUT /api/roi-calculations/:id` - Update calculation
- `DELETE /api/roi-calculations/:id` - Delete calculation
- `PUT /api/roi-calculations/:id/pin` - Toggle pin status
- `GET /api/roi-calculations/search/tag/:tag` - Search by tags
- `GET /api/roi-calculations/admin/all` - Admin view all (paginated)

**Authentication:** All routes require `isAuth` middleware
**Admin Access:** Admin endpoints require `isAdmin` middleware

#### Server Integration

`backend/server.js` - Updated to include:

```javascript
import roiRouter from "./routes/roiCalculationRoutes.js";
app.use("/api/roi-calculations", roiRouter);
```

### 2. Store Context Integration

#### New State Properties in `frontend/src/Store.js`

**ROI Data State:**

```javascript
roiData: {
  currentCalculation: null,
  savedCalculations: [],
  isLoading: false,
  error: null,
}
```

**BTU Linking State:**

```javascript
btuData: {
  currentProject: null,
  products: [],
}
```

#### New Reducer Actions:

**ROI Actions:**

- `ROI_SET_LOADING` - Toggle loading state
- `ROI_SET_ERROR` - Set error messages
- `ROI_SET_CURRENT_CALCULATION` - Set active calculation
- `ROI_SET_SAVED_CALCULATIONS` - Load all calculations
- `ROI_ADD_CALCULATION` - Add new saved calculation
- `ROI_UPDATE_CALCULATION` - Update existing calculation
- `ROI_DELETE_CALCULATION` - Remove calculation
- `ROI_CLEAR` - Clear all ROI data on logout

**BTU Actions:**

- `BTU_SET_CURRENT_PROJECT` - Set linked BTU project
- `BTU_SET_PRODUCTS` - Set linked products
- `BTU_CLEAR` - Clear BTU data

### 3. Frontend Component Updates

#### Updated: `frontend/src/pages/ROICalculatorExperimental.jsx`

**New Features:**

1. **Authentication Check**

   - Validates user is logged in before saving
   - Shows login prompts for unauthorized users
   - Displays authentication-only features

2. **Calculation Management**

   - Save calculations with name and description
   - Retrieve saved calculations on component load
   - Load previously saved calculations (auto-populate fields)
   - Delete calculations
   - Search/filter by tags

3. **Saved Calculations Display**

   - Table showing all saved calculations
   - Quick load/delete buttons
   - Display key metrics (Savings, ROI, Date Created)
   - Loading spinner during data fetch

4. **Save Modal**

   - Form for naming calculations
   - Optional description field
   - Tag system for organization
   - Preview of calculation summary

5. **UI Enhancements**
   - Save button in export section (visible when logged in)
   - Saved calculations card above export section
   - Authentication alerts for non-logged-in users
   - Loading states and error handling
   - Toast notifications for all actions

### 4. API Integration Details

**Frontend API Calls:**

```javascript
// Get calculations
GET /api/roi-calculations
Headers: { authorization: "Bearer {token}" }

// Save calculation
POST /api/roi-calculations
Body: {
  name: string,
  description: string,
  projectSize: number,
  installationTime: number,
  teamSize: number,
  projectsPerMonth: number,
  monthsToAnalyze: number,
  savingsPerProject: number,
  savingsPercentage: number,
  annualSavings: number,
  roi: number,
  paybackMonths: number,
  linkedBtuProjectId: ObjectId (optional),
  linkedProductIds: [ObjectId] (optional),
  tags: [string]
}

// Update calculation
PUT /api/roi-calculations/:id
Body: { same fields as above }

// Delete calculation
DELETE /api/roi-calculations/:id
```

### 5. Security Features

- **Authentication Required:** All save/load operations require valid JWT token
- **Ownership Verification:** Users can only access/modify their own calculations
- **Admin Access:** Separate admin endpoint for system-wide analytics
- **Data Validation:** Server-side validation of all input parameters

### 6. CSS Enhancements

Added styles for:

- `.saved-calculations-card` - Styled table of saved calculations
- `.modal-content` - Custom modal styling
- `.saved-calculations-card .table` - Responsive calculation table
- Responsive design for all screen sizes

## Usage Flow

### For End Users:

1. **Log In** → Access ROI Calculator
2. **Adjust Parameters** → See real-time calculations
3. **Save Calculation** → Click "Save Calculation" button
4. **Name & Describe** → Fill out save modal
5. **Add Tags** → Organize calculations
6. **Load Later** → Click "Load" on any saved calculation
7. **Compare** → Save multiple scenarios and compare

### For Admins:

1. Access `/api/roi-calculations/admin/all` endpoint
2. View all user ROI calculations
3. Analytics on usage patterns
4. No direct edit/delete privileges (view only)

## Future Enhancements

1. **Share Calculations** - Enable `isPublic` feature for team collaboration
2. **BTU Linking** - Auto-populate ROI from BTU Calculator results
3. **Export to Excel** - Advanced data export functionality
4. **ROI Comparisons** - Side-by-side calculation comparison
5. **Scheduling** - Set reminders for recalculation
6. **Analytics Dashboard** - Trend analysis and ROI tracking
7. **API Webhooks** - Real-time updates when calculations change
8. **Advanced Filtering** - Filter by date range, savings amount, ROI %

## Testing Checklist

- [ ] User can save calculation with all required fields
- [ ] User can load previously saved calculation
- [ ] User can delete calculation (with confirmation)
- [ ] Non-authenticated users see login prompt
- [ ] Tags work for filtering (future enhancement)
- [ ] Pagination works for large calculation sets
- [ ] Error handling works for network failures
- [ ] Admin can view all calculations
- [ ] Own calculations cannot be accessed by other users
- [ ] PDF export works after loading saved calculation

## Error Handling

- Network errors: "Failed to load saved calculations"
- Missing name: "Please enter a name for this calculation"
- Authorization errors: "Access denied"
- Not found errors: "Calculation not found"
- Server errors: "Failed to save/delete/update calculation"

## API Response Examples

**Success - Save Calculation:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Q1 Office Expansion",
  "savingsPerProject": 15000,
  "annualSavings": 180000,
  "roi": 156.7,
  "createdAt": "2024-01-17T10:30:00Z",
  "tags": ["office", "expansion", "2024"]
}
```

**Success - Get Calculations:**

```json
{
  "calculations": [...],
  "page": 1,
  "pages": 3,
  "total": 25
}
```

## Environment Variables Required

In frontend `.env`:

```
REACT_APP_API_URL=http://localhost:4000
```

In backend `.env`:

```
MONGODB_URI=mongodb://...
```

---

**Version:** 1.0  
**Last Updated:** January 17, 2026
