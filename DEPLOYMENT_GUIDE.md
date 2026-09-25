# 🚀 Village Grievance App (ग्राम समाधान) - Complete Deployment Guide

इस गाइड में आपको Backend (Spring Boot + MySQL) को Cloud पर deploy करने और Mobile App का **Android APK** generate करने के पूरे स्टेप्स दिए गए हैं।

---

## 📂 Architecture Overview
1. **Backend**: Spring Boot 3 + Java 17 + Aiven Cloud MySQL Database + JWT Authentication.
2. **Mobile App**: React Native (Expo Router) with Citizen, Sarpanch, and Secretary dashboards.

---

## 🌐 PART 1: Backend Deployment (Render / Railway पर Free Deploy)

Backend को 24/7 Live रखने के लिए आप **Render** (render.com) या **Railway** (railway.app) का उपयोग कर सकते हैं।

### Step 1: GitHub पर Code Push करें
1. अपने पूरे प्रोजेक्ट को GitHub repository पर push करें।

### Step 2: Render.com पर Web Service बनाएं
1. [Render.com](https://render.com) पर जाएं और लॉगिन करें।
2. **New +** -> **Web Service** पर क्लिक करें।
3. अपनी GitHub Repository को कनेक्ट करें।
4. Settings भरें:
   - **Name**: `village-app-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (हमने `backend/Dockerfile` पहले से बना दिया है)
   - **Region**: Singapore या Frankfurt
   - **Instance Type**: Free
5. **Environment Variables** (Optional, क्योंकि Aiven Cloud MySQL default properties में पहले से set है):
   - `PORT`: `8080`
   - `SPRING_DATASOURCE_URL`: `jdbc:mysql://avnadmin:AVNS_6-I1ATe-IUN7rbFuo2x@mysql-31858198-avverma7620-82ac.d.aivencloud.com:27112/defaultdb?ssl-mode=REQUIRED`
   - `SPRING_DATASOURCE_USERNAME`: `avnadmin`
   - `SPRING_DATASOURCE_PASSWORD`: `AVNS_6-I1ATe-IUN7rbFuo2x`
6. **Deploy Web Service** पर क्लिक करें।
7. Deploy होने के बाद आपको एक Live URL मिलेगा (उदा. `https://village-app-backend.onrender.com`).

---

## 📱 PART 2: Mobile App Deployment (Android APK Generate करना)

### Option A: Expo Cloud Build (EAS CLI) - सबसे आसान तरीका (1 Command)

1. `mobile-app` फोल्डर में टर्मिनल खोलें:
   ```bash
   cd c:\Users\Acer\Desktop\VillageApp\mobile-app
   ```
2. EAS CLI install करें (यदि पहले से नहीं है):
   ```bash
   npm install -g eas-cli
   ```
3. Expo Account में Login करें:
   ```bash
   npx eas login
   ```
4. `.env` फाइल में अपने Backend का Live URL डालें:
   ```env
   EXPO_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```
5. Android APK build कमांड चलाएं:
   ```bash
   npx eas build -p android --profile preview
   ```
6. Build पूरा होने पर आपको सीधा **Download APK Link** और QR Code मिलेगा जिसे किसी भी Android फोन में install किया जा सकता है।

---

### Option B: Local Android APK Build (बिना Cloud के)

यदि आपके सिस्टम पर Android Studio / Android SDK install है:
```bash
cd c:\Users\Acer\Desktop\VillageApp\mobile-app
npx expo run:android --variant release
```

---

## 🔑 Role-Based Access Summary

| Role | Dashboard URL / Screen | Key Features |
|---|---|---|
| **नागरिक (Citizen)** | `/citizen-dashboard` | शिकायत दर्ज करना (फोटो + ऑडियो + लोकेशन), लाइव स्टेटस ट्रैकिंग, फीडबैक |
| **सरपंच (Sarpanch)** | `/admin` / `/complaint-details` | गांव की सभी शिकायतें देखना, स्थिति अपडेट करना (In Progress, Resolved, Action Taken), टिप्पणी देना |
| **ग्राम सचिव (Secretary)** | `/secretary` / `/complaint-details` | शिकायतों की निगरानी, सत्यापन और स्थिति प्रबंधन |
