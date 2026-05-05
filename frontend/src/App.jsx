// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import './index.css';

// Auth
import Login        from './pages/Login';
import OTPVerify    from './pages/OTPVerify';

// Super Admin
import SuperDashboard  from './pages/superadmin/Dashboard';
import SuperTenants    from './pages/superadmin/Tenants';
import SuperFeatures   from './pages/superadmin/Features';
import SuperPlans      from './pages/superadmin/Plans';
import SuperAnalytics  from './pages/superadmin/Analytics';

// Tenant Admin
import AdminDashboard  from './pages/admin/Dashboard';
import AdminOrders     from './pages/admin/Orders';
import AdminDrivers    from './pages/admin/Drivers';
import AdminCustomers  from './pages/admin/Customers';
import AdminPricing    from './pages/admin/Pricing';
import AdminContent    from './pages/admin/Content';
import AdminNotify     from './pages/admin/Notifications';

// Customer
import CustomerHome    from './pages/customer/Home';
import CustomerBook    from './pages/customer/Book';
import CustomerTrack   from './pages/customer/Track';
import CustomerOrders  from './pages/customer/Orders';
import CustomerProfile from './pages/customer/Profile';

// Driver
import DriverHome      from './pages/driver/Home';
import DriverJob       from './pages/driver/Job';

// Guards
const Guard = ({ role, children }) => {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (role && !role.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#111', color: '#fff', fontSize: '14px' } }} />
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<Login />} />
        <Route path="/verify" element={<OTPVerify />} />

        {/* Super Admin */}
        <Route path="/super/*" element={<Guard role={['super_admin']}><SuperLayout /></Guard>}>
          <Route index element={<SuperDashboard />} />
          <Route path="tenants"   element={<SuperTenants />} />
          <Route path="features"  element={<SuperFeatures />} />
          <Route path="plans"     element={<SuperPlans />} />
          <Route path="analytics" element={<SuperAnalytics />} />
        </Route>

        {/* Tenant Admin */}
        <Route path="/admin/*" element={<Guard role={['admin','tenant_admin']}><AdminLayout /></Guard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders"    element={<AdminOrders />} />
          <Route path="drivers"   element={<AdminDrivers />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="pricing"   element={<AdminPricing />} />
          <Route path="content"   element={<AdminContent />} />
          <Route path="notify"    element={<AdminNotify />} />
        </Route>

        {/* Customer */}
        <Route path="/app/*" element={<Guard role={['customer']}><CustomerLayout /></Guard>}>
          <Route index element={<CustomerHome />} />
          <Route path="book"    element={<CustomerBook />} />
          <Route path="track/:bookingId" element={<CustomerTrack />} />
          <Route path="orders"  element={<CustomerOrders />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* Driver */}
        <Route path="/driver/*" element={<Guard role={['driver']}><DriverLayout /></Guard>}>
          <Route index element={<DriverHome />} />
          <Route path="job/:bookingId" element={<DriverJob />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Layout components live here for brevity — in production split to separate files
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

function SidebarLink({ to, icon, label }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + '/');
  return (
    <Link to={to} style={{
      display:'flex',alignItems:'center',gap:9,padding:'.55rem .9rem',
      margin:'1px .5rem',borderRadius:8,color:active?'#111':'#666',
      background:active?'rgba(200,240,0,0.2)':'transparent',
      fontWeight:active?600:400,fontSize:'.86rem',textDecoration:'none',
      transition:'all .15s'
    }}>
      <span>{icon}</span><span>{label}</span>
    </Link>
  );
}

function LogoBrand({ sub }) {
  return (
    <div style={{padding:'1.1rem 1.2rem',borderBottom:'1px solid #e0e0e0'}}>
      <div style={{fontWeight:700,fontSize:'1.2rem',letterSpacing:'-.3px'}}>ShiftEase</div>
      <div style={{fontSize:'.7rem',color:'#999',marginTop:2,textTransform:'uppercase',letterSpacing:'1px'}}>{sub}</div>
    </div>
  );
}

function UserFooter() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  return (
    <div style={{padding:'.9rem 1.1rem',borderTop:'1px solid #e0e0e0',display:'flex',alignItems:'center',gap:9}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:'#111',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',fontWeight:700,flexShrink:0}}>
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'.83rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name || 'User'}</div>
        <div style={{fontSize:'.7rem',color:'#999'}}>{user?.role}</div>
      </div>
      <button onClick={() => { logout(); nav('/login'); }} style={{background:'none',border:'none',cursor:'pointer',color:'#999',fontSize:'.8rem'}}>Out</button>
    </div>
  );
}

function SuperLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <LogoBrand sub="Super Admin" />
        <nav style={{flex:1,padding:'.5rem 0',overflowY:'auto'}}>
          <div style={{fontSize:'.62rem',color:'#999',padding:'.6rem 1.2rem .3rem',letterSpacing:'1.5px',textTransform:'uppercase'}}>Overview</div>
          <SidebarLink to="/super"          icon="📊" label="Dashboard" />
          <SidebarLink to="/super/tenants"  icon="🏢" label="Tenants" />
          <SidebarLink to="/super/plans"    icon="💳" label="Plans & Pricing" />
          <SidebarLink to="/super/features" icon="⚙️" label="Feature Control" />
          <SidebarLink to="/super/analytics"icon="📈" label="Analytics" />
        </nav>
        <UserFooter />
      </aside>
      <div className="main-area">
        <Topbar />
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <LogoBrand sub="Admin Panel" />
        <nav style={{flex:1,padding:'.5rem 0',overflowY:'auto'}}>
          <div style={{fontSize:'.62rem',color:'#999',padding:'.6rem 1.2rem .3rem',letterSpacing:'1.5px',textTransform:'uppercase'}}>Manage</div>
          <SidebarLink to="/admin"           icon="📊" label="Dashboard" />
          <SidebarLink to="/admin/orders"    icon="📦" label="Orders" />
          <SidebarLink to="/admin/drivers"   icon="🚚" label="Drivers" />
          <SidebarLink to="/admin/customers" icon="👥" label="Customers" />
          <div style={{fontSize:'.62rem',color:'#999',padding:'.6rem 1.2rem .3rem',letterSpacing:'1.5px',textTransform:'uppercase'}}>Settings</div>
          <SidebarLink to="/admin/pricing"   icon="💰" label="Pricing" />
          <SidebarLink to="/admin/content"   icon="✏️" label="Website Content" />
          <SidebarLink to="/admin/notify"    icon="🔔" label="Notifications" />
        </nav>
        <UserFooter />
      </aside>
      <div className="main-area">
        <Topbar />
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  );
}

function CustomerLayout() {
  const loc = useLocation();
  const navItems = [
    { to: '/app',        icon: '🏠', label: 'Home' },
    { to: '/app/orders', icon: '📦', label: 'Orders' },
    { to: '/app/book',   icon: '➕', label: 'Book' },
    { to: '/app/profile',icon: '👤', label: 'Profile' },
  ];
  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:70}}>
      <div style={{background:'#fff',borderBottom:'1px solid #e0e0e0',padding:'.9rem 1.25rem',position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontWeight:700,fontSize:'1.1rem'}}>ShiftEase</div>
        <Link to="/app/profile"><div style={{width:34,height:34,borderRadius:'50%',background:'#111',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.8rem',fontWeight:700}}>U</div></Link>
      </div>
      <Outlet />
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #e0e0e0',display:'flex',zIndex:50}}>
        {navItems.map(item => {
          const active = loc.pathname === item.to;
          return (
            <Link key={item.to} to={item.to} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'.65rem .5rem',color:active?'#111':'#999',textDecoration:'none',fontSize:'.65rem',fontWeight:active?700:400,gap:3,borderTop:active?'2px solid #111':'2px solid transparent'}}>
              <span style={{fontSize:'1.2rem'}}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DriverLayout() {
  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5'}}>
      <div style={{background:'#111',color:'#fff',padding:'.9rem 1.25rem',position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontWeight:700,fontSize:'1.1rem'}}>Driver Panel</div>
        <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(200,240,0,.2)',color:'#c8f000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.8rem',fontWeight:700}}>D</div>
      </div>
      <Outlet />
    </div>
  );
}

function Topbar() {
  const { user } = useAuthStore();
  const loc = useLocation();
  const title = loc.pathname.split('/').filter(Boolean).pop() || 'dashboard';
  return (
    <div className="topbar">
      <h3 style={{textTransform:'capitalize',fontSize:'1rem'}}>{title}</h3>
      <div style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
        <div style={{fontSize:'.82rem',color:'#666'}}>{user?.name}</div>
      </div>
    </div>
  );
}
