import React from 'react';
import { RefreshCw, Clock, AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { UpdateStatus } from '../hooks/useAutoUpdate';

interface UpdateIndicatorProps {
  updateStatus: UpdateStatus;
  onManualUpdate: () => void;
  dataType: string;
}

const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ 
  updateStatus, 
  onManualUpdate, 
  dataType 
}) => {
  const { isUpdating, lastUpdated, nextUpdate, error } = updateStatus;

  const getTimeUntilNext = () => {
    const now = new Date();
    const diff = nextUpdate.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = () => {
    if (error) return 'text-red-600 bg-red-50 border-red-200';
    if (isUpdating) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (error) return <WifiOff className="w-4 h-4" />;
    if (isUpdating) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}>
      {getStatusIcon()}
      <span>
        {error ? 'Update Failed' : isUpdating ? 'Updating...' : 'Live Data'}
      </span>
      
      {!isUpdating && !error && (
        <div className="flex items-center space-x-2 text-xs">
          <Clock className="w-3 h-3" />
          <span>Next: {getTimeUntilNext()}</span>
        </div>
      )}
      
      <button
        onClick={onManualUpdate}
        disabled={isUpdating}
        className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors disabled:opacity-50"
        title="Manual refresh"
      >
        <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
      </button>
      
      {error && (
        <div className="ml-2 group relative">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateIndicator;