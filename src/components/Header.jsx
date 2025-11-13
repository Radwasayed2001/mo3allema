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
  Clock as ClockIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebaseConfig';
import Logo from '../../public/site-logo.png';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

/*
  Enhanced Header - UI/UX polish
  - soft rounded corners, subtle shadows
  - nicer hover states & transitions
  - fully responsive (mobile & desktop)
  - accessible (aria attrs, focus rings)
  - keeps existing functionality (children, profile, timer, menu)
*/

const Header = ({
  currentChild,
  onChildChange,
  sessionTimer,
  onTimerToggle,
  onTimerReset,
  onMenuToggle,
  userRole,
  teacherId
}) => {
  const { logout, currentUser } = useAuth();
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // profile & school
  const [profile, setProfile] = useState(null);
  const [schoolName, setSchoolName] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // mobile full-screen children panel
  const [showMobileChildrenPanel, setShowMobileChildrenPanel] = useState(false);

  const { toast } = useToast();

  // children listener (teacher only)
  useEffect(() => {
    if (userRole !== 'teacher' || !teacherId) {
      setChildren([]);
      setLoadingChildren(false);
      return;
    }

    setLoadingChildren(true);
    setFetchError(null);

    try {
      // *** Modified: read children from assessments.assessmentData.basicInfo instead of 'children' collection
      const q = query(
        collection(db, 'assessments'),
        where('assessmentData.basicInfo.teacherId', '==', teacherId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const items = snapshot.docs.map(d => {
            const data = d.data() || {};
            const name = (data.assessmentData && data.assessmentData.basicInfo && data.assessmentData.basicInfo.childName)
              ? String(data.assessmentData.basicInfo.childName).trim()
              : '';
            return { id: d.id, name };
          }).filter(i => i.name);

          // deduplicate by name (keep first occurrence) and sort by name
          const uniqueMap = new Map();
          for (const it of items) {
            if (!uniqueMap.has(it.name)) uniqueMap.set(it.name, it);
          }
          const unique = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

          setChildren(unique);
          setLoadingChildren(false);
        } catch (innerErr) {
          console.error('Error processing assessments snapshot:', innerErr);
          setFetchError('حدث خطأ أثناء معالجة قائمة الأطفال');
          setLoadingChildren(false);
        }
      }, (error) => {
        console.error('Error fetching children list from assessments:', error);
        setFetchError('حدث خطأ أثناء جلب قائمة الأطفال');
        setLoadingChildren(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error initializing listener for children (assessments):', err);
      setFetchError('حدث خطأ أثناء جلب قائمة الأطفال');
      setLoadingChildren(false);
    }
  }, [userRole, teacherId]);

  // load user profile (compat patterns)
  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      if (!currentUser || !currentUser.uid) {
        setProfile(null);
        setSchoolName(null);
        return;
      }

      setProfileLoading(true);
      try {
        const q = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
        const snap = await getDocs(q);

        if (!mounted) return;

        if (!snap.empty) {
          const doc0 = snap.docs[0];
          const data = doc0.data();
          setProfile({ id: doc0.id, ...data });
          const sId = data.schoolId || null;
          if (sId) {
            try {
              const schoolSnap = await getDoc(doc(db, 'schools', sId));
              if (!mounted) return;
              setSchoolName(schoolSnap.exists() ? (schoolSnap.data().name || null) : null);
            } catch (err) {
              console.error('Failed to fetch school doc:', err);
              setSchoolName(null);
            }
          } else {
            setSchoolName(null);
          }
        } else {
          // fallback: doc id === uid
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userDocRef);
            if (!mounted) return;
            if (userSnap.exists()) {
              const data = userSnap.data();
              setProfile({ id: userSnap.id, ...data });
              const sId = data.schoolId || null;
              if (sId) {
                try {
                  const schoolSnap = await getDoc(doc(db, 'schools', sId));
                  if (!mounted) return;
                  setSchoolName(schoolSnap.exists() ? (schoolSnap.data().name || null) : null);
                } catch (err) {
                  console.error('Failed to fetch school doc (fallback):', err);
                  setSchoolName(null);
                }
              } else {
                setSchoolName(null);
              }
            } else {
              setProfile(null);
              setSchoolName(null);
            }
          } catch (err) {
            console.error('Fallback getDoc error:', err);
            setProfile(null);
            setSchoolName(null);
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setProfile(null);
        setSchoolName(null);
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, [currentUser]);

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
    setShowMobileChildrenPanel(false);
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
    window.location.href = '/settings';
  };

  // small helper: initials (Arabic-safe)
  const makeInitials = (nameOrEmail) => {
    if (!nameOrEmail) return 'ت';
    const parts = String(nameOrEmail).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // role badge element (pill)
  const RoleBadge = ({ role, compact }) => {
    const base = "inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full";
    if (role === 'teacher') return <span className={`${base} bg-emerald-100 text-emerald-700`}>{compact ? 'معلمة' : 'معلمة'}</span>;
    if (role === 'school_admin') return <span className={`${base} bg-amber-100 text-amber-800`}>{compact ? 'أدمن' : 'أدمن مدرسة'}</span>;
    if (role === 'super_admin') return <span className={`${base} bg-sky-100 text-sky-700`}>{compact ? 'مشرف' : 'مشرف عام'}</span>;
    return <span className={`${base} bg-slate-100 text-slate-700`}>{role || 'مستخدم'}</span>;
  };

  // render user info (compact in header)
  const renderUserInfoBlock = () => {
    if (profileLoading) {
      return (
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-700">جاري التحميل...</p>
          <p className="text-xs text-slate-500">...</p>
        </div>
      );
    }

    if (userRole === 'super_admin') {
      return (
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-800">شركة تِبيان</p>
          <p className="text-xs text-slate-500 truncate">{profile?.email || currentUser?.email || ''}</p>
          <div className="mt-1"><RoleBadge role="super_admin" /></div>
        </div>
      );
    }

    if (userRole === 'school_admin') {
      const nameToShow = schoolName || (profile && profile.schoolId) || 'أدمن المدرسة';
      return (
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-800 truncate">{nameToShow}</p>
          <p className="text-xs text-slate-500 truncate" title={profile?.email || currentUser?.email || ''}>{profile?.email || currentUser?.email || ''}</p>
          <div className="mt-1"><RoleBadge role="school_admin" /></div>
        </div>
      );
    }

    if (userRole === 'teacher') {
      const teacherName = (profile && (profile.name || profile.displayName)) || currentUser?.displayName || currentUser?.email || 'المعلمة';
      const teacherEmail = profile?.email || currentUser?.email || '';
      return (
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-800 truncate">{teacherName}</p>
          <p className="text-xs text-slate-500 truncate" title={teacherEmail}>{teacherEmail}</p>
          <div className="mt-1"><RoleBadge role="teacher" /></div>
        </div>
      );
    }

    // default
    return (
      <div className="hidden sm:block text-right">
        <p className="text-sm font-medium text-slate-800 truncate">{profile?.name || currentUser?.email || 'مستخدم'}</p>
        <p className="text-xs text-slate-500">{userRole || ''}</p>
      </div>
    );
  };

  // motion variants for dropdowns
  const ddVariants = { hidden: { opacity: 0, y: -6 }, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 ">
          <div className="flex items-center justify-between gap-4 md:px-8">
            {/* 1) ACCOUNT on the LEFT */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuToggle}
                className="lg:hidden -ml-1 p-2 rounded-full hover:bg-slate-100 transition"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5 text-slate-700" />
              </Button>

              <a href="/" className="flex items-center gap-3 min-w-0" aria-label="العودة للصفحة الرئيسية">
                <div className="rounded-full w-16">
                  <img src={Logo}
                    alt="شعار تبيان" className="h-16 w-16 object-contain rounded-md" />
                </div>
                <div className="hidden sm:flex flex-col leading-tight min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">نظام تِبيان</div>
                  <div className="text-xs text-slate-500 truncate">منصة إدارة البرامج التعليمية</div>
                </div>
              </a>
            </div>

            {/* center: child selector (teacher) - hidden on xs */}
            {userRole === 'teacher' && (
              <div className="flex-1 max-w-md mx-4 relative hidden xs:block sm:block">
                <div className="relative">
                  <button
                    onClick={() => setShowChildDropdown(prev => !prev)}
                    className="w-full flex items-center justify-between gap-3 p-2 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-transform transform-gpu hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    aria-haspopup="listbox"
                    aria-expanded={showChildDropdown}
                  >
                    <div className="flex items-center gap-3 text-right truncate min-w-0">
                      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm flex-shrink-0">
                        {makeInitials(currentChild || profile?.name || profile?.displayName || '')}
                      </div>
                      <div className="text-sm text-slate-700 truncate min-w-0">
                        <div className="truncate">{currentChild || 'اختر الطفل'}</div>
                        <div className="text-xs text-slate-400">الجلسة الحالية</div>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>

                  {showChildDropdown && (
                    <motion.div
                      variants={ddVariants}
                      initial="hidden"
                      animate="enter"
                      exit="exit"
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      <div className="p-3">
                        <div className="relative">
                          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="ابحث عن الطفل..."
                            value={childSearch}
                            onChange={(e) => setChildSearch(e.target.value)}
                            className="w-full pr-10 pl-3 py-2 border border-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-100"
                            aria-label="بحث عن الطفل"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y">
                        {loadingChildren && <div className="px-4 py-3 text-slate-500">جاري التحميل...</div>}
                        {fetchError && <div className="px-4 py-3 text-red-600">{fetchError}</div>}
                        {!loadingChildren && !fetchError && filteredChildren.length === 0 && (
                          <div className="px-4 py-3 text-slate-500">لا توجد نتائج</div>
                        )}
                        {!loadingChildren && !fetchError && filteredChildren.map((child) => (
                          <button
                            key={child}
                            onClick={() => handleChildSelect(child)}
                            className="w-full text-right px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3 rounded-none"
                          >
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                              {makeInitials(child)}
                            </div>
                            <div className="text-sm text-slate-700 truncate">{child}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* right: timer (teacher) + user menu */}
            <div className="flex items-center gap-3  min-w-0">
              {/* mobile child picker button (xs) */}
              {userRole === 'teacher' && (
                <button
                  onClick={() => setShowMobileChildrenPanel(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
                  aria-label="اختر الطفل"
                >
                </button>
              )}

              {/* teacher timer compact UI */}
              {/* {userRole === 'teacher' && (
                <div className="hidden md:flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-3 py-2 shadow-sm">
                  <ClockIcon className="h-4 w-4 text-emerald-500" />
                  <div className="text-sm font-medium text-slate-700">{formatTime(sessionTimer.time)}</div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={onTimerToggle} aria-label={sessionTimer.running ? 'إيقاف المؤقت' : 'تشغيل المؤقت'}>
                      {sessionTimer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onTimerReset} aria-label="إعادة ضبط المؤقت">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )} */}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-3  rounded-2xl hover:bg-slate-50 focus:outline-none my-2 py-1 px-2 transition"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow">
                    <span className="text-sm font-semibold">{makeInitials(profile?.name || currentUser?.displayName || currentUser?.email)}</span>
                  </div>

                  {renderUserInfoBlock()}

                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {showUserMenu && (
                  <motion.div
                    variants={ddVariants}
                    initial="hidden"
                    animate="enter"
                    exit="exit"
                    className="absolute mt-[-5px] hover:bg-rose-50 top-full left-0 bg-white border border-slate-100 rounded-2xl shadow-lg z-50 overflow-hidden"
                  >
                    <div className="p-3">


                      <button onClick={async () => { await handleLogout(); }} className="w-full text-right px-3 py-2 rounded-lg  transition-colors flex items-center gap-2 text-rose-600">
                        <LogOut className="h-4 w-4" /> تسجيل الخروج
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile children panel (full-screen modal style) */}
      {showMobileChildrenPanel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowMobileChildrenPanel(false)} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative ml-auto w-full max-w-sm h-full bg-white border-l border-slate-100 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800">اختر الطفل</h3>
              <button onClick={() => setShowMobileChildrenPanel(false)} className="p-2 rounded-md hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن الطفل..."
                value={childSearch}
                onChange={(e) => setChildSearch(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-slate-100 rounded-lg focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="divide-y overflow-y-auto max-h-[70vh]">
              {loadingChildren && <div className="py-4 text-slate-500">جاري التحميل...</div>}
              {fetchError && <div className="py-4 text-red-600">{fetchError}</div>}
              {!loadingChildren && !fetchError && filteredChildren.length === 0 && (
                <div className="py-4 text-slate-500">لا توجد نتائج</div>
              )}
              {!loadingChildren && !fetchError && filteredChildren.map((child) => (
                <button
                  key={child}
                  onClick={() => handleChildSelect(child)}
                  className="w-full text-right px-3 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3 rounded-md"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                    {makeInitials(child)}
                  </div>
                  <div className="text-sm text-slate-700 truncate">{child}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default Header;
