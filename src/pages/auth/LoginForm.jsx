// src/pages/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebaseConfig';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginForm = () => {
    const { role: roleParam } = useParams(); // 'teacher' | 'school-admin' | 'super-admin'
    const normalizedRole = roleParam === 'school-admin' ? 'school_admin' : roleParam === 'super-admin' ? 'super_admin' : 'teacher';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    // CORRECT use of hook:
    const { setProfileInContext } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const cleanEmail = String(email || '').trim();
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const uid = cred.user.uid;

            // fetch profile doc (try doc id === uid first, then query where uid field)
            let profile = null;
            try {
                const docRef = doc(db, 'users', uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) profile = { id: snap.id, ...snap.data() };
                else {
                    const q = query(collection(db, 'users'), where('uid', '==', uid));
                    const snaps = await getDocs(q);
                    if (!snaps.empty) profile = { id: snaps.docs[0].id, ...snaps.docs[0].data() };
                }
            } catch (pfErr) {
                console.error('Profile fetch error:', pfErr);
            }

            // store profile in context if setter available
            if (typeof setProfileInContext === 'function' && profile) {
                setProfileInContext(profile);
            }

            const userRole = profile?.role || null;

            // role mismatch: show a friendly warning but still redirect to actual role's dashboard
            if (userRole && userRole !== normalizedRole) {
                toast(`${userRole} — تم تسجيل الدخول لكن دور الحساب مختلف، سيتم الانتقال إلى لوحة الدور الفعلي.`);
            }

            // determine redirect target: prefer redirect to original protected page
            const redirectTo = location.state?.from?.pathname
                || (userRole === 'teacher' ? '/teacher/dashboard'
                    : userRole === 'school_admin' ? '/school-admin/view-teachers'
                        : userRole === 'super_admin' ? '/super-admin/view-schools'
                            : '/');

            navigate(redirectTo, { replace: true });
            toast.success('تم تسجيل الدخول بنجاح');
        } catch (err) {
            console.error('Login error:', err);
            // user-friendly messages
            const msg = err?.code?.includes('wrong-password') ? 'كلمة المرور خاطئة' :
                err?.code?.includes('user-not-found') ? 'لا يوجد حساب بهذا البريد' :
                    err?.message || 'فشل تسجيل الدخول';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">
                تسجيل دخول {normalizedRole === 'teacher' ? 'المعلمة' : normalizedRole === 'school_admin' ? 'مدير المدرسة' : 'المشرف العام'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="border rounded px-3 py-2"
                    autoComplete="username"
                />
                <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="border rounded px-3 py-2"
                    autoComplete="current-password"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="btn bg-green-600 text-white rounded py-2"
                >
                    {loading ? 'جاري تسجيل الدخول...' : 'تسجيل دخول'}
                </button>
            </form>
        </div>
    );
};

export default LoginForm;
