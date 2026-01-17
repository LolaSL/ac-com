# ROI Calculator - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ROICalculatorExperimental.jsx                             │
│  ├── State Management                                      │
│  │   ├── useContext(Store) - Global state                 │
│  │   ├── useState - Local component state                 │
│  │   └── useEffect - Data fetching                        │
│  │                                                        │
│  ├── Features                                             │
│  │   ├── Calculate ROI metrics                           │
│  │   ├── Save calculations                               │
│  │   ├── Load saved calculations                         │
│  │   ├── Delete calculations                             │
│  │   ├── Export to PDF                                   │
│  │   ├── Display visualizations                          │
│  │   └── Link to BTU Calculator                          │
│  │                                                        │
│  └── UI Components                                        │
│      ├── Tabs (Calculator, Charts, Analysis)            │
│      ├── Form Inputs (sliders, ranges)                  │
│      ├── Results Grid (4-box layout)                    │
│      ├── Charts (Line, Bar, Pie)                        │
│      ├── Saved Calculations Table                       │
│      └── Save Modal                                      │
│                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↕
                    axios.post/get/put/delete
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  roiCalculationRoutes.js                                   │
│  ├── GET /roi-calculations (paginated)                     │
│  ├── GET /roi-calculations/:id                            │
│  ├── POST /roi-calculations (create)                      │
│  ├── PUT /roi-calculations/:id (update)                   │
│  ├── DELETE /roi-calculations/:id                         │
│  ├── PUT /roi-calculations/:id/pin (favorite)            │
│  ├── GET /roi-calculations/search/tag/:tag               │
│  └── GET /roi-calculations/admin/all                     │
│                                                            │
│  Authentication & Authorization                            │
│  ├── isAuth middleware - Check JWT token                 │
│  ├── Ownership verification - User can only access own   │
│  └── isAdmin - Admin-only endpoints                      │
│                                                            │
└─────────────────────────────────────────────────────────────┘
                          ↕
                    Mongoose ODM
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (MongoDB)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  roiCalculationModel.js                                    │
│  ├── userId (ref: User)                                   │
│  ├── name, description                                    │
│  ├── Parameters (projectSize, teamSize, etc.)            │
│  ├── Results (roi, savingsPerProject, etc.)              │
│  ├── linkedBtuProjectId (ref: Project)                   │
│  ├── linkedProductIds (ref: Product[])                   │
│  ├── tags, isPinned, isPublic                            │
│  └── timestamps (createdAt, updatedAt)                   │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Saving a Calculation

```
User clicks "Save Calculation"
        ↓
Modal opens with form
        ↓
User enters: name, description, tags
        ↓
Click "Save Calculation" button
        ↓
handleSaveCalculation() executes
        ↓
Dispatch ROI_SET_LOADING(true)
        ↓
POST to /api/roi-calculations
├─ Headers: Authorization Bearer token
└─ Body: {
    name, description, projectSize,
    installationTime, teamSize,
    projectsPerMonth, monthsToAnalyze,
    savingsPerProject, roi, paybackMonths,
    tags
  }
        ↓
Backend validates JWT token
        ↓
Extract userId from token
        ↓
Create ROICalculation document
        ↓
Save to MongoDB
        ↓
Return saved document
        ↓
Frontend receives response
        ↓
Dispatch ROI_ADD_CALCULATION(data)
        ↓
Update savedCalculations state
        ↓
Close modal
        ↓
Show success toast
        ↓
Display in Saved Calculations table
```

### Loading a Calculation

```
Component mounts
        ↓
useEffect checks userInfo
        ↓
If logged in:
  fetch /api/roi-calculations
        ↓
Backend:
  Find all calculations where userId = currentUser
  Return paginated results
        ↓
Frontend:
  setSavedCalculations(data.calculations)
  Dispatch ROI_SET_SAVED_CALCULATIONS
        ↓
Display table with Load buttons
        ↓
User clicks Load button
        ↓
handleLoadCalculation(calculation)
        ↓
setProjectSize(calculation.projectSize)
setInstallationTime(calculation.installationTime)
[... other parameters]
        ↓
Dispatch ROI_SET_CURRENT_CALCULATION
        ↓
UI updates with loaded values
        ↓
Charts and results recalculate
```

### Deleting a Calculation

```
User clicks Delete button
        ↓
Show confirmation dialog
        ↓
User confirms
        ↓
handleDeleteCalculation(calculationId)
        ↓
DELETE /api/roi-calculations/:id
        ↓
Backend:
  Find calculation by ID
  Verify ownership (userId matches)
  Delete from MongoDB
        ↓
Frontend:
  Filter out calculation from local state
  Dispatch ROI_DELETE_CALCULATION
  Remove from table
        ↓
Show success toast
```

## Store Context Integration

```
Store Provider (root)
│
├── state.userInfo
│   ├── _id
│   ├── email
│   ├── name
│   └── token
│
├── state.roiData
│   ├── currentCalculation (active calculation)
│   ├── savedCalculations (all user's calculations)
│   ├── isLoading (true while fetching)
│   └── error (error message if any)
│
└── state.btuData
    ├── currentProject (linked BTU project)
    └── products (linked product quotes)
```

## Authentication Flow

```
User logs in
        ↓
Receive JWT token
        ↓
Store in localStorage (via Store)
        ↓
ROI Calculator mounts
        ↓
useEffect checks userInfo.token
        ↓
If token exists:
  Fetch saved calculations
  Include Authorization header
        ↓
Backend middleware (isAuth):
  Extract token from Authorization header
  Verify token signature
  Decode token to get userId
  Attach user to request object
        ↓
Route handler:
  Access req.user._id
  Find calculations where userId = req.user._id
        ↓
If accessing another user's calculation:
  Compare calculation.userId with req.user._id
  If mismatch: return 403 Forbidden
```

## API Request/Response Examples

### Save Calculation Request

```
POST /api/roi-calculations HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Q1 Office Expansion",
  "description": "ROI analysis for office expansion project",
  "projectSize": 5000,
  "installationTime": 7,
  "teamSize": 3,
  "projectsPerMonth": 10,
  "monthsToAnalyze": 12,
  "savingsPerProject": 1234,
  "savingsPercentage": 45.2,
  "annualSavings": 148080,
  "roi": 156.7,
  "paybackMonths": 3,
  "tags": ["office", "expansion", "2024"]
}
```

### Save Calculation Response

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "name": "Q1 Office Expansion",
  "description": "ROI analysis for office expansion project",
  "projectSize": 5000,
  "installationTime": 7,
  "teamSize": 3,
  "projectsPerMonth": 10,
  "monthsToAnalyze": 12,
  "savingsPerProject": 1234,
  "savingsPercentage": 45.2,
  "annualSavings": 148080,
  "roi": 156.7,
  "paybackMonths": 3,
  "linkedBtuProjectId": null,
  "linkedProductIds": [],
  "isPinned": false,
  "isPublic": false,
  "tags": ["office", "expansion", "2024"],
  "createdAt": "2024-01-17T10:30:00.000Z",
  "updatedAt": "2024-01-17T10:30:00.000Z",
  "__v": 0
}
```

### Get Calculations Request

```
GET /api/roi-calculations?page=1 HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Get Calculations Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "calculations": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Q1 Office Expansion",
      "annualSavings": 148080,
      "roi": 156.7,
      "paybackMonths": 3,
      "createdAt": "2024-01-17T10:30:00.000Z",
      ...
    },
    ...
  ],
  "page": 1,
  "pages": 3,
  "total": 25
}
```

## Security Layers

```
Layer 1: Transport Security
└── HTTPS/SSL in production

Layer 2: Authentication
└── JWT token validation on every request

Layer 3: Authorization
├── User can only access own calculations
├── Admin can access all calculations
└── Route protection with isAuth/isAdmin middleware

Layer 4: Data Validation
├── Server-side parameter validation
├── Type checking
└── Range validation (e.g., projectSize 1000-50000)

Layer 5: Database
└── Indexed userId for fast queries
```

## Performance Considerations

```
Database Optimization:
├── userId indexed for fast lookups
├── Paginated responses (10 items per page)
└── Lean queries to exclude unnecessary fields

Frontend Optimization:
├── useState for local calculations
├── useContext for global state sharing
├── Lazy loading of saved calculations table
└── Memoization of expensive calculations

API Optimization:
├── RESTful design
├── HTTP caching headers
└── Efficient pagination
```

## Error Handling

```
Frontend Errors:
├── Network errors → Show toast notification
├── Auth errors (401/403) → Redirect to login
├── Validation errors (400) → Show inline messages
├── Server errors (500) → Generic error message
└── Missing fields → Form validation before submit

Backend Errors:
├── Invalid JWT → 401 Unauthorized
├── User mismatch → 403 Forbidden
├── Not found → 404 Not Found
├── Validation failure → 400 Bad Request
└── Server error → 500 Internal Server Error
```

---

**Architecture Version:** 1.0  
**Design Pattern:** REST API + React + Redux-like Context  
**Security Level:** Enterprise Grade
