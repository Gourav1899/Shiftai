// ─── lib/screens/customer/track_screen.dart ───────────
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/tracking_provider.dart';
import '../../models/booking_model.dart';
import '../../main.dart';

class TrackScreen extends StatefulWidget {
  final String bookingId;
  const TrackScreen({super.key, required this.bookingId});
  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  GoogleMapController? _mapCtrl;
  Marker?              _truckMarker;
  bool                 _showRating = false;

  static const _statusFlow = ['confirmed','driver_assigned','packing','loading','in_transit','delivered'];
  static const _statusLabels = {
    'confirmed':       'Order Confirmed',
    'driver_assigned': 'Driver Assigned',
    'packing':         'Packing Started',
    'loading':         'Loading Complete',
    'in_transit':      'In Transit',
    'delivered':       'Delivered',
  };
  static const _statusIcons = {
    'confirmed':'✓','driver_assigned':'🚚','packing':'📦','loading':'🔼','in_transit':'🛣️','delivered':'✅',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BookingProvider>().fetchById(widget.bookingId);
      context.read<TrackingProvider>().listenToBooking(widget.bookingId);
    });
  }

  @override
  void dispose() {
    _mapCtrl?.dispose();
    super.dispose();
  }

  void _updateMapMarker(double lat, double lng) {
    final pos = LatLng(lat, lng);
    setState(() {
      _truckMarker = Marker(
        markerId: const MarkerId('truck'),
        position: pos,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: const InfoWindow(title: '🚚 Driver'),
      );
    });
    _mapCtrl?.animateCamera(CameraUpdate.newLatLng(pos));
  }

  @override
  Widget build(BuildContext context) {
    final booking  = context.watch<BookingProvider>().selected;
    final tracking = context.watch<TrackingProvider>();
    final driverLoc = tracking.driverLocation;

    // Update map when driver moves
    if (driverLoc != null) _updateMapMarker(driverLoc.lat, driverLoc.lng);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        title: Text(booking?.bookingId ?? 'Tracking'),
        actions: [
          if (booking?.status == 'delivered') IconButton(
            icon: const Icon(Icons.star_outline),
            onPressed: () => setState(() => _showRating = true),
          ),
        ],
      ),
      body: booking == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                // ETA Banner
                if (tracking.eta != null)
                  Container(
                    color: AppTheme.accent,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('🚚 In Transit', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.black)),
                      Text('ETA: ${tracking.eta} min', style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.black)),
                    ]),
                  ),

                // Live Map (show when driver assigned or later)
                if (_statusFlow.indexOf(booking.status) >= 1)
                  SizedBox(
                    height: 240,
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: driverLoc != null ? LatLng(driverLoc.lat, driverLoc.lng) : const LatLng(28.6139, 77.2090),
                        zoom: 13,
                      ),
                      markers: {
                        if (_truckMarker != null) _truckMarker!,
                        if (booking.pickup['lat'] != null)
                          Marker(markerId: const MarkerId('pickup'), position: LatLng(booking.pickup['lat'], booking.pickup['lng']), icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue), infoWindow: const InfoWindow(title: '📍 Pickup')),
                        if (booking.dropoff['lat'] != null)
                          Marker(markerId: const MarkerId('dropoff'), position: LatLng(booking.dropoff['lat'], booking.dropoff['lng']), icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed), infoWindow: const InfoWindow(title: '🏁 Drop')),
                      },
                      onMapCreated: (ctrl) => _mapCtrl = ctrl,
                      zoomControlsEnabled: false,
                      myLocationButtonEnabled: false,
                    ),
                  )
                else
                  Container(
                    height: 60, color: AppTheme.bg,
                    alignment: Alignment.center,
                    child: const Text('📍 Live map activates after driver assignment', style: TextStyle(color: AppTheme.txt3, fontSize: 13)),
                  ),

                // Driver Info
                if (booking.driver != null)
                  Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                    child: Row(children: [
                      CircleAvatar(radius: 22, backgroundColor: AppTheme.black, child: Text(
                        (booking.driver?['userId']?['name'] ?? 'D').toString().substring(0,1),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                      )),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(booking.driver?['userId']?['name'] ?? 'Driver', style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.black)),
                        Text(booking.driver?['vehicle']?['number'] ?? '—', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
                      ])),
                      GestureDetector(
                        onTap: () {
                          final phone = booking.driver?['userId']?['phone'];
                          if (phone != null) url_launcher.launchUrl(Uri.parse('tel:+91$phone'));
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(100)),
                          child: const Text('📞 Call', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ]),
                  ),

                // Status Timeline
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Order Progress', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
                    const SizedBox(height: 16),
                    ..._buildTimeline(booking),
                  ]),
                ),

                // Rating (if delivered & not rated)
                if (booking.isDelivered && booking.rating == null)
                  _RatingCard(
                    bookingId: booking.id,
                    onDone: () => context.read<BookingProvider>().fetchById(booking.id),
                  ),
              ],
            ),
    );
  }

  List<Widget> _buildTimeline(BookingModel booking) {
    final currentIdx = _statusFlow.indexOf(booking.status);
    return _statusFlow.asMap().entries.map((e) {
      final i        = e.key;
      final s        = e.value;
      final isDone   = i < currentIdx;
      final isActive = i == currentIdx;
      final entry    = booking.tracking.where((t) => t['status'] == s).lastOrNull;
      final photos   = List<String>.from(entry?['photos'] ?? []);

      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Column(children: [
            Container(
              width: 30, height: 30, decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDone ? AppTheme.green : isActive ? AppTheme.black : AppTheme.bg,
                border: Border.all(color: isDone ? AppTheme.green : isActive ? AppTheme.black : AppTheme.border),
              ),
              child: Center(child: Text(
                isDone ? '✓' : (_statusIcons[s] ?? '○'),
                style: TextStyle(color: isDone || isActive ? Colors.white : AppTheme.txt3, fontSize: isDone ? 14 : 12),
              )),
            ),
            if (i < _statusFlow.length - 1)
              Container(width: 2, height: 20, color: isDone ? AppTheme.green : AppTheme.border),
          ]),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_statusLabels[s] ?? s, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: isDone || isActive ? AppTheme.black : AppTheme.txt3)),
            if (entry != null) ...[
              const SizedBox(height: 2),
              Text(
                _formatTime(entry['timestamp']),
                style: const TextStyle(fontSize: 12, color: AppTheme.txt3),
              ),
              if (entry['message'] != null) ...[
                const SizedBox(height: 2),
                Text(entry['message'], style: const TextStyle(fontSize: 12, color: AppTheme.txt2)),
              ],
              // Step photos from driver
              if (photos.isNotEmpty) ...[
                const SizedBox(height: 8),
                SizedBox(height: 70, child: ListView.separated(
                  scrollDirection: Axis.horizontal, itemCount: photos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, pi) => GestureDetector(
                    onTap: () => _showPhoto(context, photos[pi]),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: CachedNetworkImage(imageUrl: photos[pi], width: 80, height: 70, fit: BoxFit.cover),
                    ),
                  ),
                )),
              ],
            ],
          ])),
        ]),
      );
    }).toList();
  }

  String _formatTime(dynamic ts) {
    if (ts == null) return '';
    final dt = DateTime.tryParse(ts.toString());
    if (dt == null) return '';
    return '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  void _showPhoto(BuildContext ctx, String url) {
    showDialog(context: ctx, builder: (_) => Dialog(
      child: ClipRRect(borderRadius: BorderRadius.circular(12), child: CachedNetworkImage(imageUrl: url, fit: BoxFit.contain)),
    ));
  }
}

class _RatingCard extends StatefulWidget {
  final String bookingId;
  final VoidCallback onDone;
  const _RatingCard({required this.bookingId, required this.onDone});
  @override
  State<_RatingCard> createState() => _RatingCardState();
}

class _RatingCardState extends State<_RatingCard> {
  int    _score  = 5;
  String _review = '';
  bool   _done   = false;

  @override
  Widget build(BuildContext context) {
    if (_done) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Rate Your Experience', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
        const SizedBox(height: 12),
        Row(children: List.generate(5, (i) => GestureDetector(
          onTap: () => setState(() => _score = i + 1),
          child: Icon(i < _score ? Icons.star : Icons.star_border, size: 36, color: i < _score ? Colors.amber : AppTheme.border),
        ))),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(hintText: 'Write a review (optional)…'),
          maxLines: 2,
          onChanged: (v) => _review = v,
        ),
        const SizedBox(height: 14),
        ElevatedButton(
          onPressed: () async {
            await context.read<BookingProvider>().rateBooking(widget.bookingId, _score, _review);
            setState(() => _done = true);
            widget.onDone();
          },
          child: const Text('Submit Review'),
        ),
      ]),
    );
  }
}


// ─── lib/screens/driver/driver_home_screen.dart ────────
class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});
  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool   _isOnline   = false;
  Map?   _activeJob;
  Map    _earnings   = {};
  bool   _loading    = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final jobRes  = await DriverApi.getActiveJob();
      final earnRes = await DriverApi.getEarnings();
      setState(() {
        _activeJob = jobRes['booking'];
        _earnings  = earnRes;
        _loading   = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _toggleOnline() async {
    final next = !_isOnline;
    await DriverApi.toggleOnline(next);
    setState(() => _isOnline = next);
    final tracking = context.read<TrackingProvider>();
    if (next && _activeJob != null) {
      tracking.goOnline(_activeJob!['_id']);
    } else {
      tracking.goOffline();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Driver Panel', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.black)),
              GestureDetector(
                onTap: () async { await context.read<AuthProvider>().logout(); if (!mounted) return; Navigator.pushReplacementNamed(context, '/login'); },
                child: const Text('Logout', style: TextStyle(fontSize: 14, color: AppTheme.txt2)),
              ),
            ]),
            const SizedBox(height: 20),

            // Online toggle
            Container(
              decoration: BoxDecoration(color: _isOnline ? AppTheme.black : AppTheme.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _isOnline ? AppTheme.black : AppTheme.border)),
              padding: const EdgeInsets.all(18),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(_isOnline ? '🟢 Online' : '⚫ Offline', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: _isOnline ? Colors.white : AppTheme.black)),
                  const SizedBox(height: 4),
                  Text(_isOnline ? 'Accepting new jobs · GPS active' : 'Go online to receive jobs', style: TextStyle(fontSize: 13, color: _isOnline ? Colors.white60 : AppTheme.txt2)),
                ])),
                GestureDetector(
                  onTap: _toggleOnline,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(color: _isOnline ? AppTheme.accent : AppTheme.black, borderRadius: BorderRadius.circular(100)),
                    child: Text(_isOnline ? 'Go Offline' : 'Go Online', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: _isOnline ? AppTheme.black : Colors.white)),
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 16),

            // Earnings
            Row(children: [
              _StatCard('Today', '₹${(_earnings['todayEarnings'] ?? 0).toStringAsFixed(0)}'),
              const SizedBox(width: 10),
              _StatCard('Trips', '${_earnings['totalTrips'] ?? 0}'),
              const SizedBox(width: 10),
              _StatCard('Rating', '${_earnings['avgRating'] ?? '—'}⭐'),
            ]),
            const SizedBox(height: 20),

            // Active Job
            const Text('Active Job', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.black)),
            const SizedBox(height: 10),
            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
            else if (_activeJob == null)
              Container(
                padding: const EdgeInsets.all(32), width: double.infinity,
                decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                child: Column(children: [
                  const Text('🛑', style: TextStyle(fontSize: 36)),
                  const SizedBox(height: 10),
                  Text(_isOnline ? 'Waiting for a job…' : 'Go online to receive jobs', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.black)),
                  const SizedBox(height: 4),
                  const Text('New bookings appear here automatically', style: TextStyle(fontSize: 13, color: AppTheme.txt2)),
                ]),
              )
            else
              Container(
                decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.black, width: 2)),
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(_activeJob!['bookingId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.black)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(100)),
                      child: Text((_activeJob!['status'] ?? '').replaceAll('_',' '), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  Text('${_activeJob!['pickup']?['city'] ?? ''} → ${_activeJob!['dropoff']?['city'] ?? ''}', style: const TextStyle(fontSize: 14, color: AppTheme.txt2)),
                  Text('${_activeJob!['houseType'] ?? ''} · ${(_activeJob!['serviceType'] ?? '').replaceAll('_',' ')}', style: const TextStyle(fontSize: 13, color: AppTheme.txt2)),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/driver-job', arguments: _activeJob!['_id']),
                    child: const Text('Manage Job →'),
                  ),
                ]),
              ),
          ],
        ),
      ),
    );
  }

  Widget _StatCard(String label, String value) => Expanded(child: Container(
    padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
    child: Column(children: [
      Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: AppTheme.black)),
      const SizedBox(height: 3),
      Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.txt3)),
    ]),
  ));
}


// ─── lib/screens/driver/driver_job_screen.dart ─────────
class DriverJobScreen extends StatefulWidget {
  final String bookingId;
  const DriverJobScreen({super.key, required this.bookingId});
  @override
  State<DriverJobScreen> createState() => _DriverJobScreenState();
}

class _DriverJobScreenState extends State<DriverJobScreen> {
  Map?        _booking;
  List<File>  _stepPhotos = [];
  bool        _uploading  = false;
  final _picker = ImagePicker();

  static const _flow = ['confirmed','driver_assigned','packing','loading','in_transit','delivered'];
  static const _nextLabels = {
    'confirmed':       'Start Packing',
    'driver_assigned': 'Start Packing',
    'packing':         'Mark Loading Complete',
    'loading':         'Start Transit',
    'in_transit':      'Mark Delivered',
  };

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    final r = await BookingApi.getById(widget.bookingId);
    setState(() => _booking = r['booking']);
  }

  Future<void> _pickStepPhoto() async {
    final picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 80);
    if (picked != null) setState(() => _stepPhotos.add(File(picked.path)));
  }

  Future<void> _advance() async {
    final curr   = _booking?['status'] ?? '';
    final currI  = _flow.indexOf(curr);
    if (currI < 0 || currI >= _flow.length - 1) return;
    final next   = _flow[currI + 1];

    setState(() => _uploading = true);
    // Upload step photos
    final urls = <String>[];
    for (final f in _stepPhotos) {
      final url = await UploadApi.uploadFile(f, 'booking-steps');
      if (url != null) urls.add(url);
    }
    // Update status
    await BookingApi.updateStatus(widget.bookingId, next, photos: urls, message: _getMessage(next));
    setState(() { _stepPhotos.clear(); _uploading = false; });
    await _load();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status: ${next.replaceAll('_', ' ')}')));
  }

  String _getMessage(String s) => {
    'packing':    'Packing started at pickup location',
    'loading':    'All items loaded into vehicle',
    'in_transit': 'Vehicle departed — on the way to drop location',
    'delivered':  'All items delivered safely',
  }[s] ?? s;

  @override
  Widget build(BuildContext context) {
    final status  = _booking?['status'] ?? '';
    final currI   = _flow.indexOf(status);
    final isDone  = status == 'delivered';
    final nextLbl = _nextLabels[status];

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(title: Text(_booking?['bookingId'] ?? 'Job')),
      body: _booking == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Job summary
                Container(
                  decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text(_booking!['bookingId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: AppTheme.accent, borderRadius: BorderRadius.circular(100)),
                        child: Text(status.replaceAll('_',' '), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: AppTheme.black)),
                      ),
                    ]),
                    const SizedBox(height: 12),
                    _infoRow('📍 Pickup', '${_booking!['pickup']?['address'] ?? ''}, ${_booking!['pickup']?['city'] ?? ''} · Floor ${_booking!['pickup']?['floor'] ?? 0}'),
                    const SizedBox(height: 8),
                    _infoRow('🏁 Drop', '${_booking!['dropoff']?['address'] ?? ''}, ${_booking!['dropoff']?['city'] ?? ''} · Floor ${_booking!['dropoff']?['floor'] ?? 0}'),
                    const Divider(height: 20),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('👤 ${_booking!['customer']?['name'] ?? 'Customer'}', style: const TextStyle(fontWeight: FontWeight.w500)),
                      GestureDetector(
                        onTap: () {
                          final phone = _booking!['customer']?['phone'];
                          if (phone != null) url_launcher.launchUrl(Uri.parse('tel:+91$phone'));
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: AppTheme.black, borderRadius: BorderRadius.circular(100)),
                          child: const Text('📞 Call', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ]),
                  ]),
                ),
                const SizedBox(height: 16),

                // Timeline
                Container(
                  decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Job Progress', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 14),
                    ..._flow.asMap().entries.map((e) {
                      final i      = e.key;
                      final s      = e.value;
                      final done   = i < currI;
                      final active = i == currI;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                          Container(
                            width: 26, height: 26,
                            decoration: BoxDecoration(shape: BoxShape.circle, color: done ? AppTheme.green : active ? AppTheme.black : AppTheme.bg, border: Border.all(color: done ? AppTheme.green : active ? AppTheme.black : AppTheme.border)),
                            child: Center(child: Text(done ? '✓' : '${i+1}', style: TextStyle(color: done||active ? Colors.white : AppTheme.txt3, fontSize: 11, fontWeight: FontWeight.w700))),
                          ),
                          const SizedBox(width: 10),
                          Text(s.replaceAll('_',' ').toUpperCase(), style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: done||active ? AppTheme.black : AppTheme.txt3)),
                        ]),
                      );
                    }),
                  ]),
                ),
                const SizedBox(height: 16),

                // Advance status + photo upload
                if (!isDone && nextLbl != null)
                  Container(
                    decoration: BoxDecoration(color: AppTheme.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Next: $nextLbl', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.black)),
                      const SizedBox(height: 4),
                      const Text('Upload proof photos before advancing', style: TextStyle(fontSize: 12, color: AppTheme.txt2)),
                      const SizedBox(height: 14),

                      // Photo grid
                      GridView.count(
                        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                        crossAxisCount: 4, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 1,
                        children: [
                          ..._stepPhotos.map((f) => Stack(children: [
                            ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(f, fit: BoxFit.cover, width: double.infinity, height: double.infinity)),
                            Positioned(top: 2, right: 2, child: GestureDetector(
                              onTap: () => setState(() => _stepPhotos.remove(f)),
                              child: Container(width: 18, height: 18, decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.close, size: 11, color: Colors.white)),
                            )),
                          ])),
                          if (_stepPhotos.length < 5)
                            GestureDetector(
                              onTap: _pickStepPhoto,
                              child: Container(
                                decoration: BoxDecoration(color: AppTheme.bg, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.border)),
                                child: const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                  Icon(Icons.camera_alt, size: 20, color: AppTheme.txt3),
                                  SizedBox(height: 3),
                                  Text('Photo', style: TextStyle(fontSize: 10, color: AppTheme.txt3)),
                                ]),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton(
                        onPressed: _uploading ? null : _advance,
                        child: _uploading
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text('Mark as $nextLbl →', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                    ]),
                  ),

                if (isDone)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF86EFAC))),
                    child: const Column(children: [
                      Text('✅', style: TextStyle(fontSize: 36)),
                      SizedBox(height: 8),
                      Text('Job Completed!', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppTheme.green)),
                      SizedBox(height: 4),
                      Text('Great work. Earnings credited.', style: TextStyle(fontSize: 13, color: Color(0xFF166534))),
                    ]),
                  ),
              ],
            ),
    );
  }

  Widget _infoRow(String label, String val) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.black)),
    const SizedBox(width: 8),
    Expanded(child: Text(val, style: const TextStyle(fontSize: 13, color: AppTheme.txt2))),
  ]);
}
