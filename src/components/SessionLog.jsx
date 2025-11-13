// SessionLog.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Calendar,
  User,
  FileText,
  Volume2,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// PDF libs
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * SessionLog
 * Props:
 * - data: array of session/notes objects
 * - onUpdateData(updatedArray)
 * - onReloadSessions()
 * - isLoadingSessions (bool)
 * - onOpenSession(session, opts)  <-- NEW optional callback
 *
 * Expected session shape (example): see original file comments.
 */

const SessionLog = ({ data = [], onUpdateData, onReloadSessions, isLoadingSessions, onOpenSession }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const { toast } = useToast();

  // unique filter lists
  const uniqueChildren = useMemo(() => [...new Set((data || []).map(item => item.child).filter(Boolean))], [data]);
  const uniqueActivities = useMemo(() => [...new Set((data || []).map(item => item.activity).filter(Boolean))], [data]);

  // helpers
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (timestamp) => {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    return d.toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '-';
    if (minutes < 60) return `${minutes} دقيقة`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} س ${m} د`;
  };

  const getStatusBadge = (status, item) => {
    const baseClass = 'inline-block px-2 py-0.5 rounded text-xs cursor-pointer transition';

    if (status === 'pending') {
      return (
        <span
          onClick={() => handleOpenSession(item)}
          className={`${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`}
          title="اضغط لفتح خطة السلوك"
        >
          قيد المتابعة
        </span>
      );
    }

    if (status === 'applied') {
      return <span className={`${baseClass} bg-green-100 text-green-800`}>مُطبّق</span>;
    }

    if (status === 'rejected') {
      return <span className={`${baseClass} bg-red-100 text-red-800`}>مرفوض</span>;
    }

    return <span className={`${baseClass} bg-slate-100 text-slate-700`}>{status || '—'}</span>;
  };


  const handleStatusChange = (id, newStatus) => {
    if (!onUpdateData) {
      toast({ title: 'لا يوجد معالج للتحديث', description: 'لا يمكن تحديث الحالة محليًا.', className: 'notification-warning' });
      return;
    }
    const updated = data.map(item => item.id === id ? { ...item, status: newStatus } : item);
    onUpdateData(updated);
    toast({ title: 'تم تحديث الحالة', description: 'تم تغيير حالة الملاحظة بنجاح', className: 'notification-success' });
  };

  const handleExportPDF = async (item) => {
    try {
      toast({ title: 'جاري إنشاء PDF...', className: 'notification-info' });

      // Build HTML content (RTL) safely
      const escapeHtml = (str = '') => String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

      const gp = item.generatedPlan || {};
      const norm = (gp.normalized && gp.normalized) ? gp.normalized : gp;

      const buildListHtml = (arr) => {
        if (!arr || !arr.length) return `<div>—</div>`;
        return `<ul style="padding-inline-start:18px;margin:6px 0;">${arr.map(x => `<li style="margin:4px 0">${escapeHtml(String(typeof x === 'string' ? x : (x.text || x.name || x)))}</li>`).join('')}</ul>`;
      };

      const getReinforcementHtml = (r) => {
        if (!r) return `<div>—</div>`;
        if (typeof r === 'string') return `<div>${escapeHtml(r)}</div>`;
        // object
        const type = escapeHtml(r.type || r.name || r.label || '-');
        const schedule = escapeHtml(r.schedule || r.frequency || '-');
        const notes = r.notes ? `<div style="margin-top:6px">${escapeHtml(String(r.notes))}</div>` : '';
        return `<div><div><b>النوع:</b> ${type}</div><div><b>الجدول:</b> ${schedule}</div>${notes}</div>`;
      };

      const getGeneralizationHtml = (g) => {
        if (!g) return `<div>—</div>`;
        if (typeof g === 'string') return `<div>${escapeHtml(g)}</div>`;
        if (Array.isArray(g)) return buildListHtml(g);
        // object or other
        try {
          return `<div>${escapeHtml(JSON.stringify(g))}</div>`;
        } catch (e) {
          return `<div>—</div>`;
        }
      };

      const reinforcementSource =
        norm?.reinforcement ||
        norm?.reinforcements ||
        norm?.reinforcement_plan ||
        norm?.reinforcementPlan ||
        null;

      const generalizationSource =
        norm?.generalization_plan ||
        norm?.generalization ||
        norm?.generalisation ||
        norm?.generalizationPlan ||
        null;

      const html = `
        <div dir="rtl" style="font-family: 'Tahoma', 'Arial', sans-serif; color:#152238; background:#ffffff; padding:20px; width:794px; box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="text-align:left;">
              <div style="font-size:12px;color:#6b7280">تاريخ الطباعة</div>
              <div style="font-weight:600;font-size:12px;">${escapeHtml(new Date().toLocaleString('ar-SA'))}</div>
            </div>
            <div style="text-align:right;">
              <h2 style="margin:0;font-size:20px;color:#0f172a">تقرير الجلسة</h2>
              <div style="font-size:12px;color:#6b7280">الطفل: ${escapeHtml(item.child || '-')} · النشاط: ${escapeHtml(item.activity || '-')}</div>
            </div>
          </div>

          <div style="margin-top:8px;padding:12px;border-radius:8px;border:1px solid #e6e9ef;background:#fbfcff;">
            <h3 style="margin:0 0 8px 0;font-size:14px;color:#0f172a">الوصف السريع / مقتطف</h3>
            <div style="font-size:13px;color:#374151;line-height:1.4">${escapeHtml(item.text || (item.hasAudio ? 'ملاحظة صوتية' : '-'))}</div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div style="padding:12px;border-radius:8px;border:1px solid #e6e9ef;background:#fff;">
              <div style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:6px">الهدف / الملخص</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(norm?.smart_goal || norm?.summary || '-')}</div>
            </div>

            <div style="padding:12px;border-radius:8px;border:1px solid #e6e9ef;background:#fff;">
              <div style="font-size:13px;color:#0f172a;font-weight:600;margin-bottom:6px">تفاصيل الجلسة</div>
              <div style="font-size:13px;color:#374151">التاريخ: ${escapeHtml(formatDate(item.timestamp))}<br/>مدة الجلسة: ${escapeHtml(formatDuration(item.sessionDuration))}</div>
            </div>
          </div>

          <div style="margin-top:12px;padding:12px;border-radius:8px;border:1px solid #e6e9ef;background:#fff;">
            <h4 style="margin:0 0 8px 0;font-size:14px;color:#0f172a">الخطة المولّدة (تفصيل)</h4>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">الاستراتيجية التعليمية</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(norm?.teaching_strategy || '-')}</div>
            </div>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">تحليل المهمة (خطوات)</div>
              ${buildListHtml(norm?.task_analysis_steps)}
            </div>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">الأنشطة المقترحة</div>
              ${buildListHtml(norm?.activities)}
            </div>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">خطة التنفيذ</div>
              ${buildListHtml(norm?.execution_plan)}
            </div>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">خطة التعزيز</div>
              ${getReinforcementHtml(reinforcementSource)}
            </div>

            <div style="margin-bottom:8px;">
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">خطة التعميم</div>
              ${getGeneralizationHtml(generalizationSource)}
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;">
              <div style="flex:1;min-width:200px;">
                <div style="font-size:12px;color:#0f172a;font-weight:600">قياس الأداء</div>
                <div style="font-size:13px;color:#374151">${escapeHtml((norm?.measurement && (norm.measurement.type || norm.measurement.sheet)) ? `${norm.measurement.type || '-'} · ${norm.measurement.sheet || '-'}` : '-')}</div>
              </div>
              <div style="flex:1;min-width:200px;">
                <div style="font-size:12px;color:#0f172a;font-weight:600">التكييفات</div>
                <div style="font-size:13px;color:#374151">${escapeHtml((norm?.accommodations && norm.accommodations.length) ? norm.accommodations.join(' · ') : '-')}</div>
              </div>
            </div>
          </div>

          <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:12px;color:#6b7280">مصدر: ${escapeHtml(item.meta?.source || item.generatedPlan?.meta?.source || '-')}</div>
            <div style="font-size:12px;color:#6b7280">مُعرّف الجلسة: ${escapeHtml(item.id || '-')}</div>
          </div>
        </div>
      `;

      // Create container
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      // Render via html2canvas
      const node = wrapper.firstElementChild;
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');

      // Create PDF A4 (mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions in mm
      const pxToMm = (px) => px * 0.264583333; // 1 px ≈ 0.264583333 mm at 96 DPI
      const imgWidthMm = pxToMm(canvas.width);
      const imgHeightMm = pxToMm(canvas.height);

      // Fit to page while preserving aspect ratio, leave small margin
      const margin = 8; // mm
      const maxWidth = pdfWidth - margin * 2;
      const maxHeight = pdfHeight - margin * 2;

      let drawWidth = imgWidthMm;
      let drawHeight = imgHeightMm;
      const widthRatio = maxWidth / imgWidthMm;
      const heightRatio = maxHeight / imgHeightMm;
      const scale = Math.min(widthRatio, heightRatio, 1);

      drawWidth = imgWidthMm * scale;
      drawHeight = imgHeightMm * scale;

      const x = (pdfWidth - drawWidth) / 2;
      const y = (pdfHeight - drawHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);
      const filename = `session_${item.child || 'child'}_${(item.id || '').slice(0, 8) || ''}_${new Date(item.timestamp || Date.now()).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
      pdf.save(filename);

      // cleanup
      document.body.removeChild(wrapper);

      toast({ title: 'تم تنزيل PDF', description: `تم حفظ الملف: ${filename}`, className: 'notification-success' });
    } catch (err) {
      console.error('export PDF error', err);
      toast({ title: 'فشل إنشاء PDF', description: err.message || 'حاول مرة أخرى', className: 'notification-error' });
    }
  };

  const handleViewDetails = (id) => setExpandedRow(prev => prev === id ? null : id);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedChild('');
    setSelectedActivity('');
    setDateRange('');
  };

  // NEW: open session handler - calls parent callback if provided
  const handleOpenSession = (item) => {
    const shouldOpenChecklist = !!(item?.meta?.openChecklistOnOpen || item?.type === 'behavior_session');
    if (typeof onOpenSession === 'function') {
      // pass the full item and a small opts object
      onOpenSession(item, { openChecklist: shouldOpenChecklist });
      // optionally collapse expanded row
      setExpandedRow(null);
    } else {
      toast({
        title: 'تعذر فتح الجلسة',
        description: 'لم يتم تمرير onOpenSession إلى SessionLog. اضبط onOpenSession(item, { openChecklist }) في المكوّن الأب.',
        className: 'notification-warning'
      });
    }
  };

  // utility to safely render arrays/strings
  const safeArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return [];
  };

  // Render a behavioral plan in readable form (extended to include reinforcement & generalization)
  const renderBehaviorPlan = (plan) => {
    if (!plan) return <div>—</div>;

    const behaviorGoal = plan.behavior_goal || plan.behaviorGoal || plan.goal || '';
    const antecedents = safeArray(plan.antecedents || plan.preceding || []);
    const consequences = safeArray(plan.consequences || plan.following || []);
    const functionAnalysis = plan.function_analysis || plan.behavior_function || plan.function_analysis || '';
    const antecedentStrategies = safeArray(plan.antecedent_strategies || plan.antecedentStrategies || plan.prevention || plan.suggestions);
    const consequenceStrategies = safeArray(plan.consequence_strategies || plan.consequenceStrategies || plan.response_strategies || plan.customizations);
    const replacement = plan.replacement_behavior || plan.replacement || plan.replacementBehavior || {};
    const replacementSkill = replacement.skill || replacement.name || replacement.label || '';
    const replacementModality = replacement.modality || replacement.medium || '';
    const dataCollection = plan.data_collection || plan.measurement || {};
    const reviewAfter = plan.review_after_days || plan.reviewAfterDays || plan.review || 14;
    const safetyFlag = !!(plan.safety_flag || plan.safetyFlag);
    const suggestions = safeArray(plan.suggestions || []);
    const customizations = safeArray(plan.customizations || []);

    // reinforcement & generalization (flexible keys)
    const reinforcement =
      plan.reinforcement ||
      plan.reinforcements ||
      plan.reinforcement_plan ||
      plan.reinforcementPlan ||
      null;

    const generalization =
      plan.generalization_plan ||
      plan.generalization ||
      plan.generalisation ||
      plan.generalizationPlan ||
      null;

    return (
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium text-slate-700">الهدف السلوكي</h5>
          <div className="text-slate-600 p-3 bg-white rounded border">{behaviorGoal || '—'}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-slate-700">المثيرات / ما يسبق السلوك</h5>
            {antecedents.length ? (
              <ul className="mt-2 text-slate-600 space-y-1">
                {antecedents.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            ) : <div className="text-slate-500">—</div>}
          </div>

          <div>
            <h5 className="text-sm font-medium text-slate-700">العواقب / ما يلي السلوك</h5>
            {consequences.length ? (
              <ul className="mt-2 text-slate-600 space-y-1">
                {consequences.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            ) : <div className="text-slate-500">—</div>}
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700">فرضية الوظيفة</h5>
          <div className="text-slate-600 p-3 bg-white rounded border">{functionAnalysis || '—'}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-slate-700">استراتيجيات تهيئة (Antecedent)</h5>
            {antecedentStrategies.length ? (
              <ul className="mt-2 text-slate-600 space-y-1">
                {antecedentStrategies.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            ) : <div className="text-slate-500">—</div>}
          </div>

          <div>
            <h5 className="text-sm font-medium text-slate-700">استراتيجيات استجابة/عواقب</h5>
            {consequenceStrategies.length ? (
              <ul className="mt-2 text-slate-600 space-y-1">
                {consequenceStrategies.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            ) : <div className="text-slate-500">—</div>}
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700">السلوك البديل المقترح</h5>
          <div className="text-slate-600 p-3 bg-white rounded border">
            {replacementSkill ? <div>المهارة: {replacementSkill}</div> : null}
            {replacementModality ? <div>الوسيلة: {replacementModality}</div> : null}
            {!replacementSkill && !replacementModality ? <div>—</div> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-slate-700">جمع البيانات</h5>
            <div className="text-slate-600 p-3 bg-white rounded border">
              المقياس: {dataCollection.metric || dataCollection.type || '-'}<br />
              الأداة: {dataCollection.tool || dataCollection.sheet || '-'}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-slate-700">معلومات إضافية</h5>
            <div className="text-slate-600 p-3 bg-white rounded border">
              مراجعة بعد: {reviewAfter} يومًا<br />
              حالة السلامة: {safetyFlag ? <span className="text-red-600 font-semibold">محتمل وجود خطر</span> : 'طبيعي/غير خطير'}
            </div>
          </div>
        </div>

        {/* Reinforcement */}
        <div>
          <h5 className="text-sm font-medium text-slate-700">خطة التعزيز</h5>
          <div className="text-slate-600 p-3 bg-white rounded border">
            {reinforcement
              ? (typeof reinforcement === 'string' ? reinforcement : (
                <>
                  <div><b>النوع:</b> {reinforcement.type || reinforcement.name || '-'}</div>
                  <div><b>الجدول:</b> {reinforcement.schedule || reinforcement.frequency || '-'}</div>
                  {reinforcement.notes ? <div><b>ملاحظات:</b> {reinforcement.notes}</div> : null}
                </>
              ))
              : <div>—</div>
            }
          </div>
        </div>

        {/* Generalization */}
        <div>
          <h5 className="text-sm font-medium text-slate-700">خطة التعميم</h5>
          <div className="text-slate-600 p-3 bg-white rounded border">
            {generalization
              ? (Array.isArray(generalization) ? (
                <ul className="mt-2 text-slate-600 space-y-1">
                  {generalization.map((g, i) => <li key={i}>• {g}</li>)}
                </ul>
              ) : (typeof generalization === 'string' ? generalization : JSON.stringify(generalization)))
              : <div>—</div>
            }
          </div>
        </div>

        {(suggestions.length || customizations.length) && (
          <div>
            <h5 className="text-sm font-medium text-slate-700">اقتراحات / تخصيصات إضافية</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {suggestions.length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700">المقترحات</h6>
                  <ul className="mt-2 text-slate-600 space-y-1">
                    {suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {customizations.length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-slate-700">التخصيصات</h6>
                  <ul className="mt-2 text-slate-600 space-y-1">
                    {customizations.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // filter + sort
  const filteredData = useMemo(() => {
    const today = new Date();
    return (data || []).filter(item => {
      // search
      const matchesSearch = !searchTerm || (
        (item.text && item.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.child && item.child.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.activity && item.activity.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const matchesChild = !selectedChild || item.child === selectedChild;
      const matchesActivity = !selectedActivity || item.activity === selectedActivity;

      // date range
      let matchesDate = true;
      if (dateRange && item.timestamp) {
        const itemDate = new Date(item.timestamp);
        if (dateRange === 'today') {
          matchesDate = itemDate.toDateString() === today.toDateString();
        } else if (dateRange === 'week') {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = itemDate >= monthAgo;
        }
      }

      return matchesSearch && matchesChild && matchesActivity && matchesDate;
    }).sort((a, b) => {
      let aValue, bValue;
      if (sortBy === 'date') {
        aValue = new Date(a.timestamp || 0).getTime();
        bValue = new Date(b.timestamp || 0).getTime();
      } else if (sortBy === 'child') {
        aValue = (a.child || '').toLowerCase();
        bValue = (b.child || '').toLowerCase();
      } else if (sortBy === 'activity') {
        aValue = (a.activity || '').toLowerCase();
        bValue = (b.activity || '').toLowerCase();
      } else {
        aValue = a.timestamp;
        bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : (aValue < bValue ? -1 : 0);
      } else {
        return aValue < bValue ? 1 : (aValue > bValue ? -1 : 0);
      }
    });
  }, [data, searchTerm, selectedChild, selectedActivity, dateRange, sortBy, sortOrder]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header / Controls */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">سجل الجلسات</h2>
            <p className="text-slate-600">إجمالي الملاحظات: {data.length}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className="text-sm text-slate-500">النتائج المعروضة</p>
              <p className="text-2xl font-bold text-green-600">{filteredData.length}</p>
            </div>

            {onReloadSessions && (
              <Button onClick={onReloadSessions} disabled={isLoadingSessions} variant="outline" size="sm" className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                {isLoadingSessions ? 'جاري التحميل...' : 'إعادة تحميل'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث في الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg input-focus"
            />
          </div>

          <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg input-focus">
            <option value="">جميع الأطفال</option>
            {uniqueChildren.map(child => <option key={child} value={child}>{child}</option>)}
          </select>

          <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg input-focus">
            <option value="">جميع الأنشطة</option>
            {uniqueActivities.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg input-focus">
            <option value="">جميع التواريخ</option>
            <option value="today">اليوم</option>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
          </select>
        </div>

        {/* Sort & Clear */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">ترتيب حسب:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-1 border border-slate-200 rounded text-sm">
              <option value="date">التاريخ</option>
              <option value="child">الطفل</option>
              <option value="activity">النشاط</option>
            </select>

            <Button size="sm" variant="ghost" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          <Button onClick={clearFilters} variant="outline" size="sm">مسح المرشحات</Button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">لا توجد نتائج</h3>
            <p className="text-slate-500">جرب تغيير معايير البحث أو المرشحات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right p-4 font-medium text-slate-700">التاريخ والوقت</th>
                  <th className="text-right p-4 font-medium text-slate-700">الطفل</th>
                  <th className="text-right p-4 font-medium text-slate-700">النوع</th>
                  <th className="text-right p-4 font-medium text-slate-700">النشاط</th>
                  <th className="text-right p-4 font-medium text-slate-700">مقتطف</th>
                  <th className="text-right p-4 font-medium text-slate-700">الحالة</th>
                  <th className="text-right p-4 font-medium text-slate-700">إجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((item, idx) => (
                  <React.Fragment key={item.id || idx}>
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{formatDate(item.timestamp)}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{item.child || 'غير محدد'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {item.hasAudio ? <Volume2 className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-green-500" />}
                          <span className="text-sm">{item.hasAudio ? 'صوت' : 'نص'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{item.activity || 'غير محدد'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-sm text-slate-600 truncate max-w-xs">{item.text ? item.text.slice(0, 120) : 'ملاحظة صوتية'}</p>
                      </td>

                      <td className="p-4">{getStatusBadge(item.status, item)}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {/* view details (toggle) */}
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(item.id)} className="h-8 w-8 p-0" aria-label="عرض التفاصيل">
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* export */}
                          <Button size="sm" variant="ghost" onClick={() => handleExportPDF(item)} className="h-8 w-8 p-0" aria-label="تنزيل PDF">
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* NEW: open in BehaviorPlan / open checklist */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenSession(item)}
                            className="h-8 w-8 p-0"
                            aria-label={(item?.meta?.openChecklistOnOpen || item?.type === 'behavior_session') ? 'فتح قائمة التحقق' : 'فتح الجلسة'}
                            title={(item?.meta?.openChecklistOnOpen || item?.type === 'behavior_session') ? 'فتح قائمة التحقق' : 'فتح الجلسة'}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>

                    {/* Expanded details row */}
                    <AnimatePresence>
                      {expandedRow === item.id && (
                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-50">
                          <td colSpan="7" className="p-4">
                            <div className="space-y-4">
                              {/* Full text */}
                              {item.text && (
                                <div>
                                  <h4 className="font-medium text-slate-700 mb-2">النص الكامل</h4>
                                  <p className="text-slate-600 bg-white p-3 rounded border">{item.text}</p>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div>
                                  <h5 className="text-sm font-medium text-slate-700">توقيت الحفظ</h5>
                                  <div className="text-sm text-slate-600">{formatRelativeDate(item.meta?.savedAt || item.timestamp)}</div>
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-slate-700">مدة الجلسة</h5>
                                  <div className="text-sm text-slate-600">{formatDuration(item.sessionDuration)}</div>
                                </div>
                              </div>

                              {/* Tags */}
                              {item.tags && item.tags.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-slate-700 mb-2">الوسوم</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag, i) => (
                                      <span key={tag + i} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs inline-flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Energy */}
                              {typeof item.energy === 'number' && (
                                <div>
                                  <h4 className="font-medium text-slate-700 mb-2">مستوى الطاقة</h4>
                                  <div className="flex items-center gap-3">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <span key={i} className={`text-lg ${i < item.energy ? 'text-yellow-400' : 'text-gray-300'}`}>⭐</span>
                                      ))}
                                    </div>
                                    <span className="text-sm text-slate-600">{item.energy}/5</span>
                                  </div>
                                </div>
                              )}

                              {/* Suggestions & Customizations */}
                              {(item.suggestions && item.suggestions.length) || (item.customizations && item.customizations.length) ? (
                                <div>
                                  <h4 className="font-medium text-slate-700 mb-2">المقترحات / التخصيصات</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {item.suggestions && item.suggestions.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium text-slate-700">المقترحات</h5>
                                        <ul className="mt-2 space-y-1">
                                          {item.suggestions.map((s, i) => <li key={i} className="text-slate-600 text-sm">• {s}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                    {item.customizations && item.customizations.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-medium text-slate-700">التخصيصات</h5>
                                        <ul className="mt-2 space-y-1">
                                          {item.customizations.map((c, i) => <li key={i} className="text-slate-600 text-sm">• {c}</li>)}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : null}

                              {/* Generated Plan: show normalized sections if available */}
                              {item.generatedPlan && (
                                <div>
                                  <h4 className="font-semibold text-slate-700 mb-2">الخطة المولّدة</h4>

                                  {/* prefer normalized if present */}
                                  {item.generatedPlan.normalized ? (
                                    <div className="space-y-3">
                                      {/* smart goal / summary */}
                                      <div>
                                        <h5 className="text-sm font-medium text-slate-700">الهدف الذكي / الملخص</h5>
                                        <div className="text-slate-600 p-3 bg-white rounded border">{item.generatedPlan.normalized.smart_goal || item.generatedPlan.normalized.summary || '—'}</div>
                                      </div>

                                      {/* teaching strategy */}
                                      {item.generatedPlan.normalized.teaching_strategy && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">الاستراتيجية التعليمية</h5>
                                          <div className="text-slate-600 p-3 bg-white rounded border">{item.generatedPlan.normalized.teaching_strategy}</div>
                                        </div>
                                      )}

                                      {/* task analysis */}
                                      {item.generatedPlan.normalized.task_analysis_steps && item.generatedPlan.normalized.task_analysis_steps.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">تحليل المهمة (خطوات)</h5>
                                          <ol className="list-decimal pr-6 mt-2 text-slate-600 space-y-1">
                                            {item.generatedPlan.normalized.task_analysis_steps.map((s, i) => <li key={i}>{s}</li>)}
                                          </ol>
                                        </div>
                                      )}

                                      {/* activities */}
                                      {item.generatedPlan.normalized.activities && item.generatedPlan.normalized.activities.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">الأنشطة المقترحة</h5>
                                          <ul className="mt-2 text-slate-600 space-y-1">
                                            {item.generatedPlan.normalized.activities.map((a, i) => (
                                              <li key={i}>
                                                {typeof a === 'string' ? a : `${a.type || a.label || 'نشاط'}: ${a.name || a.title || JSON.stringify(a)}`}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {/* execution plan */}
                                      {item.generatedPlan.normalized.execution_plan && item.generatedPlan.normalized.execution_plan.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">الخطة التنفيذية</h5>
                                          <ol className="list-decimal pr-6 mt-2 text-slate-600 space-y-1">
                                            {item.generatedPlan.normalized.execution_plan.map((step, i) => <li key={i}>{step}</li>)}
                                          </ol>
                                        </div>
                                      )}

                                      {/* reinforcement (new) */}
                                      {(item.generatedPlan.normalized.reinforcement || item.generatedPlan.normalized.reinforcements || item.generatedPlan.normalized.reinforcement_plan) && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">خطة التعزيز</h5>
                                          <div className="text-slate-600 p-3 bg-white rounded border">
                                            {(() => {
                                              const r = item.generatedPlan.normalized.reinforcement || item.generatedPlan.normalized.reinforcements || item.generatedPlan.normalized.reinforcement_plan;
                                              if (typeof r === 'string') return r;
                                              return (
                                                <>
                                                  <div><b>النوع:</b> {r.type || r.name || r.label || '-'}</div>
                                                  <div><b>الجدول:</b> {r.schedule || r.frequency || '-'}</div>
                                                  {r.notes ? <div><b>ملاحظات:</b> {r.notes}</div> : null}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      )}

                                      {/* generalization (new) */}
                                      {(item.generatedPlan.normalized.generalization_plan || item.generatedPlan.normalized.generalization || item.generatedPlan.normalized.generalisation) && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">خطة التعميم</h5>
                                          <div className="text-slate-600 p-3 bg-white rounded border">
                                            {(() => {
                                              const g = item.generatedPlan.normalized.generalization_plan || item.generatedPlan.normalized.generalization || item.generatedPlan.normalized.generalisation;
                                              if (!g) return '—';
                                              if (Array.isArray(g)) return <ul className="list-disc pr-6 mt-2">{g.map((x, i) => <li key={i}>{x}</li>)}</ul>;
                                              if (typeof g === 'string') return g;
                                              return JSON.stringify(g);
                                            })()}
                                          </div>
                                        </div>
                                      )}

                                      {/* measurement */}
                                      {item.generatedPlan.normalized.measurement && (
                                        <div>
                                          <h5 className="text-sm font-medium text-slate-700">قياس الأداء</h5>
                                          <div className="text-slate-600 p-3 bg-white rounded border">
                                            النوع: {item.generatedPlan.normalized.measurement.type || '-'}<br />
                                            الأداة: {item.generatedPlan.normalized.measurement.sheet || '-'}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    // If plan looks like behavioral, render it in readable form
                                    (item.generatedPlan.type === 'behavioral' || item.generatedPlan.behavior_goal || item.generatedPlan.antecedents) ? (
                                      renderBehaviorPlan(item.generatedPlan)
                                    ) : (
                                      // fallback: print whole generatedPlan object prettified
                                      <div>
                                        <h5 className="text-sm font-medium text-slate-700">محتوى الخطة (خام)</h5>
                                        <pre className="text-xs p-3 bg-white rounded border text-slate-700 overflow-auto" style={{ maxHeight: 240 }}>
                                          {JSON.stringify(item.generatedPlan, null, 2)}
                                        </pre>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Audio playback (if exists) */}
                              {item.audioUrl && (
                                <div>
                                  <h4 className="font-medium text-slate-700 mb-2">تشغيل الصوت</h4>
                                  <audio controls src={item.audioUrl} className="w-full" />
                                </div>
                              )}

                              {/* NEW: CTA to open session / checklist */}
                              {(item?.meta?.openChecklistOnOpen || item?.type === 'behavior_session') && (
                                <div className="pt-2">
                                  <Button onClick={() => handleOpenSession(item)} variant="outline">
                                    فتح قائمة التحقق (راجع الجلسة)
                                  </Button>
                                </div>
                              )}
                              {/* end NEW */}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SessionLog;
