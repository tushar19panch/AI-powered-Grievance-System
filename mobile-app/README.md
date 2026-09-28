# 📱 Gram Samadhan Mobile Application (ग्राम समाधान मोबाइल ऐप)

> **Cross-Platform React Native & Expo Router Mobile Application for Village Grievance Management.**

Built with **Expo Router v54**, **TypeScript**, **Lucide React Native Icons**, and a rich **Native + Web Responsive Design System**.

---

## 🚀 Key Features

* **Role-Based Navigation:**
  * 🧑‍🌾 **Citizen (`/citizen-dashboard`):** Report grievances with photo, audio recording, and auto GPS coordinates. Track timeline updates in real-time.
  * 🏛️ **Sarpanch (`/admin`):** Review pending tickets, assign priorities, update action-taken reports, and upload resolution proof photos.
  * 📋 **Panchayat Secretary (`/secretary`):** Administrative oversight, escalation logs, and village-wide audit scorecard.
* **Offline-First Resilience:**
  * Seamless caching using `AsyncStorage`.
  * Auto-sync engine (`offlineSyncService.ts`) syncs queued submissions once network connectivity is restored.
* **Bilingual Support (i18n):**
  * Instant toggling between **हिंदी (Hindi)** and **English**.
* **Ward-Level Scorecards:**
  * Visual bar charts and metric gauges showing resolution efficiency by ward.

---

## 📂 Project Structure

```
mobile-app/
├── 📁 src/
│   ├── 📁 app/                    # Expo Router File-Based Navigation
│   │   ├── 📄 index.tsx           # Splash & Initial Landing Page
│   │   ├── 📄 role-selection.tsx  # Citizen / Sarpanch / Secretary Role Selector
│   │   ├── 📄 login.tsx           # Secure Phone / Password Authentication
│   │   ├── 📄 register.tsx        # Citizen Registration Screen
│   │   ├── 📄 admin-register.tsx  # Sarpanch Registration Screen
│   │   ├── 📄 secretary-register.tsx # Secretary Registration Screen
│   │   ├── 📄 citizen-dashboard.tsx  # Citizen Main Hub & Active Tickets
│   │   ├── 📄 report.tsx          # Multi-Step Complaint Filing Screen
│   │   ├── 📄 complaint-details.tsx  # Comprehensive Ticket Detail & Resolution
│   │   ├── 📄 admin.tsx           # Sarpanch Grievance Management Dashboard
│   │   ├── 📄 secretary.tsx       # Secretary Oversight Dashboard
│   │   ├── 📄 ward-scorecard.tsx  # Ward-wise Metrics & Performance Tracker
│   │   ├── 📄 audit-report.tsx    # Governance & Redressal Audit Logs
│   │   ├── 📄 notifications.tsx   # Real-Time Alerts & Status Push List
│   │   ├── 📄 profile.tsx         # User Profile & Village Association
│   │   └── 📄 help-line.tsx       # Emergency Contacts & Direct Helpline
│   ├── 📁 components/             # Reusable UI & Business Components
│   │   ├── 📄 LocationHierarchyPicker.tsx # State -> District -> Block -> Village Picker
│   │   ├── 📄 OfflineSyncBanner.tsx       # Network Connection & Sync Status Bar
│   │   ├── 📄 PhotoPreviewModal.tsx       # Image Zoom & Full Screen Viewer
│   │   └── 📄 VillageInfoModal.tsx        # Panchayat Overview Dialog
│   ├── 📁 services/               # API Clients & Offline Storage
│   │   ├── 📄 api.ts              # Axios REST Client & Token Interceptors
│   │   ├── 📄 locationService.ts  # Reverse Geocoding & GPS Service
│   │   └── 📄 offlineSyncService.ts # Background Queue & Sync Engine
│   └── 📁 i18n/                   # Language Dictionaries
├── 📄 app.json                    # Expo Manifest & Android Permissions
└── 📄 package.json                # Dependencies & Scripts
```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the `mobile-app` directory:

```env
# Backend API Base URL (Local Development)
EXPO_PUBLIC_API_URL=http://localhost:8080

# For Physical Phone Testing on Same Wi-Fi (Replace with your PC LAN IP)
# EXPO_PUBLIC_API_URL=http://192.168.1.10:8080

# Production Cloud Backend URL
# EXPO_PUBLIC_API_URL=https://village-app-backend.onrender.com
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Development Mode
```bash
npx expo start -c
```

* **Android / iOS Device:** Scan the QR code using the **Expo Go** app.
* **Web Browser:** Press `w` in the terminal to view in Chrome/Edge.
* **Android Emulator:** Press `a` in the terminal.

---

## 📦 Building Standalone Android APK

To generate an installable `.apk` file for Android devices:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to Expo
npx eas login

# 3. Build Preview APK
npx eas build -p android --profile preview
```
Once the cloud build completes, you will receive a direct APK download link and QR code.
