// src/components/Sidebar.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// (لقد أزلنا useAuth و "if (userRole === ...)" من هنا)
// أصبح هذا المكون يعتمد بالكامل على الـ props القادمة من App.jsx

const Sidebar = ({ items, activeSection, onSectionChange, isOpen, onClose }) => {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 md:hidden">
        <h2 className="text-lg font-semibold">القائمة</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {/* الـ "items" الآن تأتي جاهزة من App.jsx 
            وهي متطابقة 100% مع renderMainContent
          */}
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id); // <--- هذا يستدعي setActiveSection
                  if (isOpen) onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right
                  sidebar-item transition-all duration-200
                  ${isActive ? 'active' : 'hover:bg-slate-50'}
                `}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-slate-600'}`} />
                <span className={`font-medium ${isActive ? 'text-green-600' : 'text-slate-700'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="text-center text-sm text-slate-500">
          <p>نظام تبيان للتعليم</p>
          <p className="text-xs mt-1">الإصدار 1.1</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <div className="md:hidden">
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
              />
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-72 bg-white shadow-lg z-50"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block order-1 bg-white rounded-xl shadow-lg border border-slate-200 h-fit sticky top-24">
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;