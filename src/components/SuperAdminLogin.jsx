// src/components/SuperAdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "./ui/button";

const SuperAdminLogin = () => {
    const { login, loading, error, logout } = useAuth(); // إذا logout غير موجود فستكون undefined
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        try {
            // حاول تسجيل الدخول — نأمل أن تقيم useAuth.login قيمة userCredential أو يضع currentUser بسرعة
            const maybeUserCredential = await login(email, password);
            // best-effort uid extraction
            const uid = (maybeUserCredential && maybeUserCredential.user && maybeUserCredential.user.uid)
                || (maybeUserCredential && maybeUserCredential.uid)
                || (typeof window !== 'undefined' && window?.firebaseAuth?.currentUser?.uid) // fallback
                || null;

            // إذا لم نحصل على uid حاول أخيراً أخذ currentUser من useAuth (قد يحدّثه auth context)
            let userId = uid;
            if (!userId) {
                // try to read from auth context if it exposes currentUser
                try {
                    // eslint-disable-next-line no-undef
                    if (typeof window !== 'undefined' && window.__CURRENT_USER_UID__) {
                        userId = window.__CURRENT_USER_UID__;
                    }
                } catch (e) {
                    // ignore
                }
            }

            // if still no uid, use a short timeout to allow AuthContext to update (best-effort)
            if (!userId) {
                await new Promise(res => setTimeout(res, 600));
                // try auth.currentUser via firebase (if available)
                try {
                    // dynamic import just in case
                    const { getAuth } = await import('firebase/auth');
                    const auth = getAuth();
                    userId = auth?.currentUser?.uid || null;
                } catch (e) {
                    // ignore
                }
            }

            if (!userId) {
                setFormError("تسجيل الدخول تم ولكن تعذّر التحقق من المستخدم. حاول مرة أخرى.");
                return;
            }

            // read user doc from Firestore
            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            const role = (userSnap.exists() && userSnap.data().role) ? userSnap.data().role : null;

            if (role === 'super_admin') {
                // دخول ناجح للمشرف العام — نوجّه المستخدم للواجهة الرئيسية أو إعادة تحميل لتحديث App state
                // navigate('/', { replace: true });
                window.location.reload();
            } else {
                // دور غير صالح — حاول تسجيل الخروج (إن وُجد) ثم عرض رسالة
                if (typeof logout === 'function') {
                    try { await logout(); } catch (e) { /* ignore */ }
                }
                setFormError('تم تسجيل الدخول ولكن حسابك ليس مشرفًا عامًا (super_admin).');
            }
        } catch (err) {
            console.error('SuperAdminLogin error:', err);
            setFormError(err?.message || "حدث خطأ أثناء تسجيل الدخول");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
            <div className="w-full max-w-md mx-4">
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    {/* header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600">
                        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
                            تسجيل دخول المشرف العام
                        </h1>
                        <p className="text-center text-sm text-white/90 mt-1">خاص بمشرفي النظام (super_admin)</p>
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-violet-200/60 focus:border-violet-400"
                                    placeholder="مثال: admin@mail.com"
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-violet-200/60 focus:border-violet-400"
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
                                className="mt-1 w-full rounded-xl py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-md"
                                disabled={loading}
                            >
                                {loading ? 'جاري الدخول...' : 'تسجيل دخول المشرف العام'}
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

export default SuperAdminLogin;
