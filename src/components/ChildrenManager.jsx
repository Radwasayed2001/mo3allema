// src/components/ChildrenManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, Trash2, Search, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import KPIPanel from "./KPIPanel";
// import KPIPanel from "@/components/KPIPanel";

/**
 * ChildrenManager (assessments view) — عرض كامل مع فلترة وKPIs وتصدير CSV
 * Props:
 *  - userSchoolId: string
 *  - teacherId?: string
 */

const DECISION_LABELS_AR = {
  eligible: "مؤهل",
  not_eligible: "غير مؤهل حاليًا",
  boundary: "قابل للدعم الإضافي",
  excluded: "مستبعد",
  "": "الكل",
  undefined: "الكل"
};

const YES_NO_AR = { yes: "نعم", no: "لا", "": "—", undefined: "—", null: "—" };

/* ---------- Translation maps for nicer report rendering ---------- */
const BASIC_INFO_LABELS = {
  childName: "اسم الطفل",
  dob: "تاريخ الميلاد",
  gender: "الجنس",
  diagnosisAge: "عمر التشخيص",
  hasRecentReport: "تقرير تشخيصي حديث",
  autismSeverity: "شدة التوحد",
  hasCognitiveDisability: "إعاقة ذهنية",
  otherHealthIssues: "مشكلات صحية أخرى",
  isReceivingTherapy: "يتلقى علاجًا",
  primaryLanguage: "اللغة الأساسية",
  communicationMethod: "وسيلة التواصل",
  previousEducation: "التعليم السابق",
  familySize: "عدد أفراد الأسرة",
  birthOrder: "ترتيب الطفل",
  primaryCaregiver: "المرافق الأساسي",
  familyGoals: "أهداف الأسرة",
  phoneNumber: "رقم الهاتف",
  whatsappNumber: "رقم الواتساب",
  schoolId: "معرّف المدرسة",
  teacherId: "معرّف المعلمة"
};

const EXCLUSION_LABELS = {
  aggression: "نوبات عدوانية/إيذاء ذاتي",
  elopement: "سلوك هروب",
  noImitation: "غياب التقليد",
  intensiveTherapyRecommendation: "توصية علاج مكثّف"
};

const SCALE_A_DOMAINS = {
  attention: "مجال الانتباه",
  communication: "مجال التواصل الوظيفي",
  social: "مجال السلوك الاجتماعي",
  selfReliance: "مجال الاعتماد على النفس",
  cognition: "مجال الإدراك والتطابق",
  fineMotor: "مجال الحركات الدقيقة"
};

const SCALE_A_SKILLS = {
  respondsToName: "يلتفت عند مناداته بالاسم",
  sitsFor3Mins: "يحافظ على الجلوس لمدة 3 دقائق",
  tracksVisually: "يتابع بصريًا قصة/صورة",
  completesSimpleTask: "يكمل نشاط تطابق بسيط",
  followsTwoStepCommand: "يتبع أمرًا مركبًا من خطوتين",
  followsConditionalCommand: "ينفذ أمرًا يحتوي على مفهوم شرطي",
  identifiesCommonItems: "يتعرف على مفردات حياتية مألوفة",
  understandsConcepts: "يفهم مفاهيم مكانية/وصفية",
  maintainsEyeContact: "تواصل بصري (≥2 ثانية)",
  toleratesPeer: "يتحمل وجود طفل آخر بجانبه",
  respondsToGreeting: "يستجيب للتحية",
  transitionsActivity: "ينتقل بين الأنشطة دون بكاء",
  showsFlexibility: "يُظهر مرونة عند تغيير النشاط أو الأدوات",
  drinksFromCup: "يشرب من كوب دون مساعدة",
  indicatesToiletNeed: "يُخبر بالحاجة للحمام",
  removesShoes: "يخلع/يلبس الحذاء بمساعدة خفيفة",
  washesHands: "يغسل يديه بعد التذكير",
  sortsByColor: "يفرز شيئين مختلفين باللون",
  countsTo3: "يعد حتى 3",
  matchesPictures: "يطابق صورتين متشابهتين",
  choosesBigSmall: 'يختار بين "كبير/صغير" بصريًا',
  holdsPen: "يمسك قلما ويخط خطوطًا عشوائية",
  buildsTower4Blocks: "يبني برجا من 4 مكعبات",
  threadsBeads: "يدخل خرزتين في خيط",
  turnsOnePage: "يقلب صفحات كتاب واحدة واحدة"
};

const SCALE_B_LABELS = {
  severeScreaming: "صراخ شديد",
  hittingOthers: "ضرب الآخرين",
  selfHarm: "إيذاء الذات",
  refusesTasks: "يرفض تنفيذ المهام",
  stereotypy: "سلوكيات نمطية",
  unusualSoundReaction: "تفاعل غير معتاد مع الأصوات",
  unusualLightColorReaction: "تفاعل مع الإضاءة/الألوان",
  unusualSensoryUse: "استخدام حسي غير معتاد"
};

const SCALE_L_LABELS = {
  simplePlayWithPeer: "يشارك في لعب بسيط مع طفل آخر",
  imitatesPeerPlay: "يقلد لعب الأقران",
  showsImaginativePlay: "يُظهر لعبًا تخيليًا",
  involvesOthersInPlay: "يُشرك الآخرين في لعبه"
};

/* ---------- Component ---------- */
const ChildrenManager = ({ userSchoolId, teacherId }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [evaluatorFilter, setEvaluatorFilter] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!userSchoolId) {
      setError("معرّف المدرسة مفقود.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const baseColl = collection(db, "assessments");
      let q;
      if (teacherId) {
        q = query(
          baseColl,
          where("assessmentData.basicInfo.schoolId", "==", userSchoolId),
          where("assessmentData.basicInfo.teacherId", "==", teacherId),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          baseColl,
          where("assessmentData.basicInfo.schoolId", "==", userSchoolId),
          orderBy("createdAt", "desc")
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAssessments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (e) => {
        console.error("Error loading assessments:", e);
        setError("فشل جلب بيانات التقييمات. قد يتطلب إنشاء فهرس في Firestore.");
        toast({ title: "خطأ", description: "فشل جلب التقييمات", variant: "destructive" });
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setError("خطأ أثناء إعداد الاستماع للتقييمات.");
      setLoading(false);
    }
  }, [userSchoolId, teacherId, toast]);

  const safeGet = (obj, path, fallback = undefined) => {
    try {
      return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? fallback;
    } catch {
      return fallback;
    }
  };

  // === renamed helper to avoid conflict with state `toDate` ===
  const parseDate = (v) => {
    if (!v) return null;
    // Firestore Timestamp
    if (typeof v?.toDate === "function") return v.toDate();
    // already Date
    if (v instanceof Date) return v;
    // string/number
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const formatDateSummary = (value) => {
    if (!value) return "-";
    const d = parseDate(value);
    if (d) return d.toLocaleString("en-US");
    return String(value);
  };

  const computeScoresFromData = (a) => {
    const data = safeGet(a, "assessmentData", {});
    const scaleA = data.scaleA || {};
    const scaleB = data.scaleB || {};
    const scaleL = data.scaleL || {};

    const sumObj = (obj) => Object.values(obj || {}).reduce((s, v) => {
      if (typeof v === 'object' && v !== null) {
        return s + Object.values(v).reduce((s2, vv) => s2 + (Number(vv) || 0), 0);
      }
      return s + (Number(v) || 0);
    }, 0);

    const scaleA_Total = sumObj(scaleA);
    const scaleB_Total = sumObj(scaleB);
    const scaleL_Total = sumObj(scaleL);

    return { scaleA_Total, scaleB_Total, scaleL_Total };
  };

  // ---------- Filters application (search + date + decision + evaluator) ----------
  const matched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return assessments.filter(a => {
      const basic = safeGet(a, "assessmentData.basicInfo", {});
      const child = (basic?.childName || "").toString().toLowerCase();
      const caregiver = (basic?.primaryCaregiver || "").toString().toLowerCase();
      if (q && !(child.includes(q) || caregiver.includes(q))) return false;

      if (decisionFilter && decisionFilter !== "") {
        if ((a.decision || "") !== decisionFilter) return false;
      }

      if (evaluatorFilter) {
        const ev = (a.evaluatorId || safeGet(a, "metadata.evaluatorId") || safeGet(a, "metadata.userAgent") || "").toString().toLowerCase();
        if (!ev.includes(evaluatorFilter.trim().toLowerCase())) return false;
      }

      const created = parseDate(a.createdAt || safeGet(a, "metadata.createdAt"));
      if (from && created && created < from) return false;
      if (to && created && created > to) return false;

      return true;
    });
  }, [assessments, searchTerm, fromDate, toDate, decisionFilter, evaluatorFilter]);

  // ---------- KPIs calculation for display cards + KPIPanel ----------
  const kpiMetrics = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const totalReports = assessments.length;
    let reportsLast7Days = 0;
    let sumA = 0, sumB = 0, sumL = 0;
    let eligibleCount = 0, excludedCount = 0;

    assessments.forEach(a => {
      const created = parseDate(a.createdAt || (a.metadata && a.metadata.createdAt));
      if (created && created.getTime() >= sevenDaysAgo) reportsLast7Days++;

      let scores = a.scores;
      if (!scores || (scores && (scores.scaleA_Total == null && scores.scaleB_Total == null && scores.scaleL_Total == null))) {
        scores = computeScoresFromData(a);
      }
      sumA += Number(scores.scaleA_Total || 0);
      sumB += Number(scores.scaleB_Total || 0);
      sumL += Number(scores.scaleL_Total || 0);

      if (a.decision === 'eligible') eligibleCount++;
      if (a.decision === 'excluded') excludedCount++;
    });

    const avgA = totalReports ? Math.round((sumA / totalReports) * 10) / 10 : 0;
    const avgB = totalReports ? Math.round((sumB / totalReports) * 10) / 10 : 0;
    const avgL = totalReports ? Math.round((sumL / totalReports) * 10) / 10 : 0;
    const eligibleRate = totalReports ? Math.round((eligibleCount / totalReports) * 100) : 0;

    return { totalReports, reportsLast7Days, avgA, avgB, avgL, eligibleCount, excludedCount, eligibleRate };
  }, [assessments]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages]);

  const pageItems = matched.slice((page - 1) * pageSize, page * pageSize);

  // export CSV
  const exportCSV = () => {
    if (!matched.length) {
      toast({ title: "لا توجد بيانات", description: "لا توجد تقييمات لتصديرها", variant: "destructive" });
      return;
    }
    const rows = matched.map(a => {
      const basic = safeGet(a, "assessmentData.basicInfo", {});
      const scores = a.scores || computeScoresFromData(a);
      return {
        id: a.id,
        createdAt: formatDateSummary(a.createdAt || safeGet(a, "metadata.createdAt")),
        evaluatorId: a.evaluatorId || safeGet(a, "metadata.evaluatorId") || "",
        childName: basic.childName || "",
        dob: basic.dob || "",
        gender: basic.gender || "",
        phoneNumber: basic.phoneNumber || "",
        whatsappNumber: basic.whatsappNumber || "",
        schoolId: basic.schoolId || "",
        teacherId: basic.teacherId || "",
        decision: a.decision || "",
        scaleA_Total: scores.scaleA_Total || 0,
        scaleB_Total: scores.scaleB_Total || 0,
        scaleL_Total: scores.scaleL_Total || 0
      };
    });

    const cols = Object.keys(rows[0]);
    const csv = [
      cols.join(","),
      ...rows.map(r => cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessments_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: "تم تنزيل CSV", className: "notification-success" });
  };

  const handleDelete = async (id, childName) => {
    if (!window.confirm(`هل أنت متأكد من حذف تقرير "${childName || id}"؟`)) return;
    try {
      await deleteDoc(doc(db, "assessments", id));
      toast({ title: "تم الحذف", description: `تم حذف التقرير ${childName || id}`, className: "notification-success" });
    } catch (e) {
      console.error("Error deleting assessment:", e);
      toast({ title: "فشل الحذف", description: "تعذر حذف التقرير", variant: "destructive" });
    }
  };

  /* small helper to show stable text */
  const pretty = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "نعم" : "لا";
    return String(v);
  };

  /* helper to get translated label for A skill or fallback */
  const labelForA = (domainKey, skillKey) => {
    const domainLabel = SCALE_A_DOMAINS[domainKey] || domainKey;
    const skillLabel = SCALE_A_SKILLS[skillKey] || skillKey.replace(/([A-Z])/g, ' $1').toLowerCase();
    return { domainLabel, skillLabel };
  };

  /* helper to translate other keys */
  const translateBasicKey = (k) => BASIC_INFO_LABELS[k] || k;
  const translateExclusionKey = (k) => EXCLUSION_LABELS[k] || k;
  const translateBKey = (k) => SCALE_B_LABELS[k] || k;
  const translateLKey = (k) => SCALE_L_LABELS[k] || k;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header + Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">سجل التقييمات</h2>
            <p className="text-sm text-slate-500">عرض التقييمات الكاملة المرتبطة بمدرستك{teacherId ? " (أطفالي)" : ""}.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الطفل أو ولي الأمر..."
                className="pl-3 pr-10 py-2 border border-slate-200 rounded-lg input-focus"
              />
            </div>
          </div>
        </div>

        {/* Expanded filter row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500">من تاريخ</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-xs text-slate-500">إلى تاريخ</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-xs text-slate-500">القرار</label>
            <select value={decisionFilter} onChange={e => setDecisionFilter(e.target.value)} className="w-full p-2 border rounded">
              <option value="">الكل</option>
              <option value="eligible">مؤهل</option>
              <option value="not_eligible">غير مؤهل</option>
              <option value="boundary">قابل للدعم</option>
              <option value="excluded">مستبعد</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => { setPage(1); }} variant="outline">تطبيق الفلاتر</Button>
          <Button onClick={() => { setFromDate(""); setToDate(""); setDecisionFilter(""); setEvaluatorFilter(""); setSearchTerm(""); setPage(1); }} variant="ghost">مسح الكل</Button>
          <div className="ml-auto flex items-center gap-3">
            <Button onClick={exportCSV} variant="outline">تصدير CSV</Button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">عدد العناصر:</label>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="p-1 border rounded">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* Optionally show more detailed KPIPanel */}
      <KPIPanel metrics={kpiMetrics} />

      {/* Table of reports */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <h3 className="p-6 text-lg font-semibold">{teacherId ? "تقاريري" : "كل التقييمات"}</h3>

        {error && <div className="p-4 text-red-700 bg-red-50 border-t border-red-200 px-6">{error}</div>}

        {loading && assessments.length === 0 ? (
          <div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right p-4 font-medium text-slate-700">التاريخ</th>
                  <th className="text-right p-4 font-medium text-slate-700">اسم الطفل</th>
                  <th className="text-right p-4 font-medium text-slate-700">القرار</th>
                  <th className="text-right p-4 font-medium text-slate-700">A</th>
                  <th className="text-right p-4 font-medium text-slate-700">B</th>
                  <th className="text-right p-4 font-medium text-slate-700">L</th>
                  <th className="text-right p-4 font-medium text-slate-700">إجراءات</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500">لا توجد تقييمات مطابقة.</td>
                  </tr>
                ) : (
                  pageItems.map((a) => {
                    const basic = safeGet(a, "assessmentData.basicInfo", {});
                    const childName = basic?.childName || "—";
                    const decisionRaw = a.decision ?? "";
                    const decisionLabel = DECISION_LABELS_AR[decisionRaw] ?? DECISION_LABELS_AR.undefined;
                    const scores = a.scores || computeScoresFromData(a);
                    const createdAt = a.createdAt || a.metadata?.createdAt || null;

                    return (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 text-sm">{formatDateSummary(createdAt)}</td>
                        <td className="p-4 font-medium text-slate-800">{childName}</td>
                        <td className="p-4 text-sm">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${decisionRaw === 'eligible' ? 'bg-green-100 text-green-800' : decisionRaw === 'excluded' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {decisionLabel}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{scores?.scaleA_Total ?? '—'}</td>
                        <td className="p-4 text-sm">{scores?.scaleB_Total ?? '—'}</td>
                        <td className="p-4 text-sm">{scores?.scaleL_Total ?? '—'}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedAssessment(a)} className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4 text-slate-700" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id, childName)} className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">إظهار {pageItems.length} من {matched.length} نتيجة</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>السابق</Button>
          <div className="px-3">{page} / {totalPages}</div>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>التالي</Button>
        </div>
      </div>

      {/* Details drawer/modal */}
      <AnimatePresence>
        {selectedAssessment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedAssessment(null)} />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative max-w-6xl w-full bg-white rounded-xl shadow-xl p-6 z-10 overflow-auto"
              style={{ maxHeight: '92vh', direction: 'rtl' }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h4 className="text-xl font-bold">تفاصيل التقرير — {safeGet(selectedAssessment, "assessmentData.basicInfo.childName", selectedAssessment.id)}</h4>
                <button onClick={() => setSelectedAssessment(null)} className="p-1 rounded hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ---------- New structured content for modal ---------- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Summary */}
                <div className="p-4 border rounded bg-white">
                  <h6 className="text-slate-700 font-semibold mb-2">ملخّص عام</h6>
                  <div className="text-sm text-slate-700 space-y-1">
                    <div><strong>التاريخ:</strong> {formatDateSummary(selectedAssessment?.createdAt || safeGet(selectedAssessment, "metadata.createdAt"))}</div>
                    <div><strong>معرّف المقيم:</strong> <span className="font-mono">{selectedAssessment?.evaluatorId || safeGet(selectedAssessment, "metadata.evaluatorId") || '—'}</span></div>
                    <div><strong>القرار:</strong> <span className="inline-block px-2 py-0.5 rounded text-xs">{DECISION_LABELS_AR[selectedAssessment?.decision] ?? '—'}</span></div>
                    <div><strong>الإصدار:</strong> {safeGet(selectedAssessment, "metadata.appVersion", "—")}</div>
                    <div><strong>PDF:</strong> {safeGet(selectedAssessment, "metadata.pdfUrl") ? (<a href={safeGet(selectedAssessment, "metadata.pdfUrl")} target="_blank" rel="noreferrer" className="text-blue-600 underline">فتح</a>) : '—'}</div>
                  </div>
                </div>

                {/* Scores */}
                <div className="p-4 border rounded bg-white">
                  <h6 className="text-slate-700 font-semibold mb-2">درجات المقاييس</h6>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 p-3 bg-slate-50 rounded text-center">
                      <div className="text-xs text-slate-500">Scale A</div>
                      <div className="text-2xl font-bold">{(selectedAssessment.scores && selectedAssessment.scores.scaleA_Total) ?? computeScoresFromData(selectedAssessment).scaleA_Total}</div>
                    </div>
                    <div className="flex-1 p-3 bg-slate-50 rounded text-center">
                      <div className="text-xs text-slate-500">Scale B</div>
                      <div className="text-2xl font-bold">{(selectedAssessment.scores && selectedAssessment.scores.scaleB_Total) ?? computeScoresFromData(selectedAssessment).scaleB_Total}</div>
                    </div>
                    <div className="flex-1 p-3 bg-slate-50 rounded text-center">
                      <div className="text-xs text-slate-500">Scale L</div>
                      <div className="text-2xl font-bold">{(selectedAssessment.scores && selectedAssessment.scores.scaleL_Total) ?? computeScoresFromData(selectedAssessment).scaleL_Total}</div>
                    </div>
                  </div>
                </div>

                {/* Exclusions */}
                <div className="p-4 border rounded bg-white">
                  <h6 className="text-slate-700 font-semibold mb-2">الاستثناءات/التوصيات</h6>
                  <div className="text-sm text-slate-700 space-y-1">
                    {Object.keys(EXCLUSION_LABELS).map(k => (
                      <div key={k}><strong>{EXCLUSION_LABELS[k]}:</strong> {YES_NO_AR[safeGet(selectedAssessment, `assessmentData.exclusionCriteria.${k}`)] ?? pretty(safeGet(selectedAssessment, `assessmentData.exclusionCriteria.${k}`))}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Basic info (ordered display) */}
              <div className="p-4 border rounded bg-white mb-4">
                <h6 className="font-semibold mb-3">بيانات أساسية</h6>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
                  {[
                    'childName', 'dob', 'gender', 'diagnosisAge', 'hasRecentReport', 'autismSeverity', 'hasCognitiveDisability',
                    'otherHealthIssues', 'isReceivingTherapy', 'primaryLanguage', 'communicationMethod', 'previousEducation',
                    'familySize', 'birthOrder', 'primaryCaregiver', 'familyGoals', 'phoneNumber', 'whatsappNumber', 'schoolId', 'teacherId'
                  ].map(key => (
                    <div key={key} className="flex flex-col">
                      <span className="text-slate-500">{translateBasicKey(key)}</span>
                      <span className="font-medium">
                        {(() => {
                          const val = safeGet(selectedAssessment, `assessmentData.basicInfo.${key}`);
                          if (key === 'gender') return val === 'male' ? 'ذكر' : val === 'female' ? 'أنثى' : pretty(val);
                          if (key === 'hasRecentReport' || key === 'hasCognitiveDisability') return YES_NO_AR[val] ?? pretty(val);
                          if (key === 'familyGoals') return val ? String(val) : '—';
                          if (key === 'dob') return val ? String(val) : '—';
                          return pretty(val);
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scale A detailed (if present) */}
              {safeGet(selectedAssessment, "assessmentData.scaleA") && (
                <div className="p-4 border rounded bg-white mb-4">
                  <h6 className="font-semibold mb-3">المقياس A — المهارات التمهيدية</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                    {Object.entries(safeGet(selectedAssessment, "assessmentData.scaleA", {})).map(([domain, obj]) => (
                      <div key={domain} className="p-3 border rounded bg-slate-50">
                        <div className="font-medium mb-2">{SCALE_A_DOMAINS[domain] || domain}</div>
                        <div className="space-y-2">
                          {Object.entries(obj || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <div className="text-slate-600 text-sm">{SCALE_A_SKILLS[k] || k}</div>
                              <div className="font-semibold">{pretty(v)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scale B */}
              {safeGet(selectedAssessment, "assessmentData.scaleB") && (
                <div className="p-4 border rounded bg-white mb-4">
                  <h6 className="font-semibold mb-3">المقياس B — سلوكيات التحدي</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                    {Object.entries(safeGet(selectedAssessment, "assessmentData.scaleB", {})).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b py-2">
                        <div className="text-slate-600">{translateBKey(k)}</div>
                        <div className="font-semibold">{pretty(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scale L */}
              {safeGet(selectedAssessment, "assessmentData.scaleL") && (
                <div className="p-4 border rounded bg-white mb-4">
                  <h6 className="font-semibold mb-3">المقياس L — اللعب التفاعلي</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                    {Object.entries(safeGet(selectedAssessment, "assessmentData.scaleL", {})).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b py-2">
                        <div className="text-slate-600">{translateLKey(k)}</div>
                        <div className="font-semibold">{pretty(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team members */}
              {Array.isArray(safeGet(selectedAssessment, "assessmentData.teamMembers", [])) && (
                <div className="p-4 border rounded bg-white mb-4">
                  <h6 className="font-semibold mb-3">أعضاء الفريق</h6>
                  <div className="grid grid-cols-1 gap-2">
                    {safeGet(selectedAssessment, "assessmentData.teamMembers", []).map((m, idx) => (
                      <div key={m.id || idx} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.role || '—'}</div>
                          <div className="text-sm text-slate-500">{m.name || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reinforcers / notes */}
              {safeGet(selectedAssessment, "assessmentData.reinforcers") && (
                <div className="p-4 border rounded bg-white mb-4">
                  <h6 className="font-semibold mb-3">الملاحظات والمعززات</h6>

                  <div className="mb-3">
                    <div className="text-sm text-slate-600 font-medium">المعززات المفضلة</div>
                    <div className="mt-2 text-sm text-slate-700">
                      {Object.entries(safeGet(selectedAssessment, "assessmentData.reinforcers.categories", {}))
                        .filter(([, details]) => details && details.isLiked)
                        .map(([cat, details]) => `${cat}: ${details.examples || details.notes || '—'}`)
                        .join(' • ') || '—'}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-sm text-slate-600 font-medium">ترتيب التفضيل</div>
                    <div className="text-sm font-medium mt-1">{(safeGet(selectedAssessment, "assessmentData.reinforcers.preferences", []) || []).filter(Boolean).join(' > ') || '—'}</div>
                  </div>

                  <div className="text-sm text-slate-600 mt-2">
                    <div className="font-medium mb-1">ملاحظات إضافية</div>
                    <div className="text-slate-700">{safeGet(selectedAssessment, "assessmentData.reinforcers.additionalNotes") || '—'}</div>
                  </div>
                </div>
              )}

              {/* actions */}
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setSelectedAssessment(null)}>إغلاق</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!selectedAssessment) return;
                    if (window.confirm("هل تريد حذف هذا التقرير نهائيًا؟")) {
                      handleDelete(selectedAssessment.id, safeGet(selectedAssessment, "assessmentData.basicInfo.childName", ""));
                      setSelectedAssessment(null);
                    }
                  }}
                >
                  حذف التقرير
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChildrenManager;
