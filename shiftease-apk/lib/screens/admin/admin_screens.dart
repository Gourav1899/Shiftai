// ─── lib/screens/admin/admin_dashboard_screen.dart ────
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});
  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int    _tab     = 0;
  Map?   _stats;
  List   _orders  = [];
  List   _drivers = [];
  bool   _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final s = await ApiService.get('/admin/dashboard');
      final o = await ApiService.get('/admin/orders?limit=20');
      final d = await ApiService.get('/admin/drivers');
      setState(() {
        _stats   = s['stats'];
        _orders  = o['bookings'] ?? [];
        _drivers = d['drivers'] ?? [];
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: const Text('Admin Panel'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () async {
              await context.read<AuthProvider>().logout();
              if (!mounted) return;
              Navigator.pushReplacementNamed(context, '/login');
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : IndexedStack(
              index: _tab,
              children: [
                _DashboardTab(stats: _stats, orders: _orders.take(5).toList()),
                _OrdersTab(orders: _orders, onRefresh: _load),
                _DriversTab(drivers: _drivers, onRefresh: _load),
              ],
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.list_alt_outlined),  activeIcon: Icon(Icons.list_alt),  label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.local_shipping_outlined), activeIcon: Icon(Icons.local_shipping), label: 'Drivers'),
        ],
      ),
    );
  }
}

// ── Dashboard Tab ──────────────────────────────────────
class _DashboardTab extends StatelessWidget {
  final Map? stats;
  final List orders;
  const _DashboardTab({required this.stats, required this.orders});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // KPI grid
          GridView.count(
            shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2, childAspectRatio: 1.6,
            crossAxisSpacing: 10, mainAxisSpacing: 10,
            children: [
              _KpiCard('Revenue', '₹${((stats?['totalRevenue'] ?? 0) / 100000).toStringAsFixed(1)}L', '💰', AppTheme.green),
              _KpiCard('Active Orders', '${stats?['activeOrders'] ?? 0}', '📦', AppTheme.orange),
              _KpiCard('Online Drivers', '${stats?['onlineDrivers'] ?? 0}', '🚚', AppTheme.blue),
              _KpiCard('New Customers', '${stats?['newCustomers'] ?? 0}', '👥', AppTheme.black),
            ],
          ),
          const SizedBox(height: 20),

          // Recent orders
          const Text('Recent Orders', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
          const SizedBox(height: 10),
          ...orders.map((o) => _AdminOrderCard(order: o)),
        ],
      ),
    );
  }

  Widget _KpiCard(String label, String value, String icon, Color color) => Container(
    decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
    padding: const EdgeInsets.all(14),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(icon, style: const TextStyle(fontSize: 22)),
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      ]),
      const Spacer(),
      Text(value, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: AppTheme.black)),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.txt2)),
    ]),
  );
}

// ── Orders Tab ─────────────────────────────────────────
class _OrdersTab extends StatelessWidget {
  final List orders;
  final VoidCallback onRefresh;
  const _OrdersTab({required this.orders, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: orders.isEmpty
          ? const Center(child: Text('No orders', style: TextStyle(color: AppTheme.txt2)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _AdminOrderCard(order: orders[i], expanded: true),
            ),
    );
  }
}

class _AdminOrderCard extends StatelessWidget {
  final Map    order;
  final bool   expanded;
  const _AdminOrderCard({required this.order, this.expanded = false});

  Color _statusColor(String s) {
    const m = {'confirmed': AppTheme.blue, 'driver_assigned': AppTheme.orange, 'packing': AppTheme.orange, 'loading': AppTheme.orange, 'in_transit': AppTheme.orange, 'delivered': AppTheme.green, 'cancelled': AppTheme.red};
    return m[s] ?? AppTheme.txt3;
  }

  @override
  Widget build(BuildContext context) {
    final status = order['status'] ?? '';
    final color  = _statusColor(status);
    return Container(
      decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(order['bookingId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.black)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(100)),
            child: Text(status.replaceAll('_',' '), style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 11)),
          ),
        ]),
        const SizedBox(height: 6),
        Text('${order['pickup']?['city'] ?? ''} → ${order['dropoff']?['city'] ?? ''}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
        Text('${order['customer']?['name'] ?? ''} · ₹${order['pricing']?['totalAmount'] ?? 0}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
        if (expanded && order['driver'] == null && status != 'cancelled') ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => _assignDriver(context, order['_id']),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: AppTheme.border), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              child: const Text('Assign Driver', style: TextStyle(color: AppTheme.black, fontSize: 13)),
            ),
          ),
        ],
      ]),
    );
  }

  Future<void> _assignDriver(BuildContext ctx, String bookingId) async {
    // Show driver picker dialog
    final drivers = await ApiService.get('/admin/drivers?online=true');
    if (!ctx.mounted) return;
    showModalBottomSheet(
      context: ctx,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _DriverPickerSheet(bookingId: bookingId, drivers: drivers['drivers'] ?? []),
    );
  }
}

class _DriverPickerSheet extends StatelessWidget {
  final String bookingId;
  final List   drivers;
  const _DriverPickerSheet({required this.bookingId, required this.drivers});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Assign Driver', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppTheme.black)),
          const SizedBox(height: 16),
          if (drivers.isEmpty)
            const Text('No drivers available', style: TextStyle(color: AppTheme.txt2))
          else
            ...drivers.map((d) => ListTile(
              leading: CircleAvatar(backgroundColor: AppTheme.black, child: Text(
                (d['userId']?['name'] ?? 'D').toString().substring(0,1),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              )),
              title: Text(d['userId']?['name'] ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('${d['vehicle']?['number'] ?? ''} · ${d['stats']?['avgRating'] ?? '—'}⭐'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () async {
                await ApiService.post('/admin/orders/$bookingId/assign', {'driverId': d['_id']});
                if (!context.mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Driver assigned!')));
              },
            )),
        ],
      ),
    );
  }
}

// ── Drivers Tab ─────────────────────────────────────────
class _DriversTab extends StatelessWidget {
  final List            drivers;
  final VoidCallback    onRefresh;
  const _DriversTab({required this.drivers, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: drivers.isEmpty
          ? const Center(child: Text('No drivers', style: TextStyle(color: AppTheme.txt2)))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: drivers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final d       = drivers[i];
                final online  = d['availability']?['isOnline'] == true;
                final onTrip  = d['availability']?['currentBooking'] != null;
                return Container(
                  decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                  padding: const EdgeInsets.all(14),
                  child: Row(children: [
                    CircleAvatar(
                      radius: 22, backgroundColor: AppTheme.black,
                      child: Text((d['userId']?['name'] ?? 'D').toString().substring(0,1),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(d['userId']?['name'] ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.black)),
                      const SizedBox(height: 2),
                      Text('${d['vehicle']?['number'] ?? '—'} · ${d['stats']?['totalTrips'] ?? 0} trips · ${d['stats']?['avgRating'] ?? '—'}⭐',
                        style: const TextStyle(fontSize: 12, color: AppTheme.txt2)),
                    ])),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: onTrip ? AppTheme.orange.withOpacity(.1) : online ? AppTheme.green.withOpacity(.1) : AppTheme.bg,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        onTrip ? 'On Trip' : online ? 'Online' : 'Offline',
                        style: TextStyle(color: onTrip ? AppTheme.orange : online ? AppTheme.green : AppTheme.txt3, fontWeight: FontWeight.w600, fontSize: 11),
                      ),
                    ),
                  ]),
                );
              },
            ),
    );
  }
}


// ─── lib/screens/customer/orders_screen.dart ──────────
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().fetchMyBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bookings = context.watch<BookingProvider>();
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(title: const Text('My Orders')),
      body: bookings.loading
          ? const Center(child: CircularProgressIndicator())
          : bookings.bookings.isEmpty
              ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('📦', style: TextStyle(fontSize: 48)),
                  SizedBox(height: 12),
                  Text('No bookings yet', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.black)),
                  SizedBox(height: 4),
                  Text('Book your first move!', style: TextStyle(color: AppTheme.txt2, fontSize: 13)),
                ]))
              : RefreshIndicator(
                  onRefresh: () => context.read<BookingProvider>().fetchMyBookings(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: bookings.bookings.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final b = bookings.bookings[i];
                      return GestureDetector(
                        onTap: () => Navigator.pushNamed(context, '/track', arguments: b.id),
                        child: Container(
                          decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                          padding: const EdgeInsets.all(14),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                              Text(b.bookingId, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.black)),
                              _StatusBadge(b.status),
                            ]),
                            const SizedBox(height: 6),
                            Text('${b.pickupCity} → ${b.dropCity}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
                            const SizedBox(height: 3),
                            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                              Text(b.scheduledDate != null ? b.scheduledDate!.substring(0,10) : '', style: const TextStyle(fontSize: 12, color: AppTheme.txt3)),
                              Text('₹${b.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.black)),
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge(this.status);
  @override
  Widget build(BuildContext context) {
    const colors = {'confirmed': AppTheme.blue, 'driver_assigned': AppTheme.orange, 'packing': AppTheme.orange, 'loading': AppTheme.orange, 'in_transit': AppTheme.orange, 'delivered': AppTheme.green, 'cancelled': AppTheme.red};
    final color = colors[status] ?? AppTheme.txt3;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(color: color.withOpacity(.1), borderRadius: BorderRadius.circular(100)),
      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 11)),
    );
  }
}


// ─── lib/screens/customer/profile_screen.dart ─────────
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar + name
          Container(
            decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              CircleAvatar(
                radius: 36, backgroundColor: AppTheme.black,
                child: Text(user?.name.substring(0,1).toUpperCase() ?? 'U',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 26)),
              ),
              const SizedBox(height: 12),
              Text(user?.name ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: AppTheme.black)),
              const SizedBox(height: 4),
              Text('+91 ${user?.phone ?? ''}', style: const TextStyle(fontSize: 14, color: AppTheme.txt2)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(100)),
                child: Text(user?.role ?? '', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Menu items
          ...[
            ('📦', 'My Bookings',    () => Navigator.pushNamed(context, '/orders')),
            ('🔔', 'Notifications',  () {}),
            ('❓', 'Help & Support', () {}),
            ('📋', 'Terms of Service', () {}),
          ].map((item) => GestureDetector(
            onTap: item.$3,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                Text(item.$1, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 12),
                Text(item.$2, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: AppTheme.black)),
                const Spacer(),
                const Icon(Icons.chevron_right, size: 18, color: AppTheme.txt3),
              ]),
            ),
          )),
          const SizedBox(height: 8),

          // Logout
          GestureDetector(
            onTap: () async {
              await auth.logout();
              if (!context.mounted) return;
              Navigator.pushReplacementNamed(context, '/login');
            },
            child: Container(
              decoration: BoxDecoration(color: AppTheme.red.withOpacity(.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.red.withOpacity(.2))),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: const Row(children: [
                Text('🚪', style: TextStyle(fontSize: 18)),
                SizedBox(width: 12),
                Text('Logout', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.red)),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
