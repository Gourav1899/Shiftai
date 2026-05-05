# ShiftEase — Complete Platform

## System Architecture

```
SUPER ADMIN  →  Sell plans, assign features, manage all tenants
TENANT ADMIN →  Manage their own business: orders, drivers, pricing, content
CUSTOMER     →  Book, upload photos, track live, rate
DRIVER       →  Accept jobs, update status, upload step photos, GPS
```

## Role Logic

| Role         | Access                                              |
|--------------|-----------------------------------------------------|
| super_admin  | /super/* — all tenants, plan sales, global analytics |
| tenant_admin | /admin/* — own bookings, drivers, pricing, content  |
| customer     | /app/*  — book, track, history, profile             |
| driver       | /driver/* — active job, status updates, earnings    |

## Booking Status Flow

```
pending → confirmed → driver_assigned → packing → loading → in_transit → delivered
                                          ↑              ↑          ↑           ↑
                                     Driver photo   Driver photo  GPS live   OTP + photo
```

## Live Tracking Flow

```
1. Driver app goes ONLINE   → Socket connects
2. Customer books           → Gets bookingId
3. Customer opens /track/ID → Emits join_booking
4. Driver app sends GPS     → Every 10 seconds via Socket
5. Server broadcasts        → to booking:ID room
6. Customer map updates     → Truck marker moves
7. ETA calculated           → Shown to customer
```

## Photo Flow

```
Customer:
  - Upload room photos before booking (helps AI estimate better)

Driver step photos:
  - PACKING  → Photo of packed boxes before loading
  - LOADING  → Photo of loaded truck
  - DELIVERED → Photo of delivered items at drop location

All photos:
  - Uploaded to Cloudinary
  - URL stored in booking.tracking[].photos[]
  - Visible to customer in status timeline
```

## SaaS Plan Assignment

```
Super Admin Panel → Plans page
  1. Click "Add Tenant" → Fill name, email, phone, plan
  2. Tenant created → 14-day trial starts automatically
  3. WhatsApp sent to tenant with panel link
  
  4. To upgrade: Select tenant → Change plan dropdown → Save
  5. WhatsApp "Plan Upgraded" notification sent automatically
  6. Features auto-enabled based on plan

Plan Features:
  starter      → Basic (chatbot, tracking, whatsapp)
  professional → + Photo detection, analytics, multi-city
  enterprise   → + Voice bot, custom branding, API access
```

## Setup

### Backend
```bash
cd backend
cp .env.example .env
# Fill .env values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
# REACT_APP_API_URL=http://localhost:5000/api
# REACT_APP_SOCKET_URL=http://localhost:5000
# REACT_APP_GOOGLE_KEY=your_google_maps_key
npm install
npm start
```

### Deploy
- **Backend**: Railway, Render, or EC2 (Node.js)
- **Frontend**: Vercel or Netlify
- **DB**: MongoDB Atlas
- **Files**: Cloudinary (already configured)
- **Socket**: Works automatically with backend deploy

## Admin Panel URLs (after deploy)
- Super Admin : https://your-domain.com/super
- Tenant Admin: https://your-domain.com/admin
- Customer App: https://your-domain.com/app
- Driver App  : https://your-domain.com/driver
