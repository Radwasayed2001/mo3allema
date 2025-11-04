import React, { useEffect, useState } from "react"; // <-- (التعديل 1: إضافة useState)
// --- (تم تعديل Imports) ---
import { collection, deleteDoc, doc, where, query, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import toast from 'react-hot-toast'; // <-- استيراد react-hot-toast
import { Button } from "@/components/ui/button"; // (لاستخدامها في الـ Toast)
import { Loader2, Trash2, AlertTriangle, ShieldOff } from "lucide-react"; // (أيقونات)

const ViewSchoolAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "school_admin"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setAdmins(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching admins: ", error);
      toast.error("فشل جلب قائمة المدراء");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- (دالة الحذف الفعلية - تحذف صلاحيات Firestore فقط) ---
  const handleDelete = async (adminId) => {
    try {
      await deleteDoc(doc(db, "users", adminId));
      toast.success("تم حذف صلاحيات المدير بنجاح!");
    } catch (e) {
      toast.error("فشل الحذف: " + e.message);
    }
  };

  // --- (دالة فتح مربع الحوار مع نص تحذير مُعدل) ---
  const promptDelete = (admin) => {
    toast((t) => {
      // --- (التعديل 2: إضافة حالة تحميل داخل الـ Toast) ---
      const [isDeleting, setIsDeleting] = useState(false);

      return (
        <div className="flex flex-col gap-4 p-4" dir="rtl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="font-bold">هل أنت متأكد من الحذف؟</h3>
          </div>
          <p className="text-sm text-slate-600">
            سيتم حذف صلاحيات المدير "{admin.email}" نهائيًا من قاعدة البيانات.
          </p>
          

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.dismiss(t.id)}
              disabled={isDeleting} // <-- تعطيل عند التحميل
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting} // <-- تعطيل عند التحميل
              onClick={async () => { // <-- (التعديل 3: تحويله إلى async)
                setIsDeleting(true); // <-- تفعيل التحميل
                
                await handleDelete(admin.id); // <-- انتظار اكتمال الحذف
                
                toast.dismiss(t.id); // <-- إغلاق الـ Toast بعد الانتهاء
              }}
            >
              {/* --- (التعديل 4: إظهار Spinner) --- */}
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "نعم، قم بحذف الصلاحيات"
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
        <span className="text-sm text-slate-500">...جاري تحميل المدراء</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-x-auto">
      <h2 className="font-bold px-6 pt-6 pb-2 text-lg">قائمة مدراء المدارس</h2>
      <div className="min-w-full align-middle">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">معرّف المدرسة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {admins.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-slate-400 text-center">لا يوجد مدراء بعد</td></tr>
              ) : admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{admin.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">{admin.schoolId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => promptDelete(admin)}>
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

export default ViewSchoolAdmins;