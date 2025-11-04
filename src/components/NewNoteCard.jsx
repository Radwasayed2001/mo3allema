import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Type,
  Send,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const BACKEND_ANALYZE_URL = 'https://tebyan-backend.vercel.app/api/analyze'; // update if different

const NewNoteCard = ({ currentChild, onAnalysisComplete, onSaveToLog, sessionTimer }) => {
  const [inputMode, setInputMode] = useState('text');
  const [textNote, setTextNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const { toast } = useToast();

  const activities = [
    'أناشيد وموسيقى',
    'قراءة القصص',
    'الألعاب التعليمية',
    'الرسم والتلوين',
    'الأنشطة الحركية',
    'التمارين الرياضية',
    'الألعاب الجماعية',
    'الأنشطة الفنية',
    'التعلم التفاعلي',
    'وقت الطعام'
  ];

  const quickTags = [
    'نشيط',
    'هادئ',
    'متعاون',
    'يحتاج مساعدة',
    'مبدع',
    'اجتماعي',
    'خجول',
    'متحمس',
    'يحتاج تشجيع',
    'متميز'
  ];

  const moodEmojis = ['😢', '😐', '🙂', '😊', '😄'];

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // revoke any created audio URL on unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create/revoke object URL whenever audioBlob changes
  useEffect(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    }
    // cleanup will revoke previous url on next change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const startRecording = async () => {
    if (isRecording) return; // prevent double start
    try {
      toast({
        title: "تنبيه الخصوصية 🔒",
        description: "سيتم تسجيل الصوت محلياً على جهازك فقط",
        className: "notification-warning"
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "خطأ في التسجيل",
        description: "لم يتم السماح بالوصول للميكروفون",
        className: "notification-error"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Failed to stop mediaRecorder', e);
      }
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      // return base64 without prefix
      const commaIndex = dataUrl.indexOf(',');
      resolve(commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handleAnalyze = async () => {
    if (!currentChild) {
      toast({
        title: "يرجى اختيار الطفل أولاً",
        description: "اختر الطفل من القائمة العلوية",
        className: "notification-warning"
      });
      return;
    }

    if (!textNote.trim() && !audioBlob) {
      toast({
        title: "لا توجد ملاحظات للتحليل",
        description: "أدخل نصاً أو سجل صوتاً أولاً",
        className: "notification-warning"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // prepare payload
      const payload = {
        textNote: textNote || '',
        currentActivity,
        energyLevel,
        tags: selectedTags,
        sessionDuration: Math.round(sessionTimer?.time / 60 || 0),
        curriculumQuery: currentActivity || textNote.slice(0, 120) // help retrieval
      };

      // if audio exists, convert to base64 and include (backend must handle audioBase64)
      if (audioBlob) {
        // show a small toast to indicate encoding
        toast({
          title: 'جاري تجهيز الصوت',
          description: 'يتم تحويل التسجيل لإرساله إلى الخادم...',
          className: 'notification-info'
        });
        const base64 = await blobToBase64(audioBlob);
        payload.audioBase64 = base64;
        // also attach original file metadata if wanted
        payload.audioMimeType = audioBlob.type || 'audio/wav';
      }

      // call backend analyze endpoint
      const res = await fetch(BACKEND_ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      // handle non-ok responses
      if (!res.ok) {
        const errMsg = json?.error?.message || json?.error || (json?.raw ? 'AI returned unparsable output' : 'خطأ في الخادم');
        throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
      }

      // expected shape: { ai: { suggestions, customizations, summary }, meta: {...} }
      const resultsWithNoteData = {
        ...(json.ai || {}),
        noteData: {
          text: textNote,
          hasAudio: !!audioBlob,
          activity: currentActivity,
          energy: energyLevel,
          tags: selectedTags,
          audioBlob // keep blob in memory for later if needed
        },
        meta: json.meta || {}
      };

      onAnalysisComplete(resultsWithNoteData);

    } catch (err) {
      console.error(err);
      toast({
        title: "تعذّر إرسال الملاحظة",
        description: `حدث خطأ أثناء التحليل: ${err.message}`,
        className: "notification-error"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveDraft = () => {
    const draftData = {
      text: textNote,
      hasAudio: !!audioBlob,
      activity: currentActivity,
      energy: energyLevel,
      tags: selectedTags,
      audioBlob: audioBlob,
      type: 'draft'
    };

    onSaveToLog(draftData);
    handleClear();
  };

  const handleClear = () => {
    setTextNote('');
    setAudioBlob(null);
    setCurrentActivity('');
    setEnergyLevel(3);
    setSelectedTags([]);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">ملاحظة جديدة</h2>
          <p className="text-green-100">
            {currentChild ? `جلسة مع ${currentChild}` : 'اختر الطفل لبدء الجلسة'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${inputMode === 'text'
                ? 'bg-white shadow-sm text-green-600'
                : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Type className="h-4 w-4" />
              كتابة
            </button>
            <button
              onClick={() => setInputMode('audio')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${inputMode === 'audio'
                ? 'bg-white shadow-sm text-green-600'
                : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Mic className="h-4 w-4" />
              صوت
            </button>
          </div>

          <AnimatePresence mode="wait">
            {inputMode === 'text' ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <textarea
                    value={textNote}
                    onChange={(e) => setTextNote(e.target.value)}
                    placeholder="اكتب ملاحظاتك هنا..."
                    className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none input-focus"
                    maxLength={500}
                  />
                  <div className="absolute bottom-2 left-2 text-xs text-slate-500">
                    {textNote.length}/500
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="audio"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
                  {!isRecording && !audioBlob && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Mic className="h-8 w-8 text-green-600" />
                      </div>
                      <p className="text-slate-600">اضغط لبدء التسجيل</p>
                      <Button onClick={startRecording} className="btn-primary">
                        <Mic className="h-4 w-4 ml-2" />
                        بدء التسجيل
                      </Button>
                    </div>
                  )}

                  {isRecording && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto recording-animation">
                        <MicOff className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="wave-animation justify-center">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="wave-bar" />
                        ))}
                      </div>
                      <p className="text-lg font-mono text-red-600">
                        {formatTime(recordingTime)}
                      </p>
                      <Button onClick={stopRecording} variant="destructive">
                        <MicOff className="h-4 w-4 ml-2" />
                        إيقاف التسجيل
                      </Button>
                    </div>
                  )}

                  {audioBlob && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Volume2 className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-slate-600">تم التسجيل - {formatTime(recordingTime)}</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={playAudio} variant="outline">
                          {isPlaying ? <Pause className="h-4 w-4 ml-2" /> : <Play className="h-4 w-4 ml-2" />}
                          {isPlaying ? 'إيقاف' : 'تشغيل'}
                        </Button>
                        <Button onClick={() => { setAudioBlob(null); setRecordingTime(0); }} variant="outline">
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف
                        </Button>
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioUrl || ''}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">النشاط الحالي</label>
              <select
                value={currentActivity}
                onChange={(e) => setCurrentActivity(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg input-focus"
              >
                <option value="">اختر النشاط</option>
                {activities.map(activity => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">مستوى الطاقة/المزاج</label>
              <div className="flex items-center gap-2">
                {moodEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => setEnergyLevel(index + 1)}
                    className={`mood-emoji ${energyLevel === index + 1 ? 'selected' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
                <span className="text-sm text-slate-600 mr-2">
                  {energyLevel}/5
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">وسوم سريعة</label>
            <div className="flex flex-wrap gap-2">
              {quickTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm border transition-all tag-item ${selectedTags.includes(tag)
                    ? 'selected'
                    : 'border-slate-200 text-slate-600 hover:border-green-300'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!textNote.trim() && !audioBlob)}
              className="btn-primary flex-1 sm:flex-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  تحليل فوري
                </>
              )}
            </Button>

            <Button
              onClick={handleSaveDraft}
              variant="outline"
              disabled={!textNote.trim() && !audioBlob}
              className="btn-secondary"
            >
              <Save className="h-4 w-4 ml-2" />
              حفظ كمسودة
            </Button>

            <Button
              onClick={handleClear}
              variant="outline"
              className="btn-secondary"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              إفراغ الحقول
            </Button>
          </div>

          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-blue-700">جاري إرسال البيانات إلى نظام التحليل...</span>
            </motion.div>
          )}

          {!currentChild && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700">يرجى اختيار الطفل من القائمة العلوية لبدء الجلسة</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NewNoteCard;
