import React, { useEffect, useState } from "react";
// --- (تم تعديل Imports لإضافة getDocs, where, writeBatch) ---
import {
  collection,
  query,
  deleteDoc,
  doc,
  onSnapshot,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import toast from 'react-hot-toast'; 
import { Button } from "@/components/ui/button"; 
import { Loader2, Trash2, AlertTriangle, ShieldOff } from "lucide-react"; // (أيقونات)

const ViewSchools = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "schools"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setSchools(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching schools: ", error);
      toast.error("فشل جلب المدارس");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- (دالة الحذف الفعلية - معدلة بالكامل) ---
  const handleDelete = async (schoolId, schoolName) => {
    try {
      // (ملاحظة: هذا يتطلب فهرسًا (index) لكل عملية بحث)
      // إذا واجهت خطأ "index required"، اضغط على الرابط في الـ console لإنشائه.

      // 1. إنشاء حزمة عمليات
      const batch = writeBatch(db);

      // 2. البحث عن وحذف كل المستخدمين (المعلمين والمدراء)
      const usersQuery = query(collection(db, "users"), where("schoolId", "==", schoolId));
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. البحث عن وحذف كل الأطفال
      const childrenQuery = query(collection(db, "children"), where("schoolId", "==", schoolId));
      const childrenSnapshot = await getDocs(childrenQuery);
      childrenSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. البحث عن وحذف كل الجلسات
      const sessionsQuery = query(collection(db, "sessions"), where("schoolId", "==", schoolId));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      sessionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 5. حذف المدرسة نفسها
      const schoolRef = doc(db, "schools", schoolId);
      batch.delete(schoolRef);

      // 6. تنفيذ جميع عمليات الحذف مرة واحدة
      await batch.commit();

      toast.success(`تم حذف مدرسة "${schoolName}" وكل بياناتها (المعلمين، الأطفال، الجلسات) بنجاح!`);
    } catch (e) {
      console.error("Error during cascading delete: ", e);
      toast.error("فشل الحذف: " + e.message);
    }
  };
  // --- (نهاية دالة الحذف المعدلة) ---


  // --- (دالة فتح مربع الحوار - معدلة) ---
  const promptDelete = (school) => {
    toast((t) => {
      const [isDeleting, setIsDeleting] = useState(false);

      return (
        <div className="flex flex-col gap-4 p-4" dir="rtl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="font-bold">هل أنت متأكد من الحذف؟</h3>
          </div>
          
          {/* --- (تعديل نص التحذير) --- */}
          <p className="text-sm text-slate-600">
            أنت على وشك حذف مدرسة "{school.name}" نهائيًا.
          </p>
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <ShieldOff className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700">
              <strong>تحذير خطير:</strong> هذا الإجراء سيقوم أيضًا بحذف <strong>جميع</strong> المعلمين، والمدراء، والأطفال، والجلسات المرتبطة بهذه المدرسة.
            </p>
          </div>
          {/* --- (نهاية التعديل) --- */}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.dismiss(t.id)}
              disabled={isDeleting} 
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                // (تمرير الاسم للـ toast)
                await handleDelete(school.id, school.name); 
                toast.dismiss(t.id);
              }}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "نعم، قم بحذف كل شيء"
              )}
            </Button>
          </div>
        </div>
      );
    }, {
      duration: Infinity, 
      style: {
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
      },
      position: 'top-center',
    });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
        <span className="text-sm text-slate-500">...جاري تحميل المدارس</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-x-auto">
      <h2 className="font-bold px-6 pt-6 pb-2 text-lg">قائمة المدارس</h2>
      <div className="min-w-full align-middle">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">اسم المدرسة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {schools.length === 0 ? (
                <tr><td colSpan={2} className="p-6 text-slate-400 text-center">لا توجد مدارس</td></tr>
              ) : schools.map((school) => (
                <tr key={school.id}>
                  <td className="px-6 py-4 whitespace-nowGrap text-sm font-medium text-slate-900">{school.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => promptDelete(school)}>
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewSchools;
