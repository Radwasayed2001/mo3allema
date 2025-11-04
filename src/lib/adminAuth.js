import { initializeApp, getApp, getApps } from 'firebase/app';
// --- (تم تعديل Imports لإضافة signInWithEmailAndPassword) ---
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, // <-- لاسترجاع الـ UID
  signOut 
} from 'firebase/auth';
import { db } from './firebaseConfig';
// --- (تم تعديل Imports لإضافة getDoc و setDoc) ---
import { setDoc, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASdfenQgp2XxMPCTyWMa-OcFKFa5zYg50",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mo3alema-1f615.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mo3alema-1f615",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mo3alema-1f615.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "103682400529",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:103682400529:web:e9e6570351e9c6f6ca2cb0"
};

let secondaryApp;
if (!getApps().find(app => app.name === 'secondaryAdmin')) {
  secondaryApp = initializeApp(firebaseConfig, 'secondaryAdmin');
} else {
  secondaryApp = getApp('secondaryAdmin');
}

const secondaryAuth = getAuth(secondaryApp);

// --- (دالة createUserAsAdmin المعدلة بالكامل) ---
export const createUserAsAdmin = async (email, password, userData) => {
  let newUid = null;

  try {
    // --- (المحاولة الأولى: إنشاء مستخدم جديد) ---
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    newUid = userCredential.user.uid;

    // (إنشاء مستند Firestore)
    const userDocRef = doc(db, 'users', newUid);
    await setDoc(userDocRef, {
      uid: newUid,
      email: email,
      ...userData 
    });

    await signOut(secondaryAuth);
    return { success: true, uid: newUid, status: 'created_new' }; // (تم الإنشاء بنجاح)

  } catch (createError) {
    // --- (المحاولة الثانية: إذا كان المستخدم موجودًا مسبقًا) ---
    if (createError.code === 'auth/email-already-in-use') {
      try {
        // (نحاول تسجيل الدخول للحصول على UID)
        const signInCredential = await signInWithEmailAndPassword(secondaryAuth, email, password);
        newUid = signInCredential.user.uid;
        
        // (الآن لدينا UID، نقوم بإنشاء/تحديث مستند الصلاحيات)
        const userDocRef = doc(db, 'users', newUid);
        
        await setDoc(userDocRef, {
          uid: newUid,
          email: email,
          ...userData 
        }, { merge: true }); // (استخدام merge لضمان عدم مسح بيانات قديمة)

        await signOut(secondaryAuth);
        // (تم الربط بنجاح)
        return { success: true, uid: newUid, status: 'linked_existing' };

      } catch (signInError) {
        // (فشل تسجيل الدخول: البريد موجود لكن كلمة المرور خاطئة)
        console.error("Sign in failed during user creation:", signInError);
        // (هذه الرسالة الوحيدة التي يجب أن تظهر كخطأ)
        return { success: false, error: "هذا البريد مستخدم، وكلمة المرور المدخلة خاطئة." };
      }
    }
    
    // (خطأ آخر غير "البريد مستخدم"، مثل باسورد ضعيف)
    console.error("Create user failed:", createError);
    return { success: false, error: createError.message };
  }
};

