import * as React from "react";
import { X, Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotificationPopup = ({
  isOpen,
  onClose,
  type = "info", // 'info', 'success', 'warning', 'error'
  title,
  message,
  autoClose = false,
  autoCloseDelay = 5000,
  action,
  persistent = false,
}) => {
  React.useEffect(() => {
    if (autoClose && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "processing":
        return <Clock className="h-6 w-6 text-blue-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "processing":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "success":
        return "text-green-900";
      case "warning":
        return "text-yellow-900";
      case "error":
        return "text-red-900";
      case "processing":
        return "text-blue-900";
      default:
        return "text-blue-900";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`relative max-w-md w-full rounded-lg border ${getBgColor()} shadow-lg animate-in fade-in-0 zoom-in-95 duration-300`}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold ${getTextColor()}`}>
                {title}
              </h3>
              <div className={`mt-2 text-sm ${getTextColor()}`}>
                {typeof message === "string" ? <p>{message}</p> : message}
              </div>
              {action && (
                <div className="mt-4 flex justify-end space-x-2">{action}</div>
              )}
            </div>
            {!persistent && (
              <button
                onClick={onClose}
                className={`flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors ${getTextColor()}`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { NotificationPopup };
