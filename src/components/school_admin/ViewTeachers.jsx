import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import app from "../../lib/firebaseConfig";

const db = getFirestore(app);

const ViewTeachers = ({ userSchoolId }) => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      const q = query(collection(db, "users"), where("role", "==", "teacher"), where("schoolId", "==", userSchoolId));
      const snapshot = await getDocs(q);
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    if (userSchoolId) fetchTeachers();
  }, [userSchoolId]);

  const handleDelete = async (teacherId) => {
    await deleteDoc(doc(db, "users", teacherId));
    setTeachers(teachers.filter(t => t.id !== teacherId));
  };

  if (loading) return <div>...تحميل المعلمين</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="font-bold mb-4">قائمة معلمي المدرسة</h2>
      <table className="w-full text-right border">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2">البريد الإلكتروني</th>
            <th className="p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {teachers.length === 0 ? (
            <tr><td colSpan={2}>لا يوجد معلمون بعد.</td></tr>
          ) : teachers.map((teacher) => (
            <tr key={teacher.id} className="odd:bg-slate-50">
              <td className="p-2">{teacher.email}</td>
              <td className="p-2">
                <button
                  className="text-red-600"
                  onClick={() => handleDelete(teacher.id)}
                >حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ViewTeachers;
