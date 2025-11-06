// src/components/super_admin/ViewSchoolAdmins.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  where,
  query,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

const ViewSchoolAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schoolsMap, setSchoolsMap] = useState({}); // { schoolId: schoolName }

  // fetch admins realtime
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "school_admin"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        setAdmins(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching admins: ", error);
        toast.error("فشل جلب قائمة المدراء");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // fetch schools once and build map
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const snap = await getDocs(collection(db, "schools"));
        const map = {};
        snap.forEach((d) => {
          const data = d.data() || {};
          map[d.id] = data.name || d.id;
        });
        setSchoolsMap(map);
      } catch (err) {
        console.error("Failed to load schools:", err);
        toast.error("فشل جلب بيانات المدارس");
      }
    };
    loadSchools();
  }, []);

  const handleDelete = async (adminId) => {
    try {
      await deleteDoc(doc(db, "users", adminId));
      toast.success("تم حذف صلاحيات المدير بنجاح!");
    } catch (e) {
      console.error("delete admin error:", e);
      toast.error("فشل الحذف: " + (e.message || ""));
    }
  };

  // Simple confirm (safe) before delete
  const promptDelete = (admin) => {
    const schoolName = schoolsMap[admin.schoolId] || admin.schoolId || "اسم غير معروف";
    const ok = window.confirm(
      `هل أنت متأكد من حذف صلاحيات المدير "${admin.email}" المرتبط بمدرسة "${schoolName}"؟\n\nسيتم حذف صلاحياته نهائيًا من قاعدة البيانات.`
    );
    if (ok) {
      // optionally show a small toast while deleting
      const tId = toast.loading("جاري الحذف...");
      handleDelete(admin.id)
        .then(() => {
          toast.dismiss(tId);
        })
        .catch(() => {
          toast.dismiss(tId);
        });
    }
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
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">اسم المدرسة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {admins.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-slate-400 text-center">لا يوجد مدراء بعد</td></tr>
              ) : admins.map((admin) => {
                const schoolName = schoolsMap[admin.schoolId] || admin.schoolId || "-";
                return (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">{schoolName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900" onClick={() => promptDelete(admin)}>
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewSchoolAdmins;
