import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Settings, 
  FileText, 
  Copy, 
  Mail, 
  Save, 
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ResultsPanel = ({ results, onSaveToLog }) => {
  const [copiedSection, setCopiedSection] = useState(null);
  const { toast } = useToast();

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">لا توجد نتائج بعد</h3>
          <p className="text-slate-500">قم بتحليل ملاحظة أولاً لعرض المقترحات والتوصيات</p>
        </motion.div>
      </div>
    );
  }

  const { suggestions = [], customizations = [], summary = '', noteData } = results;

  const handleCopy = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: "تم النسخ! 📋",
        description: "تم نسخ المحتوى إلى الحافظة",
        className: "notification-success"
      });
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "لم يتم نسخ المحتوى",
        className: "notification-error"
      });
    }
  };

  const handleEmailSend = () => {
    const emailContent = `
المقترحات الفورية:
${suggestions.map(s => `• ${s}`).join('\n')}

التعديلات المخصصة:
${customizations.map(c => `• ${c}`).join('\n')}

الملخص:
${summary}
    `;

    const mailtoLink = `mailto:?subject=تقرير الجلسة&body=${encodeURIComponent(emailContent)}`;
    window.open(mailtoLink);
  };

  const handleSave = () => {
    onSaveToLog({
      ...noteData,
      suggestions: suggestions,
      customizations: customizations,
      summary: summary,
      type: 'analyzed'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6" />
          <h2 className="text-2xl font-bold">النتائج الفورية</h2>
        </div>
        <p className="text-green-100">تم تحليل الملاحظة وإنشاء المقترحات بنجاح</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instant Suggestions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden card-hover"
        >
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">المقترحات الفورية</h3>
            </div>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{suggestion}</span>
                </motion.li>
              ))}
            </ul>
            <Button
              onClick={() => handleCopy(suggestions.join('\n• '), 'suggestions')}
              variant="outline"
              size="sm"
              className="mt-4 w-full"
            >
              {copiedSection === 'suggestions' ? (
                <>
                  <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ المقترحات
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Custom Modifications */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden card-hover"
        >
          <div className="bg-purple-50 p-4 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">التعديلات المخصصة</h3>
            </div>
          </div>
          <div className="p-4">
            <ul className="space-y-3">
              {customizations.map((customization, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <Settings className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{customization}</span>
                </motion.li>
              ))}
            </ul>
            <Button
              onClick={() => handleCopy(customizations.join('\n• '), 'customizations')}
              variant="outline"
              size="sm"
              className="mt-4 w-full"
            >
              {copiedSection === 'customizations' ? (
                <>
                  <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ التعديلات
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden card-hover"
      >
        <div className="bg-amber-50 p-4 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">ملخص الجلسة</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-slate-700 leading-relaxed">{summary}</p>
          <Button
            onClick={() => handleCopy(summary, 'summary')}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            {copiedSection === 'summary' ? (
              <>
                <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 ml-2" />
                نسخ الملخص
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        <Button onClick={handleEmailSend} className="btn-primary">
          <Mail className="h-4 w-4 ml-2" />
          إرسال بالبريد
        </Button>
        
        <Button onClick={handleSave} variant="outline" className="btn-secondary">
          <Save className="h-4 w-4 ml-2" />
          حفظ إلى السجل
        </Button>
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">تم إنشاء التحليل بنجاح!</span>
        </div>
        <p className="text-green-600 text-sm mt-1">
          يمكنك الآن تطبيق هذه التوصيات أو حفظها للمراجعة لاحقاً
        </p>
      </motion.div>
    </div>
  );
};

export default ResultsPanel;