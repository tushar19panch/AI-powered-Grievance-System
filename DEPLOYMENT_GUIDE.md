# 🚀 Village Grievance App (ग्राम समाधान) - Complete Deployment Guide

> **Detailed step-by-step production deployment manual for Spring Boot Cloud Backend and React Native (Expo) Android APK Generation.**

---

## 📂 Architecture Overview

1. **Backend**: Spring Boot 3 + Java 17 + Aiven Cloud MySQL Database + Stateless JWT Authentication.
2. **Mobile App**: React Native (Expo Router) with dedicated Citizen, Sarpanch, and Secretary dashboards.
3. **Database**: Aiven Managed Cloud MySQL (SSL enabled).

---

## 🌐 PART 1: Backend Cloud Deployment (Render / Railway / Docker)

### Option A: Deploy on Render.com (Recommended Free Cloud Hosting)

1. **Push your code to GitHub Repository:**
   ```bash
   git add .
   git commit -m "Prepare production deployment"
   git push origin main
   ```

2. **Create a Web Service on Render:**
   * Open [Render Dashboard](https://dashboard.render.com).
   * Click **New +** ➔ **Web Service**.
   * Connect your GitHub repository.
   * Configure Service Settings:
     * **Name:** `village-app-backend`
     * **Root Directory:** `backend`
     * **Runtime:** `Docker` (Render will automatically detect `backend/Dockerfile`)
     * **Region:** Singapore or Frankfurt
     * **Plan:** Free
   * **Environment Variables (Add in Render UI):**
     * `PORT`: `8080`
     * `SPRING_DATASOURCE_URL`: `jdbc:mysql://avnadmin:AVNS_6-I1ATe-IUN7rbFuo2x@mysql-31858198-avverma7620-82ac.d.aivencloud.com:27112/defaultdb?ssl-mode=REQUIRED`
     * `SPRING_DATASOURCE_USERNAME`: `avnadmin`
     * `SPRING_DATASOURCE_PASSWORD`: `AVNS_6-I1ATe-IUN7rbFuo2x`
     * `JWT_SECRET`: `MyVillageGrievanceSystemSecretKeyForJWT2026Secure`

3. **Deploy:** Click **Create Web Service**. Once built, you'll receive your Live Backend URL (e.g., `https://village-app-backend.onrender.com`).

---

### Option B: Deploy with Railway.app

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo** and choose your repo.
3. Set the Root Directory to `/backend`.
4. Add the environment variables (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `PORT=8080`).
5. Generate Domain in Railway networking settings to get your live API URL.

---

## 📱 PART 2: Mobile App Android APK Build (EAS Cloud)

### Step 1: Configure Backend URL in Mobile App
Open `mobile-app/.env` (or create it) and enter your live cloud backend URL:

```env
EXPO_PUBLIC_API_URL=https://village-app-backend.onrender.com
```

### Step 2: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 3: Login to Expo Account
```bash
npx eas login
```
*(If you don't have an Expo account, create one free at [expo.dev](https://expo.dev)).*

### Step 4: Run Android APK Build
```bash
cd mobile-app
npx eas build -p android --profile preview
```

### Step 5: Download & Install APK
When the build completes, the terminal will output a **direct APK download URL** and a **QR Code**. Scan or download it onto any Android smartphone to install the app.

---

## 🔑 Role-Based Access Reference

| Role | Dashboard Screen | Key Functionalities |
|---|---|---|
| **नागरिक (Citizen)** | `/citizen-dashboard` | शिकायत दर्ज करना (फोटो + ऑडियो + लोकेशन), लाइव स्थिति ट्रैक करना |
| **सरपंच (Sarpanch)** | `/admin` | ग्राम पंचायत की सभी शिकायतें देखना, स्थिति अपडेट करना, समाधान साक्ष्य अपलोड करना |
| **ग्राम सचिव (Secretary)** | `/secretary` | पेंडेंसी मॉनिटरिंग, एस्केलेशन ट्रैकिंग, वार्ड-वार स्कोरकार्ड |

---

## 🛠️ Local Testing Over Wi-Fi (Physical Phone)

If testing locally without deploying to cloud:
1. Make sure your PC and Android phone are on the **same Wi-Fi network**.
2. Find your PC's local IP address (run `ipconfig` in Command Prompt, e.g. `192.168.1.5`).
3. Update `mobile-app/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.5:8080
   ```
4. Start backend (`.\mvnw.cmd spring-boot:run`) and Expo (`npx expo start -c`).
5. Open **Expo Go** on your phone and scan the terminal QR code.
