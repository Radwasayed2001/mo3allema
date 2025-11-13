// src/components/AssessmentSteps.jsx
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';

/* UI primitives (cleaner styles for readability & accessibility) */
const Input = (props) => (
    <input
        {...props}
        className={
            "w-full min-w-0 px-4 py-3 rounded-lg border bg-white placeholder:text-slate-400 text-slate-800 text-sm " +
            "border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition"
        }
    />
);

const Select = (props) => (
    <select
        {...props}
        className={
            "w-full min-w-0 px-4 pe-6 py-3 rounded-lg border bg-white text-slate-800 text-sm " +
            "border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition"
        }
    />
);

const Textarea = (props) => (
    <textarea
        {...props}
        rows={4}
        className={
            "w-full min-w-0 px-4 py-3 rounded-lg border bg-white text-slate-800 text-sm " +
            "border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-500 transition"
        }
    />
);

const Field = ({ label, hint, children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        {hint && <div className="text-xs text-slate-400 mb-2">{hint}</div>}
        {children}
    </div>
);

/* Small Card wrapper for grouped sections */
const Card = ({ title, children }) => (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 sm:p-5">
        {title && <h4 className="text-lg font-semibold text-slate-800 mb-3">{title}</h4>}
        {children}
    </div>
);

export const Step1 = ({ data, updateData }) => {
    const basic = data.basicInfo || {};

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateData('basicInfo', { ...basic, [name]: value });
    };

    return (
        <Card>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                <Field label="اسم الطفل">
                    <Input name="childName" value={basic.childName || ''} onChange={handleChange} placeholder="مثال: آلاء آدم صالح" required />
                </Field>

                <Field label="تاريخ الميلاد">
                    <Input name="dob" type="date" value={basic.dob || ''} onChange={handleChange} />
                </Field>

                <Field label="الجنس">
                    <Select name="gender" value={basic.gender || ''} onChange={handleChange}>
                        <option value="">اختر...</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                    </Select>
                </Field>

                <Field label="عمر الطفل عند التشخيص بطيف التوحد">
                    <Input name="diagnosisAge" value={basic.diagnosisAge || ''} onChange={handleChange} placeholder="مثال: 3 سنوات" />
                </Field>

                <Field label="هل يوجد تقرير تشخيصي حديث؟">
                    <Select name="hasRecentReport" value={basic.hasRecentReport || ''} onChange={handleChange}>
                        <option value="">اختر...</option><option value="yes">نعم</option><option value="no">لا</option>
                    </Select>
                </Field>

                <Field label="مستوى شدة التوحد (DSM-5)">
                    <Select name="autismSeverity" value={basic.autismSeverity || ''} onChange={handleChange}>
                        <option value="">اختر...</option>
                        <option value="mild">خفيف</option>
                        <option value="moderate">متوسط</option>
                        <option value="severe">شديد</option>
                    </Select>
                </Field>

                <Field label="هل لدى الطفل إعاقة ذهنية مشخّصة؟">
                    <Select name="hasCognitiveDisability" value={basic.hasCognitiveDisability || ''} onChange={handleChange}>
                        <option value="">اختر...</option>
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                    </Select>
                </Field>

                <Field label="هل يتلقى الطفل علاجًا/تأهيلاً حاليًا؟" hint="مثال: جلسات نطق، علاج وظيفي">
                    <Input name="isReceivingTherapy" value={basic.isReceivingTherapy || ''} onChange={handleChange} placeholder="نعم / لا أو وصف موجز" />
                </Field>

                <Field label="وسيلة التواصل الحالية" hint="مثال: كلام، إيماءات، صور">
                    <Input name="communicationMethod" value={basic.communicationMethod || ''} onChange={handleChange} placeholder="وسيلة التواصل" />
                </Field>

                <Field label="اللغة الأساسية في المنزل">
                    <Input name="primaryLanguage" value={basic.primaryLanguage || ''} onChange={handleChange} placeholder="مثال: العربية" />
                </Field>

                <Field label="مشكلات صحية أخرى" hint="صرع، اضطرابات وراثية، حساسية...">
                    <Input name="otherHealthIssues" value={basic.otherHealthIssues || ''} onChange={handleChange} placeholder="اذكر إن وُجدت" />
                </Field>

                <Field label="نوع التعليم السابق">
                    <Input name="previousEducation" value={basic.previousEducation || ''} onChange={handleChange} placeholder="جلسات فردية / حضانة / لا شيء" />
                </Field>

                <Field label="عدد أفراد الأسرة">
                    <Input name="familySize" value={basic.familySize || ''} onChange={handleChange} placeholder="مثال: 5" />
                </Field>

                <Field label="ترتيب الطفل بين إخوته">
                    <Input name="birthOrder" value={basic.birthOrder || ''} onChange={handleChange} placeholder="مثال: الثاني" />
                </Field>

                <Field label="المرافق الأساسي في المنزل">
                    <Input name="primaryCaregiver" value={basic.primaryCaregiver || ''} onChange={handleChange} placeholder="مثال: الأم" />
                </Field>

                <div className="sm:col-span-2">
                    <Field label="أهداف الأسرة من برنامج تبيان" hint="اكتب أهدافًا قصيرة وواضحة">
                        <Textarea name="familyGoals" value={basic.familyGoals || ''} onChange={handleChange} placeholder="ما الذي ترغب الأسرة تحقيقه؟" />
                    </Field>
                </div>
            </div>
        </Card>
    );
};

/* --- Step 2: Team Members (enhanced: adds teacherId to basicInfo when a teacher is selected) --- */
export const Step2 = ({ data, updateData }) => {
    const members = Array.isArray(data.teamMembers) ? data.teamMembers : [];

    // local state for fetching teachers
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [teachersError, setTeachersError] = useState(null);
    const [showTeacherPicker, setShowTeacherPicker] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');

    // fetch teachers lazily when user opens the picker
    useEffect(() => {
        if (!showTeacherPicker) return;

        let cancelled = false;
        const load = async () => {
            setLoadingTeachers(true);
            setTeachersError(null);
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
                const snap = await getDocs(q);
                if (cancelled) return;
                const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                items.sort((a, b) => {
                    const aName = (a.displayName || a.name || a.email || '').toString().toLowerCase();
                    const bName = (b.displayName || b.name || b.email || '').toString().toLowerCase();
                    return aName.localeCompare(bName);
                });
                setTeachers(items);
            } catch (err) {
                console.error('Failed to load teachers:', err);
                setTeachersError('فشل جلب قائمة المعلمات. حاول مرة أخرى.');
            } finally {
                if (!cancelled) setLoadingTeachers(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [showTeacherPicker]);

    const addMember = () => {
        const newMember = { id: crypto.randomUUID(), name: '', role: '' };
        updateData('teamMembers', [...members, newMember]);
    };

    const removeMember = (id) => {
        updateData('teamMembers', members.filter(m => m.id !== id));
    };

    const handleMemberChange = (id, field, value) => {
        const updated = members.map(m => (m.id === id ? { ...m, [field]: value } : m));
        updateData('teamMembers', updated);
    };

    const handleAddSelectedTeacher = () => {
        if (!selectedTeacherId) return;
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        if (!teacher) return;

        // prevent duplicate teacher (by teacher id)
        const already = members.some(m => m._teacherId && m._teacherId === teacher.id);
        if (already) {
            // optionally show toast; we just reset picker here
            setShowTeacherPicker(false);
            setSelectedTeacherId('');
            return;
        }

        const memberToAdd = {
            id: crypto.randomUUID(),
            name: teacher.displayName || teacher.name || teacher.email || 'معلمة',
            role: 'معلمة',
            _teacherId: teacher.id // internal reference for dedupe
        };

        // 1) Append to team members
        updateData('teamMembers', [...members, memberToAdd]);

        // 2) **Important**: Save the teacher UID as the report's teacherId
        const basic = data.basicInfo || {};
        updateData('basicInfo', { ...basic, teacherId: teacher.id });

        // reset picker UI
        setSelectedTeacherId('');
        setShowTeacherPicker(false);
    };

    return (
        <Card title="أعضاء الفريق" >
            <div className="mb-3 text-sm text-slate-600">أضف أعضاء الفريق المشاركين في وضع الخطة.</div>

            <div className="space-y-3">
                {members.map((member) => (
                    <div key={member.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-2 rounded-lg bg-slate-50">
                        <Input
                            placeholder="الاسم"
                            value={member.name || ''}
                            onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                            aria-label="اسم عضو الفريق"
                        />
                        <Input
                            placeholder="الوظيفة/التخصص"
                            value={member.role || ''}
                            onChange={(e) => handleMemberChange(member.id, 'role', e.target.value)}
                            aria-label="وظيفة عضو الفريق"
                        />
                        <div className="flex justify-end items-center gap-2">
                            {members.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeMember(member.id)}
                                    className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded"
                                    aria-label="إزالة عضو"
                                >
                                    إزالة
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <div className="flex flex-wrap gap-3 items-center">
                    <button
                        type="button"
                        onClick={addMember}
                        className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 hover:shadow-sm transition"
                    >
                        إضافة عضو
                    </button>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowTeacherPicker(prev => !prev)}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                        >
                            {showTeacherPicker ? 'إلغاء' : 'إضافة معلمة'}
                        </button>

                        {showTeacherPicker && (
                            <div className="mt-2 w-[320px] bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-30">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="text-sm font-medium">اختر معلمة لإضافتها</div>
                                    <div className="text-xs text-slate-500">{loadingTeachers ? 'جاري التحميل...' : `${teachers.length} نتيجة`}</div>
                                </div>

                                {teachersError && (
                                    <div className="text-sm text-red-600 mb-2">{teachersError}</div>
                                )}

                                <div className="mb-3">
                                    <Select
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                        aria-label="قائمة المعلمات"
                                    >
                                        <option value="" className='px-4'>اختر معلمة...</option>
                                        {teachers.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.displayName || t.name || t.email || `معلمة (${t.id})`}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddSelectedTeacher}
                                        disabled={!selectedTeacherId || loadingTeachers}
                                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                                    >
                                        أضف المعلمة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowTeacherPicker(false); setSelectedTeacherId(''); }}
                                        className="px-3 py-2 bg-white border rounded-lg"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </Card>
    );
};


/* --- Step 3: Exclusion Criteria --- */
export const Step3 = ({ data, updateData }) => {
    const criteria = [
        { key: 'aggression', label: 'نوبات عدوانية/إيذاء ذاتي متكررة' },
        { key: 'elopement', label: 'سلوك هروب يستلزم تأمين' },
        { key: 'noImitation', label: 'غياب التقليد الحركي/البصري' },
        { key: 'intensiveTherapyRecommendation', label: 'توصية علاج مكثّف حديثة' },
    ];

    const handleChange = (key, value) => {
        updateData('exclusionCriteria', { ...(data.exclusionCriteria || {}), [key]: value });
    };

    return (
        <Card title="معايير الاستبعاد السريعة">
            <div className="space-y-3">
                {criteria.map(c => (
                    <div key={c.key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="text-sm font-medium text-slate-800 mb-2 sm:mb-0">{c.label}</div>
                        <div className="flex gap-4 items-center">
                            <label className="flex items-center gap-2">
                                <input type="radio" name={c.key} value="yes" checked={(data.exclusionCriteria || {})[c.key] === 'yes'} onChange={() => handleChange(c.key, 'yes')} />
                                <span className="text-sm">نعم</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" name={c.key} value="no" checked={(data.exclusionCriteria || {})[c.key] === 'no'} onChange={() => handleChange(c.key, 'no')} />
                                <span className="text-sm">لا</span>
                            </label>
                        </div>
                    </div>
                ))}

                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="font-semibold text-yellow-800">مبرر الإقصاء</div>
                    <div className="text-sm text-yellow-700">وجود هذه البنود يعني أن الطفل بحاجة لبيئة علاجية أكثر تخصصًا قبل الانضمام لبرنامج تبيان.</div>
                </div>
            </div>
        </Card>
    );
};

/* Helper for radio score groups */
const ScoreRadioGroup = ({ name, value = 0, options = [], onChange }) => (
    <div className="flex flex-wrap gap-3 items-center">
        {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                    type="radio"
                    name={name}
                    value={opt.value}
                    checked={Number(value) === Number(opt.value)}
                    onChange={() => onChange(opt.value)}
                    className="h-4 w-4"
                />
                <span>{opt.label}</span>
            </label>
        ))}
    </div>
);

const AssessmentItem = ({ label, children }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b last:border-b-0">
        <div className="text-sm text-slate-700 mb-2 sm:mb-0 min-w-0">{label}</div>
        <div className="min-w-0">{children}</div>
    </div>
);

/* --- Step 4: Scale A --- */
export const Step4 = ({ data, updateData }) => {
    const sections = [
        {
            key: 'attention', title: 'مجال الانتباه', items: [
                { key: 'respondsToName', label: 'يلتفت عند مناداته بالاسم' },
                { key: 'sitsFor3Mins', label: 'يحافظ على الجلوس لمدة 3 دقائق' },
                { key: 'tracksVisually', label: 'يتابع بصريًا قصة/صورة' },
                { key: 'completesSimpleTask', label: 'يكمل نشاط تطابق بسيط' },
            ]
        },
        {
            key: 'communication', title: 'مجال التواصل الوظيفي', items: [
                { key: 'followsTwoStepCommand', label: 'يتبع أمرًا من خطوتين' },
                { key: 'followsConditionalCommand', label: 'ينفذ أمرًا مشروطًا' },
                { key: 'identifiesCommonItems', label: 'يتعرف على مفردات مألوفة' },
                { key: 'understandsConcepts', label: 'يفهم مفاهيم وصفية' },
            ]
        },
        {
            key: 'social', title: 'مجال السلوك الاجتماعي', items: [
                { key: 'maintainsEyeContact', label: 'تواصل بصري (≥2 ثانية)' },
                { key: 'toleratesPeer', label: 'يتحمل وجود طفل آخر' },
                { key: 'respondsToGreeting', label: 'يستجيب للتحية' },
                { key: 'transitionsActivity', label: 'ينتقل بين الأنشطة دون بكاء' },
                { key: 'showsFlexibility', label: 'يظهر مرونة عند التغيير' },
            ]
        },
        {
            key: 'selfReliance', title: 'مجال الاعتماد على النفس', items: [
                { key: 'drinksFromCup', label: 'يشرب من كوب دون مساعدة' },
                { key: 'indicatesToiletNeed', label: 'يخبر بالحاجة للحمام' },
                { key: 'removesShoes', label: 'يخلع/يلبس الحذاء بمساعدة خفيفة' },
                { key: 'washesHands', label: 'يغسل يديه بعد التذكير' },
            ]
        },
        {
            key: 'cognition', title: 'مجال الإدراك والتطابق', items: [
                { key: 'sortsByColor', label: 'يفرز شيئين باللون' },
                { key: 'countsTo3', label: 'يعد حتى 3' },
                { key: 'matchesPictures', label: 'يطابق صورتين' },
                { key: 'choosesBigSmall', label: 'يختار كبير/صغير' },
            ]
        },
        {
            key: 'fineMotor', title: 'مجال الحركات الدقيقة', items: [
                { key: 'holdsPen', label: 'يمسك قلما' },
                { key: 'buildsTower4Blocks', label: 'يبني برج 4 مكعبات' },
                { key: 'threadsBeads', label: 'يدخل خرزتين في خيط' },
                { key: 'turnsOnePage', label: 'يقلب صفحة واحدة' },
            ]
        },
    ];

    const scoreOptions = [{ label: '0', value: 0 }, { label: '1', value: 1 }, { label: '2', value: 2 }];

    const handleScoreChange = (domain, skill, value) => {
        updateData('scaleA', { ...data.scaleA, [domain]: { ...(data.scaleA?.[domain] || {}), [skill]: value } });
    };

    return (
        <div className="space-y-6">
            {sections.map(section => (
                <div key={section.key}>
                    <h5 className="text-md font-semibold text-slate-800 mb-2">{section.title}</h5>
                    <div className="bg-white border rounded-lg shadow-sm">
                        {section.items.map(item => (
                            <AssessmentItem key={item.key} label={item.label}>
                                <ScoreRadioGroup
                                    name={`${section.key}-${item.key}`}
                                    value={(data.scaleA?.[section.key] || {})[item.key] || 0}
                                    options={scoreOptions}
                                    onChange={(v) => handleScoreChange(section.key, item.key, v)}
                                />
                            </AssessmentItem>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* --- Step 5: Scale B --- */
export const Step5 = ({ data, updateData }) => {
    const behaviors = [
        { key: 'severeScreaming', label: 'صراخ شديد' },
        { key: 'hittingOthers', label: 'ضرب الآخرين' },
        { key: 'selfHarm', label: 'إيذاء الذات' },
        { key: 'refusesTasks', label: 'يرفض تنفيذ المهام' },
        { key: 'stereotypy', label: 'سلوكيات نمطية' },
        { key: 'unusualSoundReaction', label: 'تفاعل غير معتاد مع الأصوات' },
        { key: 'unusualLightColorReaction', label: 'تفاعل مع الإضاءة/الألوان' },
        { key: 'unusualSensoryUse', label: 'استخدام حسي غير معتاد' },
    ];

    const scoreOptions = [{ label: '0', value: 0 }, { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }];

    const handleScoreChange = (key, v) => {
        updateData('scaleB', { ...data.scaleB, [key]: v });
    };

    return (
        <div className="bg-white border rounded-lg p-2">
            {behaviors.map(b => (
                <AssessmentItem key={b.key} label={b.label}>
                    <ScoreRadioGroup name={b.key} value={data.scaleB?.[b.key] || 0} options={scoreOptions} onChange={(v) => handleScoreChange(b.key, v)} />
                </AssessmentItem>
            ))}
        </div>
    );
};

/* --- Step 6: Scale L --- */
export const Step6 = ({ data, updateData }) => {
    const skills = [
        { key: 'simplePlayWithPeer', label: 'يلعب مع طفل آخر بشكل بسيط' },
        { key: 'imitatesPeerPlay', label: 'يقلد لعب الأقران' },
        { key: 'showsImaginativePlay', label: 'يظهر لعبًا تخيليًا' },
        { key: 'involvesOthersInPlay', label: 'يشرك الآخرين في لعبه' },
    ];

    const scoreOptions = [{ label: '0', value: 0 }, { label: '1', value: 1 }, { label: '2', value: 2 }];

    const handleScoreChange = (key, v) => {
        updateData('scaleL', { ...data.scaleL, [key]: v });
    };

    return (
        <div className="bg-white border rounded-lg p-2">
            {skills.map(s => (
                <AssessmentItem key={s.key} label={s.label}>
                    <ScoreRadioGroup name={s.key} value={data.scaleL?.[s.key] || 0} options={scoreOptions} onChange={(v) => handleScoreChange(s.key, v)} />
                </AssessmentItem>
            ))}
        </div>
    );
};

/* --- Step 7: Reinforcers --- */
export const Step7 = ({ data, updateData }) => {
    const categories = data.reinforcers?.categories || {};
    const prefs = data.reinforcers?.preferences || ['', '', ''];

    const toggleCategory = (cat) => {
        const next = { ...categories, [cat]: { ...categories[cat], isLiked: !categories[cat].isLiked } };
        updateData('reinforcers', { ...data.reinforcers, categories: next });
    };

    const setNotes = (cat, notes) => {
        const next = { ...categories, [cat]: { ...categories[cat], notes } };
        updateData('reinforcers', { ...data.reinforcers, categories: next });
    };

    const setPref = (i, v) => {
        const next = [...prefs];
        next[i] = v;
        updateData('reinforcers', { ...data.reinforcers, preferences: next });
    };

    return (
        <Card title="المعززات">
            <div className="space-y-4">
                {Object.entries(categories).map(([cat, details]) => (
                    <div key={cat} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center p-2 rounded bg-slate-50">
                        <div className="sm:col-span-2 flex items-center gap-3">
                            <input id={cat} type="checkbox" checked={details.isLiked} onChange={() => toggleCategory(cat)} className="h-5 w-5" />
                            <div>
                                <div className="font-medium text-sm">{cat}</div>
                                <div className="text-xs text-slate-500">مثال: {details.examples}</div>
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <Input value={details.notes || ''} onChange={(e) => setNotes(cat, e.target.value)} placeholder="ملاحظات (اختياري)" disabled={!details.isLiked} />
                        </div>
                    </div>
                ))}

                <div>
                    <div className="text-sm font-medium mb-2">ترتيب التفضيل (1-3)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input placeholder="1. الأكثر تفضيلاً" value={prefs[0] || ''} onChange={(e) => setPref(0, e.target.value)} />
                        <Input placeholder="2." value={prefs[1] || ''} onChange={(e) => setPref(1, e.target.value)} />
                        <Input placeholder="3." value={prefs[2] || ''} onChange={(e) => setPref(2, e.target.value)} />
                    </div>
                </div>
            </div>
        </Card>
    );
};
