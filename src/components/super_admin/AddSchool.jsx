import React, { useState } from "react";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import app from "../../lib/firebaseConfig";
// --- (التعديل 1: إضافة imports) ---
import toast from 'react-hot-toast';
import { Loader2 } from "lucide-react";

const db = getFirestore(app);

const AddSchool = () => {
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  // (تم حذف message و error، سنستخدم toast)

  // --- (التعديل 2: تحديث دالة الحفظ) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, "schools"), { name: schoolName });
      toast.success("تمت إضافة المدرسة بنجاح"); // <-- استخدام Toast
      setSchoolName("");
    } catch (err) {
      toast.error("حدث خطأ: " + err.message); // <-- استخدام Toast
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-bold mb-4">إضافة مدرسة جديدة</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="اسم المدرسة"
            className="border rounded px-3 py-2"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            required
          />
          {/* --- (التعديل 3: تحديث الزر) --- */}
          <button 
            className="btn bg-green-600 text-white rounded py-2 mt-2 flex items-center justify-center" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "إضافة"
            )}
          </button>
        </form>
        {/* (تم حذف رسائل الخطأ والنجاح النصية من هنا) */}
      </div>
  );
};

export default AddSchool;
