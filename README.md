# AC Commerce

Full-stack HVAC marketplace with an integrated BTU calculator, ROI calculator, and PDF floor-plan annotator.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, React Bootstrap, Recharts, Konva |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT |
| Storage | Cloudinary |
| Email | Gmail (Nodemailer) |
| Payments | PayPal |

## Project Structure

```text
ac-com/
├── backend/        # Express API (port 5020)
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── server.js
├── frontend/       # React SPA (port 3000)
│   └── src/
└── package.json    # Root scripts for deployment
```

## Local Development

```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start backend (http://localhost:5020)
npm run dev:backend

# Start frontend (http://localhost:3000)
npm run dev:frontend
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing (32+ chars) |
| `NODE_ENV` | `production` in production |
| `PORT` | Server port (Render sets automatically) |
| `FRONTEND_URL` | Deployed frontend URL (for CORS) |
| `BASE_URL` | Same as `FRONTEND_URL` (used in email links) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PAYPAL_CLIENT_ID` | PayPal client ID |
| `GOOGLE_API_KEY` | Google Maps API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GMAIL_USER` | Gmail address for transactional email |
| `GMAIL_APP_PASSWORD` | Gmail App Password |

## Deployment (Render — monorepo)

**Build command:**

```text
npm run build
```

**Start command:**

```text
npm start
```

Set `NODE_ENV=production` and all required environment variables in the Render dashboard.
