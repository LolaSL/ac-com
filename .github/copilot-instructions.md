# AI Coding Agent Instructions

## Project Overview

AC Commerce is a full-stack MERN marketplace for HVAC services with an integrated ROI calculator and BTU calculator. The codebase features a React frontend (port 3000), Express backend (port 5020), and MongoDB database.

## Architecture & Key Patterns

### Full Stack Data Flow

- **Frontend** (React 18, Store Context): User interactions → axios API calls with Bearer token auth
- **Backend** (Express, async handlers): Routes validate JWT → check user ownership → MongoDB operations
- **Database** (MongoDB, Mongoose): Models use refs for relationships (e.g., ROI calculations link to Users)

**Critical Example:** ROI Calculator flow (see `frontend/src/pages/ROICalculatorExperimental.jsx` and `backend/routes/roiCalculationRoutes.js`)

1. User fills form → `handleSaveCalculation()` dispatches `ROI_SET_LOADING`
2. POST to `/api/roi-calculations` with header: `Authorization: Bearer ${userToken}`
3. Backend `isAuth` middleware validates token, extracts `req.user`
4. Saves to DB with `userId` ownership field
5. Dispatch `ROI_SET_CURRENT_CALCULATION` to Store context

### Frontend State Management

- **Store Context** (`frontend/src/Store.js`): Centralized with useReducer
- ROI & BTU data namespaced as `roiData` and `btuData`
- Actions: `ROI_SET_LOADING`, `ROI_SET_CURRENT_CALCULATION`, `ROI_ADD_CALCULATION`, `ROI_DELETE_CALCULATION`
- Auth tokens stored in localStorage and included in Authorization headers
- Cart operations persist to localStorage

### Backend Authentication Pattern

- `isAuth` middleware: Extract Bearer token → verify with JWT_SECRET → attach `req.user` to request
- All ROI/user-specific endpoints require `isAuth` middleware
- Ownership checks compare `req.user._id` with resource `userId` field (see line 53 in roiCalculationRoutes.js)
- `isAdmin` middleware checks `req.user.isAdmin` boolean

### Model Relationships

- `User` (userModel.js) ← referenced by ROI calculations, orders, earnings
- `ROICalculation` → links to User (userId), BTU Project (linkedBtuProjectId), Products (linkedProductIds[])
- `Product` → featured in ROI analysis; linked via `linkedProductIds`
- Service types enum: AC Installation, AC Repair, Maintenance, Heating, IAQ, Smart Control, Electrical

## Critical Developer Workflows

### Running Locally

```bash
# Terminal 1: Backend (runs on http://localhost:5020)
cd backend && npm start

# Terminal 2: Frontend (runs on http://localhost:3000)
cd frontend && npm start
```

### Adding API Endpoints

1. Create route handler in `backend/routes/routeName.js`
2. Use `expressAsyncHandler` for async errors (e.g., line 61 in roiCalculationRoutes.js)
3. Add `isAuth` middleware if user-specific
4. Add ownership verification for user data: `if (resource.userId.toString() !== req.user._id.toString())`
5. Register route in `backend/server.js` (line 19: `import roiRouter from './routes/roiCalculationRoutes.js'`)

### Frontend Component API Integration

1. Import `{ Store }` and `axios`
2. Get `userInfo` and `dispatch` from context
3. Make authenticated call: `axios.get('/api/endpoint', { headers: { Authorization: `Bearer ${userInfo.token}` } })`
4. Update Store on response: `dispatch({ type: 'ACTION_TYPE', payload: data })`
5. Handle errors with toast: `toast.error(error.response?.data?.message)`

### Modifying Store

1. Add new action case in reducer function (line 15+ in Store.js)
2. Return new state with spread operators: `{ ...state, field: newValue }`
3. For nested updates: `{ ...state, roiData: { ...state.roiData, currentCalculation: payload } }`

## Project-Specific Conventions

### Error Handling

- Backend: Use `expressAsyncHandler` to wrap async routes (catches and forwards errors)
- Standardized error response: `{ message: 'Error description' }` (status code 400/401/403/404)
- Frontend: Destructure error message: `error.response?.data?.message`

### Naming Conventions

- API endpoints: RESTful (GET `/roi-calculations`, POST `/roi-calculations`, DELETE `/roi-calculations/:id`)
- Store actions: UPPERCASE with underscore (`ROI_SET_LOADING`, `CART_ADD_ITEM`)
- Component files: PascalCase (e.g., `ROICalculatorExperimental.jsx`, `BtuCalculator.jsx`)
- CSS files: Match component name (e.g., `ROICalculatorExperimental.css`)

### Property Type & Service Configuration

ROI calculator uses `propertyConfigs` object (line 69-104 in ROICalculatorExperimental.jsx) with:

- `costMultiplier`: traditional vs acCommerce comparison
- `laborCost`: per-unit labor rates
- `timeReductionFactor`: efficiency gains
- Min/max ranges for sliders (projectSize, installationTime)

## Integration Points & External Dependencies

### Key Dependencies

- **Frontend**: React Bootstrap (UI), Recharts (charts), jsPDF (PDF export), axios (HTTP)
- **Backend**: Express, Mongoose, JWT, Mailgun (email), PDF-lib, Cloudinary (image uploads)
- **Database**: MongoDB Atlas (connection via MONGODB_URI env var)

### Environment Variables Required

**Backend (.env):**

- `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`
- `MAILGUN_API_KEY`, `BASE_URL`
- `PAYPAL_CLIENT_ID` (payment processing)

**Frontend (.env):**

- `REACT_APP_API_URL` (optional; uses proxy "http://localhost:5020" in package.json)

### Common Cross-Component Communication

- BTU Calculator passes data to ROI Calculator via `location.state?.btuData`
- ROI calculations can be "linked" to BTU projects via `linkedBtuProjectId` reference
- Products are linked via array `linkedProductIds[]` for bulk analysis

## Debugging Tips

- **Auth failures**: Check token in localStorage via DevTools → verify JWT_SECRET matches backend
- **CORS errors**: Backend CORS config (line 41 in server.js) allows only localhost:3000
- **API 404s**: Verify route registered in server.js; check endpoint path spelling
- **Store state not updating**: Ensure dispatch action matches reducer case name exactly
- **MongoDB connection issues**: Check MONGODB_URI format and network access in Atlas
