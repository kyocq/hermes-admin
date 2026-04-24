import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Demo notifications on mount
    //const timer = setTimeout(() => {
    //  setNotifications([
    //    { id: '1', type: 'success', message: 'Hermes Admin is ready!' },
    //  ]);
    //}, 1000);

    //return () => clearTimeout(timer);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-fade-in ${
            notification.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
            notification.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
            'bg-blue-500/10 border border-blue-500/20'
          }`}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
          <span className="text-sm text-dark-100">{notification.message}</span>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-2 text-dark-400 hover:text-dark-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
