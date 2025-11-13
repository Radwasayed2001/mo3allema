// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from './components/ui/toaster';
import { useToast } from './components/ui/use-toast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import EducationalPlan from './components/EducationalPlan';
import BehaviorPlan from './components/BehaviorPlan';
import FamilyReport from './components/FamilyReport';
import SessionLog from './components/SessionLog';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import AddChild from './components/AddChild';
import {
  BookOpen,
  ShieldCheck,
  Users,
  FileText,
  Clock,
  BarChart3,
  Settings as SettingsIcon,
  UserPlus,
  FolderKanban,
  Plus,
} from 'lucide-react';
import ChildrenManager from './components/ChildrenManager';
import { db } from './lib/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ViewSchools from './components/super_admin/ViewSchools';
import AddSchool from './components/super_admin/AddSchool';
import ViewSchoolAdmins from './components/super_admin/ViewSchoolAdmins';
import AddSchoolAdmin from './components/super_admin/AddSchoolAdmin';
import ViewTeachers from './components/school_admin/ViewTeachers';
import AddTeacher from './components/school_admin/AddTeacher';
import SuperAdminLogin from './components/SuperAdminLogin';
import SchoolAdminLogin from './components/SchoolAdminLogin';
import TeacherLogin from './components/TeacherLogin';

// ---------- helpers: deterministic id ----------
function slugifyForId(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 60);
}
function makeDeterministicId({ type = 'behavior_session', schoolId, teacherId, child, targetBehavior }) {
  const school = slugifyForId(schoolId || 'noschool');
  const teacher = slugifyForId(teacherId || 'noteacher');
  const childSlug = slugifyForId(child || 'nochild');
  const targetSlug = slugifyForId(targetBehavior || 'notarget');
  return `${type}_${school}_${teacher}_${childSlug}_${targetSlug}`;
}

function App() {
  const { currentUser, userRole, userSchoolId, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChild, setCurrentChild] = useState('');
  const [sessionTimer, setSessionTimer] = useState({ running: false, time: 0 });
  const [sessionData, setSessionData] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const { toast } = useToast();

  // open a session into BehaviorPlan
  const [openedSession, setOpenedSession] = useState(null);
  const [initialBehaviorStep, setInitialBehaviorStep] = useState(1);

  // load sessions from Firestore
  const loadSessionsFromFirebase = async () => {
    if (!userSchoolId || !currentUser) {
      setSessionData([]);
      return;
    }
    setIsLoadingSessions(true);
    try {
      const sessionsRef = collection(db, 'sessions');
      let q;
      if (userRole === 'teacher') {
        q = query(
          sessionsRef,
          where("schoolId", "==", userSchoolId),
          where("teacherId", "==", currentUser.uid),
          orderBy('createdAt', 'desc')
        );
      } else if (userRole === 'school_admin') {
        q = query(
          sessionsRef,
          where("schoolId", "==", userSchoolId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(sessionsRef, where("schoolId", "==", "INVALID_ID"));
      }

      const querySnapshot = await getDocs(q);
      const firebaseSessions = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const sessionItem = {
          id: docSnap.id,
          timestamp: data.createdAt?.toDate?.()?.toISOString() || data.meta?.savedAtLocal || new Date().toISOString(),
          child: data.child || 'غير محدد',
          text: data.type === 'behavior_checklist'
            ? `قائمة تحقق الخطة السلوكية - السلوك: ${data.formData?.targetBehavior || 'غير محدد'} - درجة الالتزام: ${data.checklist?.fidelityScore || 0}%`
            : data.generatedPlan?.summary || data.text || 'جلسة محفوظة',
          activity: data.formData?.behaviorContext || data.activity || 'نشاط عام',
          hasAudio: data.hasAudio || false,
          energy: (data.energy || (data.checklist && typeof data.checklist.fidelityScore === 'number') ? Math.round((data.energy || data.checklist.fidelityScore) / 20) : 3),
          tags: data.tags || (data.type === 'behavior_checklist' ? ['behavior', 'checklist'] : ['session']),
          type: data.type || 'session',
          status: data.status || 'applied',
          generatedPlan: data.generatedPlan,
          suggestions: data.suggestions || data.generatedPlan?.antecedent_strategies || [],
          customizations: data.customizations || data.generatedPlan?.consequence_strategies || [],
          checklist: data.checklist,
          formData: data.formData,
          meta: data.meta || {}
        };
        firebaseSessions.push(sessionItem);
      });

      setSessionData(firebaseSessions);
      if (firebaseSessions.length > 0) {
        toast({
          title: "تم تحميل الجلسات ✅",
          description: `تم تحميل ${firebaseSessions.length} جلسة`,
          className: "notification-success"
        });
      }
    } catch (error) {
      console.error('Error loading sessions from Firebase:', error);
      toast({
        title: "خطأ في تحميل الجلسات",
        description: error.message,
        className: "notification-warning",
        duration: 10000
      });
      setSessionData([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (currentUser && userSchoolId) {
      loadSessionsFromFirebase();
    }
  }, [currentUser, userSchoolId]);

  useEffect(() => {
    let interval;
    if (sessionTimer.running) {
      interval = setInterval(() => {
        setSessionTimer(prev => ({ ...prev, time: prev.time + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionTimer.running]);

  const handleTimerToggle = () => setSessionTimer(prev => ({ ...prev, running: !prev.running }));
  const handleTimerReset = () => setSessionTimer({ running: false, time: 0 });

  // -------------------------
  // handleSaveToLog (App-level)
  // IMPORTANT: by default this ONLY updates UI; it will only persist to Firestore
  // if the incoming noteData contains persist === true
  // -------------------------
  const handleSaveToLog = async (noteData) => {
    console.log('[handleSaveToLog] called by child', noteData);

    if (!currentUser || !userSchoolId) {
      toast({ title: "خطأ", description: "يجب تسجيل الدخول لحفظ الجلسات", variant: "destructive" });
      return;
    }

    const shouldPersist = !!noteData.persist;
    const stableIdPresent = noteData.id && !String(noteData.id).startsWith('local-');

    // determine stable id only if persisting; otherwise keep local id
    let chosenId = noteData.id || `local-${Date.now()}`;
    if (shouldPersist) {
      if (stableIdPresent) {
        chosenId = noteData.id;
        console.log('[handleSaveToLog] using provided stable id for persistence ->', chosenId);
      } else {
        const target = noteData.formData?.targetBehavior || noteData.child || (noteData.text || '').slice(0, 60) || 'notarget';
        chosenId = makeDeterministicId({
          type: noteData.type || 'session',
          schoolId: userSchoolId,
          teacherId: currentUser.uid,
          child: noteData.child || currentChild || 'nochild',
          targetBehavior: target
        });
        console.log('[handleSaveToLog] computed deterministic id for persistence ->', chosenId);
      }
    } else {
      console.log('[handleSaveToLog] not persisting, using local id ->', chosenId);
    }

    // local optimistic entry (id uses chosenId for persistable items)
    const localEntry = {
      id: chosenId,
      timestamp: noteData.timestamp || new Date().toISOString(),
      child: noteData.child || currentChild,
      ...noteData,
      status: noteData.status || (noteData.type === 'draft' ? 'draft' : 'pending'),
      schoolId: userSchoolId,
      teacherId: currentUser.uid,
    };

    // update UI: upsert (no immediate server write unless persist===true)
    setSessionData(prev => {
      if (prev.some(p => p.id === localEntry.id)) {
        console.log('[save-event] local-upsert -> update existing', localEntry.id);
        return prev.map(p => p.id === localEntry.id ? { ...p, ...localEntry } : p);
      }
      console.log('[save-event] local-upsert -> prepend', localEntry);
      return [localEntry, ...prev];
    });

    // if caller explicitly asked to persist to server, do upsert; otherwise return
    if (!shouldPersist) {
      console.log('[handleSaveToLog] persist flag not set -> skipping server persistence');
      toast({ title: "تم تحديث العرض المحلي", description: "لم يتم حفظ شيء على الخادم (حفظ محلي فقط).", className: "notification-success" });
      return;
    }

    // otherwise persist to Firestore using deterministic id (chosenId)
    try {
      const docRef = doc(db, 'sessions', chosenId);
      const payload = { ...noteData };
      // ensure server fields
      delete payload.id;
      payload.schoolId = userSchoolId;
      payload.teacherId = currentUser.uid;
      payload.createdAt = serverTimestamp();

      console.log('[handleSaveToLog] persisting to Firestore with id', chosenId, payload);
      await setDoc(docRef, payload, { merge: true });

      // reflect stable id in UI (already used chosenId)
      const persistedEntry = { ...localEntry, id: chosenId };
      setSessionData(prev => prev.some(p => p.id === chosenId) ? prev.map(p => p.id === chosenId ? { ...p, ...persistedEntry } : p) : [persistedEntry, ...prev]);

      toast({ title: "تم الحفظ في الخادم", description: `تم حفظ الملاحظة (id: ${chosenId}).`, className: "notification-success" });
      console.log('[handleSaveToLog] persist successful', chosenId);
    } catch (e) {
      console.error("Error persisting note to Firestore:", e);
      toast({ title: "خطأ مزامنة", description: "فشل حفظ الملاحظة في قاعدة البيانات", variant: "destructive" });
    }
  };

  // ---------- handleAnalysisComplete: ONLY local UI (no server persist) ----------
  const handleAnalysisComplete = async (results) => {
    console.log('[handleAnalysisComplete] results (LOCAL ONLY)', results);
    if (!currentUser || !userSchoolId) {
      toast({ title: "خطأ", description: "يجب تسجيل الدخول لحفظ الجلسات", variant: "destructive" });
      return;
    }

    const newEntry = {
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
      child: currentChild,
      ai: {
        suggestions: results.suggestions || [],
        customizations: results.customizations || [],
        summary: results.summary || ''
      },
      noteData: results.noteData || {},
      meta: results.meta || { source: 'NewNoteCard-Analyzed' },
      status: 'analyzed',
      schoolId: userSchoolId,
      teacherId: currentUser.uid,
      text: results.noteData?.text || results.summary || 'تحليل AI',
      activity: results.noteData?.activity || 'نشاط عام',
      tags: results.noteData?.tags || ['analysis'],
      hasAudio: results.noteData?.hasAudio || false
    };

    // local-only upsert
    setSessionData(prev => {
      if (prev.some(p => p.id === newEntry.id)) return prev.map(p => p.id === newEntry.id ? { ...p, ...newEntry } : p);
      return [newEntry, ...prev];
    });

    toast({ title: "تم تحليل الملاحظة (محليًا)", description: "التحليل أضيف إلى العرض المحلي. اضغط حفظ للحفظ على الخادم.", className: "notification-success" });
    console.log('[handleAnalysisComplete] finished local add. To persist call handleSaveToLog with { persist: true } from the child when user presses save.');
  };

  // Sidebar etc...
  let mainSidebarItems = [];
  let defaultSection = '';

  if (currentUser) {
    switch (userRole) {
      case 'teacher':
        defaultSection = 'educational-plan';
        mainSidebarItems = [
          { id: 'educational-plan', label: 'خطة تعليمية', icon: BookOpen },
          { id: 'behavior-plan', label: 'خطة سلوكية', icon: ShieldCheck },
          { id: 'family-report', label: 'تقرير للأسرة', icon: Users },
          { id: 'session-log', label: 'سجل الجلسات', icon: Clock },
          { id: 'dashboard', label: 'لوحة المتابعة', icon: BarChart3 },
          { id: 'all-children', label: 'إدارة الأطفال', icon: FolderKanban },
          { id: 'settings', label: 'الإعدادات', icon: SettingsIcon }
        ];
        break;
      case 'school_admin':
        defaultSection = 'view_teachers';
        mainSidebarItems = [
          { id: 'view_teachers', label: 'إدارة المعلمين', icon: Users },
          { id: 'add_teacher', label: 'إضافة معلم', icon: UserPlus },
          { id: 'all-children', label: 'إدارة الأطفال', icon: FolderKanban },
          { id: 'settings', label: 'إعدادات المدرسة', icon: SettingsIcon },
          { id: 'add-child', label: 'إضافة طفل', icon: UserPlus }
        ];
        break;
      case 'super_admin':
        defaultSection = 'view_schools';
        mainSidebarItems = [
          { id: 'view_schools', label: 'إدارة المدارس', icon: FolderKanban },
          { id: 'add_school', label: 'إضافة مدرسة', icon: Plus },
          { id: 'view_admins', label: 'إدارة المدراء', icon: Users },
          { id: 'add_admin', label: 'إضافة مدير مدرسة', icon: UserPlus },
          { id: 'settings', label: 'إعدادات النظام', icon: SettingsIcon }
        ];
        break;
      default:
        mainSidebarItems = [];
    }
  }

  // read next-section from localStorage (after a reload)
  useEffect(() => {
    try {
      const next = localStorage.getItem('tebyan_next_section');
      if (next) {
        setActiveSection(next);
        localStorage.removeItem('tebyan_next_section');
        console.log('[App] restored activeSection from localStorage:', next);
      }
    } catch (e) {
      console.warn('[App] could not read tebyan_next_section from localStorage', e);
    }
  }, []);


  useEffect(() => {
    if (defaultSection && activeSection === '') setActiveSection(defaultSection);
  }, [defaultSection, activeSection]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Spinner */}
      </div>
    );
  }
  if (!currentUser) {
    if (location.pathname === '/superadmin' || location.pathname === '/super-admin') {
      return <SuperAdminLogin />;
    }
    if (location.pathname === '/schooladmin' || location.pathname === '/school-admin') {
      return <SchoolAdminLogin />;
    }
    if (location.pathname === '/teacher' || location.pathname === '/teacher-login') {
      return <TeacherLogin />;
    }
    return <LoginPage />;
  }

  const handleOpenSession = (session, opts = {}) => {
    console.log('[handleOpenSession] session requested to open', { session, opts });
    setOpenedSession(session || null);
    setInitialBehaviorStep(opts && opts.openChecklist ? 4 : 1);
    setActiveSection('behavior-plan');
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'educational-plan':
        return (
          <EducationalPlan
            currentChild={currentChild}
            onSaveToLog={handleSaveToLog}
            userSchoolId={userSchoolId}
            teacherId={currentUser.uid}
          />
        );
      case 'behavior-plan':
        return (
          <BehaviorPlan
            currentChild={currentChild}
            onSaveToLog={handleSaveToLog}
            onAnalysisComplete={handleAnalysisComplete}
            sessionTimer={sessionTimer}
            userSchoolId={userSchoolId}
            teacherId={currentUser.uid}
            existingSession={openedSession}
            initialStep={initialBehaviorStep}
          />
        );
      case 'family-report':
        return <FamilyReport data={sessionData} currentChild={currentChild} />;
      case 'session-log':
        return (
          <SessionLog
            data={sessionData}
            onUpdateData={setSessionData}
            onReloadSessions={loadSessionsFromFirebase}
            isLoadingSessions={isLoadingSessions}
            onOpenSession={handleOpenSession}
          />
        );
      case 'dashboard':
        return <Dashboard data={sessionData} currentChild={currentChild} />;
      case 'add-child':
        return <AddChild userSchoolId={userSchoolId} teacherId={currentUser.uid} />;
      case 'all-children':
        if (userRole === 'teacher') return <ChildrenManager userSchoolId={userSchoolId} teacherId={currentUser.uid} />;
        if (userRole === 'school_admin') return <ChildrenManager userSchoolId={userSchoolId} teacherId={null} />;
        return <div>غير مصرح لك</div>;
      case 'view_teachers':
        return <ViewTeachers userSchoolId={userSchoolId} />;
      case 'add_teacher':
        return <AddTeacher userSchoolId={userSchoolId} />;
      case 'view_schools':
        return <ViewSchools />;
      case 'add_school':
        return <AddSchool />;
      case 'view_admins':
        return <ViewSchoolAdmins />;
      case 'add_admin':
        return <AddSchoolAdmin />;
      case 'settings':
        return <Settings />;
      default:
        return <div>يرجى اختيار قسم من القائمة...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        userRole={userRole}
        teacherId={userRole === 'teacher' ? currentUser.uid : null}
        currentChild={currentChild}
        onChildChange={setCurrentChild}
        sessionTimer={sessionTimer}
        onTimerToggle={handleTimerToggle}
        onTimerReset={handleTimerReset}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <Sidebar
            items={mainSidebarItems}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="order-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
