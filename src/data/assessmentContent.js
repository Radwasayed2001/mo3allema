// src/data/assessmentContent.js

export const assessmentSteps = [
    { title: 'البيانات الأساسية', description: 'يرجى إدخال المعلومات الأساسية عن الطفل.' },
    { title: 'أعضاء الفريق', description: 'أضف أعضاء الفريق المشاركين في وضع الخطة.' },
    { title: 'معايير الاستبعاد السريعة', description: 'إذا تحقق أي بند من البنود التالية، يُعتبر الطفل غير مؤهل للالتحاق بالبرنامج حالياً.' },
    { title: 'مقياس المهارات التمهيدية (A)', description: 'يتم منح درجة لكل بند كما يلي: 0 = لا يظهر أبدًا، 1 = يظهر أحيانًا أو بمساعدة، 2 = يظهر باستقلال وبوضوح.' },
    { title: 'مقياس سلوكيات التحدي (B)', description: 'سجل تكرار هذه السلوكيات خلال الجلسة (15 دقيقة) وما ذكره ولي الأمر خلال آخر 24 ساعة. 0 = لم يحدث، 1 = مرة أو مرتين، 2 = 3-4 مرات، 3 = 5 مرات فأكثر.' },
    { title: 'مقياس اللعب التفاعلي (L)', description: 'قم بتقييم مهارات اللعب لدى الطفل. 0 = لا يظهر، 1 = أحيانًا، 2 = غالبًا.' },
    { title: 'مُحدّد المعززات', description: 'أكمل هذه الأداة بمساعدة ولي الأمر والملاحظة المباشرة، لتحديد أكثر المحفزات التي يحبّها الطفل.' },
    { title: 'التقرير النهائي', description: 'ملخص شامل لنتائج التقييم والقرار النهائي.' },
];

export const initialAssessmentData = {
    basicInfo: {
        childName: '', dob: '', gender: '', diagnosisAge: '',
        hasRecentReport: '', autismSeverity: '', hasCognitiveDisability: '',
        otherHealthIssues: '', isReceivingTherapy: '', primaryLanguage: '',
        communicationMethod: '', previousEducation: '', familySize: '',
        birthOrder: '', primaryCaregiver: '', familyGoals: '',
    },
    teamMembers: [{ id: crypto.randomUUID(), name: '', role: '' }],
    exclusionCriteria: {
        aggression: '', elopement: '',
        noImitation: '', intensiveTherapyRecommendation: '',
    },
    scaleA: {
        attention: { respondsToName: 0, sitsFor3Mins: 0, tracksVisually: 0, completesSimpleTask: 0 },
        communication: { followsTwoStepCommand: 0, followsConditionalCommand: 0, identifiesCommonItems: 0, understandsConcepts: 0 },
        social: { maintainsEyeContact: 0, toleratesPeer: 0, respondsToGreeting: 0, transitionsActivity: 0, showsFlexibility: 0 },
        selfReliance: { drinksFromCup: 0, indicatesToiletNeed: 0, removesShoes: 0, washesHands: 0 },
        cognition: { sortsByColor: 0, countsTo3: 0, matchesPictures: 0, choosesBigSmall: 0 },
        fineMotor: { holdsPen: 0, buildsTower4Blocks: 0, threadsBeads: 0, turnsOnePage: 0 },
    },
    scaleB: {
        severeScreaming: 0, hittingOthers: 0, selfHarm: 0, refusesTasks: 0,
        stereotypy: 0, unusualSoundReaction: 0, unusualLightColorReaction: 0, unusualSensoryUse: 0,
    },
    scaleL: {
        simplePlayWithPeer: 0, imitatesPeerPlay: 0, showsImaginativePlay: 0, involvesOthersInPlay: 0,
    },
    reinforcers: {
        categories: {
            'أطعمة': { isLiked: false, examples: 'شوكولاتة – بطاطس – علكة', notes: '' },
            'ألعاب': { isLiked: false, examples: 'كرة – فقاعات – سيارات صغيرة', notes: '' },
            'نشاط حركي': { isLiked: false, examples: 'التأرجح - القفز – التدحرج على الكرة', notes: '' },
            'تفاعل اجتماعي': { isLiked: false, examples: 'تصفيق - حضن – تمثيل بسيط', notes: '' },
            'صور/فيديوهات': { isLiked: false, examples: 'فيديو أغنيته المفضلة – صورة حيوان يحبه', notes: '' },
            'الأصوات': { isLiked: false, examples: 'مثلا صوت الأذان - أناشيد', notes: '' },
            'لمسي/حسي': { isLiked: false, examples: 'كرات الضغط – معجون - ملمس مفضل', notes: '' }
        },
        preferences: ['', '', ''],
        additionalNotes: '',
    }
};
