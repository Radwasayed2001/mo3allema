// src/components/Spinner.jsx
import React from 'react';

/**
 * Small inline spinner suitable for buttons
 */
export const ButtonSpinner = (props) => (
    <svg
        className="w-4 h-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        {...props}
    >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20 text-white" />
        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white" />
    </svg>
);

/**
 * Full screen spinner with optional label
 */
export const FullScreenSpinner = ({ label = 'جارِ التحميل...' }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
            <svg className="w-14 h-14 animate-spin mx-auto text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-teal-500" />
            </svg>
            <div className="mt-3 text-slate-600">{label}</div>
        </div>
    </div>
);

export default null;
