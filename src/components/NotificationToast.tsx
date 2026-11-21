import React, { useEffect } from 'react';

interface NotificationToastProps {
  message: string | null;
  tone?: 'success' | 'error';
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ message, tone = 'success', onClose }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [message, tone, onClose]);

  if (!message) return null;
  const isError = tone === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-[13px] font-medium border animate-in slide-in-from-bottom duration-200 ${
        isError ? 'bg-[#93000a] border-[#ba1a1a]' : 'bg-[#0b1c30] border-[#213145]'
      }`}
    >
      <span className={`material-symbols-outlined text-[20px] ${isError ? 'text-[#ffdad6]' : 'text-[#85f8c4]'}`}>
        {isError ? 'error' : 'check_circle'}
      </span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-[#94a3b8] hover:text-white p-0.5 rounded cursor-pointer">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
