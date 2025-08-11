import React, { useState } from 'react';
import { useBot } from '../../context/BotContext';
import Tabs from '../ui/Tabs';
import UserManagement from './UserManagement';
import GroupManagement from './GroupManagement';
import AnnouncementBroadcast from './AnnouncementBroadcast';
import MessageTemplates from './MessageTemplates';
import { translations } from '../../lib/i18n';
import { RefreshCw } from 'lucide-react';

const BotManagement: React.FC = () => {
  const { selectedBot, isLoading, syncBotData, error } = useBot();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  if (!selectedBot) {
    return null;
  }

  const handleSync = async () => {
    const success = await syncBotData();
    setSyncStatus(success ? 'success' : 'error');
    
    // 3 saniye sonra durum mesajını temizle
    setTimeout(() => {
      setSyncStatus('idle');
    }, 3000);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{selectedBot.name}</h1>
        
        <div className="flex items-center">
          {syncStatus === 'success' && (
            <span className="text-green-600 mr-3">Veriler başarıyla senkronize edildi!</span>
          )}
          {syncStatus === 'error' && (
            <span className="text-red-600 mr-3">Senkronizasyon hatası: {error}</span>
          )}
          <button
            onClick={handleSync}
            disabled={isLoading}
            className={`flex items-center px-4 py-2 rounded-md text-white ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Senkronize Ediliyor...' : 'Telegram ile Senkronize Et'}
          </button>
        </div>
      </div>
      
      <Tabs
        tabs={[
          {
            id: 'users',
            label: translations.bots.userManagement,
            content: <UserManagement />,
          },
          {
            id: 'groups',
            label: translations.bots.groupManagement,
            content: <GroupManagement />,
          },
          {
            id: 'announcements',
            label: translations.bots.announcements,
            content: <AnnouncementBroadcast />,
          },
          {
            id: 'templates',
            label: 'Mesaj Şablonları',
            content: <MessageTemplates />,
          }
        ]}
        defaultTab="users"
      />
    </div>
  );
};

export default BotManagement