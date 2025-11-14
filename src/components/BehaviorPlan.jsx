// src/components/BehaviorPlan.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  FileText,
  BarChart,
  Lightbulb,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  CheckSquare,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { Button } from './ui/button';

// ---------- helpers ----------
const TRUNCATE_MAX = 2000;
function truncateString(s, n = TRUNCATE_MAX) { if (typeof s !== 'string') return s; return s.length > n ? s.slice(0, n) + '…(مقتطف)' : s; }
function sanitizeValue(value, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return '[truncated-depth]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return truncateString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 200).map(v => sanitizeValue(v, depth + 1, maxDepth));
  if (typeof value === 'object') return sanitizeObject(value, depth + 1, maxDepth);
  return String(value);
}
function sanitizeObject(obj = {}, depth = 0, maxDepth = 4) {
  const blacklistKeys = ['raw_ai', 'binary', 'embeddings', 'embedding', 'full_text', 'data'];
  const sanitized = {};
  try {
    for (const [k, v] of Object.entries(obj)) {
      if (blacklistKeys.includes(k)) {
        if (typeof v === 'string') sanitized[k] = truncateString(v, 300);
        else sanitized[k] = '[removed-heavy]';
        continue;
      }
      sanitized[k] = sanitizeValue(v, depth, maxDepth);
    }
  } catch (e) { return { note: '[sanitization-failed]' }; }
  return sanitized;
}

// ---------- deterministic id helpers ----------
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

// ---------- UI constants ----------
const steps = [
  { id: 1, name: 'نموذج السلوك', icon: FileText },
  { id: 2, name: 'تحليل ABC', icon: BarChart },
  { id: 3, name: 'توليد الخطة', icon: Lightbulb },
  { id: 4, name: 'قائمة التحقق', icon: CheckSquare },
];
const fidelityChecklistItems = [
  { id: 'c1', label: 'قدمتُ تهيئة بصرية للالخطوات' },
  { id: 'c2', label: 'منحتُ اختيارين للطفل' },
  { id: 'c3', label: 'طبّقتُ التعزيز فوريًا بعد السلوك البديل' },
  { id: 'c4', label: 'سجّلتُ البيانات نهاية الجلسة' },
];
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ANALYZE_URL)
  ? import.meta.env.VITE_ANALYZE_URL
  : 'https://tebyan-backend.vercel.app/api/analyze';

// ---------- small Firestore helpers for assessment lookup ----------

// normalize Arabic name (trim, collapse spaces, remove tashkeel)
const normalizeNameForSearch = (n) => {
  if (!n) return '';
  const removeDiacritics = (s) =>
    s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
  return removeDiacritics(String(n).trim()).replace(/\s+/g, ' ');
};

// recursively serialize Firestore values (Timestamp -> ISO)
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

// fetch assessment by child name with multiple fallbacks (client-side)
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

    // 5) fallback to 'children' collection (best-effort)
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

// ---------- Component ----------
const BehaviorPlan = ({
  currentChild,
  onSaveToLog,
  onAnalysisComplete,
  sessionTimer,
  userSchoolId,
  teacherId,
  existingSession = null,
  initialStep = 1
}) => {
  const { toast } = useToast();

  // core state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    targetBehavior: '',
    behaviorContext: '',
    severity: 'خفيف',
    previousAttempts: '',
    cognitiveLevel: '',
    behavioralLevel: '',
    sensoryMotorLevel: '',
    socialCommLevel: '',
    antecedent: '',
    behavior: '',
    consequence: '',
    hypothesizedFunction: 'انتباه',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // persisted ids for idempotency
  const [savedSessionId, setSavedSessionId] = useState(existingSession?.id || null);
  // keep savedChecklistId null by default to avoid accidental auto-merge; will be set only if checklist belongs to current teacher
  const [savedChecklistId, setSavedChecklistId] = useState(null);

  // refs
  const mountedRef = useRef(true);

  // populate from existingSession once
  useEffect(() => {
    mountedRef.current = true;
    if (existingSession) {
      console.log('[BehaviorPlan] mounting with existingSession', existingSession.id);
      const ef = existingSession.formData || {};
      setFormData(prev => ({
        ...prev,
        targetBehavior: ef.targetBehavior || ef.target_behavior || ef.behavior || prev.targetBehavior,
        behaviorContext: ef.behaviorContext || ef.behavior_context || ef.activity || prev.behaviorContext,
        severity: ef.severity || prev.severity,
        previousAttempts: ef.previousAttempts || prev.previousAttempts,
        cognitiveLevel: ef.cognitiveLevel || prev.cognitiveLevel,
        behavioralLevel: ef.behavioralLevel || prev.behavioralLevel,
        sensoryMotorLevel: ef.sensoryMotorLevel || prev.sensoryMotorLevel,
        socialCommLevel: ef.socialCommLevel || prev.socialCommLevel,
        antecedent: ef.antecedent || prev.antecedent,
        behavior: ef.behavior || prev.behavior,
        consequence: ef.consequence || prev.consequence,
        hypothesizedFunction: ef.hypothesizedFunction || ef.hypothesized_function || prev.hypothesizedFunction,
      }));
      if (existingSession.generatedPlan) setGeneratedPlan(existingSession.generatedPlan);

      // NEW: populate checklist only if the checklist was saved by the current teacher
      const checklist = existingSession.checklist || null;
      if (checklist && checklist.checkedItems && Object.keys(checklist.checkedItems).length) {
        // possible places where owner info might live
        const savedByCandidate =
          checklist.savedBy ||
          checklist.owner ||
          checklist.meta?.savedBy ||
          checklist.meta?.ownerId ||
          existingSession.teacherId ||
          existingSession.meta?.teacherId ||
          existingSession.meta?.savedBy ||
          null;

        const matchesCurrentUser = savedByCandidate ? String(savedByCandidate) === String(teacherId) : false;

        if (matchesCurrentUser) {
          // normalize values to booleans
          const normalized = {};
          for (const [k, v] of Object.entries(checklist.checkedItems || {})) {
            normalized[k] = !!v;
          }
          setCheckedItems(normalized);
          if (checklist.id) setSavedChecklistId(checklist.id);
          console.log('[BehaviorPlan] loaded checklist from existingSession (owned by current teacher).');
        } else {
          // do NOT auto-populate checked items from someone else — keep empty
          setCheckedItems({});
          setSavedChecklistId(null);
          console.log('[BehaviorPlan] existing checklist belongs to another user — not auto-loading checked items.');
        }
      } else {
        // no checklist present
        setCheckedItems({});
        setSavedChecklistId(null);
      }

      if (existingSession.id) setSavedSessionId(existingSession.id);
      if (initialStep && initialStep >= 1 && initialStep <= steps.length) setCurrentStep(initialStep);
    } else {
      if (initialStep && initialStep >= 1 && initialStep <= steps.length) setCurrentStep(initialStep);
    }
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSession, initialStep]);

  // helpers
  const buildNoteText = () => [
    `Child: ${currentChild || 'غير محدد'}`,
    `Target behavior: ${formData.targetBehavior || 'غير محدد'}`,
    `Context: ${formData.behaviorContext || 'غير محدد'}`,
    `Antecedent (A): ${formData.antecedent || '-'}`,
    `Behavior (B): ${formData.behavior || '-'}`,
    `Consequence (C): ${formData.consequence || '-'}`,
    `Hypothesized function: ${formData.hypothesizedFunction || '-'}`,
    `Severity: ${formData.severity || '-'}`,
    `Previous attempts: ${formData.previousAttempts || '-'}`,
    `Child levels: cognitive=${formData.cognitiveLevel || '-'}, behavioral=${formData.behavioralLevel || '-'}, sensoryMotor=${formData.sensoryMotorLevel || '-'}, socialComm=${formData.socialCommLevel || '-'}`
  ].join('\n');

  const computeChecklistCompletion = (items) => {
    const completed = Object.values(items || {}).filter(Boolean).length;
    return { completed, total: fidelityChecklistItems.length, allComplete: completed === fidelityChecklistItems.length };
  };

  // ---------- Save session (explicit only) ----------
  const handleSaveSession = async () => {
    if (isSavingSession) return null;
    if (!userSchoolId || !teacherId) {
      toast({ title: "خطأ في الصلاحيات", description: "لا يمكن حفظ الجلسة بدون معرّف المدرسة والمعلمة.", className: "notification-error" });
      return null;
    }
    setIsSavingSession(true);
    try {
      const sanitizedPlan = sanitizeObject(generatedPlan || {});
      const sessionIdToUse = makeDeterministicId({
        type: 'behavior_session',
        schoolId: userSchoolId,
        teacherId,
        child: currentChild || formData.targetBehavior || 'nochild',
        targetBehavior: formData.targetBehavior || 'notarget'
      });
      console.log('[BehaviorPlan] handleSaveSession -> upserting session id:', sessionIdToUse);

      const docRef = doc(db, 'sessions', sessionIdToUse);
      const payload = {
        type: 'behavior_session',
        child: currentChild || formData.targetBehavior || null,
        text: sanitizedPlan.behavior_goal || formData.targetBehavior || 'جلسة سلوكية',
        generatedPlan: sanitizedPlan,
        formData: {
          targetBehavior: formData.targetBehavior,
          behaviorContext: formData.behaviorContext,
          severity: formData.severity,
          previousAttempts: formData.previousAttempts
        },
        meta: {
          source: 'behavior-session-save',
          savedAtLocal: new Date().toISOString(),
          clientSessionId: sessionIdToUse
        },
        createdAt: serverTimestamp(),
        schoolId: userSchoolId,
        teacherId,
        status: 'pending' // initial status
      };

      // persist once (upsert)
      await setDoc(docRef, payload, { merge: true });
      setSavedSessionId(sessionIdToUse);
      console.log('[BehaviorPlan] session saved to Firestore (once):', sessionIdToUse);

      // inform parent to update UI but DO NOT trigger parent to write to DB again.
      if (typeof onSaveToLog === 'function') {
        onSaveToLog({
          id: sessionIdToUse,
          timestamp: new Date().toISOString(),
          child: payload.child,
          text: payload.text,
          activity: formData.behaviorContext || 'خطة سلوكية',
          hasAudio: false,
          energy: 3,
          tags: ['behavior', 'session'],
          type: 'behavior_session',
          status: payload.status,
          generatedPlan: payload.generatedPlan,
          meta: payload.meta,
          alreadySaved: true,
          persist: false // IMPORTANT: tell App not to persist again
        });
      }

      toast({ title: "تم حفظ الجلسة ✅", description: `تم حفظ الجلسة (id: ${sessionIdToUse}).`, className: "notification-success" });
      return sessionIdToUse;
    } catch (err) {
      console.error('handleSaveSession error', err);
      toast({ title: 'فشل حفظ الجلسة', description: err.message || 'حدث خطأ أثناء الحفظ.', className: 'notification-error' });
      return null;
    } finally {
      setIsSavingSession(false);
    }
  };

  // ---------- Save checklist (finalize) ----------
  const handleSaveChecklist = async () => {
    if (isSavingChecklist) return null;
    if (!userSchoolId || !teacherId) {
      toast({ title: "خطأ في الصلاحيات", description: "لا يمكن حفظ القائمة بدون معرّف المدرسة والمعلمة.", className: "notification-error" });
      return null;
    }

    setIsSavingChecklist(true);
    try {
      const { completed, total, allComplete } = computeChecklistCompletion(checkedItems);
      const fidelityScore = Math.round((completed / total) * 100);
      const sanitizedPlan = sanitizeObject(generatedPlan || {});

      // ensure there is a session doc to attach checklist to (deterministic id)
      const sessionIdToUse = savedSessionId || makeDeterministicId({
        type: 'behavior_session',
        schoolId: userSchoolId,
        teacherId,
        child: currentChild || formData.targetBehavior || 'nochild',
        targetBehavior: formData.targetBehavior || 'notarget'
      });

      console.log('[BehaviorPlan] handleSaveChecklist -> sessionIdToUse:', sessionIdToUse);

      const sessionDocRef = doc(db, 'sessions', sessionIdToUse);

      const checklistSummary = {
        checkedItems,
        fidelityScore,
        totalItems: total,
        completedItems: completed,
        // record who saved the checklist
        savedBy: teacherId,
        savedAt: new Date().toISOString()
      };

      // Merge checklist into parent session doc only (no separate checklist doc)
      const sessionUpdatePayload = {
        checklist: checklistSummary,
        generatedPlan: sanitizedPlan,
        meta: {
          lastChecklistSummary: checklistSummary,
          updatedByChecklistAt: new Date().toISOString()
        },
        status: allComplete ? 'applied' : 'pending',
        updatedAt: serverTimestamp()
      };

      await setDoc(sessionDocRef, sessionUpdatePayload, { merge: true });
      setSavedSessionId(sessionIdToUse);
      // mark savedChecklistId as owned by current user (set to sessionId or a checklist id if you produce one)
      setSavedChecklistId(sessionIdToUse);

      console.log('[BehaviorPlan] parent session updated with checklist (no separate checklist doc):', sessionIdToUse);

      // inform parent to update UI but DO NOT trigger parent to write to DB again
      if (typeof onSaveToLog === 'function') {
        onSaveToLog({
          id: sessionIdToUse,
          sessionId: sessionIdToUse,
          timestamp: new Date().toISOString(),
          child: currentChild || formData.targetBehavior || null,
          text: `قائمة تحقق - ${formData.targetBehavior || '-'}`,
          activity: formData.behaviorContext || 'خطة سلوكية',
          hasAudio: false,
          energy: Math.round(fidelityScore / 20),
          tags: ['behavior', 'checklist', `fidelity-${fidelityScore}%`],
          type: 'behavior_checklist', // kept type for UI, but persisted into parent session
          status: allComplete ? 'applied' : 'pending',
          generatedPlan: sanitizedPlan,
          checklist: checklistSummary,
          meta: {
            source: 'behavior-checklist-merged-into-session',
            savedAtLocal: new Date().toISOString(),
            parentSessionId: sessionIdToUse
          },
          alreadySaved: true,
          persist: false // IMPORTANT: prevent parent double-write
        });
      }

      toast({
        title: allComplete ? "تم تطبيق الخطة ✅" : "تم حفظ قائمة التحقق ✅",
        description: allComplete ? "جميع العناصر مكتملة. الحالة: مُطبّق." : `تم الحفظ. درجة الالتزام: ${fidelityScore}%.`,
        className: "notification-success"
      });

      return sessionIdToUse;
    } catch (err) {
      console.error('handleSaveChecklist error', err);
      toast({ title: 'فشل حفظ قائمة التحقق', description: err.message || 'حدث خطأ أثناء الحفظ.', className: 'notification-error' });
      return null;
    } finally {
      setIsSavingChecklist(false);
    }
  };

  // ---------- Generate plan (does not auto-save) ----------
  const splitSentences = (text) => {
    if (!text || typeof text !== 'string') return [];
    return text.split(/[\.\!\?\n؛؛\:]+/).map(s => s.trim()).filter(Boolean);
  };
  const collectStrings = (obj) => {
    const out = [];
    const walk = (v) => {
      if (v === null || v === undefined) return;
      if (typeof v === 'string') out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(obj);
    return out;
  };
  const toArrayStrings = (v) => {
    if (!v && v !== 0) return [];
    if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
    if (typeof v === 'string') return splitSentences(v);
    return [];
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);

    // Attempt to fetch assessment/report data from Firestore to include in request (same pattern as EducationalPlan)
    const lookupName = (currentChild && currentChild.trim()) || null;
    let assessmentDoc = null;
    if (lookupName) {
      try {
        toast({ title: 'جاري جلب بيانات الاستبيان/التقرير (إن وُجد)...', className: 'notification-info', duration: 2000 });
        assessmentDoc = await fetchAssessmentByChildNameClient(lookupName);
        if (assessmentDoc) {
          console.log('[BehaviorPlan] found assessmentDoc:', assessmentDoc);
          toast({ title: 'تم العثور على استبيان', description: `id: ${assessmentDoc.id}`, className: 'notification-success', duration: 2000 });
        } else {
          toast({ title: 'لا توجد استبيانات محفوظة لهذا الاسم', className: 'notification-warning', duration: 2000 });
        }
      } catch (e) {
        console.warn('handleGeneratePlan: error fetching assessment', e);
      }
    }

    const payload = {
      textNote: buildNoteText(),
      currentActivity: formData.behaviorContext || 'سلوكي',
      energyLevel: 3,
      tags: ['behavior'],
      sessionDuration: Math.round(sessionTimer?.time / 60 || 0),
      curriculumQuery: formData.targetBehavior || '',
      analysisType: 'behavior',
      planRequestMeta: {
        requestedByTeacherId: teacherId || null,
        requestedBySchoolId: userSchoolId || null,
        localTimestamp: new Date().toISOString(),
        formDataSummary: {
          targetBehavior: formData.targetBehavior,
          antecedent: formData.antecedent,
          behavior: formData.behavior,
          consequence: formData.consequence
        }
      }
    };

    if (assessmentDoc) {
      payload.assessmentDoc = assessmentDoc; // { id, data }
      payload.assessmentData = assessmentDoc.data.assessmentData || assessmentDoc.data || null;
      payload.assessmentReport = assessmentDoc.data.report || assessmentDoc.data.familyReport || null;
    }

    // request with abort timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const normalized = data?.ai?.normalized || {};
      const raw = data?.ai?.raw || data?.ai || {};
      const behavior_goal = normalized.behavior_goal || normalized.smart_goal || normalized.summary || (typeof raw === 'string' ? raw : '') || '';

      const safe = {
        type: normalized.type || 'behavioral',
        behavior_goal,
        antecedents: toArrayStrings(normalized.antecedents || normalized.antecedent || []),
        consequences: toArrayStrings(normalized.consequences || normalized.consequence || []),
        antecedent_strategies: toArrayStrings(normalized.antecedent_strategies || normalized.prevention || []),
        consequence_strategies: toArrayStrings(normalized.consequence_strategies || normalized.response_strategies || []),
        replacement_behavior: normalized.replacement_behavior || {},
        data_collection: normalized.data_collection || {},
        review_after_days: normalized.meta?.review_after_days || 14,
        safety_flag: !!(normalized.meta?.safety_flag || normalized.safety_flag || (formData.severity === 'شديد')),
        raw_ai: raw,
        meta: normalized.meta || {}
      };

      setGeneratedPlan(safe);
      setIsGenerating(false);
      setCurrentStep(3);

      const result = {
        suggestions: normalized.suggestions || safe.antecedent_strategies,
        customizations: normalized.customizations || safe.consequence_strategies,
        summary: normalized.summary || behavior_goal || '',
        noteData: {
          formData,
          generatedPlan: safe,
          child: currentChild,
          sessionDuration: payload.sessionDuration,
          type: 'analysis'
        },
        meta: {
          createdAt: new Date().toISOString(),
          source: 'api-analyze-behavior'
        }
      };

      // callback to parent
      if (typeof onAnalysisComplete === 'function') onAnalysisComplete(result);
      toast({ title: "تم إنشاء خطة السلوك من الخادم ✅", description: "استلمنا خطة سلوكية مُفصّلة (محليًا). اضغطي حفظ لنشرها على الخادم.", className: "notification-success" });
    } catch (err) {
      console.error('handleGeneratePlan error:', err);
      clearTimeout(timeoutId);
      setIsGenerating(false);
      toast({ title: "فشل الاتصال بالـ API — تم استخدام خطة افتراضية", description: err.message || 'تحقق من الخادم.', className: "notification-warning" });
    }
  };

  // ---------- UI rendering helpers ----------
  const nextStep = () => { if (currentStep < steps.length) setCurrentStep(currentStep + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <Step1 formData={formData} handleInputChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} />;
      case 2: return <Step2 formData={formData} handleInputChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} />;
      case 3: return (
        <Step3
          isGenerating={isGenerating}
          generatedPlan={generatedPlan}
          onGenerate={handleGeneratePlan}
          onRefer={() => {
            // referral immediate log (local only)
            if (typeof onSaveToLog === 'function') {
              onSaveToLog({
                text: `إحالة لمختص بسبب سلوك: ${formData.targetBehavior || 'غير محدد'}`,
                hasAudio: false,
                activity: formData.behaviorContext || '',
                energy: 0,
                tags: ['referral'],
                audioBlob: null,
                type: 'referral',
                alreadySaved: true,
                persist: false
              });
            }
            toast({ title: "إحالة فورية لمختص 🚑", description: "تم تسجيل طلب الإحالة محليًا.", className: "notification-error", duration: 10000 });
          }}
          onSaveSession={handleSaveSession}
          isSavingSession={isSavingSession}
          savedSessionId={savedSessionId}
          onOpenChecklist={() => setCurrentStep(4)}
        />
      );
      case 4: return <Step4 checkedItems={checkedItems} setCheckedItems={setCheckedItems} onSaveChecklist={handleSaveChecklist} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2"><ShieldCheck className="h-6 w-6" /><h2 className="text-2xl font-bold">توليد BIP</h2></div>
        <p className="text-blue-100">إدارة سلوكيات التحدي باستراتيجيات فعالة ومبنية على الأدلة</p>
      </motion.div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="mb-8">
          <ol className="flex items-center w-full">
            {steps.map((step, index) => (
              <li key={step.id} className={`flex w-full items-center ${index !== steps.length - 1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-slate-200 after:border-2 after:inline-block" : ""}`}>
                <span className={`flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors ${currentStep >= step.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <step.icon className="w-5 h-5" />
                </span>
              </li>
            ))}
          </ol>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
          <Button onClick={prevStep} disabled={currentStep === 1} variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2 rtl-flip" />السابق
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={nextStep} disabled={currentStep === 3 && !generatedPlan}>
              التالي
              <ChevronLeft className="h-4 w-4 ml-2 " />
            </Button>
          ) : (
            <Button onClick={handleSaveChecklist} disabled={isSavingChecklist}>
              {isSavingChecklist ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الحفظ...</>) : (<><CheckSquare className="h-4 w-4 ml-2" />حفظ القائمة</>)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Step subcomponents ---------- */

const Step1 = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-slate-800">الخطوة 1: نموذج سلوك سريع</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InputField name="targetBehavior" label="السلوك المستهدف (وصف قابل للملاحظة)" value={formData.targetBehavior} onChange={handleInputChange} placeholder="ماذا يفعل؟ كم مرة/المدة؟" />
      <InputField name="behaviorContext" label="متى يظهر؟" value={formData.behaviorContext} onChange={handleInputChange} placeholder="وقت/نشاط/أشخاص/مكان" />
      <SelectField name="severity" label="الشدة" value={formData.severity} onChange={handleInputChange} options={['خفيف', 'متوسط', 'شديد']} />
      <InputField name="previousAttempts" label="محاولات سابقة" value={formData.previousAttempts} onChange={handleInputChange} placeholder="ما جُرّب؟ ماذا نجح/فشل؟" />
    </div>
    <h4 className="text-lg font-medium text-slate-700 pt-4 border-t">مستويات الطفل</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InputField name="cognitiveLevel" label="معرفي" value={formData.cognitiveLevel} onChange={handleInputChange} placeholder="يفهم تعليمات بسيطة؟" />
      <InputField name="behavioralLevel" label="سلوكي" value={formData.behavioralLevel} onChange={handleInputChange} placeholder="متكرر/نادر؟" />
      <InputField name="sensoryMotorLevel" label="حسي/حركي" value={formData.sensoryMotorLevel} onChange={handleInputChange} placeholder="صعوبات حسية/حركية؟" />
      <InputField name="socialCommLevel" label="اجتماعي/تواصلي" value={formData.socialCommLevel} onChange={handleInputChange} placeholder="كلمات/إيماءات/بطاقات؟" />
    </div>
  </div>
);

const Step2 = ({ formData, handleInputChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-slate-800">الخطوة 2: تحليل ABC</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <InputField name="antecedent" label="قبل السلوك (A)" value={formData.antecedent} onChange={handleInputChange} placeholder="مطالب، حرمان، ضجيج..." />
      <InputField name="behavior" label="السلوك (B)" value={formData.behavior} onChange={handleInputChange} placeholder="وصف محدد، عدّ، مدة" />
      <InputField name="consequence" label="بعد السلوك (C)" value={formData.consequence} onChange={handleInputChange} placeholder="يحصل على انتباه، يهرب..." />
    </div>
    <div className="space-y-2">
      <SelectField name="hypothesizedFunction" label="فرضية الوظيفة" value={formData.hypothesizedFunction} onChange={handleInputChange} options={['انتباه', 'هروب/تجنب', 'الحصول على شيء', 'حسي']} />
    </div>
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <div>
        <h4 className="font-semibold text-red-700">قرار السلامة</h4>
        <p className="text-sm text-red-600">لو خطِر/إيذاء للنفس/للآخرين، يجب الضغط على "إحالة فورية" في الخطوة التالية.</p>
      </div>
    </div>
  </div>
);

const Step3 = ({ isGenerating, generatedPlan, onGenerate, onRefer, onSaveSession, isSavingSession, savedSessionId, onOpenChecklist }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-slate-800">الخطوة 3: توليد الخطة</h3>
    {!generatedPlan && (
      <div className="text-center">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Zap className="h-4 w-4 ml-2" />}
          {isGenerating ? 'جاري التحليل...' : 'تحليل فوري'}
        </Button>
      </div>
    )}
    <AnimatePresence mode="wait">
      {isGenerating && (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          <p className="text-slate-600">يقوم محلل السلوك بإعداد الخطة...</p>
        </motion.div>
      )}
      {!isGenerating && !generatedPlan && (
        <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
          <Lightbulb className="h-12 w-12 text-slate-300" />
          <p className="text-slate-500">اضغط على "تحليل فوري" لتوليد خطة التدخل السلوكي.</p>
        </motion.div>
      )}
      {!isGenerating && generatedPlan && (
        <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-sm">
          {generatedPlan.safety_flag && (
            <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-300 rounded-lg">
              <ShieldAlert className="h-8 w-8 text-red-600" />
              <div>
                <h4 className="font-bold text-red-800">خطر محتمل!</h4>
                <p className="text-red-700">تم تحديد السلوك على أنه شديد. يوصى بالإحالة الفورية.</p>
              </div>
              <Button onClick={onRefer} variant="destructive" className="mr-auto">
                <ShieldAlert className="h-4 w-4 ml-2" />
                إحالة فورية
              </Button>
            </div>
          )}

          <PlanSection title="الهدف السلوكي" content={generatedPlan.behavior_goal || (generatedPlan.replacement_behavior && generatedPlan.replacement_behavior.skill) || 'غير متوفر'} />

          <PlanSection
            title="المثيرات / ما يسبق السلوك (Antecedents)"
            content={generatedPlan.antecedents && generatedPlan.antecedents.length ? <ul>{generatedPlan.antecedents.map((a, i) => <li key={i}>• {a}</li>)}</ul> : <em>لم يتم تسجيل مثيرات محددة — تأكدي من الملاحظة أو أضيفيها يدوياً.</em>}
          />

          <PlanSection
            title="العواقب / ما يلي السلوك (Consequences)"
            content={generatedPlan.consequences && generatedPlan.consequences.length ? <ul>{generatedPlan.consequences.map((c, i) => <li key={i}>• {c}</li>)}</ul> : <em>لم يتم استخراج عواقب واضحة — قد يحتاج الملخص إلى مزيد من التفاصيل.</em>}
          />

          <PlanSection title="فرضية الوظيفة (Function Analysis)" content={generatedPlan.function_analysis || 'غير محدد'} />

          <PlanSection
            title="استراتيجيات تهيئة (Antecedent strategies)"
            content={generatedPlan.antecedent_strategies && generatedPlan.antecedent_strategies.length ? <ul>{generatedPlan.antecedent_strategies.map((s, i) => <li key={i}>• {s}</li>)}</ul> : <em>لا توجد اقتراحات تلقائية — جربي إعادة صياغة الملاحظة أو إضافة اقتراحات يدوياً.</em>}
          />

          <PlanSection
            title="سلوك بديل (Replacement behavior)"
            content={generatedPlan.replacement_behavior && (generatedPlan.replacement_behavior.skill || generatedPlan.replacement_behavior.modality) ? `المهارة: ${generatedPlan.replacement_behavior.skill || '-'} | الوسيلة: ${generatedPlan.replacement_behavior.modality || '-'}` : <em>لم يتم اقتراح سلوك بديل واضح — فكري في بديل يؤدي نفس الوظيفة.</em>}
          />

          <PlanSection
            title="استراتيجيات استجابة/عواقب (Consequence strategies)"
            content={generatedPlan.consequence_strategies && generatedPlan.consequence_strategies.length ? <ul>{generatedPlan.consequence_strategies.map((s, i) => <li key={i}>• {s}</li>)}</ul> : <em>لا توجد اقتراحات استجابة تلقائية — مرري ملاحظتك للنموذج مع تفصيل العواقب.</em>}
          />

          <PlanSection
            title="جمع البيانات"
            content={generatedPlan.data_collection && (generatedPlan.data_collection.metric || generatedPlan.data_collection.tool) ? `المقياس: ${generatedPlan.data_collection.metric || '-'} | الأداة: ${generatedPlan.data_collection.tool || '-'}` : <em>لم يتم اقتراح طريقة قياس محددة — فكري في تكرار/مدة/أداة تسجيل.</em>}
          />

          <PlanSection
            title="مراجعة الخطة"
            content={`تتم المراجعة بعد ${generatedPlan.review_after_days || 14} يومًا.`}
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-3 items-start">
            <Button onClick={onSaveSession} disabled={isSavingSession} variant="outline">
              {isSavingSession ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : 'حفظ الجلسة في السجل'}
            </Button>
            <Button onClick={() => typeof onOpenChecklist === 'function' && onOpenChecklist()}>
              فتح قائمة التحقق الآن
            </Button>
            {savedSessionId && (
              <div className="text-sm text-slate-500 mt-2 sm:mt-0">
                تم الحفظ (id: <span className="font-mono text-xs">{savedSessionId}</span>)
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Step4 = ({ checkedItems, setCheckedItems, onSaveChecklist }) => {
  const fidelityScore = (Object.values(checkedItems).filter(Boolean).length / fidelityChecklistItems.length) * 100;
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-800">الخطوة 4: قائمة تحقق التنفيذ</h3>
      <div className="space-y-3">
        {fidelityChecklistItems.map(item => (
          <div key={item.id} className="flex items-center space-x-2 space-x-reverse">
            <Checkbox id={item.id} checked={checkedItems[item.id] || false} onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [item.id]: checked }))} />
            <Label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{item.label}</Label>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t">
        <h4 className="font-semibold">درجة الالتزام:</h4>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <motion.div className="bg-blue-500 h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${fidelityScore}%` }} transition={{ duration: 0.5 }} />
          </div>
          <span className="font-bold text-blue-600">{Math.round(fidelityScore)}%</span>
        </div>

        <div className="mt-4 flex gap-3">
          <Button onClick={onSaveChecklist}><CheckSquare className="h-4 w-4 ml-2" />حفظ القائمة</Button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ name, label, value, onChange, placeholder }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="text-sm font-medium text-slate-600">{label}</label>
    <input id={name} name={name} type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border rounded-md input-focus" />
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

const PlanSection = ({ title, content }) => (
  <div>
    <h4 className="font-semibold text-blue-700 mb-1">{title}</h4>
    <div className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-200">{content}</div>
  </div>
);

export default BehaviorPlan;
