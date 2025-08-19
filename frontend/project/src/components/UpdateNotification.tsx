import React, { useState, useEffect } from 'react';
import { CheckCircle, X, TrendingUp, Globe } from 'lucide-react';

interface UpdateNotificationProps {
  message: string;
  type: 'schemes' | 'global';
  onClose: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    return type === 'schemes' ? <TrendingUp className="w-5 h-5" /> : <Globe className="w-5 h-5" />;
  };

  const getColor = () => {
    return type === 'schemes' ? 'bg-blue-500' : 'bg-orange-500';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className={`${getColor()} rounded-full p-2 text-white flex-shrink-0`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Data Updated</p>
                <p className="text-sm text-gray-600 mt-1">{message}</p>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;