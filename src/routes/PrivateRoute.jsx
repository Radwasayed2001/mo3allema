// src/routes/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ requiredRole }) => {
    const { currentUser, profile } = useAuth();
    const location = useLocation();

    if (!currentUser) {
        // redirect to login page (choose role path)
        const rolePath = requiredRole === 'school_admin' ? 'school-admin' : requiredRole === 'super_admin' ? 'super-admin' : 'teacher';
        return <Navigate to={`/login/${rolePath}`} state={{ from: location }} replace />;
    }

    // determine role (prefer profile.role)
    const userRole = profile?.role || currentUser?.role || null;

    if (!userRole) {
        // no role known -> block access
        return <div className="p-6">لا توجد صلاحيات معروفة لحسابك. الرجاء التواصل مع الإدارة.</div>;
    }

    const allowed = Array.isArray(requiredRole) ? requiredRole.includes(userRole) : userRole === requiredRole;
    if (!allowed) return <div className="p-6">غير مسموح بالوصول لهذه الصفحة.</div>;

    return <Outlet />;
};

export default PrivateRoute;
