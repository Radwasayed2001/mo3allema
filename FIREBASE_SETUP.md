# Firebase Setup Instructions

## 🔥 Setting up Firebase for the AddStudent Feature

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "tebayan-system")
4. Follow the setup wizard

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database

### 3. Get Your Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 4. Configure Your App

#### Option A: Direct Configuration (Quick Setup)
Edit `/src/lib/firebaseConfig.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

#### Option B: Environment Variables (Recommended for Production)
1. Create a `.env` file in your project root
2. Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 5. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to "إضافة طالب" in the sidebar
3. Fill out the form and submit
4. Check your Firestore database to see the new document in the "students" collection

### 6. Firestore Security Rules (Optional)

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{document} {
      allow read, write: if true; // Adjust based on your authentication needs
    }
  }
}
```

## 📁 Data Structure

The "students" collection will contain documents with this structure:

```javascript
{
  studentName: "أحمد محمد",
  parentName: "محمد أحمد",
  phoneNumber: "+966501234567",
  whatsappNumber: "+966501234567",
  createdAt: Timestamp
}
```

## 🚀 Ready to Use!

Once configured, the AddStudent feature will:
- ✅ Save student data to Firestore
- ✅ Show success/error notifications
- ✅ Validate form inputs
- ✅ Match the existing UI design
- ✅ Support Arabic RTL layout
