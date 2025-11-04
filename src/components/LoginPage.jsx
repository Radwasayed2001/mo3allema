import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";

const LoginPage = () => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await login(email, password);
    } catch (err) {
      setFormError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* header */}
          <div className="px-8 py-6 bg-gradient-to-r from-green-500 to-teal-500">
            <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
              تسجيل الدخول
            </h1>
            <p className="text-center text-sm text-white/90 mt-1">نظام تِبيان — إدارة الجلسات والتقارير</p>
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-green-200/60 focus:border-green-400"
                  placeholder="مثال: example@mail.com"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-4 focus:ring-green-200/60 focus:border-green-400"
                  placeholder="********"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-required="true"
                />
              </div>

              {/* errors */}
              {(formError || error) && (
                <div role="alert" aria-live="polite" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {formError || error}
                </div>
              )}

              {/* submit */}
              <Button
                type="submit"
                className="mt-1 w-full rounded-xl py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold shadow-md"
                disabled={loading}
              >
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </Button>

              {/* small footer links */}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>نسيت كلمة المرور؟</span>
                <span>تحتاج مساعدة؟ تواصل معنا</span>
              </div>
            </form>
          </div>

          {/* subtle footer */}
          <div className="px-6 py-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
            © {new Date().getFullYear()} نظام تِبيان
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
