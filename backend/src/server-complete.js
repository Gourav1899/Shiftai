// ═══════════════════════════════════════════════════════
// BACKEND — Complete Node.js + Express + Socket.io
// ═══════════════════════════════════════════════════════

// ── server.js ────────────────────────────────────────
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true },
});

// ── Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── DB ────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shiftease')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(e  => console.error('❌ DB error:', e));

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',        require('./src/routes/auth'));
app.use('/api/bookings',    require('./src/routes/bookings'));
app.use('/api/drivers',     require('./src/routes/drivers'));
app.use('/api/admin',       require('./src/routes/admin'));
app.use('/api/superadmin',  require('./src/routes/superadmin'));
app.use('/api/payments',    require('./src/routes/payments'));
app.use('/api/ai',          require('./src/routes/ai'));
app.use('/api/upload',      require('./src/routes/upload'));
app.use('/api/notifications', require('./src/routes/notifications'));

// ── Socket.io — Live GPS Tracking ────────────────────
require('./src/socket/tracking')(io);

// ── Health ────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
module.exports = { app, io };


// ═══════════════════════════════════════════════════════
// src/socket/tracking.js — Socket.io live GPS
// ═══════════════════════════════════════════════════════
const jwt    = require('jsonwebtoken');
const Driver = require('../models/Driver');

module.exports = function initTracking(io) {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', socket => {
    console.log(`[Socket] Connected: ${socket.id} | User: ${socket.user?.userId}`);

    // ── Customer: join booking room to receive updates ──
    socket.on('join_booking', bookingId => {
      socket.join(`booking:${bookingId}`);
      console.log(`[Socket] Customer joined room: booking:${bookingId}`);
    });

    // ── Driver: send location every ~10s ──
    socket.on('driver_location', async ({ bookingId, lat, lng }) => {
      try {
        // 1. Persist to DB
        await Driver.findOneAndUpdate(
          { userId: socket.user.userId },
          {
            'availability.currentLocation': { lat, lng },
            'availability.lastLocationUpdate': new Date(),
          }
        );

        // 2. Calculate ETA (simple: avg 40 km/h city speed)
        // In production: use Google Maps Distance Matrix API
        const eta = '—'; // replace with real calc

        // 3. Broadcast to all customers in that booking room
        io.to(`booking:${bookingId}`).emit('location_update', { lat, lng, eta, timestamp: new Date() });
      } catch (e) {
        console.error('[Socket] location error:', e.message);
      }
    });

    // ── Booking status update — notify customer instantly ──
    socket.on('status_update', ({ bookingId, status, message }) => {
      io.to(`booking:${bookingId}`).emit('booking_status', { status, message, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};


// ═══════════════════════════════════════════════════════
// src/models/index.js — All Mongoose Models
// ═══════════════════════════════════════════════════════
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── USER ──────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  phone:       { type: String, required: true, unique: true },
  email:       { type: String, lowercase: true, sparse: true },
  role:        { type: String, enum: ['customer','driver','admin','super_admin','tenant_admin'], default: 'customer' },
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  isBlocked:   { type: Boolean, default: false },
  otp:         { code: String, expiresAt: Date },
  fcmToken:    String,
  loyaltyPts:  { type: Number, default: 0 },
  notifications: {
    whatsapp: { type: Boolean, default: true },
    sms:      { type: Boolean, default: true },
    push:     { type: Boolean, default: true },
  },
}, { timestamps: true });

// ── BOOKING ───────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  bookingId:   { type: String, unique: true },
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver:      { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },

  pickup: {
    address: String, city: String, state: String,
    pincode: String, lat: Number, lng: Number,
    floor: { type: Number, default: 0 },
    liftAvailable: Boolean,
    contactName: String, contactPhone: String,
  },
  dropoff: {
    address: String, city: String, state: String,
    pincode: String, lat: Number, lng: Number,
    floor: { type: Number, default: 0 },
    liftAvailable: Boolean,
    contactName: String, contactPhone: String,
  },

  serviceType:  { type: String, enum: ['home_shifting','office_relocation','vehicle_transport','storage','international'], required: true },
  houseType:    { type: String, enum: ['1rk','1bhk','2bhk','3bhk','4bhk_plus','villa','office_small','office_large'] },

  photos:       [{ type: String }], // URLs of uploaded room photos

  items: [{
    name: String, category: String, quantity: Number,
    weightKg: Number, requiresDisassembly: Boolean, isFragile: Boolean,
  }],

  scheduledDate: { type: Date, required: true },
  scheduledTime: String,
  distanceKm:    Number,

  pricing: {
    basePrice: Number, distanceCharge: Number, laborCharge: Number,
    floorCharge: Number, packingCharge: Number, platformFee: Number,
    gst: Number, discount: Number, couponCode: String,
    totalAmount: Number, advanceAmount: Number, remainingAmount: Number,
    dynamicMultiplier: { type: Number, default: 1.0 },
  },

  payment: {
    method:           { type: String, enum: ['upi','card','netbanking','cod','wallet'] },
    status:           { type: String, enum: ['pending','partial','paid','refunded'], default: 'pending' },
    gatewayOrderId:   String,
    gatewayPaymentId: String,
    advancePaidAt:    Date,
    finalPaidAt:      Date,
    refundId:         String,
    refundAmount:     Number,
  },

  insurance: { opted: Boolean, premium: Number, coverageAmount: Number, policyNumber: String },

  status: {
    type: String,
    enum: ['pending','confirmed','driver_assigned','packing','loading','in_transit','delivered','cancelled'],
    default: 'pending',
  },

  // Each tracking entry can have photos (packing photo, loading photo, delivery photo)
  tracking: [{
    status:    String,
    message:   String,
    location:  { lat: Number, lng: Number },
    photos:    [{ type: String }], // step-specific photos
    timestamp: { type: Date, default: Date.now },
    updatedBy: String,
  }],

  deliveryOtp: String,
  invoiceUrl:  String,
  notes:       String,

  rating: { score: { type: Number, min:1, max:5 }, review: String, ratedAt: Date },

  cancellation: { reason: String, cancelledBy: String, refundAmount: Number, cancelledAt: Date },

  wantInsurance: Boolean,
  paymentMethod: String,
}, { timestamps: true });

// Auto-generate bookingId
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingId = `ORD-${String(1000 + count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── DRIVER ────────────────────────────────────────────
const driverSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  driverId: { type: String, unique: true, sparse: true },

  vehicle: {
    type:         { type: String, enum: ['mini_truck','tempo','truck_16ft','truck_24ft','container'] },
    number:       String,
    make:         String,
    model:        String,
    capacityTons: Number,
    rcDoc:        String,
    insuranceDoc: String,
  },

  kyc: {
    aadharNumber:  String,
    licenseNumber: String,
    licenseExpiry: Date,
    aadharDoc:     String,
    licenseDoc:    String,
    selfie:        String,
    verified:      { type: Boolean, default: false },
  },

  availability: {
    isOnline:          { type: Boolean, default: false },
    currentLocation:   { lat: Number, lng: Number },
    lastLocationUpdate: Date,
    currentBooking:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    workingCities:     [String],
  },

  stats: {
    totalTrips:     { type: Number, default: 0 },
    totalEarnings:  { type: Number, default: 0 },
    todayEarnings:  { type: Number, default: 0 },
    avgRating:      { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
  },

  bankDetails: { accountNumber: String, ifsc: String, accountName: String, upiId: String },
  isActive:  { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

// ── TENANT ────────────────────────────────────────────
const tenantSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  slug:         { type: String, required: true, unique: true, lowercase: true },
  logo:         String,
  primaryColor: { type: String, default: '#c8f000' },
  contactEmail: String,
  contactPhone: String,
  whatsappNumber: String,

  subscription: {
    plan:      { type: String, enum: ['starter','professional','enterprise'], default: 'starter' },
    status:    { type: String, enum: ['trial','active','suspended','cancelled'], default: 'trial' },
    startDate: Date,
    endDate:   Date,
    trialEnds: Date,
    amount:    Number,
  },

  features: {
    aiChatbot:       { type: Boolean, default: true },
    photoDetection:  { type: Boolean, default: false },
    voiceBot:        { type: Boolean, default: false },
    insurance:       { type: Boolean, default: true },
    dynamicPricing:  { type: Boolean, default: true },
    whatsappAuto:    { type: Boolean, default: true },
    liveTracking:    { type: Boolean, default: true },
    analytics:       { type: Boolean, default: false },
    customBranding:  { type: Boolean, default: false },
    apiAccess:       { type: Boolean, default: false },
    multiCity:       { type: Boolean, default: false },
  },

  settings: {
    chatbotTenantId: String,
    razorpayKey:     String,
    razorpaySecret:  String,
    googleMapsKey:   String,
    maxDrivers:      { type: Number, default: 50 },
  },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── CONTENT ───────────────────────────────────────────
const contentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  isGlobal: { type: Boolean, default: false },
  hero:     { headline: String, subtext: String, ctaText: String, badgeText: String },
  brand:    { name: String, logo: String, primaryColor: String, tagline: String },
  stats:    { customers: String, cities: String, onTime: String, rating: String },
  seo:      { metaTitle: String, metaDescription: String, keywords: String },
  contact:  { phone: String, email: String, whatsapp: String, address: String },
  activeTemplate: { type: String, default: 'template4' },
  testimonials: [{ name: String, location: String, review: String, rating: Number }],
  gallery:  [{ url: String, caption: String }],
  services: [{ icon: String, title: String, description: String, price: String, isVisible: Boolean }],
  socialLinks: { facebook: String, instagram: String, twitter: String, youtube: String },
}, { timestamps: true });

// ── NOTIFICATION ──────────────────────────────────────
const notifSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  type:      String,
  channel:   { type: String, enum: ['push','sms','whatsapp','email'] },
  title:     String,
  message:   String,
  isRead:    { type: Boolean, default: false },
  status:    { type: String, enum: ['pending','sent','delivered','failed'], default: 'pending' },
  sentAt:    Date,
}, { timestamps: true });

// ── PRICING ───────────────────────────────────────────
const pricingSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  isGlobal: { type: Boolean, default: false },
  houseTypePrices: {
    '1rk':         { min: Number, max: Number, default: { type: Number, default: 4000  } },
    '1bhk':        { min: Number, max: Number, default: { type: Number, default: 6500  } },
    '2bhk':        { min: Number, max: Number, default: { type: Number, default: 10000 } },
    '3bhk':        { min: Number, max: Number, default: { type: Number, default: 15000 } },
    '4bhk_plus':   { min: Number, max: Number, default: { type: Number, default: 22000 } },
    villa:         { min: Number, max: Number, default: { type: Number, default: 35000 } },
    office_small:  { min: Number, max: Number, default: { type: Number, default: 25000 } },
    office_large:  { min: Number, max: Number, default: { type: Number, default: 60000 } },
  },
  perKmRate:          { type: Number, default: 15   },
  laborRate:          { type: Number, default: 500  },
  floorCharge:        { type: Number, default: 200  },
  gstRate:            { type: Number, default: 18   },
  platformCommission: { type: Number, default: 12   },
  packingRate:        { type: Number, default: 8    },
  dynamicRules: {
    weekendSurge:    { enabled: Boolean, multiplier: { type: Number, default: 1.15 } },
    peakSeason:      { enabled: Boolean, months: [Number], multiplier: { type: Number, default: 1.20 } },
    lastMinute:      { enabled: Boolean, hours: { type: Number, default: 24 }, multiplier: { type: Number, default: 1.10 } },
    loyaltyDiscount: { enabled: Boolean, percent: { type: Number, default: 5 } },
  },
}, { timestamps: true });

module.exports = {
  User:         mongoose.model('User',         userSchema),
  Booking:      mongoose.model('Booking',      bookingSchema),
  Driver:       mongoose.model('Driver',       driverSchema),
  Tenant:       mongoose.model('Tenant',       tenantSchema),
  Content:      mongoose.model('Content',      contentSchema),
  Notification: mongoose.model('Notification', notifSchema),
  Pricing:      mongoose.model('Pricing',      pricingSchema),
};


// ═══════════════════════════════════════════════════════
// src/routes/auth.js
// ═══════════════════════════════════════════════════════
const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const twilio  = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const { User } = require('../models');

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

    const otp       = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
      { phone },
      { $set: { 'otp.code': otp, 'otp.expiresAt': expiresAt, phone } },
      { upsert: true, new: true }
    );

    if (process.env.NODE_ENV === 'production') {
      await twilio.messages.create({
        body: `Your ShiftEase OTP is: ${otp}. Valid 10 minutes. Do not share.`,
        from: process.env.TWILIO_FROM,
        to:   `+91${phone}`,
      });
    } else {
      console.log(`[DEV OTP] ${phone} → ${otp}`);
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    const user = await User.findOne({ phone });
    if (!user)               return res.status(404).json({ success: false, message: 'User not found' });
    if (user.otp?.code !== otp)           return res.status(400).json({ success: false, message: 'Invalid OTP' });
    if (user.otp?.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' });

    const updates = { isVerified: true, $unset: { otp: 1 } };
    if (name && !user.name) updates.name = name;
    await User.findOneAndUpdate({ phone }, updates);

    const token = jwt.sign(
      { userId: user._id, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user: { id: user._id, name: user.name || name, phone, role: user.role } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;


// ═══════════════════════════════════════════════════════
// src/routes/bookings.js
// ═══════════════════════════════════════════════════════
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const { Booking, Driver, Pricing } = require('../models');
const { calculatePrice, sendWhatsApp, sendPush } = require('../services');

router.post('/estimate', async (req, res) => {
  try {
    const pricing = await calculatePrice(req.body);
    res.json({ success: true, pricing });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { pickup, dropoff, houseType, serviceType, scheduledDate,
            photos, wantInsurance, paymentMethod, phone } = req.body;

    const pricing = await calculatePrice({ pickup, dropoff, houseType, serviceType, scheduledDate, tenantId: req.user.tenantId });

    const booking = await Booking.create({
      customer: req.user.userId,
      tenantId: req.user.tenantId,
      pickup, dropoff, houseType, serviceType,
      scheduledDate, photos: photos || [],
      pricing,
      payment: { method: paymentMethod, status: 'pending' },
      insurance: wantInsurance ? { opted: true, premium: Math.round(pricing.totalAmount * 0.005) } : { opted: false },
      status: 'confirmed',
      deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
      tracking: [{ status: 'confirmed', message: 'Booking confirmed', timestamp: new Date() }],
    });

    // Auto-assign driver
    const driver = await Driver.findOne({
      'availability.isOnline': true,
      'availability.currentBooking': null,
      tenantId: req.user.tenantId,
      isActive: true, isBlocked: false,
    }).sort({ 'stats.avgRating': -1 });

    if (driver) {
      booking.driver = driver._id;
      booking.status = 'driver_assigned';
      booking.tracking.push({ status: 'driver_assigned', message: `Driver ${driver.userId?.name || ''} assigned`, timestamp: new Date() });
      await booking.save();
      driver.availability.currentBooking = booking._id;
      await driver.save();
    }

    // WhatsApp notification
    await sendWhatsApp(phone || req.user.phone, 'BOOKING_CONFIRMED', {
      bookingId: booking.bookingId,
      amount:    pricing.totalAmount,
      date:      scheduledDate,
    });

    res.status(201).json({ success: true, booking });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.userId })
      .populate('driver', 'userId vehicle availability.currentLocation')
      .populate({ path: 'driver', populate: { path: 'userId', select: 'name phone' } })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, bookings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate({ path: 'driver', populate: { path: 'userId', select: 'name phone' } });
    if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, booking });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, message, location, photos = [] } = req.body;
    const booking = await Booking.findById(req.params.id).populate('customer','phone');
    if (!booking) return res.status(404).json({ success: false, message: 'Not found' });

    booking.status = status;
    booking.tracking.push({ status, message, location, photos, timestamp: new Date(), updatedBy: req.user.userId });
    await booking.save();

    // Notify customer via WhatsApp
    const tplMap = { in_transit: 'IN_TRANSIT', delivered: 'DELIVERED', packing: 'PACKING', loading: 'LOADING' };
    if (tplMap[status]) {
      await sendWhatsApp(booking.customer?.phone, tplMap[status], { bookingId: booking.bookingId });
    }

    // Also emit via socket (driver will do this from client too)
    req.app.get('io')?.to(`booking:${booking._id}`).emit('booking_status', { status, message, timestamp: new Date() });

    // If delivered — free up driver
    if (status === 'delivered') {
      await Driver.findByIdAndUpdate(booking.driver, {
        'availability.currentBooking': null,
        $inc: { 'stats.totalTrips': 1, 'stats.totalEarnings': booking.pricing?.totalAmount * 0.8 },
      });
    }

    res.json({ success: true, booking });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
    if (['delivered','in_transit'].includes(booking.status)) return res.status(400).json({ success: false, message: 'Cannot cancel now' });
    booking.status = 'cancelled';
    booking.cancellation = { reason: req.body.reason, cancelledBy: req.user.role, cancelledAt: new Date() };
    await booking.save();
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/rate', auth, async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { rating: { score: req.body.score, review: req.body.review, ratedAt: new Date() } });
    res.json({ success: true, message: 'Rating submitted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;


// ═══════════════════════════════════════════════════════
// src/routes/drivers.js
// ═══════════════════════════════════════════════════════
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { Driver, Booking } = require('../models');

const driverAuth = (req, res, next) => {
  if (req.user.role !== 'driver') return res.status(403).json({ success: false, message: 'Driver only' });
  next();
};

router.post('/toggle-online', auth, driverAuth, async (req, res) => {
  try {
    const driver = await Driver.findOneAndUpdate(
      { userId: req.user.userId },
      { 'availability.isOnline': req.body.isOnline },
      { new: true }
    );
    res.json({ success: true, driver });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/location', auth, driverAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await Driver.findOneAndUpdate(
      { userId: req.user.userId },
      { 'availability.currentLocation': { lat, lng }, 'availability.lastLocationUpdate': new Date() }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/active-job', auth, driverAuth, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.userId });
    if (!driver?.availability?.currentBooking) return res.json({ success: true, booking: null });
    const booking = await Booking.findById(driver.availability.currentBooking).populate('customer','name phone');
    res.json({ success: true, booking });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/earnings', auth, driverAuth, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.userId });
    res.json({ success: true, ...driver?.stats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;


// ═══════════════════════════════════════════════════════
// src/routes/superadmin.js — Plan assignment + features
// ═══════════════════════════════════════════════════════
const router   = require('express').Router();
const auth     = require('../middleware/auth');
const { Tenant, User, Booking } = require('../models');
const { sendWhatsApp } = require('../services');

const saAuth = (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  next();
};

router.use(auth, saAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const [tenantCount, totalRevenue, totalOrders, trialExpiring] = await Promise.all([
      Tenant.countDocuments({ isActive: true }),
      Booking.aggregate([{ $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }]),
      Booking.countDocuments(),
      Tenant.countDocuments({ 'subscription.status': 'trial', 'subscription.trialEnds': { $lte: new Date(Date.now() + 3 * 86400000) } }),
    ]);
    const revenueByDay = await Booking.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$pricing.totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, stats: { tenantCount, totalRevenue: totalRevenue[0]?.total || 0, totalOrders, trialExpiring }, revenueByDay });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json({ success: true, tenants });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/tenants', async (req, res) => {
  try {
    const { name, contactEmail, contactPhone, plan } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');

    const planFeatures = {
      starter:      { aiChatbot:true, photoDetection:false, voiceBot:false, insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:false, customBranding:false, apiAccess:false, multiCity:false },
      professional: { aiChatbot:true, photoDetection:true,  voiceBot:false, insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:true,  customBranding:false, apiAccess:false, multiCity:true  },
      enterprise:   { aiChatbot:true, photoDetection:true,  voiceBot:true,  insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:true,  customBranding:true,  apiAccess:true,  multiCity:true  },
    };

    const tenant = await Tenant.create({
      name, slug, contactEmail, contactPhone,
      subscription: { plan: plan || 'starter', status: 'trial', trialEnds: new Date(Date.now() + 14 * 86400000) },
      features: planFeatures[plan || 'starter'],
    });

    // Send welcome WhatsApp if phone provided
    if (contactPhone) {
      await sendWhatsApp(contactPhone, 'TENANT_WELCOME', { name, plan: plan || 'starter', trialDays: 14, slug });
    }

    res.status(201).json({ success: true, tenant });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Assign / upgrade plan — sends upgrade notification
router.patch('/tenants/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Not found' });

    const planFeatures = {
      starter:      { aiChatbot:true, photoDetection:false, voiceBot:false, insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:false, customBranding:false, apiAccess:false, multiCity:false },
      professional: { aiChatbot:true, photoDetection:true,  voiceBot:false, insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:true,  customBranding:false, apiAccess:false, multiCity:true  },
      enterprise:   { aiChatbot:true, photoDetection:true,  voiceBot:true,  insurance:true, dynamicPricing:true, whatsappAuto:true, liveTracking:true, analytics:true,  customBranding:true,  apiAccess:true,  multiCity:true  },
    };

    const priceMap = { starter: 999, professional: 2999, enterprise: 7999 };

    const isUpgrade = priceMap[plan] > priceMap[tenant.subscription?.plan || 'starter'];

    tenant.subscription.plan   = plan;
    tenant.subscription.status = 'active';
    tenant.subscription.amount = priceMap[plan];
    tenant.features = { ...tenant.features, ...planFeatures[plan] };
    await tenant.save();

    // Send notification
    if (tenant.contactPhone) {
      await sendWhatsApp(tenant.contactPhone, isUpgrade ? 'PLAN_UPGRADED' : 'PLAN_CHANGED', {
        name: tenant.name, plan, amount: priceMap[plan],
      });
    }

    res.json({ success: true, tenant, message: `Plan ${isUpgrade ? 'upgraded' : 'changed'} to ${plan}` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/tenants/:id/features', async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, { features: req.body.features }, { new: true });
    res.json({ success: true, tenant });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/tenants/:id/suspend', async (req, res) => {
  try {
    await Tenant.findByIdAndUpdate(req.params.id, { 'subscription.status': 'suspended', isActive: false });
    res.json({ success: true, message: 'Tenant suspended' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/tenants/:id/activate', async (req, res) => {
  try {
    await Tenant.findByIdAndUpdate(req.params.id, { 'subscription.status': 'active', isActive: true });
    res.json({ success: true, message: 'Tenant activated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;


// ═══════════════════════════════════════════════════════
// src/services/index.js — WhatsApp, Pricing, Push
// ═══════════════════════════════════════════════════════
const { Pricing } = require('../models');

// ── WhatsApp Templates ────────────────────────────────
const TEMPLATES = {
  BOOKING_CONFIRMED: d => `✅ *Booking Confirmed!*\n📦 ${d.bookingId}\n📅 ${new Date(d.date).toDateString()}\n💰 ₹${d.amount?.toLocaleString('en-IN')}\n\nTrack: https://app.shiftease.in/track/${d.bookingId}`,
  DRIVER_ASSIGNED:   d => `🚚 *Driver Assigned!*\n📦 ${d.bookingId}\n👤 ${d.driverName}\n📞 ${d.driverPhone}\n🚛 ${d.vehicleNumber}`,
  IN_TRANSIT:        d => `🛣️ *Your items are moving!*\n📦 ${d.bookingId}\nETA: ${d.eta}\nLive track: https://app.shiftease.in/track/${d.bookingId}`,
  DELIVERED:         d => `✅ *Delivered!*\n📦 ${d.bookingId}\n\nRate us: https://app.shiftease.in/track/${d.bookingId}`,
  OTP:               d => `🔐 ShiftEase OTP: *${d.otp}*\nValid 10 min. Do not share.`,
  PACKING:           d => `📦 Packing started for your booking ${d.bookingId}`,
  LOADING:           d => `🔼 All items loaded! En route to ${d.dropCity}`,
  TENANT_WELCOME:    d => `🎉 Welcome to ShiftEase, ${d.name}!\n\nYour *${d.plan}* trial is active for ${d.trialDays} days.\n\nAdmin panel: https://admin.shiftease.in/${d.slug}\n\nNeed help? Reply to this message.`,
  PLAN_UPGRADED:     d => `🚀 *Plan Upgraded!*\n${d.name} is now on *${d.plan.toUpperCase()}*\nAmount: ₹${d.amount}/mo\n\nNew features are now live on your platform!`,
  PLAN_CHANGED:      d => `ℹ️ Your ShiftEase plan has been updated to *${d.plan}* (₹${d.amount}/mo)`,
};

async function sendWhatsApp(phone, templateKey, data) {
  const msg = TEMPLATES[templateKey]?.(data);
  if (!msg || !phone) return;
  if (process.env.NODE_ENV !== 'production') { console.log(`[WA→${phone}] ${msg.substring(0,80)}`); return; }
  try {
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    await twilio.messages.create({ body: msg, from: `whatsapp:${process.env.TWILIO_WA_FROM}`, to: `whatsapp:+91${phone}` });
  } catch (e) { console.error('[WA Error]', e.message); }
}

// ── Dynamic Pricing ───────────────────────────────────
const BASE = { '1rk':4000,'1bhk':6500,'2bhk':10000,'3bhk':15000,'4bhk_plus':22000,'villa':35000,'office_small':25000,'office_large':60000 };
const LABOUR = { '1rk':2,'1bhk':2,'2bhk':3,'3bhk':4,'4bhk_plus':5,'villa':6,'office_small':4,'office_large':8 };

async function calculatePrice({ pickup, dropoff, houseType, serviceType, scheduledDate, tenantId, distanceKm }) {
  const cfg = await Pricing.findOne({ tenantId }) || await Pricing.findOne({ isGlobal: true }) || {};
  const perKm   = cfg.perKmRate   || 15;
  const laborR  = cfg.laborRate   || 500;
  const floorR  = cfg.floorCharge || 200;
  const gstR    = (cfg.gstRate    || 18) / 100;
  const platR   = (cfg.platformCommission || 12) / 100;
  const packR   = (cfg.packingRate || 8) / 100;

  const km      = distanceKm || 60;
  const base    = BASE[houseType] || 8000;
  const dist    = km * perKm;
  const labour  = (LABOUR[houseType] || 3) * laborR;
  const floor   = ((pickup?.floor || 0) + (dropoff?.floor || 0)) * floorR;
  const packing = base * packR;

  let sub  = base + dist + labour + floor + packing;
  let mult = 1.0;

  if (scheduledDate) {
    const d   = new Date(scheduledDate);
    const day = d.getDay();
    const mo  = d.getMonth() + 1;
    const hrs = (d - Date.now()) / 3600000;

    if ([0,6].includes(day))            mult *= cfg.dynamicRules?.weekendSurge?.multiplier  || 1.15;
    if ([10,11,12,1].includes(mo))      mult *= cfg.dynamicRules?.peakSeason?.multiplier    || 1.20;
    if (hrs > 0 && hrs < 24)            mult *= cfg.dynamicRules?.lastMinute?.multiplier    || 1.10;
  }

  sub *= mult;
  const platFee  = sub * platR;
  const taxable  = sub + platFee;
  const gst      = taxable * gstR;
  const total    = Math.round(taxable + gst);
  const advance  = Math.round(total * 0.30);

  return { basePrice:Math.round(base), distanceCharge:Math.round(dist), laborCharge:Math.round(labour), floorCharge:Math.round(floor), packingCharge:Math.round(packing), platformFee:Math.round(platFee), gst:Math.round(gst), discount:0, totalAmount:total, advanceAmount:advance, remainingAmount:total-advance, dynamicMultiplier:mult, distanceKm:km };
}

// ── Push notification (Firebase FCM) ─────────────────
async function sendPush(fcmToken, title, body) {
  if (!fcmToken || !process.env.FIREBASE_PROJECT_ID) return;
  // Use firebase-admin in production
  console.log(`[Push→${fcmToken?.substring(0,12)}…] ${title}: ${body}`);
}

module.exports = { sendWhatsApp, calculatePrice, sendPush };


// ═══════════════════════════════════════════════════════
// src/routes/upload.js — Cloudinary image upload
// ═══════════════════════════════════════════════════════
const router    = require('express').Router();
const multer    = require('multer');
const cloudinary = require('cloudinary').v2;
const auth      = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

    const folder = req.body.folder || 'shiftease';
    const b64    = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `shiftease/${folder}`,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;


// ═══════════════════════════════════════════════════════
// src/middleware/auth.js
// ═══════════════════════════════════════════════════════
const jwt  = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
