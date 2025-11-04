import React, { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import app from "../../lib/firebaseConfig";
import { createUserAsAdmin } from "../../lib/adminAuth";
import { Loader2 } from "lucide-react"; // (لإضافة أيقونة تحميل)
import toast from 'react-hot-toast'; // (لاستخدام إشعارات أفضل)

const db = getFirestore(app);

const AddSchoolAdmin = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      const querySnapshot = await getDocs(collection(db, "schools"));
      setSchools(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSchools();
  }, []);

  // --- (دالة handleSubmit المعدلة) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedSchoolId) {
        throw new Error("يرجى اختيار المدرسة أولاً");
      }

      const result = await createUserAsAdmin(adminEmail, adminPassword, {
        role: "school_admin",
        schoolId: selectedSchoolId,
      });

      // --- (التعديل: رسالة نجاح موحدة) ---
      if (result.success) {
        // (لا نهتم بكيفية نجاحها، فقط نعرض رسالة نجاح)
        toast.success("تمت إضافة/ربط المدير بنجاح!");
        setAdminEmail("");
        setAdminPassword("");
      } else {
        // (عرض الخطأ القادم من adminAuth.js)
        toast.error(result.error || "حدث خطأ غير معروف");
      }
      // --- (نهاية التعديل) ---

    } catch (err) {
      toast.error("خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  // --- (نهاية التعديل) ---

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="font-bold mb-4">إضافة مدير مدرسة جديد</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="بريد الأدمن"
          className="border rounded px-3 py-2"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور (6 أحرف على الأقل)"
          className="border rounded px-3 py-2"
          value={adminPassword}
          onChange={e => setAdminPassword(e.target.value)}
          required
        />
        <select
          className="border rounded px-3 py-2 mt-2"
          value={selectedSchoolId}
          onChange={e => setSelectedSchoolId(e.target.value)}
          required
        >
          <option value="">اختر المدرسة</option>
          {schools.map(school => (
            <option key={school.id} value={school.id}>{school.name}</option>
          ))}
        </select>
        <button className="btn bg-green-600 text-white rounded py-2 mt-2 flex items-center justify-center" type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "إضافة/ربط الأدمن" // (تغيير النص ليعكس كلا الحالتين)
          )}
        </button>
      </form>
    </div>
  );
};

export default AddSchoolAdmin;

