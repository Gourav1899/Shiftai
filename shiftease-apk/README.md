# ShiftEase Flutter APK
## Complete Setup & Build Guide

## Project Structure
```
lib/
├── main.dart                          ← App entry, theme, routing
├── services/
│   └── api_service.dart               ← All API calls (Auth, Booking, Driver, Upload)
├── providers/
│   └── all_providers.dart             ← Auth, Booking, Tracking (Socket + GPS)
├── models/
│   └── booking_model.dart             ← BookingModel, TrackingEntry
├── screens/
│   ├── auth/
│   │   └── auth_screens.dart          ← Login (OTP send) + OTP Verify
│   ├── customer/
│   │   ├── customer_screens.dart      ← Home, Book (4-step + photos)
│   │   └── orders_screen.dart         ← Order history
│   ├── driver/                        ← (in track_driver_screens.dart)
│   │   ├── driver_home_screen.dart    ← Online toggle, GPS, active job
│   │   └── driver_job_screen.dart     ← Job mgmt + step photos + status advance
│   └── admin/
│       └── admin_screens.dart         ← Dashboard, Orders, Drivers tabs
└── screens/
    └── track_driver_screens.dart      ← TrackScreen (live map + timeline + photos)
```

## Role → Screen Flow
```
customer     → Login → Home → Book (4 steps + photos) → Track (live map + timeline)
driver       → Login → DriverHome (online toggle) → DriverJob (photos + advance)
admin        → Login → AdminDashboard (stats + orders + drivers)
tenant_admin → same as admin
```

## Live GPS Flow
```
Driver goes Online
  → TrackingProvider.goOnline(bookingId)
  → Geolocator.getCurrentPosition() every 10 seconds
  → POST /api/drivers/location (DB persist)
  → Socket emit: driver_location {bookingId, lat, lng}
  → Server broadcasts to room booking:ID
  → Customer TrackingProvider.listenToBooking receives location_update
  → GoogleMap marker moves to new position
```

## Photo Upload Flow
```
Customer (room photos):
  ImagePicker.pickMultiImage → File list → UploadApi.uploadFile → Cloudinary URL
  → Stored in booking.photos[]

Driver (step photos):
  ImagePicker.pickImage (camera) → File → UploadApi.uploadFile → Cloudinary URL
  → Stored in booking.tracking[status].photos[]
  → Customer sees them in StatusTimeline on track screen
```

## Setup

### 1. Configure API URL
Edit `lib/services/api_service.dart`:
```dart
static const String baseUrl = 'https://api.shiftease.in/api';
// For local dev: 'http://10.0.2.2:5000/api'  (Android emulator)
// For local dev: 'http://localhost:5000/api'   (iOS simulator)
```

### 2. Configure Socket URL
Edit `lib/providers/all_providers.dart`:
```dart
_socket = io.io('https://api.shiftease.in', ...)
// For local dev: 'http://10.0.2.2:5000'
```

### 3. Google Maps API Key

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="AIzaXXXXXXXXXXXXXXXXX"/>
```

**iOS** — `ios/Runner/AppDelegate.swift`:
```swift
GMSServices.provideAPIKey("AIzaXXXXXXXXXXXXXXXXX")
```

### 4. Firebase (Push Notifications)
```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=your-firebase-project
```

### 5. Permissions

**Android** `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```

**iOS** `ios/Runner/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ShiftEase uses your location for live tracking</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Driver location is needed while job is active</string>
<key>NSCameraUsageDescription</key>
<string>Upload photos of items being moved</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose photos of your rooms for better quote</string>
```

## Build Commands
```bash
# Install dependencies
flutter pub get

# Run on device (debug)
flutter run

# Build release APK (Android)
flutter build apk --release --split-per-abi

# Build App Bundle (for Play Store)
flutter build appbundle --release

# Build iOS IPA
flutter build ios --release
```

## APK Location after build
```
build/app/outputs/flutter-apk/app-arm64-v8a-release.apk  ← Main APK
build/app/outputs/bundle/release/app-release.aab           ← Play Store
```

## Test Accounts (create via backend seed)
```
Customer : +91 9999900001
Driver   : +91 9999900002
Admin    : +91 9999900003
Super Admin: +91 9999900004
```
