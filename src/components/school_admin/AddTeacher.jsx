import React, { useState } from "react";
import { createUserAsAdmin } from "../../lib/adminAuth";

const AddTeacher = ({ userSchoolId }) => {
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
      const result = await createUserAsAdmin(email, password, {
        role: "teacher",
        schoolId: userSchoolId,
      });
      if (result.success) {
        setMessage("تم إنشاء المعلم بنجاح!");
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
          إضافة المعلم
        </button>
      </form>
      {message && <div className="text-green-600 mt-2">{message}</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
};

export default AddTeacher;
