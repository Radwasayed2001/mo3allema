import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Activity,
  Target,
  Award,
  Calendar,
  Plus,
  Minus,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = ({ data = [], currentChild = '' }) => {
  const { toast } = useToast();
  const [sessionMetrics, setSessionMetrics] = useState({
    frequency: 0,
    duration: 0,
    accuracy: 0,
    trials: 0,
  });

  const handleMetricChange = (metric, change) => {
    setSessionMetrics(prev => ({
      ...prev,
      [metric]: Math.max(0, prev[metric] + change),
    }));
  };

  // correct: boolean (true = correct trial, false = incorrect trial)
  const handleAccuracyChange = (correct) => {
    setSessionMetrics(prev => ({
      ...prev,
      accuracy: Math.max(0, prev.accuracy + (correct ? 1 : 0)),
      trials: Math.max(0, prev.trials + 1),
    }));
  };

  const accuracyPercentage = sessionMetrics.trials > 0
    ? Math.round((sessionMetrics.accuracy / sessionMetrics.trials) * 100)
    : 0;

  const stats = useMemo(() => {
    try {
      const filteredData = currentChild ? data.filter(item => item.child === currentChild) : data || [];

      const thisWeek = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      });

      const appliedCount = filteredData.filter(item => item.status === 'applied').length;
      const totalCount = filteredData.length;
      const applicationRate = totalCount > 0 ? Math.round((appliedCount / totalCount) * 100) : 0;

      const activityCounts = {};
      filteredData.forEach(item => {
        if (item.activity) {
          activityCounts[item.activity] = (activityCounts[item.activity] || 0) + 1;
        }
      });

      const topActivity = Object.entries(activityCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'لا توجد بيانات';

      const progressData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayData = filteredData.filter(item => {
          const itemDate = new Date(item.timestamp);
          return itemDate.toDateString() === date.toDateString();
        });
        return {
          day: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
          value: dayData.length,
          applied: dayData.filter(item => item.status === 'applied').length
        };
      });

      const improvementRate = progressData[0].value === 0
        ? (progressData[6].value > 0 ? 100 : 0)
        : Math.max(0, Math.round(((progressData[6].value - progressData[0].value) / Math.max(1, progressData[0].value)) * 100));

      return {
        thisWeekCount: thisWeek.length,
        applicationRate,
        topActivity,
        totalNotes: totalCount,
        appliedNotes: appliedCount,
        pendingNotes: filteredData.filter(item => item.status === 'pending').length,
        progressData,
        improvementRate
      };
    } catch (e) {
      console.error('Dashboard stats compute error', e);
      return {
        thisWeekCount: 0,
        applicationRate: 0,
        topActivity: 'لا توجد بيانات',
        totalNotes: 0,
        appliedNotes: 0,
        pendingNotes: 0,
        progressData: Array.from({ length: 7 }, (_, i) => ({ day: '', value: 0, applied: 0 })),
        improvementRate: 0
      };
    }
  }, [data, currentChild]);

  // side-effect: show toast if low improvement — moved out of useMemo
  useEffect(() => {
    if (stats.totalNotes > 5 && stats.improvementRate < 15) {
      toast({
        title: "تنبيه مراجعة تلقائي 📉",
        description: `معدل التقدم (${stats.improvementRate}%) أقل من المتوقع (15%). قد تحتاج الخطة إلى تعديل.`,
        className: "notification-warning",
        duration: 10000,
      });
    }
    // only when these values change
  }, [stats.improvementRate, stats.totalNotes, toast]);

  const colorMap = {
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    gray: { bg: 'bg-slate-100', icon: 'text-slate-600' }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = 'green' }) => {
    const styles = colorMap[color] || colorMap.gray;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 card-hover"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            {subtitle && (
              <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`${styles.bg} w-12 h-12 rounded-lg flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${styles.icon}`} />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">لوحة المتابعة</h2>
        </div>
        <p className="text-blue-100">
          {currentChild ? `رسم التقدم للطفل: ${currentChild}` : 'نظرة شاملة على جميع الأطفال'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={FileText} title="ملاحظات هذا الأسبوع" value={stats.thisWeekCount} subtitle="ملاحظة جديدة" color="green" />
        <StatCard icon={CheckCircle} title="نسبة التطبيق" value={`${stats.applicationRate}%`} subtitle={`${stats.appliedNotes} من ${stats.totalNotes}`} color="blue" />
        <StatCard icon={Award} title="النشاط الأكثر نجاحاً" value={stats.topActivity} subtitle="الأكثر تكراراً" color="purple" />
        <StatCard icon={Clock} title="قيد المتابعة" value={stats.pendingNotes} subtitle="ملاحظة" color="amber" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">بطاقة الجلسة الحالية</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DataCounter title="التكرار" value={sessionMetrics.frequency} onIncrement={() => handleMetricChange('frequency', 1)} onDecrement={() => handleMetricChange('frequency', -1)} />
          <DataCounter title="المدة (ثواني)" value={sessionMetrics.duration} onIncrement={() => handleMetricChange('duration', 1)} onDecrement={() => handleMetricChange('duration', -1)} />
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-600 mb-2">الدقة</h4>
            <div className="text-2xl font-bold text-blue-600 mb-3">{accuracyPercentage}%</div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleAccuracyChange(true)}><Check size={16} /></Button>
              <Button size="sm" variant="destructive" onClick={() => handleAccuracyChange(false)}><Minus size={16} /></Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">({sessionMetrics.accuracy}/{sessionMetrics.trials})</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-800">تطور الأداء الأسبوعي</h3>
          </div>
          <SimpleChart data={stats.progressData || []} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">توزيع الأنشطة</h3>
          </div>
          <ActivityDistribution data={data || []} />
        </motion.div>
      </div>
    </div>
  );
};

const DataCounter = ({ title, value, onIncrement, onDecrement }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg">
    <h4 className="font-medium text-slate-600 mb-2">{title}</h4>
    <div className="flex items-center gap-4">
      <Button size="icon" variant="outline" onClick={onDecrement}><Minus size={16} /></Button>
      <span className="text-3xl font-bold text-slate-800 w-16 text-center">{value}</span>
      <Button size="icon" variant="outline" onClick={onIncrement}><Plus size={16} /></Button>
    </div>
  </div>
);

const SimpleChart = ({ data = [] }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 w-12">{item.day}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
            />
            {item.applied > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.applied / maxValue) * 100}%` }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                className="absolute top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
              />
            )}
          </div>
          <span className="text-sm font-medium text-slate-700 w-8">{item.value}</span>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-slate-600">إجمالي</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-slate-600">المُطبّقة</span></div>
      </div>
    </div>
  );
};

const ActivityDistribution = ({ data = [] }) => {
  const activityData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      if (item.activity) {
        acc[item.activity] = (acc[item.activity] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [data]);

  if (activityData.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500">لا توجد بيانات أنشطة</p>
      </div>
    );
  }

  const maxCount = activityData[0]?.[1] || 1;

  return (
    <div className="space-y-3">
      {activityData.map(([activity, count], index) => (
        <div key={activity} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700 truncate">{activity}</span>
            <span className="text-slate-500">{count}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(count / maxCount) * 100}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
