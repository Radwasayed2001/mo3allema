// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import app from "../lib/firebaseConfig";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc
} from "firebase/firestore";

const AuthContext = createContext();
const db = getFirestore(app);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userSchoolId, setUserSchoolId] = useState(null);

  // initializing === true أثناء انتظار أول callback من onAuthStateChanged
  const [initializing, setInitializing] = useState(true);

  // loading === true أثناء تنفيذ login/logout (نشاطات متفرقة)
  const [loading, setLoading] = useState(false);

  // خطأ عام للعرض
  const [error, setError] = useState(null);

  // حالة صريحة للمستخدم غير مخول (يوجد حساب لكن بلا دور أو بدون صلاحية)
  const [unauthorized, setUnauthorized] = useState(false);

  const auth = getAuth(app);

  useEffect(() => {
    let mounted = true;
    setInitializing(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setCurrentUser(user);
      setError(null);
      setUnauthorized(false);

      if (!user) {
        setUserRole(null);
        setUserSchoolId(null);
        if (mounted) setInitializing(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!mounted) return;

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role || null);
          setUserSchoolId(data.schoolId || null);
          setUnauthorized(false);
        } else {
          // لا نوقّع الخروج تلقائياً — نضع العلم unauthorized فقط
          setUserRole(null);
          setUserSchoolId(null);
          setError("هذا المستخدم لا يملك صلاحيات (لم يُعثر على مستند المستخدم). الرجاء مراجعة الإدارة.");
          setUnauthorized(true);
          // لا تقم بعمل signOut هنا لتجنب حلقات ال login/logout
        }
      } catch (e) {
        // تجاهل أخطاء الإلغاء لأنها تحدث أثناء cleanup أحيانًا
        if (e && (e.name === 'AbortError' || (e.message && e.message.toLowerCase().includes('aborted')))) {
          console.warn('Firestore request aborted (ignored).', e);
          // لا نغيّر حالة المستخدم هنا
        } else {
          console.error('Error fetching user doc for auth state:', e);
          setError("فشل في جلب بيانات الصلاحيات: " + (e.message || e));
          setUserRole(null);
          setUserSchoolId(null);
          // بدل signOut: نضع unauthorized لعرض رسالة للمسؤولين
          setUnauthorized(true);
          // لا نوقّع الخروج تلقائياً هنا
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // login يعيد userCredential حتى الصفحات تقدر تستعمل uid فورا
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // reset unauthorized flag on explicit login attempt
      setUnauthorized(false);
      return userCredential;
    } catch (e) {
      setError("فشل تسجيل الدخول: " + (e.message || "حدث خطأ غير معروف"));
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      // reset states
      setUserRole(null);
      setUserSchoolId(null);
      setUnauthorized(false);
    } catch (e) {
      setError("فشل تسجيل الخروج: " + (e.message || "حدث خطأ غير معروف"));
      console.warn("logout failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        userSchoolId,
        initializing,
        login,
        logout,
        loading,
        error,
        unauthorized
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
