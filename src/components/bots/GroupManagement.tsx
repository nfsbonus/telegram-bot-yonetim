import React, { useState } from 'react';
import { useBot } from '../../context/BotContext';
import Table from '../ui/Table';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Search, Users, Clock, Plus, RefreshCw } from 'lucide-react';
import { translations } from '../../lib/i18n';
import { Database } from '../../lib/database.types';

type Group = Database['public']['Tables']['groups']['Row'];

const GroupManagement: React.FC = () => {
  const { groups, selectedBot, addGroup, syncBotData, isLoading, error } = useBot();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [addGroupError, setAddGroupError] = useState<string | null>(null);
  const [addGroupSuccess, setAddGroupSuccess] = useState<boolean>(false);

  const filteredGroups = (groups || []).filter((group) => {
    const term = searchTerm.toLowerCase();
    return group.title.toLowerCase().includes(term);
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

  const handleRowClick = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleSyncData = async () => {
    await syncBotData();
  };

  const handleAddGroup = async () => {
    setAddGroupError(null);
    setAddGroupSuccess(false);
    
    // Input kontrolü
    if (!newGroupId.trim()) {
      setAddGroupError('Grup ID boş olamaz');
      return;
    }
    
    // Sayısal değer kontrol et
    const numericId = Number(newGroupId);
    if (isNaN(numericId)) {
      setAddGroupError("Geçerli bir sayısal Telegram Grup ID'si girin");
      return;
    }
    
    const success = await addGroup(numericId);
    if (success) {
      setAddGroupSuccess(true);
      setNewGroupId('');
      
      // 3 saniye sonra modal'ı kapat
      setTimeout(() => {
        setIsAddGroupModalOpen(false);
        setAddGroupSuccess(false);
      }, 3000);
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
            {translations.groups.title} ({(groups || []).length})
          </h2>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={handleSyncData} 
              disabled={isLoading}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Grupları Senkronize Et
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setIsAddGroupModalOpen(true)}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Grup Ekle
            </Button>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder={translations.groups.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}
          
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Henüz hiçbir grup bulunamadı.</p>
              <p className="text-gray-500 text-sm mb-6">
                Bot gruplarınıza eklenmiş olmalı veya grupları manuel olarak ekleyebilirsiniz.
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={handleSyncData} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Grupları Senkronize Et
                </Button>
                <Button variant="primary" onClick={() => setIsAddGroupModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Manuel Grup Ekle
                </Button>
              </div>
            </div>
          ) : (
          <Table
            data={filteredGroups}
            columns={[
              {
                key: 'title',
                header: translations.groups.name,
                render: (group) => (
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium mr-3">
                      {group.title.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{group.title}</div>
                      <div className="text-gray-500 text-xs">
                        {group.type === 'supergroup' ? translations.groups.supergroup : translations.groups.group}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'member_count',
                header: translations.groups.members,
                render: (group) => (
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{group.member_count}</span>
                  </div>
                ),
              },
              {
                key: 'joined_at',
                header: translations.groups.joined,
                render: (group) => formatDate(group.joined_at),
              },
              {
                key: 'last_active',
                header: translations.groups.lastActive,
                render: (group) => (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{formatDate(group.last_active)}</span>
                  </div>
                ),
              },
            ]}
            onRowClick={handleRowClick}
          />
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-800">
              {translations.groups.details}
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  {translations.groups.basicInfo}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.groups.name}:</span>
                    <span className="font-medium">{selectedGroup.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.groups.type}:</span>
                    <Badge variant="info">
                      {selectedGroup.type === 'supergroup' ? translations.groups.supergroup : translations.groups.group}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Telegram ID:</span>
                    <span className="font-medium">{selectedGroup.telegram_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.groups.members}:</span>
                    <span className="font-medium">{selectedGroup.member_count}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  {translations.groups.activity}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.groups.joined}:</span>
                    <span className="font-medium">{formatDate(selectedGroup.joined_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{translations.groups.lastActive}:</span>
                    <span className="font-medium">{formatDate(selectedGroup.last_active)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grup Ekleme Modal */}
      <Modal
        isOpen={isAddGroupModalOpen}
        onClose={() => {
          setIsAddGroupModalOpen(false);
          setAddGroupError(null);
          setAddGroupSuccess(false);
          setNewGroupId('');
        }}
        title="Manuel Grup Ekle"
        size="md"
      >
        <div className="p-6">
          <p className="mb-4 text-gray-600">
            Telegram grubunun ID'sini girerek manuel olarak bir grup ekleyebilirsiniz. Bu ID'yi bulmak için, botun zaten grup üyesi olduğundan emin olun ve grup bilgilerini kontrol edin.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4">
            <p className="text-sm">
              <strong>Yardım:</strong> API sonucunda görülen grup ID'si: <code>-4785534250</code> (Bot test grubu)
            </p>
            <p className="text-sm mt-1">
              Bu ID'yi kullanarak manuel olarak grubu ekleyebilirsiniz.
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
              Telegram Grup ID
            </label>
            <Input
              id="groupId"
              type="text"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              placeholder="-100123456789"
              className="w-full"
              disabled={isLoading || addGroupSuccess}
            />
            <p className="mt-1 text-sm text-gray-500">
              Grup ID'si genellikle "-100" ile başlar ve bunu sayılar takip eder. <br />
              ID'yi bulmak için: Bot'u gruba ekleyin ve grupta bir mesaj gönderin. <br />
              Webhook hatası alıyorsanız, ID'yi doğrudan da girebilirsiniz.
            </p>
          </div>
          
          {addGroupError && (
            <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
              {addGroupError}
            </div>
          )}
          
          {addGroupSuccess && (
            <div className="bg-green-50 text-green-700 p-3 rounded mb-4">
              Grup başarıyla eklendi! Modal otomatik olarak kapanacak.
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddGroupModalOpen(false);
                setAddGroupError(null);
                setAddGroupSuccess(false);
              }}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={handleAddGroup}
              disabled={isLoading || addGroupSuccess || !newGroupId.trim()}
            >
              {isLoading ? 'Ekleniyor...' : 'Grup Ekle'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupManagement;