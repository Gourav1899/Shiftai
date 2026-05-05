// ─── lib/screens/customer/home_screen.dart ────────────
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../main.dart';
import '../../models/booking_model.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});
  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().fetchMyBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth     = context.watch<AuthProvider>();
    final bookings = context.watch<BookingProvider>();
    final active   = bookings.activeBookings;

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // AppBar
            SliverAppBar(
              floating: true,
              backgroundColor: AppTheme.white,
              elevation: 0,
              title: Row(
                children: [
                  const Text('ShiftEase', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppTheme.black)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                    child: CircleAvatar(
                      radius: 17, backgroundColor: AppTheme.black,
                      child: Text(auth.user?.name.substring(0,1).toUpperCase() ?? 'U',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  ),
                ],
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Greeting
                    Text('Hi ${auth.user?.name.split(' ').first ?? 'there'} 👋',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.black)),
                    const SizedBox(height: 4),
                    const Text('Ready to shift?', style: TextStyle(color: AppTheme.txt2)),
                    const SizedBox(height: 20),

                    // Book CTA
                    GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/book'),
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(16)),
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('📦 Book a Move', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: Colors.white)),
                            const SizedBox(height: 6),
                            const Text('AI quote in 60 seconds', style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 13)),
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(color: AppTheme.accent, borderRadius: BorderRadius.circular(100)),
                              child: const Text('Get Quote →', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.black)),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Service grid
                    GridView.count(
                      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2, childAspectRatio: 2.2, crossAxisSpacing: 10, mainAxisSpacing: 10,
                      children: [
                        _ServiceTile('🏠', 'Home Shifting', 'home_shifting'),
                        _ServiceTile('🏢', 'Office Move', 'office_relocation'),
                        _ServiceTile('🚗', 'Vehicle', 'vehicle_transport'),
                        _ServiceTile('📦', 'Storage', 'storage'),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Active bookings
                    if (active.isNotEmpty) ...[
                      const Text('Active Bookings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
                      const SizedBox(height: 10),
                      ...active.map((b) => _BookingCard(booking: b)),
                      const SizedBox(height: 20),
                    ],

                    // Recent bookings
                    const Text('Recent Bookings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
                    const SizedBox(height: 10),
                    if (bookings.loading)
                      const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                    else if (bookings.bookings.isEmpty)
                      _EmptyState()
                    else
                      ...bookings.bookings.take(5).map((b) => _BookingCard(booking: b)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) {
          setState(() => _tab = i);
          if (i == 1) Navigator.pushNamed(context, '/orders');
          if (i == 2) Navigator.pushNamed(context, '/book');
          if (i == 3) Navigator.pushNamed(context, '/profile');
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined),  activeIcon: Icon(Icons.home),       label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.list_alt_outlined), activeIcon: Icon(Icons.list_alt), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.add_circle_outline), activeIcon: Icon(Icons.add_circle), label: 'Book'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person),     label: 'Profile'),
        ],
      ),
    );
  }

  Widget _ServiceTile(String icon, String label, String type) => GestureDetector(
    onTap: () => Navigator.pushNamed(context, '/book', arguments: type),
    child: Container(
      decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(children: [
        Text(icon, style: const TextStyle(fontSize: 22)),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: AppTheme.black))),
      ]),
    ),
  );

  Widget _EmptyState() => Container(
    padding: const EdgeInsets.all(32), width: double.infinity,
    decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
    child: Column(children: [
      const Text('📦', style: TextStyle(fontSize: 40)),
      const SizedBox(height: 12),
      const Text('No bookings yet', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.black)),
      const SizedBox(height: 4),
      const Text('Book your first move!', style: TextStyle(color: AppTheme.txt2, fontSize: 13)),
    ]),
  );
}

class _BookingCard extends StatelessWidget {
  final BookingModel booking;
  const _BookingCard({required this.booking});

  Color _statusColor() {
    final m = {'confirmed': AppTheme.blue, 'driver_assigned': AppTheme.orange, 'packing': AppTheme.orange, 'loading': AppTheme.orange, 'in_transit': AppTheme.orange, 'delivered': AppTheme.green, 'cancelled': AppTheme.red, 'pending': AppTheme.txt3};
    return m[booking.status] ?? AppTheme.txt3;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/track', arguments: booking.id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(booking.bookingId, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.black)),
                const SizedBox(height: 3),
                Text('${booking.pickupCity} → ${booking.dropCity}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
                const SizedBox(height: 3),
                Text('₹${booking.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
              ],
            )),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: _statusColor().withOpacity(.1), borderRadius: BorderRadius.circular(100)),
                  child: Text(booking.status.replaceAll('_', ' '), style: TextStyle(color: _statusColor(), fontWeight: FontWeight.w600, fontSize: 11)),
                ),
                const SizedBox(height: 6),
                const Text('Track →', style: TextStyle(fontSize: 12, color: AppTheme.txt3)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


// ─── lib/screens/customer/book_screen.dart ────────────
import 'dart:io';
import 'package:image_picker/image_picker.dart';

class BookScreen extends StatefulWidget {
  const BookScreen({super.key});
  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  int    _step    = 0;
  bool   _loading = false;
  final  _picker  = ImagePicker();
  List<File> _photos = [];

  // Form state
  final _pickupCityCtrl   = TextEditingController();
  final _pickupAddrCtrl   = TextEditingController();
  final _dropCityCtrl     = TextEditingController();
  final _dropAddrCtrl     = TextEditingController();
  final _phoneCtrl        = TextEditingController();
  String _serviceType     = 'home_shifting';
  String _houseType       = '';
  int    _pickupFloor     = 0;
  int    _dropFloor       = 0;
  String _scheduledDate   = '';
  String _paymentMethod   = 'upi';
  bool   _wantInsurance   = false;

  final _steps = ['Locations', 'Details & Photos', 'Quote', 'Payment'];

  Future<void> _pickImage() async {
    if (_photos.length >= 8) return;
    final picked = await _picker.pickMultiImage(imageQuality: 75);
    for (final p in picked) {
      if (_photos.length >= 8) break;
      setState(() => _photos.add(File(p.path)));
    }
  }

  Future<void> _getEstimate() async {
    if (_houseType.isEmpty || _pickupCityCtrl.text.isEmpty || _dropCityCtrl.text.isEmpty) {
      _snack('Fill all required fields'); return;
    }
    setState(() => _loading = true);
    final ok = await context.read<BookingProvider>().getEstimate({
      'pickup':  {'city': _pickupCityCtrl.text.trim(), 'floor': _pickupFloor},
      'dropoff': {'city': _dropCityCtrl.text.trim(),  'floor': _dropFloor},
      'houseType': _houseType, 'serviceType': _serviceType,
      'scheduledDate': _scheduledDate.isEmpty ? DateTime.now().add(const Duration(days: 1)).toIso8601String() : _scheduledDate,
    });
    setState(() => _loading = false);
    if (ok) setState(() => _step = 2); else _snack('Could not get estimate');
  }

  Future<void> _confirmBooking() async {
    setState(() => _loading = true);
    // Upload photos to Cloudinary first
    final photoUrls = <String>[];
    for (final f in _photos) {
      try {
        final url = await UploadApi.uploadFile(f, 'bookings');
        if (url != null) photoUrls.add(url);
      } catch (_) {}
    }
    final booking = await context.read<BookingProvider>().createBooking({
      'pickup':      {'city': _pickupCityCtrl.text.trim(), 'address': _pickupAddrCtrl.text.trim(), 'floor': _pickupFloor},
      'dropoff':     {'city': _dropCityCtrl.text.trim(), 'address': _dropAddrCtrl.text.trim(), 'floor': _dropFloor},
      'houseType':   _houseType, 'serviceType': _serviceType,
      'scheduledDate': _scheduledDate, 'phone': _phoneCtrl.text.trim(),
      'paymentMethod': _paymentMethod, 'wantInsurance': _wantInsurance,
      'photos': photoUrls,
    });
    setState(() => _loading = false);
    if (!mounted) return;
    if (booking != null) {
      _snack('Booking confirmed! Check WhatsApp.');
      Navigator.pushReplacementNamed(context, '/track', arguments: booking.id);
    } else { _snack('Booking failed. Try again.'); }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final pricing = context.watch<BookingProvider>().pricing;
    return Scaffold(
      backgroundColor: AppTheme.white,
      appBar: AppBar(title: Text(_steps[_step])),
      body: Column(
        children: [
          // Progress
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(children: List.generate(_steps.length, (i) => Expanded(child: Container(
              height: 4, margin: EdgeInsets.only(right: i < _steps.length-1 ? 6 : 0),
              decoration: BoxDecoration(color: i <= _step ? AppTheme.black : AppTheme.border, borderRadius: BorderRadius.circular(4)),
            )))),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: [
                _buildStep0(),
                _buildStep1(),
                if (pricing != null) _buildStep2(pricing),
                _buildStep3(),
              ][_step],
            ),
          ),
          // Nav buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            child: Row(children: [
              if (_step > 0) ...[
                Expanded(child: OutlinedButton(
                  onPressed: () => setState(() => _step--),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), side: const BorderSide(color: AppTheme.border), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text('Back', style: TextStyle(color: AppTheme.black)),
                )),
                const SizedBox(width: 12),
              ],
              Expanded(flex: 2, child: ElevatedButton(
                onPressed: _loading ? null : () async {
                  if (_step == 0) setState(() => _step = 1);
                  else if (_step == 1) await _getEstimate();
                  else if (_step == 2) setState(() => _step = 3);
                  else await _confirmBooking();
                },
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_step == 3 ? 'Confirm & Pay' : 'Continue →', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              )),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _buildStep0() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _sectionLabel('PICKUP'),
    _field('City *', _pickupCityCtrl, hint: 'e.g. Delhi'),
    _field('Full Address', _pickupAddrCtrl, hint: 'Street, Area, Landmark'),
    _floorPicker('Pickup Floor', _pickupFloor, (v) => setState(() => _pickupFloor = v)),
    const SizedBox(height: 16),
    _sectionLabel('DROP'),
    _field('City *', _dropCityCtrl, hint: 'e.g. Mumbai'),
    _field('Full Address', _dropAddrCtrl, hint: 'Street, Area, Landmark'),
    _floorPicker('Drop Floor', _dropFloor, (v) => setState(() => _dropFloor = v)),
  ]);

  Widget _buildStep1() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _sectionLabel('SERVICE'),
    _dropdown('Service Type *', _serviceType, {
      'home_shifting': '🏠 Home Shifting', 'office_relocation': '🏢 Office Relocation',
      'vehicle_transport': '🚗 Vehicle Transport', 'storage': '📦 Storage',
    }, (v) => setState(() => _serviceType = v!)),
    _dropdown('House Type *', _houseType, {
      '1rk':'1 RK','1bhk':'1 BHK','2bhk':'2 BHK','3bhk':'3 BHK',
      '4bhk_plus':'4 BHK+','villa':'Villa','office_small':'Office (Small)','office_large':'Office (Large)',
    }, (v) => setState(() => _houseType = v!)),
    const SizedBox(height: 8),
    // Date picker
    GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(context: context,
          initialDate: DateTime.now().add(const Duration(days: 1)),
          firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 90)));
        if (picked != null) setState(() => _scheduledDate = picked.toIso8601String());
      },
      child: Container(
        padding: const EdgeInsets.all(14), margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border)),
        child: Row(children: [
          const Icon(Icons.calendar_today, size: 18, color: AppTheme.txt2),
          const SizedBox(width: 10),
          Text(_scheduledDate.isEmpty ? 'Select Moving Date *' : _scheduledDate.substring(0,10),
            style: TextStyle(color: _scheduledDate.isEmpty ? AppTheme.txt3 : AppTheme.black, fontSize: 14)),
        ]),
      ),
    ),
    _field('Phone *', _phoneCtrl, hint: '+91 XXXXX XXXXX', type: TextInputType.phone),
    const SizedBox(height: 16),

    // Photo upload section
    _sectionLabel('ROOM PHOTOS (Optional — improves AI quote)'),
    const SizedBox(height: 8),
    GridView.count(
      shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 1,
      children: [
        ..._photos.map((f) => Stack(
          children: [
            ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.file(f, fit: BoxFit.cover, width: double.infinity, height: double.infinity)),
            Positioned(top: 4, right: 4, child: GestureDetector(
              onTap: () => setState(() => _photos.remove(f)),
              child: Container(width: 22, height: 22, decoration: BoxDecoration(color: Colors.black.withOpacity(.6), shape: BoxShape.circle), child: const Icon(Icons.close, size: 14, color: Colors.white)),
            )),
          ],
        )),
        if (_photos.length < 8)
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              decoration: BoxDecoration(color: AppTheme.bg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border, style: BorderStyle.solid)),
              child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.add_a_photo, size: 24, color: AppTheme.txt3),
                SizedBox(height: 4),
                Text('Add', style: TextStyle(fontSize: 12, color: AppTheme.txt3)),
              ]),
            ),
          ),
      ],
    ),
    const SizedBox(height: 8),
    const Text('Upload room photos for a more accurate AI quote', style: TextStyle(fontSize: 12, color: AppTheme.txt3)),
  ]);

  Widget _buildStep2(Map<String, dynamic> p) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _sectionLabel('YOUR QUOTE'),
    Container(
      decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        ...[['Base Price', p['basePrice']],['Distance Charge', p['distanceCharge']],['Labour Charge', p['laborCharge']],['Packing Charge', p['packingCharge']],['Platform Fee', p['platformFee']],['GST (18%)', p['gst']]].map((row) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(row[0] as String, style: const TextStyle(fontSize: 14, color: AppTheme.txt2)),
            Text('₹${(row[1] as int? ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.black)),
          ]),
        )),
        const Divider(height: 24, color: AppTheme.border),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Total', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.black)),
          Text('₹${(p['totalAmount'] as int? ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.black)),
        ]),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Advance (30%)', style: TextStyle(fontSize: 13, color: AppTheme.txt2)),
          Text('₹${(p['advanceAmount'] as int? ?? 0).toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
        ]),
      ]),
    ),
    const SizedBox(height: 16),
    // Insurance toggle
    Container(
      decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('🛡️ Add Transit Insurance', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.black)),
          SizedBox(height: 3),
          Text('Covers damage up to ₹2 lakh', style: TextStyle(fontSize: 12, color: AppTheme.txt2)),
        ])),
        Switch(value: _wantInsurance, onChanged: (v) => setState(() => _wantInsurance = v), activeColor: AppTheme.black),
      ]),
    ),
  ]);

  Widget _buildStep3() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    _sectionLabel('PAYMENT METHOD'),
    ...[['upi','📱 UPI / Google Pay / PhonePe'],['card','💳 Credit / Debit Card'],['netbanking','🏦 Net Banking'],['cod','💵 Cash on Delivery']].map((item) =>
      GestureDetector(
        onTap: () => setState(() => _paymentMethod = item[0]!),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.white, borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _paymentMethod == item[0] ? AppTheme.black : AppTheme.border, width: _paymentMethod == item[0] ? 2 : 1),
          ),
          child: Row(children: [
            Container(
              width: 20, height: 20, margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: _paymentMethod == item[0] ? AppTheme.black : AppTheme.border, width: 2), color: _paymentMethod == item[0] ? AppTheme.black : Colors.transparent),
              child: _paymentMethod == item[0] ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
            ),
            Text(item[1]!, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: AppTheme.black)),
          ]),
        ),
      ),
    ),
  ]);

  Widget _sectionLabel(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.txt3, letterSpacing: .8)),
  );

  Widget _field(String label, TextEditingController ctrl, {String? hint, TextInputType? type}) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.txt2)),
      const SizedBox(height: 5),
      TextField(controller: ctrl, keyboardType: type, decoration: InputDecoration(hintText: hint)),
    ]),
  );

  Widget _dropdown(String label, String val, Map<String,String> items, void Function(String?) onChanged) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.txt2)),
      const SizedBox(height: 5),
      DropdownButtonFormField<String>(
        value: val.isEmpty ? null : val,
        decoration: const InputDecoration(),
        hint: Text('Select', style: TextStyle(color: AppTheme.txt3, fontSize: 14)),
        items: items.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
        onChanged: onChanged,
      ),
    ]),
  );

  Widget _floorPicker(String label, int val, void Function(int) onChanged) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.txt2)),
      const SizedBox(height: 5),
      Row(children: [
        GestureDetector(onTap: () { if (val > 0) onChanged(val - 1); }, child: Container(width: 38, height: 38, decoration: BoxDecoration(border: Border.all(color: AppTheme.border), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.remove, size: 18))),
        Expanded(child: Text('Floor $val', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600))),
        GestureDetector(onTap: () => onChanged(val + 1), child: Container(width: 38, height: 38, decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.add, size: 18, color: Colors.white))),
      ]),
    ]),
  );
}
