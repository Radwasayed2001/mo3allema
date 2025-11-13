// src/components/SchoolAdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "./ui/button";

const SchoolAdminLogin = () => {
    const { login, loading, error, logout } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        try {
            const maybeUserCredential = await login(email, password);

            // try extract uid from credential or firebase auth
            const uid = (maybeUserCredential && maybeUserCredential.user && maybeUserCredential.user.uid)
                || (maybeUserCredential && maybeUserCredential.uid)
                || null;

            let userId = uid;
            if (!userId) {
                // wait briefly for AuthContext to update (best-effort)
                await new Promise(res => setTimeout(res, 500));
                try {
                    const { getAuth } = await import('firebase/auth');
                    const auth = getAuth();
                    userId = auth?.currentUser?.uid || null;
                } catch (e) {
                    // ignore
                }
            }

            if (!userId) {
                setFormError("تسجيل الدخول تم لكن لم يتم التعرف على المستخدم — حاول مرة أخرى.");
                return;
            }

            // اقرأ مستند المستخدم من Firestore (collections/users/{uid})
            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            const role = (userSnap.exists() && userSnap.data().role) ? userSnap.data().role : null;

            if (role === 'school_admin') {
                // نجاح: إعادة تحميل أو تحويل إلى الصفحة الرئيسية
                // يمكنك استبدال '/' بأي لوحة خاصة بمشرف المدرسة
                navigate('/', { replace: true });
                // أو لو تفضلين إعادة تحميل:
                // window.location.reload();
            } else {
                // دور غير صحيح -> حاول logout واظهر رسالة
                if (typeof logout === 'function') {
                    try { await logout(); } catch (e) { /* ignore */ }
                }
                setFormError('تم تسجيل الدخول ولكن هذا الحساب ليس لديه دور مشرف مدرسة (school_admin).');
            }
        } catch (err) {
            console.error('SchoolAdminLogin error:', err);
            setFormError(err?.message || "حدث خطأ أثناء تسجيل الدخول");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
            <div className="w-full max-w-md mx-4">
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    {/* header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-emerald-600 to-green-500">
                        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
                            تسجيل دخول مشرف المدرسة
                        </h1>
                        <p className="text-center text-sm text-white/90 mt-1">خاص بمشرفي المدرسة (school_admin)</p>
                    </div>

                    {/* body */}
                    <div className="px-8 py-6">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-medium text-slate-700">البريد الإلكتروني</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-400"
                                    placeholder="مثال: admin@school.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    aria-required="true"
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="password" className="text-sm font-medium text-slate-700">كلمة المرور</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200/60 focus:border-emerald-400"
                                    placeholder="********"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    aria-required="true"
                                />
                            </div>

                            {(formError || error) && (
                                <div role="alert" aria-live="polite" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                    {formError || error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="mt-1 w-full rounded-xl py-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-semibold shadow-md"
                                disabled={loading}
                            >
                                {loading ? 'جاري الدخول...' : 'تسجيل دخول مشرف المدرسة'}
                            </Button>

                            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                                <span>نسيت كلمة المرور؟</span>
                                <span>تحتاج مساعدة؟ تواصل معنا</span>
                            </div>
                        </form>
                    </div>

                    <div className="px-6 py-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
                        © {new Date().getFullYear()} نظام تِبيان
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminLogin;