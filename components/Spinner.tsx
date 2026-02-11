
import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text = 'Caricamento...' }) => {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-blue rounded-full animate-spin"></div>
      <p className="ml-4 text-gray-600">{text}</p>
    </div>
  );
};

export default Spinner;