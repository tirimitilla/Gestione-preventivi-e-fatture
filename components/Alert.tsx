
import React from 'react';

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ message, type, icon }) => {
  const baseClasses = "fixed top-5 right-5 z-50 flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg";
  const typeClasses = {
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      {icon && <span className="mr-3">{icon}</span>}
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Alert;
