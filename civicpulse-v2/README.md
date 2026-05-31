# 🟢 CivicPulse v2 — Crowdsourced Civic Issue Reporting System

A scalable full-stack MERN application for citizens to report, track, and resolve civic issues in Kolkata — connecting citizens directly with the right government departments.

🔗 **Live Demo:** [civicpulse-v2.vercel.app](https://civicpulse-v2.vercel.app/)

---

## 📁 Project Structure

```
civicpulse-v2/
├── backend/
│   ├── config/         db.js
│   ├── jobs/           Deadlinejob.js
│   ├── middleware/      auth.js, errorHandler.js, upload.js, validate.js
│   ├── models/          User.js, Issue.js
│   ├── routes/          auth.js, issues.js, admin.js
│   ├── services/        emailService.js, routingService.js
│   ├── utils/           ApiError.js, asyncHandler.js, logger.js, response.js, seed.js
│   ├── uploads/         (auto-created, or Cloudinary if configured)
│   ├── logs/            (auto-created)
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── public/          index.html
    └── src/
        ├── components/
        │   ├── layout/  Sidebar.js
        │   ├── issues/  IssueCard.js
        │   └── common/  index.js, MapView.js, IssueMap.js,
        │                ImagePreviewModal.js, Chatbot.js, OverdueBadge.js
        ├── context/     AuthContext.js, ToastContext.js,
        │                LanguageContext.js, ThemeContext.js, AccountabilityContext.js
        ├── pages/
        │   ├── auth/    LoginPage.js, RegisterPage.js
        │   ├── citizen/ FeedPage.js, ReportPage.js, TrackPage.js,
        │   │            IssueDetailPage.js, ProfilePage.js, EmergencySOS.js
        │   ├── admin/   AdminDashboard.js, AdminIssues.js, AdminUsers.js,
        │   │            AccountabilityDashboard.js
        │   └── officer/ OfficerDashboard.js, DepartmentHeadDashboard.js,
        │                OfficerAccountability.js
        ├── AboutPage.js
        ├── App.js, api.js, index.js, index.css, theme.css
        └── translations.js
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, and optionally Cloudinary keys
npm install
node utils/seed.js         # seeds all demo users (admin, dept heads, officers, citizen)
npm run dev                # starts on :5000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install leaflet@1.9.4 react-leaflet@5 --legacy-peer-deps
npm install
npm start                  # starts on :3000
```

### 4. Add theme CSS import to `frontend/src/index.js`
```js
import './theme.css';   // ← add at the top
import './index.css';
```

---

## 👤 Demo Accounts

| Role              | Email                        | Password    |
|-------------------|------------------------------|-------------|
| Admin             | admin@civicpulse.in          | password123 |
| PWD Dept Head     | head@civicpulse.in           | password123 |
| Water Dept Head   | waterhead@civicpulse.in      | password123 |
| PWD Field Officer | officer@civicpulse.in        | password123 |
| Citizen           | riya@example.com             | password123 |

> Run `node utils/seed.js` from the backend folder to create all accounts automatically.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                   | Access  |
|--------|----------------------------|---------|
| POST   | /api/auth/register         | Public  |
| POST   | /api/auth/login            | Public  |
| GET    | /api/auth/me               | Private |
| PUT    | /api/auth/updateprofile    | Private |
| PUT    | /api/auth/updatepassword   | Private |

### Issues
| Method | Endpoint                      | Access                                               |
|--------|-------------------------------|------------------------------------------------------|
| GET    | /api/issues                   | Public                                               |
| GET    | /api/issues/mine              | Citizen                                              |
| GET    | /api/issues/:id               | Public                                               |
| POST   | /api/issues                   | Citizen                                              |
| PUT    | /api/issues/:id/upvote        | Citizen                                              |
| PUT    | /api/issues/:id/status        | Admin/Department (proof image required for resolved) |
| PUT    | /api/issues/:id/assign        | Admin/Dept Head                                      |
| POST   | /api/issues/:id/comments      | Any logged-in                                        |
| PUT    | /api/issues/:id/rate          | Citizen (owner)                                      |
| DELETE | /api/issues/:id               | Admin / Owner                                        |

### Admin
| Method | Endpoint                          | Access      |
|--------|-----------------------------------|-------------|
| GET    | /api/admin/stats                  | Admin       |
| GET    | /api/admin/dept-stats             | Admin/Dept  |
| GET    | /api/admin/issues                 | Admin/Dept  |
| GET    | /api/admin/users                  | Admin/Dept  |
| POST   | /api/admin/users                  | Admin       |
| PUT    | /api/admin/users/:id              | Admin       |
| DELETE | /api/admin/users/:id              | Admin       |
| POST   | /api/admin/bulk-status            | Admin/Dept  |
| GET    | /api/admin/export                 | Admin       |
| GET    | /api/admin/my-officers            | Dept Head   |
| POST   | /api/admin/my-officers            | Dept Head   |
| PUT    | /api/admin/issues/:id/assign      | Dept Head   |
| GET    | /api/admin/compensation           | Admin       |
| POST   | /api/admin/compensation/:id/clear | Admin       |

---

## ✨ Features

### 🏙️ Core
- **JWT Auth** with role-based access: `citizen` / `department` (head or officer) / `admin`
- **Issue Reporting** — 3-step form with GPS pin, Leaflet map picker with place search, photo upload (up to 5), auto-routing to department by category
- **Auto-Routing Engine** — assigns the correct KMC department on issue creation
- **Citizen Feed** — category/status filters, search, map/list toggle, upvoting
- **Real-time Tracking** — progress bar, status timeline with proof images, assigned officer contact card
- **Issue Detail** — photo gallery, Leaflet location map, comments, satisfaction rating

### 🗺️ Map System (Leaflet — no API key needed)
- **FeedPage map** — all issues plotted by priority with filters, place search (Nominatim/OpenStreetMap), click markers to view details
- **ReportPage map picker** — search by place name or click to drop a pin, auto-fills lat/lng
- **IssueDetailPage map** — shows exact issue location with priority-coloured pin
- Dark-themed tiles matching the app UI

### 🆘 Emergency SOS
- Pulsing animated SOS button landing screen
- Tap to open emergency type selection + location + GPS capture
- Auto-routed as CRITICAL priority
- Quick-dial helplines (Police 100, Ambulance 102, Fire 101, KMC, etc.)

### 🏛️ Department System
- **6 departments**: PWD, Water Supply, Sanitation, Electricity, Enforcement, General Grievance
- **Department Head** — team accountability dashboard showing all officers' performance, penalty points, and compensation owed; creates field officers, assigns issues
- **Field Officer** — sees only their own assigned issues, marks in progress/resolved with proof image

### ⚖️ Officer Accountability & Compensation
- **Deadline enforcement** via hourly cron job (`Deadlinejob.js`) — runs automatically on the server
- Officers who miss deadlines are penalised:
  - **+5 penalty points** for 1 day late
  - **+15 penalty points** for 3+ days late
  - **₹100/day** compensation deducted from the officer and owed to the government
- On each deadline breach, automatic emails are sent to:
  - The **officer** — with ticket details and total amount owed
  - The **department head** — escalation alert
  - All **admins** — escalation alert
- Admin can view all outstanding compensation via `GET /api/admin/compensation` and clear debts via the clear endpoint
- **Accountability score** = `(OnTime Resolved / Total Assigned) × 100`, colour-coded Excellent / Good / Average / Poor

### 📊 Admin Dashboard
- KPI cards (total, resolved, in-progress, pending, critical)
- 7-day trend chart — reported (by `createdAt`) vs resolved (by `resolvedAt`) plotted separately per day
- Department performance — segmented bar (green/yellow/red), success rate badge (Excellent/Moderate/Needs Attention), avg resolution days
- Hotspot areas, citizen satisfaction rating
- Critical issue queue with escalate button

### 📷 Image System
- Proof image **mandatory** when marking any issue as resolved (enforced on backend + all dashboards)
- Proof image shown inside the status timeline
- Full-screen image preview modal with portal rendering (no sidebar bleed), keyboard navigation, thumbnail strip, download button
- Camera button opens device camera directly (fixed iOS/Android `display:none` bug)
- Optional Cloudinary integration for persistent image storage on deployments

### 👤 User & Profile
- Register accepts any valid `+91` phone number (10 digits, any starting digit)
- Profile page shows activity stats (total/resolved/in-progress/pending reports)
- Officers visible with email + phone contact buttons on TrackPage and IssueDetailPage
- Citizen contact details (name, phone, email, area) shown to admins/officers on issue cards

### 🌐 Multilingual
- Full **English / Bengali (বাংলা) / Hindi (हिंदी)** support via `LanguageContext`
- Language switcher in sidebar, persists across sessions via localStorage
- `translations.js` covers all nav, feed, report, track, SOS, profile, auth pages

### 🌙 Dark / Light Mode
- Animated toggle in sidebar (pill switch), also accessible on mobile topbar
- Persists via localStorage
- Full `theme.css` with CSS variables for both modes

---

## 🔧 Tech Stack

| Layer      | Tech                                                        |
|------------|-------------------------------------------------------------|
| Frontend   | React 18, React Router v6, Axios, CSS3                      |
| Maps       | Leaflet, react-leaflet, OpenStreetMap, Nominatim geocoding  |
| Backend    | Node.js, Express.js                                         |
| Database   | MongoDB, Mongoose ODM                                       |
| Auth       | JWT + bcryptjs                                              |
| Upload     | Multer (local disk) or Cloudinary (cloud, recommended)      |
| Email      | Nodemailer (SMTP / Gmail)                                   |
| Scheduling | node-cron (hourly deadline + daily score jobs)              |
| Security   | Helmet, express-rate-limit, mongo-sanitize, XSS-clean       |
| Logging    | Winston                                                     |
| i18n       | Custom LanguageContext (EN / বাংলা / हिंदी)                |
| Theme      | CSS variables, ThemeContext (dark / light)                  |

---

## 📝 Environment Variables

### Backend `.env`
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_long_random_secret
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development

# Email — required for deadline compensation & escalation notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@civicpulse.in
FROM_NAME=CivicPulse

# Cloudinary (recommended for deployed images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

MAX_FILE_SIZE=5242880
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🗂️ Key File Changes from v1

| File | What Changed |
|------|-------------|
| `frontend/src/index.js` | Added `import './theme.css'` |
| `frontend/src/App.js` | Added `ThemeProvider` wrapper |
| `frontend/src/theme.css` | New — dark/light CSS variables |
| `frontend/src/translations.js` | New — EN/Bengali/Hindi strings |
| `frontend/src/context/LanguageContext.js` | New — language switcher |
| `frontend/src/context/ThemeContext.js` | New — dark/light toggle |
| `frontend/src/context/AccountabilityContext.js` | New — officer accountability state |
| `frontend/src/components/layout/Sidebar.js` | Language switcher + theme toggle |
| `frontend/src/components/common/MapView.js` | New — Leaflet feed map with place search |
| `frontend/src/components/common/IssueMap.js` | New — single issue map + picker with search |
| `frontend/src/components/common/ImagePreviewModal.js` | Fullscreen portal, smooth animations |
| `frontend/src/components/OverdueBadge.js` | New — reusable overdue status badge |
| `frontend/src/pages/citizen/FeedPage.js` | Map/list toggle, Leaflet map embedded |
| `frontend/src/pages/citizen/ReportPage.js` | Map picker, camera fix |
| `frontend/src/pages/citizen/TrackPage.js` | Officer contact card |
| `frontend/src/pages/citizen/IssueDetailPage.js` | Citizen details, officer card, proof in timeline, resolve modal |
| `frontend/src/pages/citizen/ProfilePage.js` | Phone/address fields, activity stats |
| `frontend/src/pages/citizen/EmergencySOS.js` | Pulsing SOS button entry screen |
| `frontend/src/pages/auth/LoginPage.js` | Dept Head vs Field Officer sub-roles |
| `frontend/src/pages/auth/RegisterPage.js` | Phone accepts any +91 number (removed 6/9 restriction) |
| `frontend/src/pages/admin/AdminDashboard.js` | Full aggregation: byCategory, byDept, trend, topAreas, satisfaction |
| `frontend/src/pages/admin/AdminIssues.js` | Reporter/officer columns, resolve with proof |
| `frontend/src/pages/admin/AccountabilityDashboard.js` | New — compensation tracking, officer penalty overview |
| `frontend/src/pages/officer/OfficerDashboard.js` | Field officers see only their own assigned issues (backend-enforced) |
| `frontend/src/pages/officer/OfficerAccountability.js` | Dept Head → team dashboard; Field Officer → personal performance |
| `frontend/src/pages/officer/DepartmentHeadDashboard.js` | Create officer modal, assign to issue |
| `frontend/src/pages/AboutPage.js` | Full redesign, no helplines |
| `frontend/src/api.js` | Added `getMyOfficers`, `createOfficer`, `assignOfficer` |
| `backend/models/User.js` | Added `compensationOwed`, `compensationPaid` fields |
| `backend/routes/auth.js` | Phone validation accepts any +91 number |
| `backend/routes/issues.js` | Status route requires proof image for resolved |
| `backend/routes/admin.js` | Role-based issue filtering; compensation endpoints; full stats aggregation |
| `backend/services/emailService.js` | Added `compensationDeducted` and `escalationAlert` email templates |
| `backend/jobs/Deadlinejob.js` | New — hourly cron: deducts ₹100/day, emails officer + dept head + admins |
| `backend/utils/seed.js` | New — seeds all dept heads + officers |