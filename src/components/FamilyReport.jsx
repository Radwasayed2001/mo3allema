// FamilyReport.jsx (updated — incorporate assessment details into AI payload + report)
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, FileText, Download, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast, { Toaster } from 'react-hot-toast';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const performanceMetrics = {
  independence: { label: 'الاستقلالية', options: ['يعتمد كليًا', 'مساعدة جزئية', 'بمفرده'], icon: '🙂' },
  attention: { label: 'الانتباه والتركيز', options: ['ضعيف', 'متوسط', 'ممتاز'], icon: '🎯' },
  participation: { label: 'المشاركة', options: ['متردد', 'عند الطلب', 'يبادر'], icon: '🙋' },
  behaviors: { label: 'السلوكيات', options: ['كثيرة معيقة', 'بعض غير المرغوب', 'مناسبة'], icon: '👍' },
  communication: { label: 'التواصل', options: ['ضعيف', 'كلمات قليلة/إشارات', 'لفظي جيد'], icon: '🗣️' },
  motivation: { label: 'الدافعية', options: ['ضعيف', 'متذبذب', 'حماس'], icon: '🔥' },
  flexibility: { label: 'المرونة', options: ['يرفض', 'يحتاج تهيئة', 'يتقبل بسهولة'], icon: '🔄' },
  social: { label: 'المهارات الاجتماعية', options: ['يرفض', 'محدود', 'تواصل إيجابي'], icon: '🤝' },
  skill_mastery: { label: 'مدى اكتساب المهارات', options: ['لم يحقق', 'تقدم جزئي', 'أتقن'], icon: '🏅' },
  overall_progress: { label: 'مستوى التقدم العام', options: ['يحتاج دعم إضافي', 'بسيط', 'ملحوظ'], icon: '📈' },
};

const FamilyReport = ({ data, currentChild }) => {
  const [formData, setFormData] = useState({
    period: 'أسبوع',
    targets: '',
    ratings: Object.keys(performanceMetrics).reduce((acc, key) => ({ ...acc, [key]: performanceMetrics[key].options[1] }), {}),
    notes: '',
    home_activities: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const reportRef = useRef(null);

  // helper to show toast consistent with previous `className` usage
  const showToast = ({ title = '', description = '', className = '', duration = 4000 }) => {
    const message = description ? `${title}\n${description}` : title || description || '';
    const lower = String(className || '').toLowerCase();
    const opts = { duration };

    if (lower.includes('success')) {
      toast.success(message, opts);
    } else if (lower.includes('error') || lower.includes('destructive')) {
      toast.error(message, opts);
    } else if (lower.includes('warning')) {
      toast(message, { ...opts });
    } else if (lower.includes('info')) {
      toast(message, { ...opts });
    } else {
      // default neutral toast
      toast(message, opts);
    }
  };

  // Resolve endpoint
  const resolvedEndpoint = (() => {
    const e1 = import.meta.env.VITE_ANALYZE_URL;
    if (e1) return e1;
    const e2 = import.meta.env.VITE_API_BASE_URL;
    if (e2) return `${e2.replace(/\/$/, '')}/api/analyze`;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'https://tebyan-backend.vercel.app/api/analyze';
    }
    return '/api/analyze';
  })();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (metric, value) => {
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [metric]: value },
    }));
  };

  const buildNoteText = () => {
    return [
      `Child: ${currentChild || 'غير محدد'}`,
      `Period: ${formData.period}`,
      `Targets: ${formData.targets}`,
      `Teacher notes: ${formData.notes}`,
      `Home activities: ${formData.home_activities}`,
      'Ratings:',
      ...Object.entries(formData.ratings).map(([k, v]) => `${performanceMetrics[k]?.label || k}: ${v}`)
    ].join('\n');
  };

  const mapAiRatingsToKeys = (aiRatings = {}) => {
    const mapped = { ...formData.ratings };
    Object.keys(mapped).forEach(key => {
      if (aiRatings[key] && typeof aiRatings[key] === 'string') mapped[key] = aiRatings[key];
      if (aiRatings[key.toLowerCase()] && typeof aiRatings[key.toLowerCase()] === 'string') mapped[key] = aiRatings[key.toLowerCase()];
    });
    Object.entries(aiRatings).forEach(([k, v]) => {
      if (typeof v !== 'string') return;
      const found = Object.keys(performanceMetrics).find(pk => performanceMetrics[pk].label === k || pk === k || pk.toLowerCase() === k.toLowerCase());
      if (found) mapped[found] = v;
    });
    return mapped;
  };

  // helper: convert an item (string | object) to a readable string
  const itemToString = (item) => {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'number' || typeof item === 'boolean') return String(item);
    if (Array.isArray(item)) return item.map(itemToString).join(' · ');
    if (typeof item === 'object') {
      if (item.name && item.type) return `${item.type}: ${item.name}`;
      if (item.name) return item.name;
      if (item.title) return item.title;
      try {
        return Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).slice(0, 5).join(' · ');
      } catch {
        return JSON.stringify(item);
      }
    }
    return String(item);
  };

  // -----------------------------
  // Assessment helpers
  // -----------------------------
  const findAssessmentByChildName = async (childNameToFind) => {
    try {
      const coll = collection(db, 'assessments');
      let q = query(coll, where('assessmentData.basicInfo.childName', '==', childNameToFind));
      let snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

      const fallbacks = [
        'assessmentData.basicInfo.name',
        'assessmentData.basicInfo.child',
        'assessmentData.basicInfo.studentName',
        'childName',
        'basicInfo.childName',
        'assessmentData.childName'
      ];

      for (const path of fallbacks) {
        q = query(coll, where(path, '==', childNameToFind));
        snap = await getDocs(q);
        if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      return null;
    } catch (err) {
      console.error('findAssessmentByChildName error:', err);
      return null;
    }
  };

  // safely read nested path
  const readPath = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, p) => (acc && Object.prototype.hasOwnProperty.call(acc, p) ? acc[p] : undefined), obj);
  };

  // extract phone
  const extractPhoneRawFromAssessment = (assessmentDoc) => {
    if (!assessmentDoc) return null;
    const candidatePaths = [
      'assessmentData.basicInfo.parent.whatsappNumber',
      'assessmentData.basicInfo.parent.whatsapp',
      'assessmentData.basicInfo.parentContact.whatsappNumber',
      'assessmentData.basicInfo.parentContact.phone',
      'assessmentData.basicInfo.whatsappNumber',
      'assessmentData.basicInfo.phoneNumber',
      'assessmentData.contact.whatsappNumber',
      'assessmentData.contact.phoneNumber',
      'parent.whatsappNumber',
      'parent.phoneNumber',
      'whatsappNumber',
      'phoneNumber',
    ];

    for (const p of candidatePaths) {
      const v = readPath(assessmentDoc, p);
      if (v) return v;
    }

    if (assessmentDoc.whatsappNumber) return assessmentDoc.whatsappNumber;
    if (assessmentDoc.phoneNumber) return assessmentDoc.phoneNumber;

    return null;
  };

  // extract a summarized assessment snapshot (fields useful for AI)
  const extractAssessmentSnapshot = (assessmentDoc) => {
    if (!assessmentDoc) return null;
    const basic = readPath(assessmentDoc, 'assessmentData.basicInfo') || {};
    const diagnosis = readPath(assessmentDoc, 'assessmentData.diagnosis') || readPath(assessmentDoc, 'diagnosis') || null;
    const initialRatings = readPath(assessmentDoc, 'assessmentData.initialRatings') || readPath(assessmentDoc, 'initialRatings') || {};
    const goals = readPath(assessmentDoc, 'assessmentData.goals') || readPath(assessmentDoc, 'goals') || null;
    const notes = readPath(assessmentDoc, 'assessmentData.notes') || assessmentDoc.notes || null;
    const recentSessions = readPath(assessmentDoc, 'assessmentData.recentSessions') || readPath(assessmentDoc, 'recentSessions') || null;

    // normalize ratings to keys we expect when possible
    const normalizedRatings = {};
    Object.keys(initialRatings || {}).forEach(k => {
      const keyLower = k.toLowerCase().replace(/\s+/g, '_');
      if (performanceMetrics[keyLower]) {
        normalizedRatings[keyLower] = initialRatings[k];
      } else {
        // try matching by label
        const found = Object.keys(performanceMetrics).find(pk => performanceMetrics[pk].label === k || pk === k);
        if (found) normalizedRatings[found] = initialRatings[k];
      }
    });

    return {
      basicInfo: basic,
      diagnosis,
      initialRatings: normalizedRatings,
      goals,
      notes,
      recentSessions
    };
  };

  // -----------------------------
  // phone utilities / WA helper
  // -----------------------------
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

  // -----------------------------
  // compose message (now includes a short assessment summary if available)
  // -----------------------------
  const composeFamilyReportMessage = ({ childName, reportObj, assessmentSnapshot = null }) => {
    const name = childName || 'الطفل';
    const period = reportObj.period || 'الفترة الحالية';
    const date = new Date(reportObj.generatedAt || Date.now()).toLocaleDateString('ar-SA');

    const ratingsText = Object.entries(reportObj.ratings || {})
      .map(([key, value]) => {
        const label = performanceMetrics[key]?.label || key;
        return `• *${label}:* ${value}`;
      })
      .join('\n');

    const goals = reportObj.targets ? `\n\n*🎯 الأهداف التي عملنا عليها:*\n${reportObj.targets}` : '';
    const performance = `\n\n*📊 ملخص الأداء:*\n${ratingsText}`;
    const notes = reportObj.notes ? `\n\n*📝 ملاحظات المعلمة:*\n${reportObj.notes}` : '';
    const home = reportObj.home_activities ? `\n\n*🏠 أنشطة منزلية مقترحة:*\n${reportObj.home_activities}` : '';

    // brief assessment snapshot (if available)
    let assessmentText = '';
    if (assessmentSnapshot) {
      const age = assessmentSnapshot.basicInfo?.age || assessmentSnapshot.basicInfo?.dob || '';
      const diag = assessmentSnapshot.diagnosis ? `\n*تشخيص/ملاحظات طبية:* ${itemToString(assessmentSnapshot.diagnosis)}` : '';
      const asGoals = assessmentSnapshot.goals ? `\n*أهداف سابقة:* ${itemToString(assessmentSnapshot.goals)}` : '';
      assessmentText = `\n\n*ℹ️ معلومات التقييم:*${age ? `\n- العمر/تاريخ الميلاد: ${age}` : ''}${diag}${asGoals}`;
    }

    return `*— تقرير تِبيان للأسرة —*
السلام عليكم ورحمة الله،

هذا هو التقرير الدوري لـ *${name}*
*فترة التقرير:* ${period}
*تاريخ التقرير:* ${date}
${goals}
${performance}
${notes}
${home}
${assessmentText}

نشكر لكم تعاونكم المستمر،
*منصة تِبيان للتعليم*`;
  };

  // -----------------------------
  // MAIN: generate report (now merges assessment details into payload)
  // -----------------------------
  // -----------------------------
  // MAIN: generate report (now merges assessment details into payload)
  // -----------------------------
  const handleGenerateReport = async () => {
    if (!formData.targets || formData.targets.trim() === '') {
      showToast({
        title: "حقل مطلوب",
        description: "يرجى إدخال (الأهداف المجدولة) أولاً قبل توليد التقرير.",
        className: "notification-warning"
      });
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      // 1) try to load assessment for the child (if currentChild set)
      let assessmentDoc = null;
      let assessmentSnapshot = null;
      if (currentChild && currentChild.trim() !== '') {
        assessmentDoc = await findAssessmentByChildName(currentChild);
        if (assessmentDoc) {
          assessmentSnapshot = extractAssessmentSnapshot(assessmentDoc);
          // If form fields empty, prefill from assessment where sensible
          if ((!formData.targets || formData.targets.trim() === '') && assessmentSnapshot.goals) {
            setFormData(prev => ({ ...prev, targets: itemToString(assessmentSnapshot.goals) }));
          }
          if (assessmentSnapshot.initialRatings && Object.keys(assessmentSnapshot.initialRatings).length > 0) {
            // merge initial ratings with current formData ratings (prefer user-entered)
            setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, ...assessmentSnapshot.initialRatings } }));
          }
        }
      }

      // 2) build payload and include assessment snapshot + raw doc fields if present
      // Prepare fields for backend (n8n) consumption
      let assessmentDocForPayload = null;
      let assessmentDataForPayload = null;
      let assessmentReportForPayload = null;

      if (assessmentDoc) {
        // ensure we send an object shaped { id, data } (the analyze route supports both)
        assessmentDocForPayload = { id: assessmentDoc.id || assessmentDoc.docId || null, data: assessmentDoc };
        // also send a direct 'data' fallback (some codepaths expect plain object)
        assessmentDataForPayload = assessmentDoc;
        // try common report paths
        assessmentReportForPayload = assessmentDoc.report || (assessmentDoc.assessmentData && assessmentDoc.assessmentData.report) || null;
      }

      const payload = {
        textNote: buildNoteText(),
        currentActivity: 'تقرير أسري',
        energyLevel: 3,
        tags: ['family-report'],
        sessionDuration: 0,
        curriculumQuery: formData.targets || '',
        // keep the local snapshot (useful for client-side UI)
        assessment: assessmentSnapshot ? assessmentSnapshot : null,
        // === new: raw assessment objects for backend/n8n/model context ===
        assessmentDoc: assessmentDocForPayload,
        assessmentData: assessmentDataForPayload,
        assessmentReport: assessmentReportForPayload,
        // include child name + metadata about this request
        childName: currentChild || null,
        planRequestMeta: {
          requestedFrom: 'family_report_ui',
          formData: { ...formData },
          requestedAt: new Date().toISOString()
        }
      };

      showToast({ title: 'جاري طلب تحليل AI...', description: `endpoint: ${resolvedEndpoint}`, className: 'notification-info', duration: 5000 });

      const res = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text().catch(() => null);
        console.error('AI analyze returned non-OK:', res.status, body);
        throw new Error(`Server responded ${res.status}${body ? ` — ${String(body).slice(0, 200)}` : ''}`);
      }

      const json = await res.json();
      const ai = json?.ai || {};
      const meta = json?.meta || {};
      const normalized = ai.normalized || ai;

      const aiTargetsRaw = normalized.smart_goal || normalized.targets || normalized.goal || formData.targets;
      const aiTargets = Array.isArray(aiTargetsRaw) ? aiTargetsRaw.map(itemToString).join('\n') : (typeof aiTargetsRaw === 'string' ? aiTargetsRaw : itemToString(aiTargetsRaw));

      const aiNotes = normalized.summary || normalized.notes || normalized.analysis || formData.notes;

      const aiHomeRaw = normalized.home_activities || normalized.recommendations || normalized.activities || formData.home_activities;
      let aiHomeStr = '';
      if (Array.isArray(aiHomeRaw)) {
        aiHomeStr = aiHomeRaw.map(itemToString).join('\n');
      } else if (typeof aiHomeRaw === 'string') {
        aiHomeStr = aiHomeRaw;
      } else {
        aiHomeStr = itemToString(aiHomeRaw);
      }

      const aiRatingsRaw = normalized.ratings || normalized.metrics || ai.ratings || {};
      const mergedRatings = mapAiRatingsToKeys(aiRatingsRaw);

      // 3) include assessment snapshot inside the generatedReport so UI / send can use it
      const newReport = {
        ...formData,
        targets: aiTargets,
        notes: aiNotes,
        home_activities: aiHomeStr,
        ratings: mergedRatings,
        generatedAt: normalized.generatedAt || normalized.date || meta.sentAt || new Date().toISOString(),
        aiRaw: ai,
        meta,
        // keep the snapshot for UI (unchanged)
        assessmentSnapshot,
        // also attach the raw doc info returned from DB (so other UI code can use phone, ids, etc.)
        assessmentDoc: assessmentDocForPayload,
        assessmentData: assessmentDataForPayload,
        assessmentReport: assessmentReportForPayload
      };

      setGeneratedReport(newReport);
      showToast({ title: 'انتهى التحليل', description: 'تم إنشاء معاينة للتقرير مع أخذ بيانات التقييم بعين الاعتبار', className: 'notification-success' });
    } catch (err) {
      console.error('handleGenerateReport error', err);
      setGeneratedReport({ ...formData, generatedAt: new Date().toISOString(), aiRaw: null });
      showToast({ title: 'فشل في تحليل AI — استخدام البيانات الحالية', description: String(err?.message || err), className: 'notification-error', duration: 8000 });
    } finally {
      clearTimeout(timeout);
      setIsGenerating(false);
    }
  };


  const handleDownloadPdf = async () => {
    if (!generatedReport || !reportRef.current) {
      showToast({ title: 'لا يوجد تقرير للتصدير', className: 'notification-warning' });
      return;
    }

    setIsDownloading(true);
    showToast({ title: 'جاري تجهيز PDF...', className: 'notification-info' });

    try {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = '794px';
      wrapper.style.direction = 'rtl';
      wrapper.style.fontFamily = "Tahoma, Arial, sans-serif";

      const node = reportRef.current.cloneNode(true);
      node.style.background = '#ffffff';
      node.style.padding = '20px';
      node.style.boxSizing = 'border-box';
      wrapper.appendChild(node);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidthMm = pdf.internal.pageSize.getWidth();
      const pdfHeightMm = pdf.internal.pageSize.getHeight();
      const pxToMm = (px) => px * 0.264583333;
      const imgWidthMm = pxToMm(canvas.width);
      const imgHeightMm = pxToMm(canvas.height);
      const margin = 8;
      const maxWidth = pdfWidthMm - margin * 2;
      const maxHeight = pdfHeightMm - margin * 2;
      const widthRatio = maxWidth / imgWidthMm;
      const heightRatio = maxHeight / imgHeightMm;
      const scale = Math.min(widthRatio, heightRatio, 1);
      const drawW = imgWidthMm * scale;
      const drawH = imgHeightMm * scale;
      const x = (pdfWidthMm - drawW) / 2;
      const y = (pdfHeightMm - drawH) / 2;

      pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);

      const datePart = (generatedReport.generatedAt ? new Date(generatedReport.generatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      const safeChild = (currentChild || 'child').replace(/\s+/g, '_');
      const filename = `family-report_${safeChild}_${datePart}.pdf`;
      pdf.save(filename);

      document.body.removeChild(wrapper);
      showToast({ title: 'تم تنزيل PDF', description: filename, className: 'notification-success' });
    } catch (err) {
      console.error('download pdf error', err);
      showToast({ title: 'فشل تجهيز PDF', description: String(err?.message || err), className: 'notification-error' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!currentChild || currentChild.trim() === '') {
      showToast({
        title: "لم يتم اختيار الطفل",
        description: "يرجى اختيار الطفل من القائمة العلوية أولاً قبل الإرسال.",
        className: "notification-warning"
      });
      return;
    }

    if (!generatedReport) {
      showToast({
        title: "لا يوجد تقرير للإرسال",
        description: "يرجى 'توليد التقرير' أولاً.",
        className: "notification-warning"
      });
      return;
    }

    showToast({ title: 'جاري البحث عن ولي الأمر...', className: 'notification-info', duration: 2000 });
    const parentDoc = await findAssessmentByChildName(currentChild);
    if (!parentDoc) {
      showToast({ title: 'لم نعثر على ولي أمر', description: `لا توجد بيانات لاسم "${currentChild}" في قاعدة البيانات.`, className: 'notification-error', duration: 8000 });
      return;
    }

    const rawNumberFromDoc = extractPhoneRawFromAssessment(parentDoc);
    const phoneDigits = sanitizePhoneForWaMe(rawNumberFromDoc || parentDoc.whatsappNumber || parentDoc.phoneNumber);
    if (!phoneDigits) {
      showToast({ title: 'رقم ولي الأمر غير متاح', description: 'لا يوجد رقم صالح محفوظ لهذا الطفل.', className: 'notification-error' });
      return;
    }

    // include assessment snapshot in message if present
    const assessmentSnapshot = extractAssessmentSnapshot(parentDoc);
    const message = composeFamilyReportMessage({ childName: currentChild, reportObj: generatedReport, assessmentSnapshot });

    try {
      openWhatsAppChat(phoneDigits, message);
      showToast({ title: 'تم فتح دردشة واتساب', description: 'يرجى الضغط على "إرسال" لإيصال الرسالة لولي الأمر.', className: 'notification-success', duration: 8000 });
    } catch (err) {
      console.error('openWhatsAppChat error:', err);
      showToast({ title: 'فشل فتح واتساب', description: err.message || 'تحقق من صحة الرقم أو إعدادات المتصفح.', className: 'notification-error' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toaster position="top-right" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">تقرير للأسرة</h2>
        </div>
        <p className="text-purple-100">ملخصات أسبوعية وشهرية، قابلة للمشاركة مع أولياء الأمور</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">1. إعداد التقرير</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField name="period" label="فترة التقرير" value={formData.period} onChange={handleInputChange} options={['أسبوع', 'شهر']} />
            <InputField name="targets" label="الأهداف المجدولة" value={formData.targets} onChange={handleInputChange} placeholder="مثال: حرف أ، سورة الفاتحة" />
          </div>

          <h4 className="text-md font-medium text-slate-700 pt-4 border-t">قياس الأداء</h4>
          <div className="space-y-3">
            {Object.entries(performanceMetrics).map(([key, metric]) => (
              <RatingField key={key} metricKey={key} metric={metric} value={formData.ratings[key]} onChange={handleRatingChange} />
            ))}
          </div>

          <InputField name="notes" label="ملاحظات نوعية" value={formData.notes} onChange={handleInputChange} placeholder="نجاحات، مواقف داعمة، توصيات..." isTextarea />
          <InputField name="home_activities" label="أنشطة منزلية مقترحة" value={formData.home_activities} onChange={handleInputChange} placeholder="نشاط 1، نشاط 2..." isTextarea />

          <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full btn-primary mt-4">
            {isGenerating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Zap className="h-4 w-4 ml-2" />}
            {isGenerating ? 'جاري التوليد...' : 'توليد التقرير'}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">2. معاينة التقرير</h3>

          <AnimatePresence mode="wait">
            {!generatedReport ? (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
                <FileText className="h-12 w-12 text-slate-300" />
                <p className="text-slate-500">سيظهر التقرير هنا بعد توليده.</p>
              </motion.div>
            ) : (
              <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div ref={reportRef} className="p-4 bg-white" style={{ direction: 'rtl' }}>
                  <div className="text-center border-b pb-2 mb-4">
                    <h2 className="text-xl font-bold text-purple-700">تقرير أداء الطالب</h2>
                    <p className="text-sm text-slate-600">
                      للطفل: {currentChild || 'غير محدد'} | الفترة: {generatedReport.period} | التاريخ: {new Date(generatedReport.generatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <ReportSection title="ملخص الأداء">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(generatedReport.ratings).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
                            <span className="font-medium text-slate-700">{performanceMetrics[key]?.label || key}</span>
                            <span className="font-semibold text-purple-600">{value}</span>
                          </div>
                        ))}
                      </div>
                    </ReportSection>

                    <ReportSection title="الأهداف خلال الفترة" content={generatedReport.targets} />
                    <ReportSection title="ملاحظات المعلمة" content={generatedReport.notes} />
                    <ReportSection title="أنشطة منزلية مقترحة" content={generatedReport.home_activities} />

                    {generatedReport.assessmentSnapshot && (
                      <ReportSection title="مُلخّص التقييم (من نظام التقييم)">
                        <div className="text-sm text-slate-600 space-y-2">
                          <div><strong>معلومات أساسية:</strong> {itemToString(generatedReport.assessmentSnapshot.basicInfo)}</div>
                          {generatedReport.assessmentSnapshot.diagnosis && <div><strong>تشخيص/ملاحظات:</strong> {itemToString(generatedReport.assessmentSnapshot.diagnosis)}</div>}
                          {generatedReport.assessmentSnapshot.goals && <div><strong>أهداف سابقة:</strong> {itemToString(generatedReport.assessmentSnapshot.goals)}</div>}
                        </div>
                      </ReportSection>
                    )}

                    {generatedReport.aiRaw && generatedReport.aiRaw.normalized && (
                      <ReportSection title="خطة مُولّدة (مقتطف)">
                        <div className="text-sm space-y-2">
                          <div><strong>الهدف:</strong> {generatedReport.aiRaw.normalized.smart_goal || '-'}</div>
                          {generatedReport.aiRaw.normalized.task_analysis_steps && generatedReport.aiRaw.normalized.task_analysis_steps.length > 0 && (
                            <div>
                              <strong>خطوات:</strong>
                              <ol className="list-decimal pr-6 mt-1 text-slate-600">
                                {generatedReport.aiRaw.normalized.task_analysis_steps.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
                              </ol>
                            </div>
                          )}
                        </div>
                      </ReportSection>
                    )}
                  </div>

                  <div className="text-center mt-6 pt-2 border-t text-xs text-slate-400">
                    <p>تم إنشاؤه بواسطة نظام تِبيان — للمشاركة مع ولي الأمر</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t">
                  <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={isDownloading}>
                    <Download size={14} className="ml-1" />{isDownloading ? 'جارٍ التحميل...' : 'تحويل إلى PDF'}
                  </Button>
                  <Button onClick={handleSend} variant="outline" size="sm">
                    <Send size={14} className="ml-1" />إرسال للأهل
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

// InputField, SelectField, RatingField, ReportSection unchanged
const InputField = ({ name, label, value, onChange, placeholder, isTextarea }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="text-sm font-medium text-slate-600">{label}</label>
    {isTextarea ? (
      <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} rows="3" className="w-full p-2 border rounded-md input-focus" />
    ) : (
      <input id={name} name={name} type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border rounded-md input-focus" />
    )}
  </div>
);

const SelectField = ({ name, label, value, onChange, options }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="text-sm font-medium text-slate-600">{label}</label>
    <select id={name} name={name} value={value} onChange={onChange} className="w-full p-2 border rounded-md input-focus">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const RatingField = ({ metricKey, metric, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-600">{metric.label}</label>
    <div className="flex justify-between items-center bg-slate-50 p-1 rounded-full">
      {metric.options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(metricKey, option)}
          className={`w-1/3 text-center text-xs font-semibold py-1.5 rounded-full transition-colors ${value === option ? 'bg-purple-500 text-white shadow' : 'text-slate-600 hover:bg-purple-100'}`}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

const ReportSection = ({ title, content, children }) => (
  <div>
    <h4 className="font-semibold text-purple-700 mb-1">{title}</h4>
    {content ? (
      <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200 whitespace-pre-wrap">{content}</p>
    ) : children}
  </div>
);

export default FamilyReport;
