// src/firebase/saveReport.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import app, { db } from '../lib/firebaseConfig';

/**
 * DecisionCode (JS doc)
 * 'eligible' | 'not_eligible' | 'boundary' | 'excluded'
 */

/**
 * Defaults to inject when missing in assessmentData.basicInfo
 * (hard-coded per request — not read from env)
 */
const DEFAULT_PHONE = '+201101332094';
const DEFAULT_WHATSAPP = '+201101332094';
const DEFAULT_SCHOOL_ID = 'gOtTEy1oqSncU99AEZW9';
const DEFAULT_TEACHER_ID = '1DRgUCXGrMa54sIru9WK6FNpuud2';

/**
 * Defensive mapping: clones assessment data, injects defaults when missing,
 * and returns the payload body (without evaluatorId/createdAt).
 */
export const mapAssessmentToPayload = (data, decision, scores) => {
    const cloned = JSON.parse(JSON.stringify(data || {}));
    cloned.basicInfo = cloned.basicInfo || {};

    if (!cloned.basicInfo.phoneNumber) cloned.basicInfo.phoneNumber = DEFAULT_PHONE;
    if (!cloned.basicInfo.whatsappNumber) cloned.basicInfo.whatsappNumber = DEFAULT_WHATSAPP;
    if (!cloned.basicInfo.schoolId) cloned.basicInfo.schoolId = DEFAULT_SCHOOL_ID;
    if (!cloned.basicInfo.teacherId) cloned.basicInfo.teacherId = DEFAULT_TEACHER_ID;

    const appVersion = globalThis?.__APP_VERSION__ ?? '0.0.0';

    return {
        assessmentData: cloned,
        decision,
        scores,
        metadata: {
            appVersion,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            locale: typeof navigator !== 'undefined' ? navigator.language : 'ar',
        },
    };
};

/**
 * Ensure an anonymous auth user exists. Returns the Firebase User object.
 * Note: signInAnonymously must be enabled in your Firebase Console Auth providers.
 */
async function ensureAnonymousAuth() {
    try {
        const auth = getAuth(app);
        if (auth.currentUser) return auth.currentUser;

        const cred = await signInAnonymously(auth);
        return cred.user;
    } catch (err) {
        // bubble up a helpful message but still rethrow so caller can handle UI
        const e = err || new Error('Failed anonymous auth');
        if (!e.userFacingMessage) e.userFacingMessage = 'تعذر تسجيل الدخول كمستخدم مجهول. تأكد من تفعيل Anonymous sign-in في Firebase.';
        throw e;
    }
}

/**
 * saveReport
 * @param {Object} data - assessment data
 * @param {Object} scores - { scaleA_Total, scaleB_Total, scaleL_Total }
 * @param {string} decision - one of DecisionCode
 * @param {Blob} [maybePdfBlob]
 * @returns {Promise<{ id: string, pdfUrl?: string }>}
 */
export async function saveReport(data, scores, decision, maybePdfBlob) {
    try {
        const user = await ensureAnonymousAuth();
        const storage = getStorage(app);

        const base = mapAssessmentToPayload(data, decision, scores);

        const docRef = await addDoc(collection(db, 'assessments'), {
            ...base,
            evaluatorId: (user && user.uid) ? user.uid : 'anon',
            createdAt: serverTimestamp(),
        });

        let pdfUrl;
        if (maybePdfBlob && (import.meta.env.VITE_ENABLE_PDF_EXPORT === 'true')) {
            const objectRef = ref(storage, `assessments-pdfs/${docRef.id}.pdf`);
            await uploadBytes(objectRef, maybePdfBlob, { contentType: 'application/pdf' });
            pdfUrl = await getDownloadURL(objectRef);
            // Optionally: you could update the Firestore doc to include pdf metadata here.
        }

        return { id: docRef.id, pdfUrl };
    } catch (err) {
        // normalize error for UI
        if (!err?.userFacingMessage) {
            err.userFacingMessage = err?.message || 'فشل الحفظ في فايربيس.';
        }
        console.error('saveReport error:', err);
        throw err;
    }
}

export default saveReport;
