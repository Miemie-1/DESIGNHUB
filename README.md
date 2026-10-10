# DesignHub

Web-based Graphic Design Project, Client and Payment Management System.

- **client/** – Next.js (App Router) frontend
- **server/** – Node.js + Express REST API
- **Database** – MongoDB (cloud, e.g. MongoDB Atlas) via Mongoose

## Setup

### 1. Database (MongoDB Atlas)
1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user and allow your IP under *Network Access*
3. Copy the connection string (Drivers → Node.js)

### 2. Server
```bash
cd server
cp .env.example .env     # then edit .env: MONGODB_URI and JWT_SECRET
npm install
npm run dev              # http://localhost:5000
```

### 3. Client
```bash
cd client
npm install
npm run dev              # http://localhost:3000
```
`client/.env.local` points the frontend at the API (`NEXT_PUBLIC_API_URL`).

## API overview
All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

| Route | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Authentication |
| `POST /api/auth/demo` | "Continue as demo" – shared sample account with seeded data (disable with `ENABLE_DEMO=false`) |
| `GET/PUT /api/auth/me`, `PUT /api/auth/password` | Profile, workspace name, change password |
| `/api/clients` (GET, POST, GET/PUT/DELETE `/:id`) | Clients. List is paginated: `?search=&page=&limit=` → `{ items, total, page, pages }` with project count and total spent. `GET /:id` includes project history and financial summary |
| `/api/projects` (same) | Projects (budget, progress, deliverables), `?search=&status=&client=` |
| `/api/payments` (GET, POST, GET/PUT/DELETE `/:id`) | Payments (method, reference, notes), `?project=&status=` |
| `GET /api/payments/summary` | Total received this year, pending amount, transaction count |
| `GET /api/dashboard/stats` | Dashboard statistics |
| `GET /api/reports/projects`, `GET /api/reports/payments` | Reports, `?from=&to=&status=` |

## Collections
`users`, `clients`, `projects`, `payments` – each record carries a `user` reference so
every designer only sees their own data.

## Deploying to Vercel
Deploy the two folders as **two separate Vercel projects** (set *Root Directory* to `server` and `client`).

**Backend (`server`)** – served as a serverless function through `api/index.js` + `vercel.json`.
Environment variables: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (the frontend's Vercel URL; comma-separate
several origins), optional `ENABLE_DEMO=false`.
In MongoDB Atlas → *Network Access*, allow `0.0.0.0/0` (Vercel's outbound IPs are not fixed).

**Frontend (`client`)** – standard Next.js project.
Environment variable: `NEXT_PUBLIC_API_URL=https://<your-backend>.vercel.app/api`.
It is inlined at build time, so redeploy the frontend after changing it.

Deploy the backend first, then set `NEXT_PUBLIC_API_URL`, deploy the frontend, then put the frontend URL
into the backend's `CLIENT_URL` and redeploy the backend.
