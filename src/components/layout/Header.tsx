import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBot } from '../../context/BotContext';
import { LogOut, Settings, Bell } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedBot } = useBot();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center">
        {selectedBot && (
          <h1 className="text-xl font-semibold text-gray-800">
            {selectedBot.name}
          </h1>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-200">
          <Bell className="h-5 w-5" />
        </button>
        
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-200">
          <Settings className="h-5 w-5" />
        </button>
        
        <div className="ml-2 border-l border-gray-200 pl-4 flex items-center">
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-800">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          
          <button 
            onClick={logout}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-200"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;