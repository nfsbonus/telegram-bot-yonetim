import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useBot } from '../../context/BotContext';
import Sidebar from './Sidebar';
import Header from './Header';
import BotManagement from '../bots/BotManagement';
import BulkAnnouncementPage from '../bots/BulkAnnouncementPage';

const Dashboard: React.FC = () => {
  const { selectedBot, isLoading } = useBot();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="bulk-announcement" element={<BulkAnnouncementPage />} />
            <Route path="*" element={
              isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : selectedBot ? (
                <BotManagement />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-2">Bot Seçin</h2>
                  <p className="text-gray-500 max-w-md">
                    Aboneleri yönetmek ve duyurular göndermek için yan menüden bir bot seçin.
                  </p>
                </div>
              )
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;