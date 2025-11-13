// src/components/KPIPanel.jsx
import React from "react";

/**
 * KPIPanel
 * props.metrics = {
 *   totalReports: number,
 *   reportsLast7Days: number,
 *   avgA: number,
 *   avgB: number,
 *   avgL: number,
 *   eligibleRate: number (0-100),
 *   topEvaluators: Array<{ id, name?, count }>
 * }
 */

const StatCard = ({ title, value, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
);

const KPIPanel = ({ metrics }) => {
    const {
        totalReports = 0,
        reportsLast7Days = 0,
        avgA = 0,
        avgB = 0,
        avgL = 0,
        eligibleRate = 0,
        topEvaluators = []
    } = metrics || {};

    return (
        <div className="bg-transparent mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="إجمالي التقارير" value={totalReports} subtitle="جميع التقارير" />
                <StatCard title="التقارير (آخر 7 أيام)" value={reportsLast7Days} subtitle="آخر أسبوع" />
                <StatCard title="متوسط المقياس A" value={Number(avgA).toFixed(1)} subtitle="المهارات التمهيدية" />
                <StatCard title="نسبة المؤهلين" value={`${Math.round(eligibleRate)}%`} subtitle="من إجمالي التقارير" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <StatCard title="متوسط المقياس B" value={Number(avgB).toFixed(1)} subtitle="سلوكيات التحدي" />
                <StatCard title="متوسط المقياس L" value={Number(avgL).toFixed(1)} subtitle="اللعب التفاعلي" />

            </div>
        </div>
    );
};

export default KPIPanel;
