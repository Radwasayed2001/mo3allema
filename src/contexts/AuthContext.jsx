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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const auth = getAuth(app);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setError(null);
      if (!user) {
        setUserRole(null);
        setUserSchoolId(null);
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role);
          setUserSchoolId(data.schoolId);
        } else {
          setUserRole(null);
          setUserSchoolId(null);
          setError("هذا المستخدم لا يملك صلاحيات، الرجاء مراجعة الإدارة.");
          await signOut(auth);
        }
      } catch (e) {
        setError("فشل في جلب بيانات الصلاحيات: " + e.message);
        setUserRole(null);
        setUserSchoolId(null);
        await signOut(auth);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
    } catch (e) {
      setError("فشل تسجيل الخروج: " + (e.message || "حدث خطأ غير معروف"));
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
        login,
        logout,
        loading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
