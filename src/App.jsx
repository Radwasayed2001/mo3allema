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
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore'; // (أضفت where)
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ViewSchools from './components/super_admin/ViewSchools';
import AddSchool from './components/super_admin/AddSchool';
import ViewSchoolAdmins from './components/super_admin/ViewSchoolAdmins';
import AddSchoolAdmin from './components/super_admin/AddSchoolAdmin';
import ViewTeachers from './components/school_admin/ViewTeachers';
import AddTeacher from './components/school_admin/AddTeacher';


function App() {
  const { currentUser, userRole, userSchoolId, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentChild, setCurrentChild] = useState('');
  const [sessionTimer, setSessionTimer] = useState({ running: false, time: 0 });
  const [sessionData, setSessionData] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const { toast } = useToast();

  // تحميل البيانات من Firebase
  // (داخل App.jsx)
const loadSessionsFromFirebase = async () => {
  if (!userSchoolId || !currentUser) {
    setSessionData([]);
    return; // لا تحمل شيئًا إذا لم يتم تسجيل الدخول
  }
  
  setIsLoadingSessions(true);
  try {
    const sessionsRef = collection(db, 'sessions');
    let q;

    if (userRole === 'teacher') {
      // المعلمة: جلستها فقط
      q = query(
        sessionsRef,
        where("schoolId", "==", userSchoolId),
        where("teacherId", "==", currentUser.uid), // <-- هذا هو الفلتر الجديد
        orderBy('createdAt', 'desc')
      );
    } else if (userRole === 'school_admin') {
      // مدير المدرسة: كل جلسات المدرسة
      q = query(
        sessionsRef,
        where("schoolId", "==", userSchoolId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Super Admin: لا نعرض له جلسات
      q = query(sessionsRef, where("schoolId", "==", "INVALID_ID")); // لا تجلب شيئًا
    }

    const querySnapshot = await getDocs(q);
    
    const firebaseSessions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // (بقية الكود الداخلي لـ forEach كما هو)
      const sessionItem = {
        id: doc.id,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || data.meta?.savedAtLocal || new Date().toISOString(),
        child: data.child || 'غير محدد',
        text: data.type === 'behavior_checklist' 
          ? `قائمة تحقق الخطة السلوكية - السلوك: ${data.formData?.targetBehavior || 'غير محدد'} - درجة الالتزام: ${data.checklist?.fidelityScore || 0}%`
          : data.generatedPlan?.summary || data.text || 'جلسة محفوظة',
        activity: data.formData?.behaviorContext || data.activity || 'نشاط عام',
        hasAudio: data.hasAudio || false,
        energy: data.energy || data.checklist?.fidelityScore ? Math.round(data.checklist.fidelityScore / 20) : 3,
        tags: data.tags || (data.type === 'behavior_checklist' ? ['behavior', 'checklist'] : ['session']),
        type: data.type || 'session',
        status: data.status || 'applied',
        generatedPlan: data.generatedPlan,
        suggestions: data.suggestions || data.generatedPlan?.antecedent_strategies || [],
        customizations: data.customizations || data.generatedPlan?.consequence_strategies || [],
        checklist: data.checklist,
        formData: data.formData
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
      description: error.message, // (لعرض خطأ الفهرس إذا حدث)
      className: "notification-warning",
      duration: 10000 // مدة أطول لرؤية خطأ الفهرس
    });
    setSessionData([]);
  } finally {
    setIsLoadingSessions(false);
  }
};

  // أعد التحميل إذا تغير المستخدم (لتطبيق الفلاتر)
  useEffect(() => {
    if (currentUser && userSchoolId) {
      loadSessionsFromFirebase();
    }
  }, [currentUser, userSchoolId]); // (أزلنا الاعتماد على data)

  // (بقية useEffects كما هي)
  useEffect(() => {
    let interval;
    if (sessionTimer.running) {
      interval = setInterval(() => {
        setSessionTimer(prev => ({ ...prev, time: prev.time + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionTimer.running]);

  const handleTimerToggle = () => {
    setSessionTimer(prev => ({ ...prev, running: !prev.running }));
  };

  const handleTimerReset = () => {
    setSessionTimer({ running: false, time: 0 });
  };

  // (داخل App.jsx)
const handleSaveToLog = async (noteData) => {
  if (!currentUser || !userSchoolId) {
    toast({ title: "خطأ", description: "يجب تسجيل الدخول لحفظ الجلسات", variant: "destructive" });
    return;
  }

  const newEntry = {
    id: `local-${Date.now()}`, // ID مؤقت
    timestamp: new Date().toISOString(),
    child: currentChild,
    ...noteData,
    status: noteData.type === 'draft' ? 'draft' : 'pending',
    // (إضافة البيانات الرئيسية للحفظ)
    schoolId: userSchoolId,
    teacherId: currentUser.uid,
    createdAt: serverTimestamp(),
    meta: { source: 'NewNoteCard-Draft' }
  };

  // 1. تحديث الواجهة فورًا (للسرعة)
  setSessionData(prev => [newEntry, ...prev]);
  toast({
    title: "تم الحفظ! 📝",
    description: "تمت إضافة الملاحظة إلى سجل الجلسات",
    className: "notification-success"
  });

  // 2. الحفظ في الخلفية
  try {
    // (إزالة ID المؤقت قبل الإرسال)
    const { id, ...payload } = newEntry; 
    await addDoc(collection(db, 'sessions'), payload);
    // (يمكننا تحديث ID الحقيقي إذا أردنا، لكن onSnapshot سيتكفل بهذا عند إعادة التحميل)
  } catch (e) {
    console.error("Error saving draft to Firestore:", e);
    toast({ title: "خطأ مزامنة", description: "فشل حفظ المسودة في قاعدة البيانات", variant: "destructive" });
  }
};

 // (داخل App.jsx)
const handleAnalysisComplete = async (results) => {
  if (!currentUser || !userSchoolId) {
    toast({ title: "خطأ", description: "يجب تسجيل الدخول لحفظ الجلسات", variant: "destructive" });
    return;
  }

  const newEntry = {
    id: `local-${Date.now()}`, // ID مؤقت
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
    // (إضافة البيانات الرئيسية للحفظ)
    schoolId: userSchoolId,
    teacherId: currentUser.uid,
    createdAt: serverTimestamp(),
    // (إضافة بيانات قابلة للفلترة من noteData)
    text: results.noteData?.text || results.summary || 'تحليل AI',
    activity: results.noteData?.activity || 'نشاط عام',
    tags: results.noteData?.tags || ['analysis'],
    hasAudio: results.noteData?.hasAudio || false
  };

  // 1. تحديث الواجهة فورًا
  setSessionData(prev => [newEntry, ...prev]);
  toast({
    title: "تم تحليل الملاحظة ✅",
    description: "النتيجة أضيفت إلى السجل",
    className: "notification-success"
  });

  // 2. الحفظ في الخلفية
  try {
    const { id, audioBlob, ...payload } = newEntry; // (إزالة ID المؤقت و audioBlob)
    await addDoc(collection(db, 'sessions'), payload);
  } catch (e) {
    console.error("Error saving analysis to Firestore:", e);
    toast({ title: "خطأ مزامنة", description: "فشل حفظ التحليل في قاعدة البيانات", variant: "destructive" });
  }
};

  // (تم حذف دالة renderTeacherContent المكررة)

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
          { id: 'add-child', label: 'إضافة طفل', icon: UserPlus }, // <-- تم إرجاعه
          { id: 'all-children', label: 'إدارة الأطفال', icon: FolderKanban }, // <-- تم إرجاعه
          { id: 'settings', label: 'الإعدادات', icon: SettingsIcon }
        ];
        break;
      case 'school_admin':
        defaultSection = 'view_teachers';
        mainSidebarItems = [
          { id: 'view_teachers', label: 'إدارة المعلمين', icon: Users },
          { id: 'add_teacher', label: 'إضافة معلم', icon: UserPlus },
          { id: 'all-children', label: 'إدارة الأطفال', icon: FolderKanban },
          { id: 'settings', label: 'إعدادات المدرسة', icon: SettingsIcon }
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

  useEffect(() => {
    if (defaultSection && activeSection === '') {
      setActiveSection(defaultSection);
    }
  }, [defaultSection, activeSection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* (Spinner بسيط) */}
      </div>
    );
  }
  if (!currentUser) {
    return <LoginPage />;
  }

  // (داخل App.jsx)
const renderMainContent = () => {
  switch (activeSection) {
    // === مسارات المعلم (Teacher) ===
    case 'educational-plan':
      return (
        <EducationalPlan
          currentChild={currentChild}
          onSaveToLog={handleSaveToLog}
          userSchoolId={userSchoolId}
          teacherId={currentUser.uid} // <-- هذا هو التعديل
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
          teacherId={currentUser.uid} // <-- هذا هو التعديل
        />
      );
    // (بقية الحالات تبقى كما هي)
    case 'family-report':
      return <FamilyReport data={sessionData} currentChild={currentChild} />;
    case 'session-log':
      return (
        <SessionLog
          data={sessionData}
          onUpdateData={setSessionData}
          onReloadSessions={loadSessionsFromFirebase}
          isLoadingSessions={isLoadingSessions}
        />
      );
    case 'dashboard':
      return <Dashboard data={sessionData} currentChild={currentChild} />;
    case 'add-child':
      return <AddChild userSchoolId={userSchoolId} teacherId={currentUser.uid} />;
    case 'all-children':
      if (userRole === 'teacher') {
        return <ChildrenManager userSchoolId={userSchoolId} teacherId={currentUser.uid} />;
      }
      if (userRole === 'school_admin') {
        return <ChildrenManager userSchoolId={userSchoolId} teacherId={null} />;
      }
      return <div>غير مصرح لك</div>;

    // ... (بقية حالات school_admin و super_admin كما هي) ...
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
  // --- (نهاية دالة العرض) ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        userRole={userRole}
        teacherId={userRole === 'teacher' ? currentUser.uid : null} // <-- هذا هو التعديل
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