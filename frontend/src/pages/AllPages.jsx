// ═══════════════════════════════════════════════════
// CUSTOMER PAGES
// ═══════════════════════════════════════════════════

// ── pages/customer/Home.jsx ──────────────────────
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function CustomerHome() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    bookingAPI.getMyBookings().then(r => setBookings(r.data.bookings || [])).finally(() => setLoading(false));
  }, []);

  const active = bookings.filter(b => !['delivered','cancelled'].includes(b.status));
  const recent = bookings.slice(0, 5);

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2>Hi {user?.name?.split(' ')[0] || 'there'} 👋</h2>
        <p style={{ color: '#666', fontSize: '.88rem' }}>Ready to shift something?</p>
      </div>

      {/* Book CTA */}
      <Link to="/app/book" style={{ textDecoration: 'none' }}>
        <div style={{ background: '#111', borderRadius: 14, padding: '1.4rem', marginBottom: '1.25rem', color: '#fff' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.4rem' }}>📦 Book a Move</div>
          <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,.6)', marginBottom: '1rem' }}>Get instant AI quote in 60 seconds</div>
          <div style={{ background: '#c8f000', color: '#000', display: 'inline-block', padding: '.45rem 1.1rem', borderRadius: 100, fontSize: '.84rem', fontWeight: 700 }}>Get Quote →</div>
        </div>
      </Link>

      {/* Quick services */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        {[['🏠','Home Shifting'],['🏢','Office Move'],['🚗','Vehicle'],['📦','Storage']].map(([icon,label]) => (
          <Link key={label} to="/app/book" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{icon}</span>
              <span style={{ fontSize: '.84rem', fontWeight: 500, color: '#111' }}>{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Active bookings */}
      {active.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '.65rem', fontSize: '.9rem' }}>Active Bookings</div>
          {active.map(b => <BookingCard key={b._id} booking={b} />)}
        </div>
      )}

      {/* Recent bookings */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: '.65rem', fontSize: '.9rem' }}>Recent Bookings</div>
        {loading ? <div style={{ color: '#999', fontSize: '.84rem' }}>Loading…</div>
          : recent.length === 0 ? <div style={{ color: '#999', fontSize: '.84rem' }}>No bookings yet. Book your first move!</div>
          : recent.map(b => <BookingCard key={b._id} booking={b} />)}
      </div>
    </div>
  );
}

function BookingCard({ booking: b }) {
  const statusColor = { confirmed:'#2563eb', driver_assigned:'#ea580c', packing:'#ea580c', loading:'#ea580c', in_transit:'#ea580c', delivered:'#16a34a', cancelled:'#dc2626', pending:'#999' };
  return (
    <Link to={`/app/track/${b._id}`} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem', marginBottom: '.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{b.bookingId}</div>
          <div style={{ fontSize: '.78rem', color: '#666', marginTop: 2 }}>{b.pickup?.city} → {b.dropoff?.city}</div>
          <div style={{ fontSize: '.78rem', color: '#999', marginTop: 2 }}>₹{b.pricing?.totalAmount?.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <span style={{ background: statusColor[b.status] + '18', color: statusColor[b.status], fontSize: '.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 100 }}>{b.status?.replace('_',' ')}</span>
          <div style={{ fontSize: '.7rem', color: '#999', marginTop: 4, textAlign: 'right' }}>Track →</div>
        </div>
      </div>
    </Link>
  );
}


// ── pages/customer/Track.jsx ─────────────────────
import { useParams } from 'react-router-dom';
import { StatusTimeline } from '../../components/common/StatusTimeline';
import { MapView } from '../../components/common/MapView';
import { useTrackBooking } from '../../hooks/useTrackBooking';

export default function CustomerTrack() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const { driverLocation, eta } = useTrackBooking(bookingId);

  useEffect(() => {
    bookingAPI.getById(bookingId).then(r => setBooking(r.data.booking));
  }, [bookingId]);

  if (!booking) return <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading booking…</div>;

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Tracking — {booking.bookingId}</h2>
        <div style={{ fontSize: '.82rem', color: '#666', marginTop: 2 }}>{booking.pickup?.city} → {booking.dropoff?.city}</div>
      </div>

      {/* ETA banner */}
      {eta && (
        <div style={{ background: '#c8f000', borderRadius: 12, padding: '.9rem 1.1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '.9rem', color: '#000' }}>🚚 In Transit</span>
          <span style={{ fontWeight: 700, color: '#000' }}>ETA: {eta} min</span>
        </div>
      )}

      {/* Live Map */}
      {['driver_assigned','packing','loading','in_transit'].includes(booking.status) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: '.6rem' }}>Live Location</div>
          <MapView
            driverLocation={driverLocation}
            pickup={booking.pickup?.lat ? { lat: booking.pickup.lat, lng: booking.pickup.lng } : null}
            dropoff={booking.dropoff?.lat ? { lat: booking.dropoff.lat, lng: booking.dropoff.lng } : null}
          />
        </div>
      )}

      {/* Driver info */}
      {booking.driver && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '.88rem' }}>🚚 {booking.driver?.userId?.name || 'Driver'}</div>
            <div style={{ fontSize: '.78rem', color: '#666', marginTop: 2 }}>Vehicle: {booking.driver?.vehicle?.number || '—'}</div>
          </div>
          <a href={`tel:${booking.driver?.userId?.phone}`}>
            <button className="btn btn-primary btn-sm">📞 Call</button>
          </a>
        </div>
      )}

      {/* Status Timeline */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: '1rem' }}>Order Status</div>
        <StatusTimeline currentStatus={booking.status} tracking={booking.tracking} />
      </div>

      {/* Rate booking */}
      {booking.status === 'delivered' && !booking.rating?.score && (
        <RateBooking bookingId={booking._id} onDone={() => window.location.reload()} />
      )}
    </div>
  );
}

function RateBooking({ bookingId, onDone }) {
  const [score, setScore] = useState(5);
  const [review, setReview] = useState('');
  const handleSubmit = () => {
    bookingAPI.rate(bookingId, { score, review }).then(onDone);
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Rate Your Experience</div>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setScore(s)} style={{ background: s <= score ? '#c8f000' : '#f0f0f0', border: 'none', borderRadius: 8, width: 40, height: 40, fontSize: '1.1rem', cursor: 'pointer' }}>⭐</button>
        ))}
      </div>
      <textarea className="form-input" placeholder="Write a review (optional)…" value={review} onChange={e => setReview(e.target.value)} style={{ marginBottom: '1rem' }} />
      <button className="btn btn-primary btn-full" onClick={handleSubmit}>Submit Review</button>
    </div>
  );
}


// ── pages/customer/Book.jsx ──────────────────────
import toast from 'react-hot-toast';
import { PhotoUpload } from '../../components/common/PhotoUpload';

export default function CustomerBook() {
  const nav = useNavigate();
  const [step, setStep]       = useState(0);
  const [photos, setPhotos]   = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    pickupCity:'', pickupAddress:'', pickupFloor:0,
    dropCity:'', dropAddress:'', dropFloor:0,
    houseType:'', serviceType:'home_shifting',
    scheduledDate:'', scheduledTime:'',
    phone:'', paymentMethod:'upi', wantInsurance: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const getEstimate = async () => {
    if (!form.pickupCity || !form.dropCity || !form.houseType) { toast.error('Fill all required fields'); return; }
    setLoading(true);
    try {
      const r = await bookingAPI.getEstimate({ pickup: { city: form.pickupCity, floor: form.pickupFloor }, dropoff: { city: form.dropCity, floor: form.dropFloor }, houseType: form.houseType, serviceType: form.serviceType, scheduledDate: form.scheduledDate || new Date().toISOString() });
      setPricing(r.data.pricing);
      setStep(2);
    } catch { toast.error('Could not get estimate'); } finally { setLoading(false); }
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      // 1. Upload photos if any
      let photoUrls = [];
      for (const p of photos) {
        if (p.file) {
          const r = await uploadAPI.uploadFile(p.file, 'bookings');
          photoUrls.push(r.data.url);
        }
      }
      // 2. Create booking
      const r = await bookingAPI.create({ ...form, pickup: { city: form.pickupCity, address: form.pickupAddress, floor: form.pickupFloor }, dropoff: { city: form.dropCity, address: form.dropAddress, floor: form.dropFloor }, photos: photoUrls });
      toast.success('Booking confirmed! Check WhatsApp for details.');
      nav(`/app/track/${r.data.booking._id}`);
    } catch { toast.error('Booking failed. Try again.'); } finally { setLoading(false); }
  };

  const steps = ['Locations', 'Items & Photos', 'Quote', 'Payment'];

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '.35rem', marginBottom: '1.5rem' }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? '#111' : '#e0e0e0', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.25rem' }}>{steps[step]}</div>

      {/* STEP 0 — Locations */}
      {step === 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '.75rem', color: '#666', fontSize: '.82rem' }}>PICKUP</div>
          <div className="form-group"><label className="form-label">City *</label><input className="form-input" placeholder="e.g. Delhi" value={form.pickupCity} onChange={e => set('pickupCity', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Full Address</label><input className="form-input" placeholder="Street, Area, Landmark" value={form.pickupAddress} onChange={e => set('pickupAddress', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Floor Number</label><input className="form-input" type="number" min="0" value={form.pickupFloor} onChange={e => set('pickupFloor', Number(e.target.value))} /></div>

          <div style={{ fontWeight: 600, margin: '1.1rem 0 .75rem', color: '#666', fontSize: '.82rem' }}>DROP</div>
          <div className="form-group"><label className="form-label">City *</label><input className="form-input" placeholder="e.g. Mumbai" value={form.dropCity} onChange={e => set('dropCity', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Full Address</label><input className="form-input" placeholder="Street, Area, Landmark" value={form.dropAddress} onChange={e => set('dropAddress', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Floor Number</label><input className="form-input" type="number" min="0" value={form.dropFloor} onChange={e => set('dropFloor', Number(e.target.value))} /></div>

          <button className="btn btn-primary btn-full btn-lg" onClick={() => setStep(1)} style={{ marginTop: '.5rem' }}>Continue →</button>
        </div>
      )}

      {/* STEP 1 — Items & Photos */}
      {step === 1 && (
        <div>
          <div className="form-group"><label className="form-label">Service Type *</label>
            <select className="form-input" value={form.serviceType} onChange={e => set('serviceType', e.target.value)}>
              <option value="home_shifting">🏠 Home Shifting</option>
              <option value="office_relocation">🏢 Office Relocation</option>
              <option value="vehicle_transport">🚗 Vehicle Transport</option>
              <option value="storage">📦 Storage</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">House Type *</label>
            <select className="form-input" value={form.houseType} onChange={e => set('houseType', e.target.value)}>
              <option value="">Select type</option>
              {[['1rk','1 RK'],['1bhk','1 BHK'],['2bhk','2 BHK'],['3bhk','3 BHK'],['4bhk_plus','4 BHK+'],['villa','Villa'],['office_small','Office (Small)'],['office_large','Office (Large)']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Moving Date *</label><input className="form-input" type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Preferred Time</label><input className="form-input" type="time" value={form.scheduledTime} onChange={e => set('scheduledTime', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>

          {/* PHOTO UPLOAD */}
          <div style={{ marginTop: '1rem' }}>
            <PhotoUpload
              photos={photos}
              onAdd={p => setPhotos(ph => [...ph, p])}
              onRemove={i => setPhotos(ph => ph.filter((_, idx) => idx !== i))}
              maxPhotos={8}
              label="Upload Room Photos (AI will detect items & estimate better)"
            />
            <div style={{ fontSize: '.74rem', color: '#999', marginTop: '.4rem' }}>Optional but improves quote accuracy</div>
          </div>

          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary btn-full" onClick={getEstimate} disabled={loading}>{loading ? 'Calculating…' : 'Get Quote →'}</button>
          </div>
        </div>
      )}

      {/* STEP 2 — Quote */}
      {step === 2 && pricing && (
        <div>
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            {[['Base Price', pricing.basePrice],['Distance Charge', pricing.distanceCharge],['Labour Charge', pricing.laborCharge],['Packing Charge', pricing.packingCharge],['Platform Fee', pricing.platformFee],['GST (18%)', pricing.gst]].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '.45rem 0', borderBottom: '1px solid #f0f0f0', fontSize: '.86rem' }}>
                <span style={{ color: '#666' }}>{l}</span>
                <span style={{ fontWeight: 500 }}>₹{v?.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.65rem 0 0', fontWeight: 700, fontSize: '1rem' }}>
              <span>Total Amount</span>
              <span style={{ color: '#111' }}>₹{pricing.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: '.78rem', color: '#666', marginTop: '.25rem' }}>Advance (30%): ₹{pricing.advanceAmount?.toLocaleString('en-IN')}</div>
          </div>

          {/* Insurance toggle */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.88rem' }}>🛡️ Add Transit Insurance</div>
              <div style={{ fontSize: '.76rem', color: '#666' }}>Covers damage up to ₹2 lakh</div>
            </div>
            <button className={`toggle ${form.wantInsurance ? 'on' : ''}`} onClick={() => set('wantInsurance', !form.wantInsurance)} />
          </div>

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-full" onClick={() => setStep(3)}>Pay →</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Payment */}
      {step === 3 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.88rem' }}>Select Payment Method</div>
          {[['upi','📱 UPI / Google Pay / PhonePe'],['card','💳 Credit / Debit Card'],['netbanking','🏦 Net Banking'],['cod','💵 Cash on Delivery']].map(([v,l]) => (
            <div key={v} onClick={() => set('paymentMethod', v)} style={{ background: '#fff', border: `2px solid ${form.paymentMethod === v ? '#111' : '#e0e0e0'}`, borderRadius: 12, padding: '.9rem 1.1rem', marginBottom: '.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.paymentMethod === v ? '#111' : '#ccc'}`, background: form.paymentMethod === v ? '#111' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {form.paymentMethod === v && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
              </div>
              <span style={{ fontSize: '.88rem', fontWeight: 500 }}>{l}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-full btn-lg" onClick={confirmBooking} disabled={loading}>{loading ? 'Confirming…' : '✓ Confirm & Pay'}</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// DRIVER PAGES
// ═══════════════════════════════════════════════════

// ── pages/driver/Home.jsx ────────────────────────
import { useDriverLocation } from '../../hooks/useDriverLocation';

export default function DriverHome() {
  const [isOnline, setIsOnline]   = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [earnings, setEarnings]   = useState({});

  useDriverLocation(isOnline, activeJob?._id);

  useEffect(() => {
    driverAPI.getActiveJob().then(r => setActiveJob(r.data.booking)).catch(() => {});
    driverAPI.getEarnings().then(r => setEarnings(r.data)).catch(() => {});
  }, []);

  const toggleOnline = () => {
    const next = !isOnline;
    driverAPI.toggleOnline(next).then(() => {
      setIsOnline(next);
      toast.success(next ? 'You are now Online 🟢' : 'You are Offline 🔴');
    });
  };

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Online toggle */}
      <div style={{ background: isOnline ? '#111' : '#fff', border: '1px solid #e0e0e0', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .3s' }}>
        <div>
          <div style={{ fontWeight: 700, color: isOnline ? '#fff' : '#111' }}>{isOnline ? '🟢 Online' : '⚫ Offline'}</div>
          <div style={{ fontSize: '.78rem', color: isOnline ? 'rgba(255,255,255,.6)' : '#999', marginTop: 3 }}>{isOnline ? 'Accepting new jobs' : 'Go online to receive jobs'}</div>
        </div>
        <button onClick={toggleOnline} style={{ background: isOnline ? '#c8f000' : '#111', color: isOnline ? '#000' : '#fff', border: 'none', borderRadius: 100, padding: '.55rem 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '.84rem' }}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Today earnings */}
      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        {[['Today', `₹${(earnings.todayEarnings || 0).toLocaleString('en-IN')}`],['Trips', earnings.totalTrips || 0],['Rating', `${earnings.avgRating || '—'}⭐`]].map(([l,v]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{v}</div>
            <div style={{ fontSize: '.72rem', color: '#999', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Active job */}
      {activeJob ? (
        <div>
          <div style={{ fontWeight: 600, marginBottom: '.65rem', fontSize: '.9rem' }}>Active Job</div>
          <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 14, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.9rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{activeJob.bookingId}</div>
                <div style={{ fontSize: '.82rem', color: '#666', marginTop: 2 }}>{activeJob.pickup?.city} → {activeJob.dropoff?.city}</div>
                <div style={{ fontSize: '.82rem', color: '#666' }}>{activeJob.houseType?.toUpperCase()} · {activeJob.serviceType?.replace('_',' ')}</div>
              </div>
              <span style={{ background: '#c8f000', color: '#000', fontSize: '.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 100 }}>{activeJob.status?.replace('_',' ')}</span>
            </div>
            <Link to={`/driver/job/${activeJob._id}`}>
              <button className="btn btn-primary btn-full">Manage Job →</button>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#fff', borderRadius: 14, border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛑</div>
          <div style={{ fontWeight: 600, color: '#111' }}>{isOnline ? 'Waiting for a job…' : 'Go online to receive jobs'}</div>
          <div style={{ fontSize: '.82rem', color: '#999', marginTop: .3 + 'rem' }}>New bookings will appear here automatically</div>
        </div>
      )}
    </div>
  );
}


// ── pages/driver/Job.jsx ─────────────────────────
export default function DriverJob() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [photos, setPhotos]   = useState([]);
  const [uploading, setUploading] = useState(false);

  const STATUS_FLOW = ['confirmed','driver_assigned','packing','loading','in_transit','delivered'];

  useEffect(() => {
    bookingAPI.getById(bookingId).then(r => setBooking(r.data.booking));
  }, [bookingId]);

  const nextStatus = () => {
    const curr = STATUS_FLOW.indexOf(booking.status);
    if (curr < STATUS_FLOW.length - 1) return STATUS_FLOW[curr + 1];
    return null;
  };

  const handleAdvance = async () => {
    const next = nextStatus();
    if (!next) return;
    setUploading(true);
    try {
      // Upload photos first
      const urls = [];
      for (const p of photos) {
        if (p.file) {
          const r = await uploadAPI.uploadFile(p.file, 'booking-steps');
          urls.push(r.data.url);
        }
      }
      // Update status with photos
      await bookingAPI.updateStatus(bookingId, { status: next, photos: urls, message: getStatusMessage(next) });
      setPhotos([]);
      toast.success(`Status updated to: ${next.replace('_',' ')}`);
      // Refresh
      const r = await bookingAPI.getById(bookingId);
      setBooking(r.data.booking);
    } catch { toast.error('Update failed'); } finally { setUploading(false); }
  };

  const getStatusMessage = (s) => ({
    packing: 'Packing started at pickup location',
    loading: 'All items loaded into vehicle',
    in_transit: 'Vehicle departed — on the way',
    delivered: 'All items delivered successfully',
  }[s] || s);

  if (!booking) return <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading…</div>;

  const next = nextStatus();
  const isDelivered = booking.status === 'delivered';

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Job header */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{booking.bookingId}</div>
            <div style={{ fontSize: '.84rem', color: '#666', marginTop: 3 }}>{booking.pickup?.city} → {booking.dropoff?.city}</div>
            <div style={{ fontSize: '.84rem', color: '#666' }}>{booking.houseType}</div>
          </div>
          <span style={{ background: '#1114', color: '#fff', fontSize: '.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: '#111' }}>{booking.status?.replace('_',' ')}</span>
        </div>

        {/* Addresses */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '.78rem', color: '#999', marginBottom: '.25rem' }}>PICKUP</div>
          <div style={{ fontSize: '.86rem', fontWeight: 500 }}>{booking.pickup?.address || booking.pickup?.city}</div>
          {booking.pickup?.floor > 0 && <div style={{ fontSize: '.76rem', color: '#666' }}>Floor: {booking.pickup.floor}</div>}
          <div style={{ fontSize: '.78rem', color: '#999', margin: '.65rem 0 .25rem' }}>DROP</div>
          <div style={{ fontSize: '.86rem', fontWeight: 500 }}>{booking.dropoff?.address || booking.dropoff?.city}</div>
          {booking.dropoff?.floor > 0 && <div style={{ fontSize: '.76rem', color: '#666' }}>Floor: {booking.dropoff.floor}</div>}
        </div>

        {/* Customer contact */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '.84rem' }}>👤 {booking.customer?.name || 'Customer'}</div>
          <a href={`tel:${booking.customer?.phone}`}>
            <button className="btn btn-outline btn-sm">📞 Call</button>
          </a>
        </div>
      </div>

      {/* Status Timeline */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '.88rem' }}>Job Progress</div>
        <StatusTimeline currentStatus={booking.status} tracking={booking.tracking} />
      </div>

      {/* Photo upload + advance status */}
      {!isDelivered && next && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 14, padding: '1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '.25rem', fontSize: '.88rem' }}>Next: {next.replace('_',' ')}</div>
          <div style={{ fontSize: '.78rem', color: '#666', marginBottom: '1rem' }}>Upload photos as proof before advancing</div>
          <PhotoUpload
            photos={photos}
            onAdd={p => setPhotos(ph => [...ph, p])}
            onRemove={i => setPhotos(ph => ph.filter((_, idx) => idx !== i))}
            maxPhotos={5}
            label="Upload Step Photos"
          />
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1rem' }} onClick={handleAdvance} disabled={uploading}>
            {uploading ? 'Uploading…' : `Mark as ${next.replace(/_/g,' ').toUpperCase()} →`}
          </button>
        </div>
      )}

      {isDelivered && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 14, padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.4rem' }}>✅</div>
          <div style={{ fontWeight: 700, color: '#16a34a' }}>Job Completed!</div>
          <div style={{ fontSize: '.82rem', color: '#166534', marginTop: '.25rem' }}>Great job. Earnings credited.</div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// ADMIN PAGES
// ═══════════════════════════════════════════════════

// ── pages/admin/Dashboard.jsx ────────────────────
import { adminAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { adminAPI.dashboard().then(r => setStats(r.data)); }, []);
  if (!stats) return <div style={{color:'#999',padding:'2rem'}}>Loading…</div>;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[['Total Revenue', `₹${(stats.totalRevenue/100000).toFixed(1)}L`,'💰','kpi-up','↑ 18%'],['Active Orders',stats.activeOrders,'📦','kpi-up','↑ 5 today'],['Online Drivers',stats.onlineDrivers,'🚚','',''],['New Customers',stats.newCustomers,'👥','kpi-up','this week']].map(([l,v,ic,cls,chg]) => (
          <div key={l} className="kpi-card">
            <div><div className="kpi-label">{l}</div><div className="kpi-value">{v}</div>{chg && <div className={`kpi-change ${cls}`}>{chg}</div>}</div>
            <div className="kpi-icon">{ic}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue (30 days)</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.revenueByDay?.slice(-14) || []}>
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#c8f000" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Top Cities</span></div>
          <div className="card-body">
            {(stats.topCities || []).slice(0,6).map(c => (
              <div key={c._id} style={{ display:'flex',justifyContent:'space-between',padding:'.4rem 0',borderBottom:'1px solid #f0f0f0',fontSize:'.84rem' }}>
                <span>{c._id}</span><span style={{fontWeight:600}}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="card-header"><span className="card-title">Recent Orders</span><Link to="/admin/orders"><button className="btn btn-outline btn-sm">View All</button></Link></div>
        <div className="table-wrap">
          <table><thead><tr><th>Order ID</th><th>Customer</th><th>Route</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {(stats.recentOrders || []).map(o => (
              <tr key={o._id}>
                <td style={{fontWeight:600}}>{o.bookingId}</td>
                <td>{o.customer?.name}</td>
                <td style={{color:'#666'}}>{o.pickup?.city} → {o.dropoff?.city}</td>
                <td style={{fontWeight:500}}>₹{o.pricing?.totalAmount?.toLocaleString('en-IN')}</td>
                <td><StatusBadge status={o.status} /></td>
                <td><button className="btn btn-outline btn-sm">View</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { confirmed:'badge-blue', driver_assigned:'badge-orange', packing:'badge-orange', loading:'badge-orange', in_transit:'badge-orange', delivered:'badge-green', cancelled:'badge-red', pending:'badge-gray' };
  return <span className={`badge ${m[status]||'badge-gray'}`}>{status?.replace(/_/g,' ')}</span>;
}


// ═══════════════════════════════════════════════════
// SUPER ADMIN — Plans & Tenant Sell Page
// ═══════════════════════════════════════════════════

// ── pages/superadmin/Plans.jsx ───────────────────
import { superAPI } from '../../services/api';

const PLANS = [
  { id:'starter',      name:'Starter',      price:999,  color:'#555',  features:['50 bookings/mo','Basic dashboard','WhatsApp notifications','GPS tracking','Email support'] },
  { id:'professional', name:'Professional', price:2999, color:'#111',  features:['Unlimited bookings','AI chatbot','Photo item detection','Dynamic pricing','Analytics','Insurance module','Priority support'] },
  { id:'enterprise',   name:'Enterprise',   price:7999, color:'#111',  features:['Everything in Pro','AI Voice Bot','Multi-branch','Custom branding','Dedicated manager','API access','SLA'] },
];

export default function SuperPlans() {
  const [tenants, setTenants]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [planTo, setPlanTo]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [newT, setNewT]         = useState({ name:'', contactEmail:'', contactPhone:'', plan:'starter' });

  useEffect(() => { superAPI.getTenants().then(r => setTenants(r.data.tenants || [])); }, []);

  const assignPlan = async () => {
    if (!selected || !planTo) return;
    setLoading(true);
    try {
      await superAPI.updatePlan(selected._id, { plan: planTo });
      toast.success(`Plan updated to ${planTo}!`);
      // refresh
      const r = await superAPI.getTenants();
      setTenants(r.data.tenants || []);
      setSelected(null); setPlanTo('');
    } catch { toast.error('Failed to update plan'); } finally { setLoading(false); }
  };

  const addTenant = async () => {
    setLoading(true);
    try {
      await superAPI.createTenant(newT);
      toast.success('Tenant created! Trial started (14 days).');
      setShowAdd(false);
      const r = await superAPI.getTenants();
      setTenants(r.data.tenants || []);
    } catch { toast.error('Failed to create tenant'); } finally { setLoading(false); }
  };

  return (
    <div>
      {/* Plans overview */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div><h2 style={{ fontSize: '1.1rem' }}>SaaS Plans</h2><p style={{ fontSize: '.82rem', color: '#666' }}>Sell access to the platform. Assign plans to tenants.</p></div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Tenant</button>
        </div>
        <div className="grid-3">
          {PLANS.map(p => (
            <div key={p.id} style={{ background: '#fff', border: `2px solid ${selected?.subscription?.plan === p.id ? '#111' : '#e0e0e0'}`, borderRadius: 14, padding: '1.4rem', position: 'relative' }}>
              {p.id === 'professional' && <div style={{ position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:'#111',color:'#fff',fontSize:'.68rem',fontWeight:700,padding:'2px 12px',borderRadius:100 }}>Most Popular</div>}
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '.5rem' }}>{p.name}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '.25rem' }}>₹{p.price.toLocaleString('en-IN')}<span style={{ fontSize: '1rem', fontWeight: 400, color: '#999' }}>/mo</span></div>
              <div style={{ marginTop: '.9rem' }}>
                {p.features.map(f => <div key={f} style={{ fontSize: '.8rem', color: '#555', padding: '.2rem 0', display: 'flex', alignItems: 'center', gap: '.4rem' }}><span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>{f}</div>)}
              </div>
              <div style={{ fontSize: '.75rem', color: '#999', marginTop: '.9rem' }}>
                Active: {tenants.filter(t => t.subscription?.plan === p.id).length} tenants
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant list with plan assignment */}
      <div className="card">
        <div className="card-header"><span className="card-title">Tenants — Manage Plans</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Contact</th><th>Current Plan</th><th>Status</th><th>Revenue MTD</th><th>Actions</th></tr></thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '.74rem', color: '#999' }}>{t.slug}.shiftease.in</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '.82rem' }}>{t.contactEmail || '—'}</div>
                    <div style={{ fontSize: '.78rem', color: '#999' }}>{t.contactPhone || '—'}</div>
                  </td>
                  <td>
                    <span className={`badge ${t.subscription?.plan === 'enterprise' ? 'badge-blue' : t.subscription?.plan === 'professional' ? 'badge-acc' : 'badge-gray'}`}>
                      {t.subscription?.plan || 'trial'}
                    </span>
                  </td>
                  <td><span className={`badge ${t.subscription?.status === 'active' ? 'badge-green' : t.subscription?.status === 'trial' ? 'badge-orange' : 'badge-red'}`}>{t.subscription?.status}</span></td>
                  <td style={{ fontWeight: 500 }}>—</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <select
                        style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 6, padding: '.3rem .5rem', fontSize: '.78rem', cursor: 'pointer' }}
                        value={selected?._id === t._id ? planTo : t.subscription?.plan || ''}
                        onChange={e => { setSelected(t); setPlanTo(e.target.value); }}
                      >
                        <option value="">Change plan</option>
                        {PLANS.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}/mo</option>)}
                      </select>
                      {selected?._id === t._id && planTo && (
                        <button className="btn btn-primary btn-sm" onClick={assignPlan} disabled={loading}>
                          {loading ? '…' : 'Save'}
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => superAPI.suspend(t._id).then(() => { toast.success('Suspended'); window.location.reload(); })}>Suspend</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tenant Modal */}
      {showAdd && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
          <div style={{ background:'#fff',borderRadius:16,padding:'2rem',width:'100%',maxWidth:480 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h3>Add New Tenant</h3>
              <button onClick={() => setShowAdd(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.2rem',color:'#999' }}>✕</button>
            </div>
            <div className="form-group"><label className="form-label">Company Name *</label><input className="form-input" placeholder="e.g. QuickShift Co." value={newT.name} onChange={e => setNewT(n => ({ ...n, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Contact Email</label><input className="form-input" type="email" placeholder="admin@company.com" value={newT.contactEmail} onChange={e => setNewT(n => ({ ...n, contactEmail: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Contact Phone</label><input className="form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={newT.contactPhone} onChange={e => setNewT(n => ({ ...n, contactPhone: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Starting Plan</label>
              <select className="form-input" value={newT.plan} onChange={e => setNewT(n => ({ ...n, plan: e.target.value }))}>
                {PLANS.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}/mo</option>)}
              </select>
            </div>
            <div style={{ fontSize:'.78rem',color:'#666',marginBottom:'1.25rem' }}>✓ Tenant gets 14-day free trial automatically. Upgrade notification sent on expiry.</div>
            <div style={{ display:'flex',gap:'.75rem' }}>
              <button className="btn btn-outline btn-full" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={addTenant} disabled={loading || !newT.name}>{loading ? 'Creating…' : 'Create Tenant'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
