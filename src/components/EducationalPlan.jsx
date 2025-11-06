// src/components/EducationalPlan.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import siteLogo from '../../public/site-logo.png'
import {
  BookOpen,
  Zap,
  User,
  Cake,
  Sparkles,
  ClipboardList,
  Target,
  Calendar,
  Accessibility,
  Home,
  Loader2,
  Download,
  Save,
  Mail,
  PlayCircle,
  BrainCircuit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// IMPORTANT: use named import for modern jspdf
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- (التعديل 1: إضافة teacherId إلى Props) ---
const EducationalPlan = ({ currentChild, onSaveToLog, userSchoolId, teacherId }) => {
  const [formData, setFormData] = useState({
    childName: '',
    age: '',
    gender: 'غير محدد',
    interests: '',
    level: 'مبتدئ',
    domain: 'مهارات الحياة',
    goal: '',
    duration: 'أسبوعان',
    constraints: '',
    environment: 'صف'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);
  const { toast } = useToast();

  const planRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ---------- helpers ----------
  const escapeHtml = (unsafe) => {
    const s = String(unsafe ?? '');
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const buildMockPlan = () => {
    const { level, duration, childName, goal, constraints } = formData;
    const levelAdjustments = {
      'مبتدئ': {
        assistance: "مساعدة جسدية كاملة ثم تلاشي إلى تلميح بصري",
        reinforcementSchedule: "مستمر (بعد كل خطوة ناجحة)",
        strategy: "النمذجة بالفيديو والتلقين الجسدي الكامل"
      },
      'متوسط': {
        assistance: "تلميحات بصرية أو لفظية فقط",
        reinforcementSchedule: "متقطع (بعد إكمال المهمة بنجاح)",
        strategy: "التلقين اللفظي والبصري مع التلاشي التدريجي"
      },
      'متقدم': {
        assistance: "تذكير لفظي عند الحاجة فقط",
        reinforcementSchedule: "تعزيز رمزي (نجمة) أو اجتماعي (مدح)",
        strategy: "سلسلة المهام الأمامية والتعلم ضمن البيئة الطبيعية"
      }
    };
    const cur = levelAdjustments[level] || levelAdjustments['مبتدئ'];

    return {
      source: 'mock',
      normalized: {
        smart_goal: `خلال ${duration}، سيقوم الطفل ${childName || ''} بإكمال 4 خطوات من مهمة "${goal}" باستقلالية بنسبة 80% عبر 3 جلسات متتالية، مع ${cur.assistance}.`,
        teaching_strategy: cur.strategy,
        task_analysis_steps: [
          "فتح صنبور الماء.",
          "تبليل اليدين بالماء.",
          "وضع الصابون على اليدين.",
          "فرك اليدين لمدة 10 ثوانٍ (باستخدام مؤقت بصري).",
          "شطف اليدين بالماء.",
          "تجفيف اليدين بالمنشفة."
        ],
        subgoals: [
          "الأسبوع 1: إتقان الخطوتين 1 و 2 (فتح الماء وتبليل اليدين) بنسبة 100% مع مساعدة متلاشية.",
          "الأسبوع 2: إضافة الخطوتين 3 و 4 (الصابون والفرك) ودمجها مع الخطوات السابقة."
        ],
        activities: [
          { type: "لعب حسي", name: "لعبة الفقاعات والصابون لزيادة التحفيز." },
          { type: "بطاقات مصورة", name: "استخدام بطاقات تسلسل الخطوات بجانب الحوض." },
          { type: "فيديو نموذجي", name: "مشاهدة فيديو قصير لطفل يغسل يديه قبل بدء النشاط." },
          { type: "أغنية", name: "غناء أغنية قصيرة مدتها 10 ثوانٍ أثناء فرك اليدين." }
        ],
        execution_plan: [
          "التهيئة (2 دقيقة): عرض جدول الأنشطة البصري، ثم مشاهدة الفيديو النموذجي للتحفيز.",
          "التنفيذ (5 دقائق): الانتقال إلى الحوض، واتباع تسلسل البطاقات المصورة خطوة بخطوة.",
          "التلقين والمساعدة: تقديم مساعدة جسدية كاملة في البداية، ثم تخفيفها تدريجياً.",
          "الاستجابة للخطأ: إعادة توجيه الطفل هدوءاً وتقديم تلميح جسدي.",
          "إنهاء النشاط: تقديم التعزيز الفوري (مثال: لعبة الفقاعات) مع مدح لفظي."
        ],
        reinforcement: { type: "معزز فوري (فقاعة صابون / ملصق نجمة)", schedule: cur.reinforcementSchedule },
        measurement: { type: "ورقة بيانات الدقة (Accuracy)", sheet: "تسجيل (+ للمستقل، P للمساعدة، - لغير المنجز) لكل خطوة في كل محاولة." },
        generalization_plan: [
          "التطبيق في بيئة مختلفة: حمام المنزل (بتدريب ولي الأمر).",
          "استخدام أدوات مختلفة: أنواع مختلفة من الصابون (سائل، صلب).",
          "مع أشخاص مختلفين: التطبيق مع معلم مساعد أو أحد أفراد الأسرة."
        ],
        accommodations: [
          "استخدام مؤقت بصري للعد.",
          "توفير منشفة ذات ملمس مفضل للطفل."
        ],
        suggestions: ['تقسيم النشاط لمراحل أقصر', 'تشجيع باستخدام مكافآت صغيرة'],
        customizations: ['خفض زمن النشاط إلى 7 دقائق', 'استخدام بطاقات بصرية خلال القراءة'],
        summary: 'الطفل استجاب جيداً للنمذجة، لكنه احتاج مساعدة جسدية في المرحلة الأولى.'
      }
    };
  };

  const extractNormalizedFromResponse = (json) => {
    if (!json) return null;
    const ai = json.ai;
    if (!ai) return null;
    if (ai.normalized) return { source: 'ai', aiRaw: ai.raw || null, normalized: ai.normalized };
    const possible = ai;
    if (possible.smart_goal || possible.task_analysis_steps || possible.summary) {
      return { source: 'ai', aiRaw: possible, normalized: possible };
    }
    return null;
  };

  const handleGeneratePlan = async () => {
    if (!formData.goal || formData.goal.trim() === '') {
      toast({ title: "حقل مطلوب", description: "يرجى إدخال الهدف العام للخطة.", className: "notification-warning" });
      return;
    }
    setIsGenerating(true);
    setGeneratedPlan(null);

    const noteText = [
      `الطفل: ${formData.childName || currentChild || 'غير محدد'}`,
      `العمر: ${formData.age || 'غير محدد'}`,
      `المجال: ${formData.domain}`,
      `المستوى: ${formData.level}`,
      `الهدف: ${formData.goal}`,
      `القيود: ${formData.constraints || 'لا توجد'}`,
      `البيئة: ${formData.environment}`
    ].join('\n');

    const endpoint = 'https://tebyan-backend.vercel.app/api/analyze';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const payload = {
        textNote: noteText,
        currentActivity: formData.domain,
        energyLevel: 3,
        tags: [],
        sessionDuration: 0,
        curriculumQuery: formData.goal
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.text().catch(() => null);
        throw new Error(`Server responded with ${res.status} ${errBody ? '- ' + errBody : ''}`);
      }

      const json = await res.json();
      const extracted = extractNormalizedFromResponse(json);

      if (extracted) {
        setGeneratedPlan(extracted);
        if (typeof onSaveToLog === 'function') {
          onSaveToLog({
            text: extracted.normalized.summary || extracted.normalized.smart_goal,
            hasAudio: false,
            activity: formData.domain,
            energy: 3,
            tags: [],
            audioBlob: null,
            type: 'analysis',
            generatedPlan: extracted
          });
        }
        toast({ title: "تم الحصول على نتيجة من الذكاء الاصطناعي ✅", description: "راجع الخطة ثم احفظ أو أرسلها لولي الأمر.", className: "notification-success" });
      } else {
        const fallback = buildMockPlan();
        setGeneratedPlan(fallback);
        toast({ title: "استجابة غير متوقعة", description: "تم استخدام خطة افتراضية مؤقتاً.", className: "notification-warning" });
      }
    } catch (err) {
      console.error('generatePlan error:', err);
      const fallback = buildMockPlan();
      setGeneratedPlan(fallback);
      if (typeof onSaveToLog === 'function') {
        onSaveToLog({
          text: fallback.normalized?.smart_goal || fallback.normalized?.summary,
          hasAudio: false,
          activity: formData.domain,
          energy: 3,
          tags: [],
          audioBlob: null,
          type: 'analysis',
          generatedPlan: fallback
        });
      }
      toast({ title: "فشل الاتصال", description: "تم إنشاء خطة افتراضية محلياً.", className: "notification-error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const sanitizeForFirestore = (obj) => {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return { note: 'unserializable' }; }
  };

  // --- (التعديل 2: دالة الحفظ المعدلة) ---
  const handleSaveSession = async () => {
    if (!generatedPlan) {
      toast({ title: 'لا توجد خطة للحفظ', description: 'توليد الخطة أولاً قبل الحفظ.', className: 'notification-warning' });
      return null;
    }

    // --- (التحقق من Props) ---
    if (!userSchoolId || !teacherId) {
      toast({
        title: "خطأ في الصلاحيات",
        description: "لا يمكن حفظ الجلسة بدون معرّف المدرسة والمعلمة.",
        className: "notification-error"
      });
      return null;
    }

    setIsSaving(true);
    try {
      const payload = {
        type: 'session_plan',
        child: currentChild || formData.childName || null,
        formData: sanitizeForFirestore(formData),
        generatedPlan: sanitizeForFirestore(generatedPlan),
        meta: { source: generatedPlan.source || 'local', savedAtLocal: new Date().toISOString() },
        createdAt: serverTimestamp(),
        schoolId: userSchoolId,  // <-- موجود
        teacherId: teacherId    // <-- هذا هو التعديل
      };

      const docRef = await addDoc(collection(db, 'sessions'), payload);
      setLastSavedId(docRef.id);

      if (typeof onSaveToLog === 'function') {
        onSaveToLog({ id: docRef.id, ...payload, status: 'saved' });
      }

      toast({ title: 'تم حفظ الجلسة ✅', description: `تم الحفظ (id: ${docRef.id}).`, className: 'notification-success' });
      return docRef.id;
    } catch (err) {
      console.error('handleSaveSession error:', err);
      toast({ title: 'فشل الحفظ', description: err.message || 'حدث خطأ أثناء الحفظ.', className: 'notification-error' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };
  // --- (نهاية التعديل 2) ---

  const findParentByChildName = async (childNameToFind) => {
    try {
      const q = query(collection(db, 'children'), where('childName', '==', childNameToFind));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const doc0 = snap.docs[0];
      return { id: doc0.id, ...doc0.data() };
    } catch (err) {
      console.error('findParentByChildName error:', err);
      return null;
    }
  };

  // whatsapp helpers (unchanged)
  const composeWhatsAppMessage = ({ childName, planObj, sessionId }) => {
    const norm = planObj.normalized || planObj;
    const name = childName || 'الطفل';
    const goal = norm.smart_goal || norm.summary || 'خطة تعليمية مخصصة';
    const topSuggestions = (norm.suggestions && norm.suggestions.slice(0, 3)) || (norm.subgoals && norm.subgoals.slice(0, 3)) || [];
    const suggestionsText = topSuggestions.length ? '\n\nاقتراحات سريعة:\n' + topSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : '';
    const linkText = sessionId ? `\n\nمعرّف الجلسة: ${sessionId} (افتحوا التطبيق لمزيد من التفاصيل)` : '';
    return `السلام عليكم، هذا ملخص خطة تعليمية لـ ${name}:\n\nالهدف الذكي (SMART):\n${goal}\n\nالاستراتيجية التعليمية:\n${norm.teaching_strategy || '-'}\n\nتحليل المهمة (خطوات):\n${(norm.task_analysis_steps || []).map((st, i) => `${i + 1}. ${st}`).join('\n')}\n${suggestionsText}${linkText}\n\nمن منصة تِبيان — لأي استفسار راسلونا.`;
  };

  const sanitizePhoneForWaMe = (raw) => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    return digits || null;
  };

  const openWhatsAppChat = (phoneDigits, message) => {
    if (!phoneDigits) throw new Error('رقم غير صالح');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phoneDigits}?text=${encoded}`;
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
  };

  const handleSendWhatsApp = async () => {
    if (!generatedPlan) {
      toast({ title: 'لا توجد خطة للإرسال', description: 'رجاءً طلبي توليد الخطة أولاً.', className: 'notification-warning' });
      return;
    }

    const lookupName = (currentChild && currentChild.trim()) || (formData.childName && formData.childName.trim());
    if (!lookupName) {
      toast({ title: 'اسم الطفل مفقود', description: 'يرجى إدخال اسم الطفل أو اختياره من القائمة قبل الإرسال.', className: 'notification-warning' });
      return;
    }

    toast({ title: 'جاري البحث عن ولي الأمر...', className: 'notification-info', duration: 2000 });
    const parentDoc = await findParentByChildName(lookupName);
    if (!parentDoc) {
      toast({ title: 'لم نعثر على ولي أمر', description: `لا توجد بيانات لاسم "${lookupName}" في قاعدة البيانات.`, className: 'notification-error', duration: 8000 });
      return;
    }

    const rawNumber = parentDoc.whatsappNumber || parentDoc.phoneNumber;
    const phoneDigits = sanitizePhoneForWaMe(rawNumber);
    if (!phoneDigits) {
      toast({ title: 'رقم ولي الأمر غير متاح', description: 'لا يوجد رقم صالح محفوظ لهذا الطفل.', className: 'notification-error' });
      return;
    }

    let sessionId = lastSavedId || null;
    if (!sessionId) {
      toast({ title: 'لم تُحفظ الجلسة بعد — سنحفظها الآن ثم نفتح واتساب...', className: 'notification-info' });
      sessionId = await handleSaveSession();
      if (!sessionId) {
        toast({ title: 'فشل حفظ الجلسة', description: 'الإرسال أوقف لأننا لم نستطع حفظ الجلسة.', className: 'notification-error' });
        return;
      }
    }

    const message = composeWhatsAppMessage({ childName: lookupName, planObj: generatedPlan, sessionId });

    try {
      openWhatsAppChat(phoneDigits, message);
      toast({ title: 'تم فتح دردشة واتساب', description: 'يرجى الضغط على "إرسال" لإيصال الرسالة لولي الأمر.', className: 'notification-success', duration: 8000 });
    } catch (err) {
      console.error('openWhatsAppChat error:', err);
      toast({ title: 'فشل فتح واتساب', description: err.message || 'تحقق من صحة الرقم أو إعدادات المتصفح.', className: 'notification-error' });
    }
  };

  const renderActivities = (acts = []) => {
    return acts.map((a, i) => {
      if (typeof a === 'string') return <li dir="rtl" key={i}>{a}</li>;
      const type = a.type || 'نشاط';
      const name = a.name || a.title || JSON.stringify(a);
      return <li dir="rtl" key={i}><b>{type}:</b> {name}</li>;
    });
  };

  const getNormalized = () => {
    if (!generatedPlan) return null;
    return generatedPlan.normalized || (generatedPlan.aiRaw && generatedPlan.aiRaw.normalized) || generatedPlan.aiRaw || generatedPlan;
  };

  const handleExportPdfWithJsPdf = async () => {
    if (!generatedPlan) {
      toast({ title: 'لا توجد خطة للتصدير', description: 'رجاءً توليد الخطة أولاً.', className: 'notification-warning' });
      return;
    }

    // إخفاء الأزرار فقط داخل الـ planRef (بدلاً من إخفاء كل أزرار الصفحة)
    const root = planRef.current;
    if (!root) return;
    const btns = root.querySelectorAll('button, a');
    btns.forEach(b => b.style.display = 'none');

    const oldDir = document.body.dir;
    document.body.dir = 'rtl'; // للتأكد أن html2canvas يلتقط RTL بشكل سليم

    try {
      // إعدادات html2canvas محسّنة: scale أعلى لدقة أفضل، background أبيض
      const canvas = await html2canvas(root, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: Math.max(document.documentElement.clientWidth, root.scrollWidth),
        scrollY: -window.scrollY // لتجنب تأثير الـ viewport عند الاسكرول
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // حساب أبعاد الصورة داخل صفحات الـ PDF (mm)
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.height / imgProps.width;
      const imgWidthInPdf = pdfWidth;
      const imgHeightInPdf = pdfWidth * imgRatio;

      // إضافة الصورة الصفحة الأولى ثم قطع للصفحات التالية إن طالت المحتوى
      let heightLeft = imgHeightInPdf;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
      heightLeft -= pdfHeight;

      while (heightLeft > -0.1) { // حلقة لإضافة صفحات إضافية
        position = heightLeft - imgHeightInPdf;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
        heightLeft -= pdfHeight;
      }

      // الآن نضيف footer / header (رقم الصفحة ومعلومات الختم) على كل صفحة
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        // footer: اسم النظام في اليسار (بـ mm)
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        // فقط رقم الصفحة بالإنجليزية (آمن)
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`Page ${i} / ${pageCount}`, pdfWidth / 2, pdfHeight - 8, { align: 'center' });
      }

      const filename = `plan_${(formData.childName || 'child').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
      pdf.save(filename);

      toast({ title: 'تم تنزيل الـ PDF', description: `تم حفظ الخطة كملف: ${filename}`, className: 'notification-success', duration: 6000 });
    } catch (err) {
      console.error('export PDF error', err);
      toast({ title: 'فشل إنشاء الـ PDF', description: 'حاول مرة أخرى أو اطلعي الكونسول للمزيد من التفاصيل.', className: 'notification-error' });
    } finally {
      document.body.dir = oldDir;
      btns.forEach(b => b.style.display = '');
    }
  };




  const handleAction = (action) => {
    if (action === 'save') return handleSaveSession();
    if (action === 'whatsapp') return handleSendWhatsApp();
    if (action === 'pdf') return handleExportPdfWithJsPdf();
    toast({ title: "🚧 هذه الميزة غير مُفعّلة بعد", description: "أستطيع أضيف وظائف إضافية عند الطلب.", className: "notification-warning" });
  };

  // ---------------------- UI ----------------------
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2"><BookOpen className="h-6 w-6" /><h2 className="text-2xl font-bold">إنشاء خطة تعليمية</h2></div>
        <p className="text-green-100">أدخل بيانات الطفل والهدف لتوليد خطة وأنشطة مخصصة</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">1. بيانات الخطة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><User size={14} />الاسم (اختياري)</label>
              <input type="text" name="childName" value={formData.childName} onChange={handleInputChange} placeholder="اسم الطفل" className="w-full p-2 border rounded-md input-focus" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Cake size={14} />العمر</label>
              <input type="number" name="age" value={formData.age} onChange={handleInputChange} placeholder="بالسنوات" className="w-full p-2 border rounded-md input-focus" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><ClipboardList size={14} />اختر مستوى الطفل</label>
              <select name="level" value={formData.level} onChange={handleInputChange} className="w-full p-2 border rounded-md input-focus">
                <option>مبتدئ</option>
                <option>متوسط</option>
                <option>متقدم</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Sparkles size={14} />اختر المجال</label>
              <select name="domain" value={formData.domain} onChange={handleInputChange} className="w-full p-2 border rounded-md input-focus">
                <option>مهارات الحياة</option>
                <option>التواصل/اللغة</option>
                <option>اللعب</option>
                <option>المهارات الأكاديمية المبكرة</option>
                <option>المهارات الحركية</option>
                <option>المهارات الاجتماعية</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Target size={14} />اكتب الهدف العام</label>
            <input type="text" name="goal" value={formData.goal} onChange={handleInputChange} placeholder="مثال: غسل اليدين، طلب الشيء" className="w-full p-2 border rounded-md input-focus" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Calendar size={14} />مدة الخطة</label>
              <select name="duration" value={formData.duration} onChange={handleInputChange} className="w-full p-2 border rounded-md input-focus">
                <option>أسبوعان</option>
                <option>شهر</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Home size={14} />بيئة التطبيق</label>
              <select name="environment" value={formData.environment} onChange={handleInputChange} className="w-full p-2 border rounded-md input-focus">
                <option>صف</option>
                <option>منزل</option>
                <option>مشترك</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Accessibility size={14} />قيود حسية/حركية (اختياري)</label>
            <input type="text" name="constraints" value={formData.constraints} onChange={handleInputChange} placeholder="مثال: حساسية أصوات، صعوبات حركية" className="w-full p-2 border rounded-md input-focus" />
          </div>

          <Button onClick={handleGeneratePlan} disabled={isGenerating} className="w-full btn-primary mt-4">
            {isGenerating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Zap className="h-4 w-4 ml-2" />}
            {isGenerating ? 'جاري التوليد...' : 'توليد خطة'}
          </Button>
        </motion.div>

        {/* Right: plan display */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">2. الخطة المقترحة</h3>
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
                <p className="text-slate-600">يقوم مساعد الذكاء الاصطناعي بإعداد الخطة...</p>
              </motion.div>
            )}

            {!isGenerating && !generatedPlan && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <BookOpen className="h-12 w-12 text-slate-300" />
                <p className="text-slate-500">ستظهر الخطة التعليمية هنا بعد توليدها.</p>
              </motion.div>
            )}

            {!isGenerating && generatedPlan && (() => {
              const norm = getNormalized();
              if (!norm) return (
                <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">تعذر الحصول على تفاصيل الخطة.</div>
              );

              // attach ref here so html2canvas captures exactly ما تريديه
              return (
                <motion.div key="plan" ref={planRef} dir="rtl" style={{ textAlign: 'right' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-sm bg-white p-4 rounded">
                  <div className="pdf-header flex items-center justify-between mb-4">
                    {/* ضعّي الشعار في public/images/logo.png */}
                    <img src={siteLogo} alt="تِبيان" style={{ height: 56, objectFit: 'contain' }} />
                    <div style={{ textAlign: 'right' }}>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>نظام تِبيان</h2>
                      <div style={{ fontSize: 12 }}>{formData.childName || currentChild || 'اسم الطفل: غير محدد'}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date().toLocaleDateString('ar-EG')}</div>
                    </div>
                  </div>
                  <PlanSection title="الهدف الذكي (SMART)" content={norm.smart_goal || '-'} />
                  <PlanSection title="الاستراتيجية التعليمية" icon={BrainCircuit} content={norm.teaching_strategy || '-'} />
                  <PlanSection title="تحليل المهمة" content={<ul className="list-disc pr-4">{(norm.task_analysis_steps || []).map((s, i) => <li dir="rtl" key={i}>{s}</li>)}</ul>} />
                  <PlanSection title="الأهداف الفرعية" content={<ul className="list-disc pr-4">{(norm.subgoals || []).map((s, i) => <li dir="rtl" key={i}>{s}</li>)}</ul>} />
                  <PlanSection title="الأنشطة المقترحة" content={<ul className="list-disc pr-4">{renderActivities(norm.activities || [])}</ul>} />
                  <PlanSection title="الخطة التنفيذية" icon={PlayCircle} content={<ul className="list-disc pr-4">{(norm.execution_plan || []).map((s, i) => <li dir="rtl" key={i}>{s}</li>)}</ul>} />
                  <PlanSection title="خطة التعزيز" content={<div><b>النوع:</b> {norm.reinforcement?.type || '-'}<br /><b>الجدول:</b> {norm.reinforcement?.schedule || '-'}</div>} />
                  <PlanSection title="قياس الأداء" content={<div><b>الطريقة:</b> {norm.measurement?.type || '-'}<br /><b>الأداة:</b> {norm.measurement?.sheet || '-'}</div>} />
                  <PlanSection title="خطة التعميم" content={<ul className="list-disc pr-4">{(norm.generalization_plan || []).map((p, i) => <li dir="rtl" key={i}>{p}</li>)}</ul>} />
                  <PlanSection title="التكييفات المقترحة" content={<ul className="list-disc pr-4">{(norm.accommodations || []).map((p, i) => <li dir="rtl" key={i}>{p}</li>)}</ul>} />

                  {generatedPlan.note && <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">{generatedPlan.note}</div>}

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button onClick={() => handleAction('pdf')} variant="outline" size="sm"><Download size={14} className="ml-1" />تحويل إلى PDF</Button>
                    <Button onClick={() => handleAction('save')} variant="outline" size="sm" disabled={isSaving || !generatedPlan}>
                      {isSaving ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جارٍ الحفظ...</>) : (<><Save size={14} className="ml-1" />حفظ الجلسة</>)}
                    </Button>
                    <Button onClick={() => handleAction('whatsapp')} variant="outline" size="sm"><Mail size={14} className="ml-1" />إرسال للأهل</Button>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

// استبدال التعريف القديم لـ PlanSection بهذا التعريف الجديد
const PlanSection = ({ title, content, icon: Icon }) => (
  <div className="plan-section"> {/* إضافة فئة مساعدة لو حبيت تضيف CSS خارجي */}
    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4" />}
      {title}
    </h4>
    <div className="text-slate-600 bg-slate-50 p-3 mt-2 rounded-md border border-slate-200 leading-relaxed">
      {content}
    </div>
  </div>
);


export default EducationalPlan;