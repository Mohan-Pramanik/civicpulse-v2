# 🟢 CivicPulse v2 — Crowdsourced Civic Issue Reporting System

A scalable full-stack MERN application for citizens to report, track, and resolve civic issues.

---

## 📁 Project Structure

```
civicpulse-v2/
├── backend/
│   ├── config/         db.js, seed.js
│   ├── middleware/      auth.js, errorHandler.js, upload.js, validate.js
│   ├── models/          User.js, Issue.js
│   ├── routes/          auth.js, issues.js, admin.js
│   ├── services/        emailService.js, routingService.js
│   ├── utils/           ApiError.js, asyncHandler.js, logger.js, response.js
│   ├── uploads/         (auto-created)
│   ├── logs/            (auto-created)
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── public/          index.html
    └── src/
        ├── components/  layout/Navbar, issues/IssueCard, common/index
        ├── context/     AuthContext, ToastContext
        ├── pages/
        │   ├── auth/    LoginPage, RegisterPage
        │   ├── citizen/ FeedPage, ReportPage, TrackPage,
        │   │            IssueDetailPage, ProfilePage
        │   └── admin/   AdminDashboard, AdminIssues, AdminUsers
        ├── App.js, api.js, index.js, index.css
        └── .env.example
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env       # fill in MONGO_URI and JWT_SECRET
npm install
npm run seed               # seed demo users + issues
npm run dev                # starts on :5000
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm start                  # starts on :3000
```

### 4. Demo Accounts
| Role       | Email                    | Password    |
|------------|--------------------------|-------------|
| Admin      | admin@civicpulse.in      | password123 |
| Officer    | officer@civicpulse.in    | password123 |
| Citizen    | riya@example.com         | password123 |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                   | Access    |
|--------|----------------------------|-----------|
| POST   | /api/auth/register         | Public    |
| POST   | /api/auth/login            | Public    |
| GET    | /api/auth/me               | Private   |
| PUT    | /api/auth/updateprofile    | Private   |
| PUT    | /api/auth/updatepassword   | Private   |

### Issues
| Method | Endpoint                      | Access            |
|--------|-------------------------------|-------------------|
| GET    | /api/issues                   | Public            |
| GET    | /api/issues/mine              | Citizen           |
| GET    | /api/issues/:id               | Public            |
| POST   | /api/issues                   | Citizen           |
| PUT    | /api/issues/:id/upvote        | Citizen           |
| PUT    | /api/issues/:id/status        | Admin/Department  |
| PUT    | /api/issues/:id/assign        | Admin             |
| POST   | /api/issues/:id/comments      | Any logged-in     |
| PUT    | /api/issues/:id/rate          | Citizen (owner)   |
| DELETE | /api/issues/:id               | Admin / Owner     |

### Admin
| Method | Endpoint                   | Access |
|--------|----------------------------|--------|
| GET    | /api/admin/stats           | Admin  |
| GET    | /api/admin/issues          | Admin  |
| GET    | /api/admin/users           | Admin  |
| PUT    | /api/admin/users/:id       | Admin  |
| DELETE | /api/admin/users/:id       | Admin  |
| POST   | /api/admin/bulk-status     | Admin  |
| GET    | /api/admin/export          | Admin  |

---

## ✨ Features

- **JWT Auth** with role-based access (citizen / department / admin)
- **Issue Reporting** with GPS geo-tagging, image upload (up to 5), auto-routing
- **Auto-Routing Engine** assigns department by category on save
- **Citizen Feed** with category/status/search filters + upvoting
- **Real-time Tracking** with progress bars and status timeline
- **Issue Detail** with photo gallery, comments, satisfaction rating
- **Admin Dashboard** with KPI cards, 7-day trend chart, hotspot map
- **Issue Management** with bulk status updates and JSON export
- **User Management** with role assignment and deactivation
- **Email Notifications** on create and status change (via Nodemailer)
- **Security**: Helmet, rate limiting, MongoDB sanitization, XSS clean
- **Logging**: Winston (console + file logs)
- **Scalable** error handling with custom ApiError + global middleware

---

## 🔧 Tech Stack

| Layer      | Tech                                        |
|------------|---------------------------------------------|
| Frontend   | React 18, React Router v6, Axios, CSS3      |
| Backend    | Node.js, Express.js                         |
| Database   | MongoDB, Mongoose ODM                       |
| Auth       | JWT + bcryptjs                              |
| Upload     | Multer (local disk)                         |
| Email      | Nodemailer                                  |
| Security   | Helmet, express-rate-limit, mongo-sanitize  |
| Logging    | Winston                                     |

---

## 📝 Environment Variables

Copy `.env.example` to `.env` in both `backend/` and `frontend/` and fill in:

**Backend:**
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — Long random secret (256-bit recommended)
- `SMTP_*` — Email credentials (optional)

**Frontend:**
- `REACT_APP_API_URL` — Backend URL (default: proxied to `/api`)
- `REACT_APP_GOOGLE_MAPS_KEY` — For live map (optional)
