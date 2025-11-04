// src/components/AddChild.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  User,
  Phone,
  MessageCircle,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FormField = React.memo(function FormField({
  name,
  label,
  placeholder,
  icon: Icon,
  type = "text",
  value,
  onChange,
  error,
  disabled
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full p-3 border rounded-lg input-focus ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'
          }`}
        disabled={disabled}
      />
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
});

// --- (تم تعديل Props هنا) ---
const AddChild = ({ userSchoolId, teacherId }) => {
  const [formData, setFormData] = useState({
    childName: '',
    parentName: '',
    phoneNumber: '',
    whatsappNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.childName.trim()) newErrors.childName = 'اسم الطفل مطلوب';
    if (!formData.parentName.trim()) newErrors.parentName = 'اسم ولي الأمر مطلوب';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'رقم الهاتف مطلوب';
    if (!formData.whatsappNumber.trim()) newErrors.whatsappNumber = 'رقم الواتساب مطلوب';
    
    // (يمكن إضافة تحقق من صحة الأرقام هنا)

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء في النموذج",
        className: "notification-error"
      });
      return;
    }
    
    // --- (التحقق من Props) ---
    if (!userSchoolId || !teacherId) {
      toast({
        title: "خطأ في الصلاحيات",
        description: "لا يمكن إضافة طفل بدون معرّف المدرسة والمعلمة.",
        className: "notification-error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // --- (تم تعديل addDoc هنا) ---
      const docRef = await addDoc(collection(db, "children"), {
        childName: formData.childName.trim(),
        parentName: formData.parentName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        schoolId: userSchoolId,  // <-- ID المدرسة
        teacherId: teacherId,    // <-- ID المعلمة
        createdAt: serverTimestamp()
      });

      console.log("Child added with ID: ", docRef.id);
      setFormData({
        childName: '',
        parentName: '',
        phoneNumber: '',
        whatsappNumber: ''
      });

      toast({
        title: "تم إضافة الطفل بنجاح! ✅",
        description: `تم حفظ بيانات ${formData.childName} في النظام`,
        className: "notification-success"
      });

    } catch (error) {
      console.error("Error adding child: ", error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء حفظ بيانات الطفل.",
        className: "notification-error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <UserPlus className="h-6 w-6" />
          <h2 className="text-2xl font-bold">إضافة طفل جديد</h2>
        </div>
        <p className="text-blue-100">أدخل بيانات الطفل الجديد لحفظها في النظام</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              name="childName"
              label="اسم الطفل"
              placeholder="أدخل اسم الطفل"
              icon={User}
              value={formData.childName}
              onChange={handleInputChange}
              error={errors.childName}
              disabled={isSubmitting}
            />
            <FormField
              name="parentName"
              label="اسم ولي الأمر"
              placeholder="أدخل اسم ولي الأمر"
              icon={User}
              value={formData.parentName}
              onChange={handleInputChange}
              error={errors.parentName}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              name="phoneNumber"
              label="رقم الهاتف"
              placeholder="مثال: +966501234567"
              icon={Phone}
              type="tel"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              error={errors.phoneNumber}
              disabled={isSubmitting}
            />
            <FormField
              name="whatsappNumber"
              label="رقم الواتساب"
              placeholder="مثال: +966501234567"
              icon={MessageCircle}
              type="tel"
              value={formData.whatsappNumber}
              onChange={handleInputChange}
              error={errors.whatsappNumber}
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  إضافة الطفل
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddChild;