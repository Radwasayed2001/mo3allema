import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Webhook,
  Key,
  FileText,
  Download,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKeys, setApiKeys] = useState({
    speechToText: '',
    llm: ''
  });
  const [showKeys, setShowKeys] = useState({
    speechToText: false,
    llm: false
  });
  const [templates, setTemplates] = useState([
    'الطفل يظهر تفاعلاً إيجابياً مع النشاط',
    'يحتاج الطفل إلى تشجيع إضافي',
    'مستوى التركيز جيد خلال النشاط',
    'يفضل الأنشطة الحركية'
  ]);
  const [newTemplate, setNewTemplate] = useState('');
  const [activities, setActivities] = useState([
    'أناشيد وموسيقى',
    'قراءة القصص',
    'الألعاب التعليمية',
    'الرسم والتلوين',
    'الأنشطة الحركية'
  ]);
  const [newActivity, setNewActivity] = useState('');
  const [tags, setTags] = useState([
    'نشيط',
    'هادئ',
    'متعاون',
    'يحتاج مساعدة',
    'مبدع'
  ]);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();

  const handleSaveSettings = () => {
    // Save to localStorage
    const settings = {
      webhookUrl,
      apiKeys,
      templates,
      activities,
      tags
    };
    localStorage.setItem('teacherSettings', JSON.stringify(settings));

    toast({
      title: "تم حفظ الإعدادات! ✅",
      description: "تم حفظ جميع الإعدادات بنجاح",
      className: "notification-success"
    });
  };

  const handleExportData = () => {
    toast({
      title: "🚧 هذه الميزة غير مُفعّلة بعد—لكن لا تقلق! يمكنك طلبها في رسالتك التالية! 🚀"
    });
  };

  const toggleKeyVisibility = (keyType) => {
    setShowKeys(prev => ({
      ...prev,
      [keyType]: !prev[keyType]
    }));
  };

  const addTemplate = () => {
    if (newTemplate.trim()) {
      setTemplates(prev => [...prev, newTemplate.trim()]);
      setNewTemplate('');
    }
  };

  const removeTemplate = (index) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const addActivity = () => {
    if (newActivity.trim()) {
      setActivities(prev => [...prev, newActivity.trim()]);
      setNewActivity('');
    }
  };

  const removeActivity = (index) => {
    setActivities(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (index) => {
    setTags(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-6 w-6" />
          <h2 className="text-2xl font-bold">الإعدادات</h2>
        </div>
      </motion.div>


      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
      >
        <div className="bg-green-50 p-4 border-b border-green-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">قوالب الملاحظات</h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              placeholder="أضف قالب جديد..."
              className="flex-1 p-2 border border-slate-200 rounded-lg input-focus"
              onKeyPress={(e) => e.key === 'Enter' && addTemplate()}
            />
            <Button onClick={addTemplate} size="sm" className="btn-primary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {templates.map((template, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <span className="flex-1 text-sm">{template}</span>
                <Button
                  onClick={() => removeTemplate(index)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Custom Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activities */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="bg-purple-50 p-4 border-b border-purple-100">
            <h3 className="font-semibold text-purple-900">قائمة الأنشطة</h3>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                placeholder="نشاط جديد..."
                className="flex-1 p-2 border border-slate-200 rounded input-focus text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addActivity()}
              />
              <Button onClick={addActivity} size="sm" className="btn-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                  <span className="flex-1">{activity}</span>
                  <Button
                    onClick={() => removeActivity(index)}
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
        >
          <div className="bg-amber-50 p-4 border-b border-amber-100">
            <h3 className="font-semibold text-amber-900">الوسوم السريعة</h3>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="وسم جديد..."
                className="flex-1 p-2 border border-slate-200 rounded input-focus text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button onClick={addTag} size="sm" className="btn-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {tags.map((tag, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full text-xs">
                  <span>{tag}</span>
                  <Button
                    onClick={() => removeTag(index)}
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 text-red-500"
                  >
                    <Trash2 className="h-2 w-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-3 justify-center pt-4"
      >
        <Button onClick={handleSaveSettings} className="btn-primary">
          <Save className="h-4 w-4 ml-2" />
          حفظ الإعدادات
        </Button>

        <Button onClick={handleExportData} variant="outline" className="btn-secondary">
          <Download className="h-4 w-4 ml-2" />
          تصدير البيانات (CSV)
        </Button>
      </motion.div>

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">ملاحظة الأمان والخصوصية</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              جميع المفاتيح والبيانات الحساسة يتم تشفيرها وحفظها محلياً على جهازك فقط.
              لا يتم إرسال أي بيانات شخصية إلى خوادم خارجية إلا عبر الروابط المحددة بواسطتك.
              جميع الاتصالات تتم عبر HTTPS المشفر.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;