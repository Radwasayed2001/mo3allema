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
  getDocs,
  orderBy,
  limit,
  onSnapshot
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

  // -------------------------
  // Helpers for fetching assessments (client-side)
  // using onSnapshot wrapper to behave like a single-shot fetch (as requested)
  // -------------------------

  // helper: normalize Arabic name (trim, collapse spaces, remove tashkeel)
  const normalizeNameForSearch = (n) => {
    if (!n) return '';
    const removeDiacritics = (s) =>
      s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
    return removeDiacritics(String(n).trim()).replace(/\s+/g, ' ');
  };

  // helper: recursively serialize Firestore values (Timestamp -> ISO)
  const serializeFirestoreData = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj.toDate === 'function') {
      try { return obj.toDate().toISOString(); } catch (e) { return String(obj); }
    }
    if (Array.isArray(obj)) return obj.map(serializeFirestoreData);
    if (typeof obj === 'object') {
      const out = {};
      for (const k of Object.keys(obj)) {
        try { out[k] = serializeFirestoreData(obj[k]); } catch (e) { out[k] = String(obj[k]); }
      }
      return out;
    }
    return obj;
  };

  // tiny wrapper: run onSnapshot once and resolve with first snapshot (or null)
  const snapshotOnce = (q) => {
    return new Promise((resolve) => {
      let unsub = () => { };
      try {
        unsub = onSnapshot(q, (snap) => {
          unsub();
          if (!snap.empty) resolve(snap);
          else resolve(null);
        }, (err) => {
          unsub();
          console.warn('snapshotOnce error', err);
          resolve(null);
        });
      } catch (e) {
        try { unsub(); } catch { }
        console.warn('snapshotOnce threw', e);
        resolve(null);
      }
    });
  };

  // improved client-side fetch by name with multiple fallbacks
  const fetchAssessmentByChildNameClient = async (childNameToFind) => {
    if (!childNameToFind || !String(childNameToFind).trim()) return null;
    const raw = String(childNameToFind);
    const nameTry = normalizeNameForSearch(raw);

    try {
      const col = collection(db, 'assessments');

      // 1) try exact match on stored field (raw)
      try {
        const q1 = query(col, where('assessmentData.basicInfo.childName', '==', raw), limit(1));
        const snap1 = await snapshotOnce(q1);
        if (snap1 && !snap1.empty) {
          const d = snap1.docs[0];
          return { id: d.id, data: serializeFirestoreData(d.data()) };
        }
      } catch (e) { /* ignore */ }

      // 2) try normalized exact
      try {
        const q2 = query(col, where('assessmentData.basicInfo.childName', '==', nameTry), limit(1));
        const snap2 = await snapshotOnce(q2);
        if (snap2 && !snap2.empty) {
          const d = snap2.docs[0];
          return { id: d.id, data: serializeFirestoreData(d.data()) };
        }
      } catch (e) { /* ignore */ }

      // 3) prefix search (range)
      try {
        const start = nameTry;
        const end = nameTry + '\uf8ff';
        const q3 = query(col, where('assessmentData.basicInfo.childName', '>=', start), where('assessmentData.basicInfo.childName', '<=', end), limit(3));
        const snap3 = await snapshotOnce(q3);
        if (snap3 && !snap3.empty) {
          const d = snap3.docs[0];
          return { id: d.id, data: serializeFirestoreData(d.data()) };
        }
      } catch (e) { /* ignore */ }

      // 4) small batch and client-side normalized compare
      try {
        const q4 = query(col, limit(20));
        const snap4 = await snapshotOnce(q4);
        if (snap4 && !snap4.empty) {
          for (const d of snap4.docs) {
            const data = d.data();
            const stored = (data?.assessmentData?.basicInfo?.childName) || data?.childName || '';
            if (normalizeNameForSearch(stored) === nameTry) {
              return { id: d.id, data: serializeFirestoreData(data) };
            }
          }
        }
      } catch (e) { /* ignore */ }

      // 5) fallback to 'children' collection
      try {
        const childrenCol = collection(db, 'children');
        const q5 = query(childrenCol, where('name', '==', raw), limit(1));
        const snap5 = await snapshotOnce(q5);
        if (snap5 && !snap5.empty) {
          const d = snap5.docs[0];
          return { id: d.id, data: serializeFirestoreData(d.data()) };
        }
      } catch (e) { /* ignore */ }

      return null;
    } catch (err) {
      console.error('fetchAssessmentByChildNameClient final error:', err);
      return null;
    }
  };

  // improved findParentByChildName that uses assessment fallback and returns parent phone fields
  const findParentByChildName = async (childNameToFind) => {
    try {
      const assessmentDoc = await fetchAssessmentByChildNameClient(childNameToFind);
      if (assessmentDoc && assessmentDoc.data) {
        // try to find phone fields inside assessmentData.basicInfo
        const basic = assessmentDoc.data?.assessmentData?.basicInfo || assessmentDoc.data?.basicInfo || assessmentDoc.data || {};
        // normalize keys (some docs may have 'parentPhone' or 'whatsappNumber' etc)
        const phone = basic.whatsappNumber || basic.phoneNumber || basic.parentPhone || basic.contactPhone || null;
        return { source: 'assessments', id: assessmentDoc.id, basic, phone };
      }

      // fallback to children collection then
      try {
        const col = collection(db, 'children');
        const q = query(col, where('name', '==', childNameToFind), limit(1));
        const snap = await snapshotOnce(q);
        if (snap && !snap.empty) {
          const d = snap.docs[0];
          const data = serializeFirestoreData(d.data());
          const phone = data.whatsappNumber || data.phoneNumber || data.parentPhone || null;
          return { source: 'children', id: d.id, basic: data, phone };
        }
      } catch (e) { /* ignore */ }

      return null;
    } catch (err) {
      console.error('findParentByChildName error (improved):', err);
      return null;
    }
  };

  // ==== stringify helpers (unchanged) ====
  const stringifyItem = (it) => {
    if (it === null || it === undefined) return '';
    if (typeof it === 'string') return it.trim();
    if (typeof it === 'number') return String(it);

    if (typeof it === 'object') {
      if (typeof it.text === 'string' && it.text.trim()) {
        const base = it.text.trim();
        if (it.rationale && typeof it.rationale === 'string' && it.rationale.trim()) {
          return `${base} — ${it.rationale.trim()}`;
        }
        return base;
      }
      if (typeof it.name === 'string' && it.name.trim()) {
        const base = it.name.trim();
        if (it.type && typeof it.type === 'string') return `${it.type}: ${base}`;
        return base;
      }
      if (typeof it.title === 'string' && it.title.trim()) return it.title.trim();
      if (typeof it.label === 'string' && it.label.trim()) return it.label.trim();

      try {
        const j = JSON.stringify(it);
        return j.length > 160 ? j.slice(0, 160) + '...' : j;
      } catch (e) {
        return String(it);
      }
    }
    return String(it);
  };

  const formatArray = (arr = [], { numbered = true, max = 20 } = {}) => {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    const items = arr.slice(0, max).map((x, i) => {
      const text = stringifyItem(x).replace(/\s+/g, ' ').trim();
      if (!text) return null;
      return numbered ? `${i + 1}. ${text}` : `- ${text}`;
    }).filter(Boolean);
    return items.join('\n\n');
  };

  const tidy = (s) => (s || '').replace(/\n{3,}/g, '\n\n').trim();

  const composeWhatsAppMessage = ({ childName, planObj, sessionId }) => {
    const norm = (planObj && (planObj.normalized || planObj)) || {};
    const name = childName || 'الطفل';

    const smartGoal = stringifyItem(norm.smart_goal || norm.summary || '-');
    const teachingStrategy = stringifyItem(norm.teaching_strategy || '-');

    let taskAnalysis = '';
    if (Array.isArray(norm.task_analysis_steps) && norm.task_analysis_steps.length) {
      taskAnalysis = formatArray(norm.task_analysis_steps, { numbered: true, max: 30 });
    } else if (typeof norm.task_analysis_steps === 'string' && norm.task_analysis_steps.trim()) {
      taskAnalysis = norm.task_analysis_steps
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n\n');
    }

    const subgoals = formatArray(norm.subgoals || [], { numbered: true, max: 12 });
    let activitiesText = '';
    if (Array.isArray(norm.activities) && norm.activities.length) {
      activitiesText = formatArray(norm.activities.map(a => {
        if (!a) return '';
        if (typeof a === 'string') return a;
        if (typeof a === 'object') {
          const type = a.type || a.category || '';
          const nameAct = a.name || a.title || a.label || '';
          if (type && nameAct) return `${type}: ${nameAct}`;
          return a.name || a.title || a.label || stringifyItem(a);
        }
        return String(a);
      }), { numbered: false, max: 20 });
    }

    const executionPlan = formatArray(norm.execution_plan || [], { numbered: true, max: 20 });

    const reinforcementType = stringifyItem(norm.reinforcement?.type || '-');
    const reinforcementSchedule = stringifyItem(norm.reinforcement?.schedule || '-');

    const measurementType = stringifyItem(norm.measurement?.type || '-');
    const measurementSheet = stringifyItem(norm.measurement?.sheet || '-');

    const generalization = formatArray(norm.generalization_plan || [], { numbered: true, max: 12 });
    const accommodations = formatArray(norm.accommodations || [], { numbered: true, max: 12 });

    const suggestions = formatArray(norm.suggestions || norm.customizations || [], { numbered: true, max: 8 });

    const sessionLinkPart = sessionId ? `\n\nمعرّف الجلسة: ${sessionId} (افتحوا التطبيق لمزيد من التفاصيل)` : '';

    const parts = [
      `السلام عليكم، هذا ملخص خطة تعليمية لـ *${name}*:`,

      `\n*الهدف الذكي (SMART):*\n\n${smartGoal}`,

      `\n*الاستراتيجية التعليمية:*\n\n${teachingStrategy}`,

      taskAnalysis ? `\n*تحليل المهمة (خطوات):*\n\n${taskAnalysis}` : '',

      subgoals ? `\n*الأهداف الفرعية:*\n\n${subgoals}` : '',

      activitiesText ? `\n*الأنشطة المقترحة:*\n\n${activitiesText}` : '',

      executionPlan ? `\n*الخطة التنفيذية:*\n\n${executionPlan}` : '',

      `\n*خطة التعزيز:*\n\n- النوع: ${reinforcementType}\n\n- الجدول: ${reinforcementSchedule}`,

      `\n*قياس الأداء:*\n\n- الطريقة: ${measurementType}\n\n- الأداة: ${measurementSheet}`,

      generalization ? `\n*خطة التعميم:*\n\n${generalization}` : '',

      accommodations ? `\n*التكييفات المقترحة:*\n\n${accommodations}` : '',

      suggestions ? `\n*اقتراحات سريعة:*\n\n${suggestions}` : '',

      sessionLinkPart,

      `\nمن منصة تِبيان — لأي استفسار راسلونا`
    ];

    const message = tidy(parts.filter(Boolean).join('\n\n'));
    return message;
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

  // ========== التغيير الرئيسي: نرسل childName + assessment/report data إلى الـ backend ==========
  const handleGeneratePlan = async () => {
    const lookupName = (formData.childName && formData.childName.trim()) || (currentChild && currentChild.trim());
    if (!lookupName) {
      toast({ title: "اسم الطفل مطلوب", description: "لأن التحليل يعتمد على اسم الطفل فقط — يرجى إدخال اسم الطفل أو اختياره.", className: "notification-warning" });
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);

    // Attempt to fetch assessment/report data from Firestore to include in request
    toast({ title: 'جاري جلب بيانات الاستبيان/التقرير (إن وُجد)...', className: 'notification-info', duration: 2000 });
    let assessmentDoc = null;
    try {
      assessmentDoc = await fetchAssessmentByChildNameClient(lookupName);
      if (assessmentDoc) {
        console.log('[EducationalPlan] found assessmentDoc:', assessmentDoc);
        toast({ title: 'تم العثور على استبيان', description: `id: ${assessmentDoc.id}`, className: 'notification-success', duration: 2000 });
      } else {
        toast({ title: 'لا توجد استبيانات محفوظة لهذا الاسم', className: 'notification-warning', duration: 2000 });
      }
    } catch (e) {
      console.warn('handleGeneratePlan: error fetching assessment', e);
    }

    const endpoint = 'http://localhost:3001/api/analyze';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // build payload AFTER fetching assessment (prevents payload undefined bug)
      const payload = {
        childName: lookupName,
        currentActivity: formData.domain,
        curriculumQuery: formData.goal,
        analysisType: 'general',
        planRequestMeta: {
          formData,
          requestedByTeacherId: teacherId || null,
          requestedBySchoolId: userSchoolId || null,
          localTimestamp: new Date().toISOString()
        }
      };

      if (assessmentDoc) {
        payload.assessmentDoc = assessmentDoc; // { id, data }
        payload.assessmentData = assessmentDoc.data.assessmentData || assessmentDoc.data || null;
        payload.assessmentReport = assessmentDoc.data.report || assessmentDoc.data.familyReport || null;
      }

      console.debug('[EducationalPlan] sending payload to analyze endpoint', {
        hasAssessment: !!assessmentDoc,
        childName: payload.childName,
        meta: payload.planRequestMeta
      });

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
  // ========== نهاية التعديل الرئيسي ==========

  const sanitizeForFirestore = (obj) => {
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return { note: 'unserializable' }; }
  };

  const handleSaveSession = async () => {
    if (!generatedPlan) {
      toast({ title: 'لا توجد خطة للحفظ', description: 'توليد الخطة أولاً قبل الحفظ.', className: 'notification-warning' });
      return null;
    }

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
        schoolId: userSchoolId,
        teacherId: teacherId
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

    // parentDoc may be { source, id, basic, phone }
    const rawNumber = parentDoc.phone || parentDoc.basic?.whatsappNumber || parentDoc.basic?.phoneNumber || parentDoc.basic?.parentPhone || null;
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

    const root = planRef.current;
    if (!root) return;
    const btns = root.querySelectorAll('button, a');
    btns.forEach(b => b.style.display = 'none');

    const oldDir = document.body.dir;
    document.body.dir = 'rtl';

    try {
      const canvas = await html2canvas(root, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: Math.max(document.documentElement.clientWidth, root.scrollWidth),
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.height / imgProps.width;
      const imgWidthInPdf = pdfWidth;
      const imgHeightInPdf = pdfWidth * imgRatio;

      let heightLeft = imgHeightInPdf;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
      heightLeft -= pdfHeight;

      while (heightLeft > -0.1) {
        position = heightLeft - imgHeightInPdf;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidthInPdf, imgHeightInPdf);
        heightLeft -= pdfHeight;
      }

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
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

              return (
                <motion.div key="plan" ref={planRef} dir="rtl" style={{ textAlign: 'right' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-sm bg-white p-4 rounded">
                  <div className="pdf-header flex items-center justify-between mb-4">
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

// PlanSection definition
const PlanSection = ({ title, content, icon: Icon }) => (
  <div className="plan-section">
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
