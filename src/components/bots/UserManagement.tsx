import React, { useState, useEffect } from 'react';
import { useBot } from '../../context/BotContext';
import Table from '../ui/Table';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { Search, UserX, UserCheck, MessageSquare, RefreshCw } from 'lucide-react';
import { translations } from '../../lib/i18n';
import { Database } from '../../lib/database.types';
import Button from '../ui/Button';
import UserMessageDialog from './UserMessageDialog';

type User = Database['public']['Tables']['subscribers']['Row'];

const UserManagement: React.FC = () => {
  const { users, selectedBot, syncBotData, isLoading, error } = useBot();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Otomatik olarak API'den kullanıcıları çek (sayfa yüklendiğinde)
  useEffect(() => {
    if (selectedBot && users.length === 0 && !isLoading && !isSyncing) {
      console.log('UserManagement: Otomatik senkronizasyon başlatılıyor...');
      handleSyncData();
    }
  }, [selectedBot, users.length, isLoading]);

  // UserManagement component unmount olduğunda cleanup
  useEffect(() => {
    return () => {
      // Sayfa kapanırken bekleyen bildirimleri temizle
      const notifications = document.querySelectorAll('.sync-notification');
      notifications.forEach(notification => {
        document.body.removeChild(notification);
      });
    };
  }, []);

  const filteredUsers = (users || []).filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(term) ||
      user.first_name?.toLowerCase().includes(term) ||
      (user.last_name && user.last_name.toLowerCase().includes(term))
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
  };

  const handleSendMessage = (user: User) => {
    setSelectedUser(user);
    setIsMessageDialogOpen(true);
  };

  const closeMessageDialog = () => {
    setIsMessageDialogOpen(false);
    setSelectedUser(null);
  };
  
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      console.log('Telegram API senkronizasyonu başlatılıyor...');
      
      // Kullanıcılara geri bildirim vermek için mesaj
      const syncMessage = document.createElement('div');
      syncMessage.className = 'fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded shadow-lg z-50 sync-notification';
      syncMessage.innerHTML = `
        <div class="flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Telegram API'den kullanıcılar senkronize ediliyor...</span>
        </div>
      `;
      document.body.appendChild(syncMessage);
      
      // Senkronizasyonu başlat
      const success = await syncBotData();
      
      // Sonucu göster
      if (success) {
        syncMessage.className = 'fixed bottom-4 right-4 bg-green-600 text-white p-3 rounded shadow-lg z-50 sync-notification';
        syncMessage.innerHTML = `
          <div class="flex items-center">
            <svg class="mr-2 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Kullanıcılar başarıyla senkronize edildi! ${users.length} kullanıcı bulundu.</span>
          </div>
        `;
      } else {
        syncMessage.className = 'fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded shadow-lg z-50 sync-notification';
        syncMessage.innerHTML = `
          <div class="flex items-center">
            <svg class="mr-2 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span>Senkronizasyon sırasında bir hata oluştu: ${error || 'Bilinmeyen hata'}</span>
          </div>
        `;
      }
      
      // 5 saniye sonra bildirimi kaldır
      setTimeout(() => {
        if (document.body.contains(syncMessage)) {
          document.body.removeChild(syncMessage);
        }
      }, 5000);
      
      console.log('API Senkronizasyon sonucu:', success ? 'Başarılı' : 'Başarısız');
    } catch (error) {
      console.error('Senkronizasyon hatası:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!selectedBot) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {translations.users.title} ({(users || []).length})
          </h2>
          <div className="flex items-center space-x-4">
            <Button 
              variant="primary" 
              onClick={handleSyncData} 
              disabled={isLoading || isSyncing}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Senkronize Ediliyor...' : 'API\'den Kullanıcıları Çek'}
            </Button>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder={translations.users.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <div className="font-medium mb-1">Hata:</div>
              <div className="text-sm">{error}</div>
              <div className="mt-2 text-sm">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSyncData} 
                  disabled={isLoading || isSyncing}
                  className="flex items-center"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
                  Telegram API'den Senkronize Et
                </Button>
              </div>
            </div>
          )}
          
          {isLoading || isSyncing ? (
            <div className="py-32 flex justify-center items-center">
              <div className="flex flex-col items-center">
                <RefreshCw className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-500 text-lg">Kullanıcılar yükleniyor...</p>
                <p className="text-gray-400 text-sm mt-2">Telegram API'den veriler alınıyor ve veritabanına kaydediliyor</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Henüz hiçbir kullanıcı bulunamadı.</p>
              <p className="text-gray-500 text-sm mb-6">
                "API'den Kullanıcıları Çek" butonuna tıklayarak kullanıcıları yükleyebilirsiniz.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-left">
                <p className="text-sm font-medium">Otomatik Senkronizasyon İşlemi:</p>
                <ol className="text-xs mt-1 list-decimal pl-4 space-y-1">
                  <li>Telegram API'den bot güncellemeleri alınır</li>
                  <li>Kullanıcı bilgileri (Telegram API'den) çıkarılır</li>
                  <li>Veriler otomatik olarak Supabase veritabanına kaydedilir</li>
                  <li>Arayüzde kullanıcılar listelenir</li>
                </ol>
                <p className="text-sm mt-2">
                  Sayfayı yenilemek veya "API'den Kullanıcıları Çek" butonuna tıklamak senkronizasyon işlemini başlatır.
                </p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-left">
                <p className="text-sm font-medium">Senkronizasyon Yapılamazsa:</p>
                <ol className="text-xs mt-1 list-decimal pl-4 space-y-1">
                  <li>Botunuzun token'ının doğru olduğundan emin olun</li>
                  <li>Botla birkaç mesaj alışverişi yaparak sohbet geçmişi oluşturun</li>
                  <li>getUpdates API çağrısı, botla etkileşimde bulunan kullanıcıları getirir</li>
                  <li>Bazen botlar webhook modunda olduğu için getUpdates çalışmayabilir</li>
                </ol>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  variant="primary" 
                  onClick={handleSyncData}
                  disabled={isLoading || isSyncing}
                  className="flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Senkronize Ediliyor...' : 'API\'den Kullanıcıları Çek'}
                </Button>
              </div>
            </div>
          ) : (
          <Table
            data={filteredUsers}
            columns={[
              {
                key: 'username',
                header: translations.users.username,
                render: (user) => (
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium mr-3">
                        {user.first_name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">@{user.username || 'noname'}</div>
                      <div className="text-gray-500 text-xs">
                        {user.first_name} {user.last_name}
                      </div>
                    </div>
                  </div>
                ),
              },
                {
                  key: 'telegram_id',
                  header: 'Telegram ID',
                  render: (user) => (
                    <div className="font-mono text-sm text-gray-600">
                      {user.telegram_id}
                    </div>
                  ),
                },
              {
                key: 'joined_at',
                header: translations.users.joined,
                render: (user) => formatDate(user.joined_at),
              },
              {
                key: 'last_active',
                header: translations.users.lastActive,
                render: (user) => formatDate(user.last_active),
              },
              {
                key: 'is_blocked',
                header: translations.users.status,
                render: (user) => (
                  <div>
                    {user.is_blocked ? (
                      <Badge variant="danger" className="flex items-center">
                        <UserX className="h-3 w-3 mr-1" />
                        {translations.users.blocked}
                      </Badge>
                    ) : (
                      <Badge variant="success" className="flex items-center">
                        <UserCheck className="h-3 w-3 mr-1" />
                        {translations.users.active}
                      </Badge>
                    )}
                  </div>
                ),
              },
                {
                  key: 'actions',
                  header: 'İşlemler',
                  render: (user) => (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(user)}
                        disabled={user.is_blocked}
                        className="flex items-center"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Mesaj Gönder
                      </Button>
                    </div>
                  ),
                },
            ]}
            onRowClick={handleRowClick}
          />
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">
              {translations.users.details}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  {translations.users.basicInfo}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.users.username}:</span>
                    <span className="font-medium">@{selectedUser.username || 'noname'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.users.fullName}:</span>
                    <span className="font-medium">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Telegram ID:</span>
                    <span className="font-medium">{selectedUser.telegram_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.users.status}:</span>
                    <span>
                      {selectedUser.is_blocked ? (
                        <Badge variant="danger">{translations.users.blocked}</Badge>
                      ) : (
                        <Badge variant="success">{translations.users.active}</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  {translations.users.activity}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.users.joined}:</span>
                    <span className="font-medium">{formatDate(selectedUser.joined_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.users.lastActive}:</span>
                    <span className="font-medium">{formatDate(selectedUser.last_active)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedUser && (
        <UserMessageDialog
          isOpen={isMessageDialogOpen}
          onClose={closeMessageDialog}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default UserManagement;