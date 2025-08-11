import React, { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  message: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ 
  type, 
  message, 
  description, 
  onClose,
  className = '' 
}) => {
  const typeStyles = {
    success: {
      container: 'bg-green-50 border-green-500',
      icon: 'text-green-500',
      title: 'text-green-800',
      description: 'text-green-700',
      Icon: CheckCircle
    },
    error: {
      container: 'bg-red-50 border-red-500',
      icon: 'text-red-500',
      title: 'text-red-800',
      description: 'text-red-700',
      Icon: AlertTriangle
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-500',
      icon: 'text-yellow-500',
      title: 'text-yellow-800',
      description: 'text-yellow-700',
      Icon: AlertTriangle
    },
    info: {
      container: 'bg-blue-50 border-blue-500',
      icon: 'text-blue-500',
      title: 'text-blue-800',
      description: 'text-blue-700',
      Icon: Info
    }
  };

  const style = typeStyles[type];
  const IconComponent = style.Icon;

  return (
    <div className={`rounded-md border-l-4 p-4 ${style.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${style.icon}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${style.title}`}>{message}</h3>
          {description && (
            <div className={`mt-2 text-sm ${style.description}`}>
              <p>{description}</p>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 ${style.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-50 focus:ring-${type}-500`}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;