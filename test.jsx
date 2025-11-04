// BehaviorPlan.jsx
import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const steps = [
    { id: 1, name: 'نموذج السلوك', icon: FileText },
    { id: 2, name: 'تحليل ABC', icon: BarChart },
    { id: 3, name: 'توليد الخطة', icon: Lightbulb },
    { id: 4, name: 'قائمة التحقق', icon: CheckSquare },
];

const fidelityChecklistItems = [
    { id: 'c1', label: 'قدمتُ تهيئة بصرية للخطوات' },
    { id: 'c2', label: 'منحتُ اختيارين للطفل' },
    { id: 'c3', label: 'طبّقتُ التعزيز فوريًا بعد السلوك البديل' },
    { id: 'c4', label: 'سجّلتُ البيانات نهاية الجلسة' },
];

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ANALYZE_URL)
    ? import.meta.env.VITE_ANALYZE_URL
    : 'http://localhost:3001/api/analyze'; // fallback — عدّلي المنفذ إذا لزم

const BehaviorPlan = ({ currentChild, onSaveToLog, onAnalysisComplete, sessionTimer }) => {
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
    const { toast } = useToast();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => { if (currentStep < steps.length) setCurrentStep(currentStep + 1); };
    const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

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

    const handleGeneratePlan = async () => {
        setIsGenerating(true);

        const payload = {
            textNote: buildNoteText(),
            currentActivity: formData.behaviorContext || 'سلوكي',
            energyLevel: 3,
            tags: ['behavior'],
            sessionDuration: Math.round(sessionTimer?.time / 60 || 0),
            curriculumQuery: formData.targetBehavior || '',
            analysisType: 'behavior'
        };

        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Server error ${res.status} ${text}`);
            }

            const data = await res.json();
            const normalized = data?.ai?.normalized || data?.ai || null;

            if (!normalized) throw new Error('API did not return normalized plan');

            const safe = {
                type: normalized.type || 'behavioral',
                behavior_goal: normalized.behavior_goal || normalized.smart_goal || normalized.summary || '',
                antecedents: Array.isArray(normalized.antecedents) ? normalized.antecedents : (normalized.antecedent ? [normalized.antecedent] : []),
                consequences: Array.isArray(normalized.consequences) ? normalized.consequences : (normalized.consequence ? [normalized.consequence] : []),
                function_analysis: normalized.function_analysis || normalized.behavior_function || '',
                behavior_interventions: Array.isArray(normalized.behavior_interventions) ? normalized.behavior_interventions : (normalized.behavior_interventions ? [normalized.behavior_interventions] : []),
                antecedent_strategies: normalized.antecedent_strategies || normalized.antecedentStrategies || [],
                consequence_strategies: normalized.consequence_strategies || normalized.consequenceStrategies || normalized.customizations || [],
                replacement_behavior: normalized.replacement_behavior || normalized.replacement || { skill: normalized.behavior_goal || '', modality: '' },
                data_collection: normalized.measurement || normalized.data_collection || { metric: normalized.measurement?.type || 'frequency', tool: normalized.measurement?.sheet || '' },
                review_after_days: normalized.meta?.review_after_days || normalized.review_after_days || 14,
                safety_flag: !!normalized.meta?.safety_flag || normalized.safety_flag || (normalized.behavior_severity === 'شديد')
            };

            setGeneratedPlan(safe);
            setIsGenerating(false);
            setCurrentStep(3);

            const result = {
                suggestions: normalized.suggestions || [],
                customizations: normalized.customizations || [],
                summary: normalized.summary || normalized.behavior_goal || '',
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

            if (typeof onAnalysisComplete === 'function') onAnalysisComplete(result);
            if (typeof onSaveToLog === 'function') {
                onSaveToLog({
                    text: result.summary,
                    hasAudio: false,
                    activity: formData.behaviorContext || '',
                    energy: 3,
                    tags: ['behavior'],
                    audioBlob: null,
                    type: 'analysis',
                    generatedPlan: safe
                });
            }

            toast({ title: "تم إنشاء خطة السلوك من الخادم ✅", description: "استلمنا خطة سلوكية مُفصّلة.", className: "notification-success" });

        } catch (err) {
            console.error('handleGeneratePlan error', err);

            // fallback mock
            const mockBIP = {
                antecedent_strategies: ["تقسيم المهمة إلى خطوات أصغر", "استخدام جدول بصري للأنشطة"],
                replacement_behavior: { skill: "طلب استراحة باستخدام بطاقة", modality: "بطاقة" },
                consequence_strategies: ["تعزيز فوري لطلب الاستراحة", "تجاهل مخطط لسلوك الرفض"],
                data_collection: { metric: "تكرار", tool: "عداد بسيط لكل جلسة" },
                review_after_days: 14,
                safety_flag: formData.severity === 'شديد'
            };

            setGeneratedPlan(mockBIP);
            setIsGenerating(false);
            setCurrentStep(3);

            const resultMock = {
                suggestions: mockBIP.antecedent_strategies || [],
                customizations: mockBIP.consequence_strategies || [],
                summary: `تم توليد خطة تدخل سلوكي (وضع افتراضي) للسلوك "${formData.targetBehavior || 'غير محدد'}".`,
                noteData: {
                    formData,
                    generatedPlan: mockBIP,
                    child: currentChild,
                    sessionDuration: Math.round(sessionTimer?.time / 60 || 0),
                    type: 'analysis'
                },
                meta: { createdAt: new Date().toISOString(), source: 'behavior-plan-mock' }
            };

            if (typeof onAnalysisComplete === 'function') onAnalysisComplete(resultMock);
            if (typeof onSaveToLog === 'function') {
                onSaveToLog({
                    text: resultMock.summary,
                    hasAudio: false,
                    activity: formData.behaviorContext || '',
                    energy: 3,
                    tags: ['behavior'],
                    audioBlob: null,
                    type: 'analysis',
                    generatedPlan: mockBIP
                });
            }

            toast({
                title: "فشل الاتصال بالـ API — تم استخدام خطة افتراضية",
                description: err.message || 'تحقق من الخادم.',
                className: "notification-warning",
                duration: 8000
            });
        }
    };

    const handleReferral = () => {
        if (typeof onSaveToLog === 'function') {
            onSaveToLog({
                text: `إحالة لمختص بسبب سلوك: ${formData.targetBehavior || 'غير محدد'}`,
                hasAudio: false,
                activity: formData.behaviorContext || '',
                energy: 0,
                tags: ['referral'],
                audioBlob: null,
                type: 'referral'
            });
        }
        toast({ title: "إحالة فورية لمختص 🚑", description: "تم تسجيل طلب الإحالة.", className: "notification-error", duration: 10000 });
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return <Step1 formData={formData} handleInputChange={handleInputChange} />;
            case 2: return <Step2 formData={formData} handleInputChange={handleInputChange} />;
            case 3: return <Step3 isGenerating={isGenerating} generatedPlan={generatedPlan} onGenerate={handleGeneratePlan} onRefer={handleReferral} />;
            case 4: return <Step4 checkedItems={checkedItems} setCheckedItems={setCheckedItems} />;
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
                        <ChevronLeft className="h-4 w-4 mr-2" />السابق
                    </Button>
                    {currentStep < steps.length ? (
                        <Button onClick={nextStep} disabled={currentStep === 3 && !generatedPlan}>
                            التالي
                            <ChevronLeft className="h-4 w-4 ml-2 rtl-flip" />
                        </Button>
                    ) : (
                        <Button onClick={() => toast({ title: "تم حفظ قائمة التحقق!" })} ><CheckSquare className="h-4 w-4 ml-2" />حفظ القائمة</Button>
                    )}
                </div>
            </div>
        </div>
    );
};


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

const Step3 = ({ isGenerating, generatedPlan, onGenerate, onRefer }) => (
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
                        content={generatedPlan.antecedents && generatedPlan.antecedents.length ? <ul>{generatedPlan.antecedents.map((a, i) => <li key={i}>• {a}</li>)}</ul> : 'لا توجد بيانات'}
                    />

                    <PlanSection
                        title="العواقب / ما يلي السلوك (Consequences)"
                        content={generatedPlan.consequences && generatedPlan.consequences.length ? <ul>{generatedPlan.consequences.map((c, i) => <li key={i}>• {c}</li>)}</ul> : 'لا توجد بيانات'}
                    />

                    <PlanSection title="فرضية الوظيفة (Function Analysis)" content={generatedPlan.function_analysis || 'غير محدد'} />

                    <PlanSection
                        title="استراتيجيات تهيئة (Antecedent strategies)"
                        content={generatedPlan.antecedent_strategies && generatedPlan.antecedent_strategies.length ? <ul>{generatedPlan.antecedent_strategies.map((s, i) => <li key={i}>• {s}</li>)}</ul> : 'لا توجد اقتراحات'}
                    />

                    <PlanSection
                        title="سلوك بديل (Replacement behavior)"
                        content={generatedPlan.replacement_behavior ? `المهارة: ${generatedPlan.replacement_behavior.skill || '-'} | الوسيلة: ${generatedPlan.replacement_behavior.modality || '-'}` : 'غير متوفر'}
                    />

                    <PlanSection
                        title="استراتيجيات استجابة/عواقب (Consequence strategies)"
                        content={generatedPlan.consequence_strategies && generatedPlan.consequence_strategies.length ? <ul>{generatedPlan.consequence_strategies.map((s, i) => <li key={i}>• {s}</li>)}</ul> : 'لا توجد اقتراحات'}
                    />

                    <PlanSection
                        title="جمع البيانات"
                        content={generatedPlan.data_collection ? `المقياس: ${generatedPlan.data_collection.metric || '-'} | الأداة: ${generatedPlan.data_collection.tool || '-'}` : 'غير محدد'}
                    />

                    <PlanSection
                        title="مراجعة الخطة"
                        content={`تتم المراجعة بعد ${generatedPlan.review_after_days || 14} يومًا.`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const Step4 = ({ checkedItems, setCheckedItems }) => {
    const fidelityScore = (Object.values(checkedItems).filter(Boolean).length / fidelityChecklistItems.length) * 100;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">الخطوة 4: قائمة تحقق التنفيذ</h3>
            <div className="space-y-3">
                {fidelityChecklistItems.map(item => (
                    <div key={item.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                            id={item.id}
                            checked={checkedItems[item.id] || false}
                            onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [item.id]: checked }))}
                        />
                        <Label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {item.label}
                        </Label>
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t">
                <h4 className="font-semibold">درجة الالتزام:</h4>
                <div className="flex items-center gap-3 mt-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <motion.div
                            className="bg-blue-500 h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${fidelityScore}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="font-bold text-blue-600">{Math.round(fidelityScore)}%</span>
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
