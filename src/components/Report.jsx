// src/components/Report.jsx
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import saveReport from '../firebase/saveReport';
// import {  } from '@/src/firebase/saveReport';

const InfoCard = ({ title, children, className = '' }) => (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
        <h3 className="text-lg font-bold text-brand-800 border-b-2 border-brand-200 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);

const InfoItem = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
        <p className="font-medium text-gray-600">{label}</p>
        <p className="font-semibold text-gray-900">{value || 'غير متوفر'}</p>
    </div>
);

const Report = ({ data, exclusionTriggered }) => {
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState(null);
    const [error, setError] = useState(null);

    const scores = useMemo(() => {
        const scaleA_Total = Object.values(data.scaleA)
            .flatMap(domain => Object.values(domain))
            .reduce((a, b) => a + b, 0);
        const scaleB_Total = Object.values(data.scaleB).reduce((a, b) => a + b, 0);
        const scaleL_Total = Object.values(data.scaleL).reduce((a, b) => a + b, 0);

        return { scaleA_Total, scaleB_Total, scaleL_Total };
    }, [data]);

    const decision = useMemo(() => {
        if (exclusionTriggered) {
            return {
                status: 'غير مؤهل حاليًا (استبعاد)',
                reason: 'تم استيفاء أحد معايير الاستبعاد السريعة. يُنصح بتحويل الطفل لجهة علاجية/تعليمية أكثر تخصصًا.',
                color: 'red',
                icon: '🚫'
            };
        }

        const { scaleA_Total, scaleB_Total, scaleL_Total } = scores;

        if (scaleA_Total >= 25 && scaleB_Total <= 8) {
            return {
                status: 'مؤهل',
                reason: 'المهارات التمهيدية مناسبة والسلوكيات المعيقة قليلة. يمكن للطفل الاستفادة من البرنامج.',
                color: 'green',
                icon: '✅'
            };
        } else if ((scaleA_Total < 15) || (scaleB_Total > 11)) {
            return {
                status: 'غير مؤهل حاليًا',
                reason: 'يواجه الطفل صعوبات كبيرة في المهارات التمهيدية أو لديه سلوكيات معيقة تتطلب تدخلًا متخصصًا ومكثفًا.',
                color: 'red',
                icon: '❌'
            };
        } else { // Boundary case
            let reason = 'يحتاج الطفل إلى دعم إضافي أو متابعة قبل اتخاذ القرار النهائي. ';
            if (scaleL_Total >= 6) {
                reason += 'مهارات اللعب لديه جيدة، مما يرجح إمكانية استفادته من الدعم الإضافي.';
            } else if (scaleL_Total <= 3) {
                reason += 'مهارات اللعب لديه محدودة، مما قد يتطلب إعادة تقييم أو تحويل لجهة أخرى.';
            }
            return {
                status: 'قابل للدعم الإضافي',
                reason,
                color: 'yellow',
                icon: '⚠️'
            };
        }
    }, [scores, exclusionTriggered]);

    const decisionCode = exclusionTriggered
        ? 'excluded'
        : (scores.scaleA_Total >= 25 && scores.scaleB_Total <= 8)
            ? 'eligible'
            : ((scores.scaleA_Total < 15) || (scores.scaleB_Total > 11))
                ? 'not_eligible'
                : 'boundary';

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaveResult(null);
        try {
            const result = await saveReport(data, scores, decisionCode);
            setSaveResult(result.id);
        } catch (e) {
            console.error('خطأ أثناء الحفظ في فايربيس:', e);
            setError(e?.userFacingMessage || 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    const scaleAChartData = useMemo(() => ([
        { name: 'الانتباه', score: Object.values(data.scaleA.attention).reduce((a, b) => a + b, 0), max: 8 },
        { name: 'التواصل', score: Object.values(data.scaleA.communication).reduce((a, b) => a + b, 0), max: 8 },
        { name: 'الاجتماعي', score: Object.values(data.scaleA.social).reduce((a, b) => a + b, 0), max: 10 },
        { name: 'الاعتماد', score: Object.values(data.scaleA.selfReliance).reduce((a, b) => a + b, 0), max: 8 },
        { name: 'الإدراك', score: Object.values(data.scaleA.cognition).reduce((a, b) => a + b, 0), max: 8 },
        { name: 'الحركات', score: Object.values(data.scaleA.fineMotor).reduce((a, b) => a + b, 0), max: 8 },
    ]), [data.scaleA]);

    const colorMap = {
        green: 'bg-green-100 border-green-500 text-green-800',
        yellow: 'bg-yellow-100 border-yellow-500 text-yellow-800',
        red: 'bg-red-100 border-red-500 text-red-800',
    };

    return (
        <div className="bg-gray-50 p-4 sm:p-8 rounded-lg">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-extrabold text-brand-900">تقرير التقييم النهائي</h2>
                <div className="no-print flex gap-3">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors">
                        {saving ? 'جاري الحفظ...' : 'حفظ في فايربيس'}
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                        طباعة التقرير
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className={`p-6 rounded-xl border-l-8 ${colorMap[decision.color]}`}>
                    <p className="text-sm font-bold uppercase tracking-wider">{decision.icon} القرار النهائي</p>
                    <p className="text-2xl font-bold mt-1">{decision.status}</p>
                    <p className="mt-2">{decision.reason}</p>
                </div>

                {saveResult && (
                    <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-300 no-print">
                        <p className="font-semibold">تم الحفظ بنجاح. رقم المعرف:</p>
                        <p dir="ltr" className="font-mono">{saveResult}</p>
                    </div>
                )}
                {error && (
                    <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-300 no-print">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard title="ملخص الدرجات" className="md:col-span-1">
                        <InfoItem label="مقياس المهارات (A)" value={`${scores.scaleA_Total} / 50`} />
                        <InfoItem label="مقياس السلوكيات (B)" value={`${scores.scaleB_Total} / 24`} />
                        <InfoItem label="مقياس اللعب (L)" value={`${scores.scaleL_Total} / 8`} />
                    </InfoCard>

                    <InfoCard title="بيانات الطفل" className="md:col-span-2">
                        <InfoItem label="اسم الطفل" value={data.basicInfo.childName} />
                        <InfoItem label="تاريخ الميلاد" value={data.basicInfo.dob} />
                        <InfoItem label="الجنس" value={data.basicInfo.gender === 'male' ? 'ذكر' : 'أنثى'} />
                    </InfoCard>
                </div>

                {!exclusionTriggered && (
                    <InfoCard title="تفاصيل مهارات (A)">
                        <div style={{ direction: 'ltr' }} className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scaleAChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="score" name="الدرجة المحرزة" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </InfoCard>
                )}

                <InfoCard title="المعززات المفضلة">
                    <ul className="list-disc pr-5 space-y-1">
                        {Object.entries(data.reinforcers.categories)
                            .filter(([, details]) => details.isLiked)
                            .map(([category, details]) => (
                                <li key={category}>
                                    <span className="font-semibold">{category}:</span> {details.notes || 'لا توجد ملاحظات'}
                                </li>
                            ))
                        }
                    </ul>
                    <h4 className="font-semibold mt-4">ترتيب التفضيل:</h4>
                    <p>{(data.reinforcers.preferences || []).filter(p => p).join(' > ') || 'لم يحدد'}</p>
                </InfoCard>

                <InfoCard title="أعضاء فريق التقييم">
                    {data.teamMembers.map(member => (
                        <InfoItem key={member.id} label={member.role} value={member.name} />
                    ))}
                </InfoCard>
            </div>
        </div>
    );
};

export default Report;
