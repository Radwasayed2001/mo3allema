import React, { useState } from "react";
import { createUserAsAdmin } from "../../lib/adminAuth";

const AddTeacher = ({ userSchoolId }) => {
  const [name, setName] = useState(""); // new
  const [phone, setPhone] = useState(""); // new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      // إرسال الحقول الإضافية كـ metadata إلى createUserAsAdmin
      const result = await createUserAsAdmin(email, password, {
        role: "teacher",
        schoolId: userSchoolId,
        name: name || null,
        phone: phone || null,
      });

      if (result.success) {
        setMessage("تم إنشاء المعلم بنجاح!");
        // إعادة تهيئة الحقول
        setName("");
        setPhone("");
        setEmail("");
        setPassword("");
      } else {
        setError(result.error || "Unknown error");
      }
    } catch (err) {
      setError("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="font-bold mb-4">إضافة معلم جديد</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="اسم المعلمة"
          className="border rounded px-3 py-2"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="رقم الهاتف (مثال: 0123456789)"
          className="border rounded px-3 py-2"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="بريد المعلم"
          className="border rounded px-3 py-2"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          className="border rounded px-3 py-2"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="btn bg-green-600 text-white rounded py-2 mt-2" type="submit" disabled={loading}>
          {loading ? "جاري الإنشاء..." : "إضافة المعلم"}
        </button>
      </form>
      {message && <div className="text-green-600 mt-2">{message}</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
};

export default AddTeacher;
