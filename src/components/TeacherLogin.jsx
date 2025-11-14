// src/components/TeacherLogin.jsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { Button } from "./ui/button";
import { ButtonSpinner } from './Spinner'; // افترضنا أنك أضفت Spinner.jsx كما شرحت سابقًا
import { useAuth } from "../contexts/AuthContext";
import toast from 'react-hot-toast';

const TeacherLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState(null);
    const [isBusy, setIsBusy] = useState(false); // local busy state
    const navigate = useNavigate();

    // في أعلى الملف: استدعاء userRole و initializing
    const { login, logout, userRole: ctxUserRole, initializing } = useAuth();

    // داخل handleSubmit:
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        setIsBusy(true);

        try {
            // 1) محاولة تسجيل الدخول و الحصول على credential سريعاً
            const credential = await login(email, password);


            // 2) best-effort استخراج uid
            let uid = credential?.user?.uid || credential?.uid || null;
            if (!uid) {
                try {
                    const { getAuth } = await import('firebase/auth');
                    const auth = getAuth();
                    uid = auth?.currentUser?.uid || null;
                } catch (err) { /* ignore */ }
            }

            if (!uid) {
                const msg = "تم تسجيل الدخول لكن لم نستطع التحقق من المستخدم. حاول ثانية.";
                setFormError(msg);
                toast.error(msg);
                try { await logout(); } catch (err) { /* ignore */ }
                setIsBusy(false);
                return;
            }

            // 3) لا ننادي getDoc هنا — بدلها ننتظر AuthContext يحدث userRole بشكل موثوق
            //    ننتظر انتهاء الـ initializing (الـ AuthContext يقوم بجلب doc داخلياً)
            let attempts = 0;
            while (initializing && attempts < 15) { // حدّ أقصى ~ 3 ثواني (15*200ms)
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }

            // الآن اقرأ الدور من الـ context (fallback: لو ما تغيّر بعد 3s نقرأ من firestore كخطة بديلة)
            let role = ctxUserRole;

            // optional fallback to getDoc only if ctxUserRole is still null (وفقط مع try/catch)
            if (!role) {
                try {
                    const userDocRef = doc(db, 'users', uid);
                    const userSnap = await getDoc(userDocRef);
                    role = (userSnap.exists() && userSnap.data().role) ? userSnap.data().role : null;
                } catch (err) {
                    // تجاهل أخطاء الإلغاء بصمت لأنها عادية أثناء unmount/cleanup
                    if (err && (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('aborted')))) {
                        console.warn('getDoc aborted (ignored)', err);
                    } else {
                        console.error('Error reading user doc fallback:', err);
                        const msg = 'فشل التحقق من صلاحيات الحساب. حاول لاحقًا.';
                        setFormError(msg);
                        toast.error(msg);
                    }
                }
            }

            if (role === 'teacher') {
                navigate('/', { replace: true });
            } else {
                // غير مصرح - نخرج المستخدم من الجلسة ونبقيه على نفس الصفحة مع رسالة
                if (typeof logout === 'function') {
                    try { await logout(); } catch (e) { /* ignore */ }
                }
                const msg = 'تم تسجيل الدخول ولكن الحساب ليس بدور معلمة (teacher).';
                setFormError(msg);
                toast.error(msg);
            }
        } catch (err) {
            console.error('TeacherLogin error:', err);

            // Handle Firebase auth error codes (common ones) and show appropriate toast
            const code = err?.code || (err && err.message && err.message.toLowerCase().includes('wrong-password') ? 'auth/wrong-password' : null);

            let userMsg = 'حدث خطأ أثناء تسجيل الدخول';
            if (code === 'auth/invalid-email') {
                userMsg = 'البريد الإلكتروني غير صالح. تحقق من التنسيق.';
            } else if (code === 'auth/user-not-found') {
                userMsg = 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.';
            } else if (code === 'auth/wrong-password') {
                userMsg = 'كلمة المرور غير صحيحة. حاول مرة أخرى.';
            } else if (code === 'auth/too-many-requests') {
                userMsg = 'محاولات كثيرة. يُرجى الانتظار قليلاً أو إعادة تعيين كلمة المرور.';
            } else if (code === 'auth/user-disabled') {
                userMsg = 'هذا الحساب معطل. الرجاء التواصل مع الإدارة.';
            } else if (err && err.message) {
                // fall back to readable message when available
                userMsg = err.message;
            }

            setFormError(userMsg);
            toast.error(userMsg);
        } finally {
            setIsBusy(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
            <div className="w-full max-w-md mx-4">
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    {/* header */}
                    <div className="px-8 py-6 bg-gradient-to-r from-sky-600 to-cyan-500">
                        <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
                            تسجيل دخول المعلمة
                        </h1>
                        <p className="text-center text-sm text-white/90 mt-1">خاص بدور المعلمة (teacher)</p>
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-sky-200/60 focus:border-sky-400"
                                    placeholder="مثال: teacher@school.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    aria-required="true"
                                    aria-invalid={!!formError}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="password" className="text-sm font-medium text-slate-700">كلمة المرور</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-sky-200/60 focus:border-sky-400"
                                    placeholder="********"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    aria-required="true"
                                />
                            </div>

                            {(formError) && (
                                <div role="alert" aria-live="polite" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                    {formError}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="mt-1 w-full rounded-xl py-3 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600 text-white font-semibold shadow-md"
                                disabled={isBusy}
                                aria-busy={isBusy}
                            >
                                {isBusy ? <ButtonSpinner /> : 'تسجيل دخول المعلمة'}
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

export default TeacherLogin;
