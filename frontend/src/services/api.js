// ═══════════════════════════════════════
// src/store/authStore.js — Zustand Auth
// ═══════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set) => ({
    user:  null,
    token: null,
    setAuth: (user, token) => set({ user, token }),
    logout: () => set({ user: null, token: null }),
  }),
  { name: 'shiftease-auth' }
));


// ═══════════════════════════════════════
// src/services/api.js — Axios instance
// ═══════════════════════════════════════
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(cfg => {
  const raw  = localStorage.getItem('shiftease-auth');
  const token = raw ? JSON.parse(raw)?.state?.token : null;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('shiftease-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth APIs ──────────────────────────
export const authAPI = {
  sendOTP:   (phone)       => api.post('/auth/send-otp',   { phone }),
  verifyOTP: (phone, otp, name) => api.post('/auth/verify-otp', { phone, otp, name }),
};

// ── Booking APIs ───────────────────────
export const bookingAPI = {
  getEstimate:   (data)   => api.post('/bookings/estimate', data),
  create:        (data)   => api.post('/bookings', data),
  getMyBookings: ()       => api.get('/bookings/my'),
  getById:       (id)     => api.get(`/bookings/${id}`),
  cancel:        (id, r)  => api.post(`/bookings/${id}/cancel`, { reason: r }),
  rate:          (id, d)  => api.post(`/bookings/${id}/rate`, d),
  // Driver actions
  updateStatus:  (id, d)  => api.patch(`/bookings/${id}/status`, d),
  uploadPhoto:   (id, fd) => api.post(`/bookings/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── Driver APIs ────────────────────────
export const driverAPI = {
  getActiveJob:    ()         => api.get('/drivers/active-job'),
  toggleOnline:    (isOnline) => api.post('/drivers/toggle-online', { isOnline }),
  updateLocation:  (lat, lng) => api.post('/drivers/location', { lat, lng }),
  getEarnings:     ()         => api.get('/drivers/earnings'),
};

// ── Admin APIs ─────────────────────────
export const adminAPI = {
  dashboard:     ()     => api.get('/admin/dashboard'),
  getOrders:     (p)    => api.get('/admin/orders', { params: p }),
  getDrivers:    ()     => api.get('/admin/drivers'),
  getCustomers:  ()     => api.get('/admin/customers'),
  getPricing:    ()     => api.get('/admin/pricing'),
  updatePricing: (d)    => api.put('/admin/pricing', d),
  getContent:    ()     => api.get('/admin/content'),
  updateContent: (d)    => api.put('/admin/content', d),
  broadcast:     (d)    => api.post('/admin/broadcast', d),
  assignDriver:  (bId, dId) => api.post(`/admin/orders/${bId}/assign`, { driverId: dId }),
};

// ── Super Admin APIs ───────────────────
export const superAPI = {
  dashboard:      ()       => api.get('/superadmin/dashboard'),
  getTenants:     ()       => api.get('/superadmin/tenants'),
  createTenant:   (d)      => api.post('/superadmin/tenants', d),
  updatePlan:     (id, d)  => api.patch(`/superadmin/tenants/${id}/plan`, d),
  updateFeatures: (id, f)  => api.patch(`/superadmin/tenants/${id}/features`, { features: f }),
  suspend:        (id)     => api.patch(`/superadmin/tenants/${id}/suspend`),
  activate:       (id)     => api.patch(`/superadmin/tenants/${id}/activate`),
};

// ── Payment APIs ───────────────────────
export const paymentAPI = {
  createOrder:   (d) => api.post('/payments/create-order', d),
  verify:        (d) => api.post('/payments/verify', d),
};

// ── AI APIs ────────────────────────────
export const aiAPI = {
  chat:        (d) => api.post('/ai/chat', d),
  detectItems: (d) => api.post('/ai/detect-items', d),
};

// ── Upload helper ──────────────────────
export const uploadAPI = {
  uploadFile: (file, folder = 'general') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    return api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};


// ═══════════════════════════════════════
// src/hooks/useSocket.js — Live tracking
// ═══════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: JSON.parse(localStorage.getItem('shiftease-auth') || '{}')?.state?.token },
    });
    socketRef.current.on('connect',    () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    return () => socketRef.current?.disconnect();
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, cb) => {
    socketRef.current?.on(event, cb);
    return () => socketRef.current?.off(event, cb);
  }, []);

  return { connected, emit, on, socket: socketRef.current };
}


// ═══════════════════════════════════════
// src/hooks/useDriverLocation.js
// — Driver sends GPS every 10 sec
// ═══════════════════════════════════════
import { useEffect, useRef } from 'react';
import { driverAPI } from '../services/api';

export function useDriverLocation(isOnline, bookingId) {
  const intervalRef = useRef(null);
  const { emit } = useSocket();

  useEffect(() => {
    if (!isOnline) { clearInterval(intervalRef.current); return; }

    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // 1. Save to DB
        driverAPI.updateLocation(lat, lng).catch(() => {});
        // 2. Broadcast via Socket to customer
        if (bookingId) emit('driver_location', { bookingId, lat, lng });
      }, () => {}, { enableHighAccuracy: true });
    };

    sendLocation(); // immediate first send
    intervalRef.current = setInterval(sendLocation, 10000); // every 10s

    return () => clearInterval(intervalRef.current);
  }, [isOnline, bookingId]);
}


// ═══════════════════════════════════════
// src/hooks/useTrackBooking.js
// — Customer listens for live location
// ═══════════════════════════════════════
import { useState } from 'react';

export function useTrackBooking(bookingId) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const { on, emit } = useSocket();

  useEffect(() => {
    if (!bookingId) return;
    // Join booking room
    emit('join_booking', bookingId);
    // Listen for location updates
    const off = on('location_update', (data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
      setEta(data.eta);
    });
    return off;
  }, [bookingId]);

  return { driverLocation, eta };
}


// ═══════════════════════════════════════
// src/components/common/MapView.jsx
// — Google Maps live tracking component
// ═══════════════════════════════════════
import { useEffect, useRef } from 'react';

export function MapView({ driverLocation, pickup, dropoff, height = 320 }) {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    // Load Google Maps
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_KEY}`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  function initMap() {
    if (!mapRef.current || !window.google) return;
    const center = driverLocation || pickup || { lat: 28.6139, lng: 77.2090 };
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center, zoom: 12,
      styles: [
        { featureType: 'all', stylers: [{ saturation: -30 }] }
      ],
      mapTypeControl: false, streetViewControl: false,
    });

    if (pickup)  new window.google.maps.Marker({ position: pickup,  map: mapObj.current, label: '📍', title: 'Pickup' });
    if (dropoff) new window.google.maps.Marker({ position: dropoff, map: mapObj.current, label: '🏁', title: 'Drop' });
  }

  useEffect(() => {
    if (!mapObj.current || !driverLocation || !window.google) return;
    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: driverLocation,
        map: mapObj.current,
        title: 'Driver',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/truck.png',
          scaledSize: new window.google.maps.Size(40, 40),
        },
      });
    } else {
      markerRef.current.setPosition(driverLocation);
    }
    mapObj.current.panTo(driverLocation);
  }, [driverLocation]);

  return (
    <div style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!window.google && (
        <div className="map-placeholder">
          <span style={{ fontSize: '2rem' }}>🗺️</span>
          <span>Loading map…</span>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════
// src/components/common/PhotoUpload.jsx
// ═══════════════════════════════════════
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export function PhotoUpload({ photos = [], onAdd, onRemove, maxPhotos = 5, label = 'Add Photos' }) {
  const onDrop = useCallback(files => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => onAdd({ file, preview: e.target.result });
      reader.readAsDataURL(file);
    });
  }, [onAdd]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: maxPhotos - photos.length,
  });

  return (
    <div>
      {label && <div className="form-label" style={{ marginBottom: '.5rem' }}>{label}</div>}
      <div className="photo-grid">
        {photos.map((p, i) => (
          <div key={i} className="photo-item">
            <img src={p.preview || p.url} alt={`photo-${i}`} />
            {onRemove && (
              <button className="remove-btn" onClick={() => onRemove(i)}>✕</button>
            )}
          </div>
        ))}
        {photos.length < maxPhotos && (
          <div {...getRootProps()} className="upload-zone">
            <input {...getInputProps()} />
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <span>Add</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════
// src/components/common/StatusTimeline.jsx
// ═══════════════════════════════════════

const STATUSES = [
  { key: 'confirmed',       label: 'Order Confirmed',    icon: '✓' },
  { key: 'driver_assigned', label: 'Driver Assigned',    icon: '🚚' },
  { key: 'packing',         label: 'Packing Started',    icon: '📦' },
  { key: 'loading',         label: 'Loading Complete',   icon: '🔼' },
  { key: 'in_transit',      label: 'In Transit',         icon: '🛣️' },
  { key: 'delivered',       label: 'Delivered',          icon: '✅' },
];

const ORDER = STATUSES.map(s => s.key);

export function StatusTimeline({ currentStatus, tracking = [] }) {
  const currentIdx = ORDER.indexOf(currentStatus);

  return (
    <div className="status-timeline">
      {STATUSES.map((s, i) => {
        const isDone   = i < currentIdx;
        const isActive = i === currentIdx;
        const entry    = tracking.find(t => t.status === s.key);

        return (
          <div key={s.key} className={`status-step ${isDone ? 'done' : isActive ? 'active' : ''}`}>
            <div className="step-dot">{isDone ? '✓' : s.icon}</div>
            <div className="step-content">
              <div className="step-title">{s.label}</div>
              {entry && <div className="step-time">{new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
              {entry?.message && <div className="txt-sm txt-muted mt-1">{entry.message}</div>}
              {/* Photos attached to this step */}
              {entry?.photos?.length > 0 && (
                <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
                  {entry.photos.map((ph, pi) => (
                    <img key={pi} src={ph} alt="step" className="step-photo" onClick={() => window.open(ph, '_blank')} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
