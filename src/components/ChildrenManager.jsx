// src/components/ChildrenManager.jsx
import React, { useState, useEffect } from "react";
import { db } from "../lib/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Edit, Trash2, AlertCircle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ChildrenManager = ({ userSchoolId, teacherId }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingChild, setEditingChild] = useState(null); // لإدارة التعديل
  const { toast } = useToast();

  // --- (تم تعديل دالة جلب البيانات لتستخدم onSnapshot) ---
  useEffect(() => {
    if (!userSchoolId) {
      setError("معرّف المدرسة مفقود.");
      return;
    }
    setLoading(true);
    setError("");

    let q;
    if (teacherId) {
      // وضع المعلم: جلب أطفاله فقط
      q = query(
        collection(db, "children"),
        where("schoolId", "==", userSchoolId),
        where("teacherId", "==", teacherId)
      );
    } else {
      // وضع مدير المدرسة: جلب كل أطفال المدرسة
      q = query(
        collection(db, "children"),
        where("schoolId", "==", userSchoolId)
      );
    }

    // استخدام onSnapshot للاستماع للتغييرات الحية
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (e) => {
      console.error("Error loading children: ", e);
      setError("فشل جلب بيانات الأطفال (قد يتطلب فهرس)");
      toast({ title: "خطأ", description: "فشل جلب بيانات الأطفال", variant: "destructive" });
      setLoading(false);
    });

    // إلغاء الاشتراك عند إغلاق المكون
    return () => unsubscribe();
    
  }, [userSchoolId, teacherId, toast]);

  // --- (دالة الحذف) ---
  const handleDeleteChild = async (childId, childName) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطفل "${childName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "children", childId));
      // (لا نحتاج لتحديث الـ state يدويًا، onSnapshot سيتكفل بذلك)
      toast({ title: "تم الحذف", description: `تم حذف ${childName} بنجاح`, className: "notification-success" });
    } catch (e) {
      console.error("Error deleting child: ", e);
      toast({ title: "خطأ", description: "فشل حذف الطفل", variant: "destructive" });
    }
  };

  // --- (دوال التعديل) ---
  const handleEditClick = (child) => {
    setEditingChild({ ...child }); // نسخ بيانات الطفل إلى حالة التعديل
  };

  const handleUpdateChild = async (e) => {
    e.preventDefault();
    if (!editingChild) return;
    
    setLoading(true);
    try {
      const childRef = doc(db, "children", editingChild.id);
      await updateDoc(childRef, {
        childName: editingChild.childName,
        parentName: editingChild.parentName,
        phoneNumber: editingChild.phoneNumber,
        whatsappNumber: editingChild.whatsappNumber
      });
      
      setEditingChild(null); // إغلاق نموذج التعديل
      // (لا نحتاج لإعادة التحميل، onSnapshot سيتكفل بذلك)
      
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الطفل", className: "notification-success" });
    } catch (e) {
      console.error("Error updating child: ", e);
      toast({ title: "خطأ", description: "فشل تحديث بيانات الطفل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- (واجهة المستخدم المعدلة) ---
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* (تم حذف نموذج الإضافة من هنا) */}

      {/* نموذج التعديل (يظهر كـ Modal أو في الأعلى عند التعديل) */}
      <AnimatePresence>
        {editingChild && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold mb-4">تعديل بيانات: {editingChild.childName}</h3>
            <form onSubmit={handleUpdateChild} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 rounded-lg input-focus"
                  value={editingChild.childName || ''}
                  onChange={e => setEditingChild(prev => ({ ...prev, childName: e.target.value }))}
                  placeholder="اسم الطفل"
                  required
                />
                <input
                  type="text"
                  className="w-full p-2 border border-slate-200 rounded-lg input-focus"
                  value={editingChild.parentName || ''}
                  onChange={e => setEditingChild(prev => ({ ...prev, parentName: e.target.value }))}
                  placeholder="اسم ولي الأمر"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="tel"
                  className="w-full p-2 border border-slate-200 rounded-lg input-focus"
                  value={editingChild.phoneNumber || ''}
                  onChange={e => setEditingChild(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="رقم الهاتف"
                  required
                />
                <input
                  type="tel"
                  className="w-full p-2 border border-slate-200 rounded-lg input-focus"
                  value={editingChild.whatsappNumber || ''}
                  onChange={e => setEditingChild(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="رقم الواتساب"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingChild(null)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- (جدول العرض المنسق) --- */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <h2 className="text-xl font-bold p-6">
          {teacherId ? "إدارة أطفالي" : "إدارة أطفال المدرسة"}
        </h2>
        
        {error && (
          <div className="p-6 flex items-center gap-2 text-red-600 bg-red-50 border-y border-red-200">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        )}

        {loading && children.length === 0 ? (
          <div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right p-4 font-medium text-slate-700">اسم الطفل</th>
                  <th className="text-right p-4 font-medium text-slate-700">ولي الأمر</th>
                  <th className="text-right p-4 font-medium text-slate-700">رقم الهاتف</th>
                  <th className="text-right p-4 font-medium text-slate-700">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {children.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-500">
                      لا يوجد أطفال مضافون بعد. (قم بإضافتهم من صفحة "إضافة طفل")
                    </td>
                  </tr>
                ) : (
                  children.map(child => (
                    <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">{child.childName}</td>
                      <td className="p-4 text-slate-600">{child.parentName || '—'}</td>
                      <td className="p-4 text-slate-600">{child.phoneNumber || '—'}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEditClick(child)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteChild(child.id, child.childName)} className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildrenManager;