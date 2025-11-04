# تحميل الجلسات من Firebase

## المشكلة
عند إعادة تحميل الصفحة، كانت الجلسات تختفي لأن `SessionLog` يحمل البيانات من `localStorage` فقط وليس من Firebase.

## الحل المطبق

### 1. تحديث App.jsx

#### الإضافات الجديدة:
```javascript
// Imports
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// State
const [isLoadingSessions, setIsLoadingSessions] = useState(false);
```

#### وظيفة تحميل البيانات:
```javascript
const loadSessionsFromFirebase = async () => {
  setIsLoadingSessions(true);
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const firebaseSessions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // تحويل بيانات Firebase إلى تنسيق SessionLog
      const sessionItem = {
        id: doc.id,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || data.meta?.savedAtLocal,
        child: data.child || 'غير محدد',
        text: data.type === 'behavior_checklist' 
          ? `قائمة تحقق الخطة السلوكية - السلوك: ${data.formData?.targetBehavior} - درجة الالتزام: ${data.checklist?.fidelityScore}%`
          : data.generatedPlan?.summary || data.text || 'جلسة محفوظة',
        activity: data.formData?.behaviorContext || data.activity || 'نشاط عام',
        hasAudio: data.hasAudio || false,
        energy: data.energy || (data.checklist?.fidelityScore ? Math.round(data.checklist.fidelityScore / 20) : 3),
        tags: data.tags || (data.type === 'behavior_checklist' ? ['behavior', 'checklist'] : ['session']),
        type: data.type || 'session',
        status: data.status || 'applied',
        generatedPlan: data.generatedPlan,
        suggestions: data.suggestions || data.generatedPlan?.antecedent_strategies || [],
        customizations: data.customizations || data.generatedPlan?.consequence_strategies || [],
        checklist: data.checklist,
        formData: data.formData
      };
      firebaseSessions.push(sessionItem);
    });
    
    // دمج البيانات من localStorage مع Firebase
    const localData = localStorage.getItem('teacherNotes');
    const localSessions = localData ? JSON.parse(localData) : [];
    
    // دمج البيانات مع تجنب التكرار
    const allSessions = [...firebaseSessions, ...localSessions];
    const uniqueSessions = allSessions.filter((session, index, self) => 
      index === self.findIndex(s => s.id === session.id)
    );
    
    setSessionData(uniqueSessions);
    
    if (firebaseSessions.length > 0) {
      toast({
        title: "تم تحميل الجلسات من Firebase ✅",
        description: `تم تحميل ${firebaseSessions.length} جلسة من قاعدة البيانات`,
        className: "notification-success"
      });
    }
  } catch (error) {
    console.error('Error loading sessions from Firebase:', error);
    toast({
      title: "خطأ في تحميل الجلسات",
      description: "فشل في تحميل الجلسات من Firebase. سيتم استخدام البيانات المحلية فقط.",
      className: "notification-warning"
    });
    
    // في حالة الخطأ، استخدم البيانات المحلية فقط
    const savedData = localStorage.getItem('teacherNotes');
    if (savedData) {
      try {
        setSessionData(JSON.parse(savedData));
      } catch (parseError) {
        console.error('Error parsing local data:', parseError);
      }
    }
  } finally {
    setIsLoadingSessions(false);
  }
};
```

### 2. تحديث SessionLog.jsx

#### الإضافات الجديدة:
```javascript
// Import
import { RefreshCw } from 'lucide-react';

// Props
const SessionLog = ({ data, onUpdateData, onReloadSessions, isLoadingSessions }) => {
```

#### زر إعادة التحميل:
```javascript
{onReloadSessions && (
  <Button
    onClick={onReloadSessions}
    disabled={isLoadingSessions}
    variant="outline"
    size="sm"
    className="flex items-center gap-2"
  >
    <RefreshCw className={`h-4 w-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
    {isLoadingSessions ? 'جاري التحميل...' : 'إعادة تحميل'}
  </Button>
)}
```

## الميزات الجديدة

### 1. تحميل تلقائي
- **عند بدء التطبيق**: يتم تحميل الجلسات من Firebase تلقائياً
- **دمج البيانات**: دمج البيانات من Firebase مع localStorage
- **تجنب التكرار**: إزالة الجلسات المكررة

### 2. تحميل يدوي
- **زر إعادة التحميل**: في SessionLog لإعادة تحميل البيانات
- **Loading state**: عرض حالة التحميل مع spinner
- **رسائل التغذية الراجعة**: إشعارات نجاح أو فشل التحميل

### 3. معالجة الأخطاء
- **Fallback**: في حالة فشل Firebase، استخدام البيانات المحلية
- **رسائل واضحة**: إشعارات للمستخدم عن حالة التحميل
- **Logging**: تسجيل الأخطاء في الكونسول

### 4. تحويل البيانات
- **تنسيق موحد**: تحويل بيانات Firebase إلى تنسيق SessionLog
- **دعم أنواع مختلفة**: دعم جلسات قوائم التحقق والجلسات العادية
- **حقول مطلوبة**: ضمان وجود جميع الحقول المطلوبة

## تدفق البيانات

### 1. عند بدء التطبيق:
```
App.jsx → loadSessionsFromFirebase() → Firebase → تحويل البيانات → دمج مع localStorage → setSessionData()
```

### 2. عند إعادة التحميل:
```
SessionLog → onReloadSessions() → loadSessionsFromFirebase() → Firebase → تحديث البيانات
```

### 3. عند حفظ جلسة جديدة:
```
BehaviorPlan → onSaveToLog() → setSessionData() → localStorage + Firebase
```

## أنواع البيانات المدعومة

### 1. جلسات قوائم التحقق (behavior_checklist):
```javascript
{
  type: 'behavior_checklist',
  text: 'قائمة تحقق الخطة السلوكية - السلوك: [اسم] - درجة الالتزام: [نسبة]%',
  tags: ['behavior', 'checklist', 'fidelity-[نسبة]%'],
  energy: Math.round(fidelityScore / 20),
  checklist: { /* بيانات قائمة التحقق */ }
}
```

### 2. الجلسات العادية:
```javascript
{
  type: 'session',
  text: data.generatedPlan?.summary || data.text || 'جلسة محفوظة',
  tags: ['session'],
  energy: data.energy || 3
}
```

## الفوائد

### 1. استمرارية البيانات
- ✅ **لا تختفي الجلسات** عند إعادة تحميل الصفحة
- ✅ **مزامنة البيانات** بين Firebase و localStorage
- ✅ **نسخ احتياطية** في Firebase

### 2. تجربة مستخدم محسنة
- ✅ **تحميل سريع** من localStorage
- ✅ **تحديث تلقائي** من Firebase
- ✅ **إعادة تحميل يدوية** عند الحاجة

### 3. موثوقية النظام
- ✅ **معالجة الأخطاء** الشاملة
- ✅ **Fallback mechanisms** للبيانات المحلية
- ✅ **رسائل واضحة** للمستخدم

## الخلاصة

تم حل مشكلة اختفاء الجلسات عند إعادة تحميل الصفحة من خلال:

- ✅ **تحميل تلقائي** من Firebase عند بدء التطبيق
- ✅ **دمج البيانات** من Firebase و localStorage
- ✅ **زر إعادة التحميل** في SessionLog
- ✅ **معالجة شاملة للأخطاء**
- ✅ **رسائل تغذية راجعة** واضحة

الآن الجلسات تبقى مرئية حتى بعد إعادة تحميل الصفحة! 🎉
