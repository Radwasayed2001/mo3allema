// src/components/AddChild.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAssessment } from '../hooks/useAssessment';
import Stepper from './Stepper';
import Report from './Report';
import { assessmentSteps } from '../data/assessmentContent';
import * as Steps from './AssessmentSteps';

const FALLBACKS = {
  phoneNumber: "+201101332094",
  whatsappNumber: "+201101332094",
  schoolId: "gOtTEy1oqSncU99AEZW9",
  teacherId: "1DRgUCXGrMa54sIru9WK6FNpuud2"
};

const AddChild = ({ userSchoolId, teacherId }) => {
  const { toast } = useToast();
  const {
    currentStep,
    data,
    updateData,
    goToNextStep,
    goToPrevStep,
    isFirstStep,
    isLastStep,
    totalSteps,
    exclusionTriggered
  } = useAssessment();

  const [submitting, setSubmitting] = useState(false);

  const validateBeforeSave = () => {
    const name = data?.basicInfo?.childName?.toString().trim();
    if (!name) {
      toast({
        title: "حقل مفقود",
        description: "يرجى إدخال اسم الطفل قبل الحفظ.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const mapToPayload = () => {
    const appVersion = (globalThis).__APP_VERSION__ ?? '0.0.0';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'ar';

    const basic = { ...(data.basicInfo || {}) };
    basic.phoneNumber = (basic.phoneNumber && basic.phoneNumber.toString()) || FALLBACKS.phoneNumber;
    basic.whatsappNumber = (basic.whatsappNumber && basic.whatsappNumber.toString()) || FALLBACKS.whatsappNumber;
    basic.schoolId = userSchoolId || basic.schoolId || FALLBACKS.schoolId;
    basic.teacherId = teacherId || basic.teacherId || FALLBACKS.teacherId;

    const scaleA_Total = Object.values(data.scaleA).flatMap(domain => Object.values(domain)).reduce((a, b) => a + (Number(b) || 0), 0);
    const scaleB_Total = Object.values(data.scaleB).reduce((a, b) => a + (Number(b) || 0), 0);
    const scaleL_Total = Object.values(data.scaleL).reduce((a, b) => a + (Number(b) || 0), 0);

    const decision = exclusionTriggered ? 'excluded'
      : (scaleA_Total >= 25 && scaleB_Total <= 8) ? 'eligible'
        : ((scaleA_Total < 15) || (scaleB_Total > 11)) ? 'not_eligible'
          : 'boundary';

    return {
      assessmentData: { ...data, basicInfo: basic },
      decision,
      scores: { scaleA_Total, scaleB_Total, scaleL_Total },
      metadata: { appVersion, userAgent, locale },
      evaluatorId: teacherId || basic.teacherId || 'anon'
    };
  };

  const handleSaveAssessment = async () => {
    if (!validateBeforeSave()) return;

    setSubmitting(true);
    try {
      const payload = mapToPayload();
      const doc = await addDoc(collection(db, 'assessments'), {
        ...payload,
        createdAt: serverTimestamp()
      });

      toast({
        title: "تم حفظ التقرير",
        description: `تم إنشاء تقرير برقم: ${doc.id}`,
        className: "notification-success"
      });
    } catch (err) {
      console.error("Failed to save assessment:", err);
      toast({
        title: "فشل الحفظ",
        description: "حدث خطأ أثناء حفظ التقرير. تأكدي من صلاحيات الكتابة في Firestore.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const CurrentStepComponent = (Steps)[`Step${currentStep + 1}`];

  const progressPct = Math.round(((currentStep) / Math.max(1, totalSteps - 1)) * 100);

  // داخل ملف src/components/AddChild.jsx — استخدم هذا الجزء كـ wrapper رئيسي (replace the top-level return)
  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6" dir="rtl">
        {/* Top banner (smaller padding so doesn't take too much vertical space) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl p-4 sm:p-5 text-white mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6" />
            <div>
              <h2 className="text-lg sm:text-2xl font-bold leading-tight">استمارة التقييم — برنامج تبيان</h2>
              <p className="text-xs sm:text-sm text-white/90">املئي الخطوات كاملة ثم احفظي التقرير.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSaveAssessment} disabled={submitting} className="bg-white text-brand-600 text-sm px-3 py-1.5">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> جاري الحفظ...</> : <><Save className="h-4 w-4 mr-2" /> حفظ التقرير</>}
            </Button>
          </div>
        </motion.div>

        {/* Main grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* main content (takes 9/12 on lg) */}
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white rounded-2xl shadow border border-slate-100 p-4 sm:p-5">
              {/* Stepper (wrap overflow inside card) */}
              <div className="mb-3">
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
                  <Stepper currentStep={currentStep} steps={assessmentSteps.map(s => s.title)} />
                </div>
              </div>

              <main className="mt-4">
                {currentStep < totalSteps - 1 ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-brand-700">{assessmentSteps[currentStep].title}</h3>
                      {assessmentSteps[currentStep].description && <p className="text-sm text-slate-600">{assessmentSteps[currentStep].description}</p>}
                    </div>
                    {CurrentStepComponent ? <CurrentStepComponent data={data} updateData={updateData} /> : <div className="text-red-600">خطأ: مكوّن الخطوة غير موجود</div>}
                  </>
                ) : (
                  <Report data={data} exclusionTriggered={exclusionTriggered} />
                )}
              </main>

              {/* footer navigation */}
              {currentStep < totalSteps - 1 && (
                <footer className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={goToPrevStep} disabled={isFirstStep}>السابق</Button>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <Button onClick={handleSaveAssessment} className="bg-yellow-50 text-yellow-800 border border-yellow-200">حفظ مؤقت</Button>
                    <Button onClick={goToNextStep} className="bg-brand-600 text-white">{currentStep + 1 === totalSteps - 1 ? 'عرض التقرير' : 'التالي'}</Button>
                  </div>
                </footer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

};

export default AddChild;
