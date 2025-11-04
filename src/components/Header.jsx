// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  Settings,
  LogOut,
  Menu,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebaseConfig';
// (تم تعديل imports لإضافة "where")
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const Header = ({
  currentChild,
  onChildChange,
  sessionTimer,
  onTimerToggle,
  onTimerReset,
  onMenuToggle,
  userRole,
  teacherId // <-- Prop جديد
}) => {
  const { logout, currentUser } = useAuth();
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [children, setChildren] = useState([]); // dynamic list from Firestore
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const { toast } = useToast();

  // --- (هذا هو الكود المعدل) ---
  useEffect(() => {
    // إذا لم يكن المستخدم معلمًا، أو لم يكن لديه teacherId، لا تجلب أي أطفال
    if (userRole !== 'teacher' || !teacherId) {
      setChildren([]);
      setLoadingChildren(false);
      return; // لا تكمل
    }

    setLoadingChildren(true);
    setFetchError(null);

    try {
      // فلترة بـ teacherId الخاص بالمعلمة الحالية
      const q = query(
        collection(db, 'children'),
        where("teacherId", "==", teacherId), // <-- الفلتر الجديد
        orderBy('childName')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: (data.childName || '').toString()
          };
        }).filter(i => i.name);

        setChildren(items);
        setLoadingChildren(false);
      }, (error) => {
        console.error('Error fetching children list:', error);
        setFetchError('حدث خطأ أثناء جلب قائمة الأطفال');
        setLoadingChildren(false);
      });

      // cleanup on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Error initializing listener for children:', err);
      setFetchError('حدث خطأ أثناء جلب قائمة الأطفال');
      setLoadingChildren(false);
    }
  }, [userRole, teacherId]); // <-- أضف teacherId و userRole كـ dependencies
  // --- (نهاية الكود المعدل) ---


  const filteredChildren = children
    .map(c => c.name)
    .filter(child =>
      child.toLowerCase().includes(childSearch.trim().toLowerCase())
    );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChildSelect = (child) => {
    onChildChange(child);
    setShowChildDropdown(false);
    setChildSearch('');
    toast({
      title: "تم اختيار الطفل",
      description: `تم اختيار ${child} للجلسة الحالية`,
      className: "notification-success"
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleSettings = () => {
    toast({
      title: "🚧 هذه الميزة غير مُفعّلة بعد—لكن لا تقلق! يمكنك طلبها في رسالتك التالية! 🚀"
    });
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2" aria-label="العودة للصفحة الرئيسية">
                <img-replace src="https://horizons-cdn.hostinger.com/7f1cff94-afa9-4d37-926d-3e7e671e45e6/82df0de6638915fa6f172a27925bba6a.jpg" alt="شعار تبيان" className="h-8 w-auto" />
                <span className="font-semibold text-lg gradient-text">نظام تِبيان</span>
              </a>
            </div>
          </div>

          {/* Child Selection (معلم فقط)*/}
          {userRole === 'teacher' && (
            <div className="flex-1 max-w-md mx-4 relative">
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowChildDropdown(!showChildDropdown)}
                  className="w-full justify-between input-focus"
                >
                  <span className="truncate">
                    {currentChild || 'اختر الطفل'}
                  </span>
                  <ChevronDown className="h-4 w-4 mr-2" />
                </Button>

                {showChildDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                  >
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ابحث عن الطفل..."
                          value={childSearch}
                          onChange={(e) => setChildSearch(e.target.value)}
                          className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-md input-focus"
                        />
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto scrollbar-thin">
                      {loadingChildren && (
                        <div className="px-4 py-2 text-slate-500">جاري التحميل...</div>
                      )}

                      {fetchError && (
                        <div className="px-4 py-2 text-red-600">{fetchError}</div>
                      )}

                      {!loadingChildren && !fetchError && filteredChildren.length === 0 && (
                        <div className="px-4 py-2 text-slate-500">لا توجد نتائج</div>
                      )}

                      {!loadingChildren && !fetchError && filteredChildren.map((child) => (
                        <button
                          key={child}
                          onClick={() => handleChildSelect(child)}
                          className="w-full text-right px-4 py-2 hover:bg-slate-50 transition-colors"
                        >
                          {child}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Timer and User Menu (Timer للمعلم فقط) */}
          <div className="flex items-center gap-4">
            {userRole === 'teacher' && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-slate-600" />
                <span className="timer-display text-sm">
                  {formatTime(sessionTimer.time)}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onTimerToggle}
                    className="h-6 w-6 p-0"
                  >
                    {sessionTimer.running ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onTimerReset}
                    className="h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{currentUser?.email || 'المعلمة سارة'}</p>
                  <p className="text-xs text-slate-600">معلمة أولى</p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                >
                  <div className="p-2">
                    <button
                      onClick={handleSettings}
                      className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-slate-50 rounded-md transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      الإعدادات
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-slate-50 rounded-md transition-colors text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;