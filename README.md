# Mini LMS Mobile App (Expo SDK 56)

A high-performance, secure Mini LMS Mobile Application built using **React Native Expo (SDK 56)**, **TypeScript**, **NativeWind (v5/Tailwind v4)**, and **LegendList**.

---

## 🚀 Key Features

*   **Secure Authentication:** User register & login integrated with `api.freeapi.app` endpoints. JWT access and refresh tokens are stored securely using `expo-secure-store` with auto-login on startup.
*   **Highly Optimized Catalog Listing:** Built with `@legendapp/list/react-native` (`LegendList`) for cell recycling, memoized layouts, and dynamic item sizing. Features pull-to-refresh and search filtering.
*   **State Persistence & Offline Banner:** Local persistence via `AsyncStorage` caches courses and bookmark configurations. A custom `OfflineBanner` alerts the user when network connectivity changes using `@react-native-community/netinfo`.
*   **WebView Integration:** Embedded course module player utilizing `react-native-webview` with dynamic parameter injection, simulating custom authorization headers, and bidirectional messaging (notifies native when course module is completed).
*   **Local Notifications:** Schedules user alerts on SDK 56 using `expo-notifications` for:
    *   Reaching 5+ bookmarked courses.
    *   24-hour inactivity reminder (reschedules dynamically upon opening).
*   **Profile Management:** User statistics dashboard showing bookmarks & enrollment counts, with avatar image picker updates (`expo-image-picker`).

---

## 🛠️ Architectural Decisions

1.  **Expo SDK 56 + NativeWind v5 (Tailwind v4):** To support SDK 56, we configured NativeWind v5 (preview), setting up `metro.config.js` and `postcss.config.mjs` to work directly with Tailwind CSS v4's newer compiler.
2.  **LegendList for Dynamic Lists:** Rather than relying on default FlatList (which causes frame drops on heavy layouts), we integrated `LegendList`, which uses view recycling to maintain smooth 60 FPS scrolls.
3.  **Local HTML Asset for WebView:** We bundled a custom, responsive HTML course page (`assets/course_content.html`) and implemented string-loading fallbacks to guarantee offline compatibility and prevent asset-linking failures on Android.
4.  **Resilient Networking:** Implemented a fetch wrapper with:
    *   Request timeout (10 seconds limit).
    *   Automatic retry logic (up to 3 attempts with exponential backoff on 5xx or network errors).
    *   Intercepts requests to append the authorization header and handles token refreshing if a `401 Unauthorized` is returned.

---

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Expo CLI (`npm install -g expo-cli`)
*   Expo Go app (for testing on real devices) or Xcode/Android Studio simulators.

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd House_Of_EdTech_Task
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npx expo start
    ```
4.  Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code using the Expo Go app on a physical device.

---

## 📱 Building the APK (Android)

To compile a development build or production APK for Android, we use **EAS Build**:

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Log in to Expo Account
```bash
eas login
```

### 3. Initialize EAS Configuration
```bash
eas build:configure
```

### 4. Build the APK (Android)
To run a remote build and generate an installable APK file:
```bash
eas build --platform android --profile preview
```
*Note: Make sure your `eas.json` is configured to build an APK (set `buildType` to `"apk"` in your preview profile).*

---

## 🗂️ Project Structure

```
├── assets/                     # Graphic assets, splash screen, and tab icons
│   └── course_content.html     # Local WebView HTML template
├── src/
│   ├── api/
│   │   └── client.ts           # Fetch API client (retries, timeouts, intercepts)
│   ├── app/                    # File-based routing (Expo Router)
│   │   ├── _layout.tsx         # Root layout & providers
│   │   ├── index.tsx           # Catalog (Home Tab)
│   │   ├── explore.tsx         # Bookmarks (Explore Tab)
│   │   ├── profile.tsx         # User Profile (Profile Tab)
│   │   ├── login.tsx           # Login Form
│   │   ├── register.tsx        # Register Form
│   │   ├── course/
│   │   │   └── [id].tsx        # Course Details Screen
│   │   └── webview.tsx         # WebView Viewer
│   ├── components/             # Reusable UI components
│   │   ├── CourseCard.tsx      # Optimized, memoized Course Card
│   │   ├── OfflineBanner.tsx   # Custom animated Network Banner
│   │   └── app-tabs.tsx        # Custom Native Router tab configuration
│   ├── constants/
│   │   └── theme.ts            # Palette styling & colors
│   ├── context/
│   │   ├── AuthContext.tsx     # Authentication state provider
│   │   └── CourseContext.tsx   # Courses catalog & bookmark provider
│   └── hooks/
│       └── useNotifications.ts # Local push notifications scheduling hook
├── metro.config.js             # Metro configuration for NativeWind
└── postcss.config.mjs          # PostCSS configuration for Tailwind v4
```
