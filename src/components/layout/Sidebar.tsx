import React, { useState, useEffect } from 'react';
import { useBot } from '../../context/BotContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Bot, Plus, Edit, Trash2, AlertTriangle, Search, Users, Megaphone } from 'lucide-react';
import { translations } from '../../lib/i18n';
import CreateBotDialog from '../bots/CreateBotDialog';
import EditBotDialog from '../bots/EditBotDialog';
import Modal from '../ui/Modal';
import Alert from '../ui/Alert';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Sidebar: React.FC = () => {
  const { bots, selectedBot, selectBot, isLoading, deleteBot, error, reloadBotData } = useBot();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<{ id: string; name: string; token: string } | null>(null);
  const [botToDelete, setBotToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [botSubscribers, setBotSubscribers] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  // Bot abonelerini yükleme fonksiyonu
  useEffect(() => {
    const loadBotSubscriberCounts = async () => {
      if (bots.length === 0) return;
      
      const subscriberCounts: Record<string, number> = {};
      
      for (const bot of bots) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('bot_id', bot.id);
            
          if (error) {
            console.error(`Bot ${bot.id} için abone sayısı alınamadı:`, error);
            subscriberCounts[bot.id] = 0;
          } else {
            subscriberCounts[bot.id] = data?.length || 0;
          }
        } catch (err) {
          console.error(`Bot ${bot.id} için abone sayısı alınırken hata:`, err);
          subscriberCounts[bot.id] = 0;
        }
      }
      
      setBotSubscribers(subscriberCounts);
    };
    
    loadBotSubscriberCounts();
  }, [bots]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'online') {
      return <Badge variant="success">{translations.dashboard.status.online}</Badge>;
    } else if (status === 'offline') {
      return <Badge variant="warning">{translations.dashboard.status.offline}</Badge>;
    } else {
      return <Badge variant="danger">{translations.dashboard.status.error}</Badge>;
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    }).format(date);
  };

  const handleDeleteClick = (e: React.MouseEvent, bot: { id: string; name: string }) => {
    e.stopPropagation();
    setBotToDelete(bot);
  };

  const handleConfirmDelete = async () => {
    if (!botToDelete) return;
    
    setIsDeleting(true);
    const success = await deleteBot(botToDelete.id);
    
    setIsDeleting(false);
    if (success) {
      setDeleteResult({
        success: true,
        message: `"${botToDelete.name}" botu başarıyla silindi.`
      });
    } else {
      setDeleteResult({
        success: false,
        message: error || `"${botToDelete.name}" botu silinirken hata oluştu.`
      });
    }
    
    // 3 saniye sonra sonuç mesajını kapatacak
    setTimeout(() => {
      setDeleteResult(null);
    }, 3000);
    
    setBotToDelete(null);
  };

  const closeDeleteModal = () => {
    setBotToDelete(null);
  };
  
  const handleBulkAnnouncementClick = () => {
    navigate('/bulk-announcement');
  };
  
  // Arama sonuçları filtrelenmiş botlar listesi
  const filteredBots = bots.filter(bot => 
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-80 bg-white border-r border-gray-200 min-h-screen overflow-y-auto">
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <Bot className="h-6 w-6 text-indigo-600 mr-2" />
        <h1 className="text-lg font-bold text-gray-900">{translations.dashboard.title}</h1>
      </div>
      
      <div className="p-4">
        {deleteResult && (
          <Alert
            type={deleteResult.success ? 'success' : 'error'}
            message={deleteResult.message}
            onClose={() => setDeleteResult(null)}
            className="mb-4"
          />
        )}
        
        <Card className="p-3 mb-4 bg-indigo-50 border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors" 
              onClick={handleBulkAnnouncementClick}>
          <div className="flex items-center">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-indigo-900">Toplu Duyuru Gönder</h3>
              <p className="text-xs text-indigo-700 mt-1">
                Tüm botların kullanıcılarına mesaj gönder
              </p>
            </div>
          </div>
        </Card>
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {translations.dashboard.myBots}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            {translations.bots.add}
          </Button>
        </div>
        
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Bot ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-2 w-full"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBots.length > 0 ? (
              filteredBots.map((bot) => (
              <Card 
                key={bot.id} 
                hoverable
                onClick={() => selectBot(bot.id)}
                className={`transition-all duration-200 border-l-4 ${
                  selectedBot?.id === bot.id 
                    ? 'border-l-indigo-600 bg-indigo-50' 
                    : 'border-l-transparent hover:border-l-gray-300'
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-900">{bot.name}</h3>
                    {getStatusBadge(bot.status)}
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex justify-between mt-2">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {translations.bots.users}:
                      </span>
                      <span className="font-medium">{formatNumber(botSubscribers[bot.id] || 0)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>{translations.bots.lastActive}:</span>
                      <span className="font-medium">{formatLastActive(bot.last_active)}</span>
                    </div>
                  </div>

                    <div className="mt-3 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBot({
                          id: bot.id,
                          name: bot.name,
                          token: bot.token
                        });
                      }}
                      className="flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {translations.common.edit}
                    </Button>
                      
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => handleDeleteClick(e, { id: bot.id, name: bot.name })}
                        className="flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Sil
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? (
                  <>
                    <Search className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p>Aranan bota ulaşılamadı</p>
                    <p className="text-sm mt-2">"{searchTerm}" ile eşleşen bot bulunamadı</p>
                  </>
                ) : (
                  <>
                    <Bot className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p>Henüz bir bot eklenmemiş</p>
                    <p className="text-sm mt-2">Başlamak için "Bot Ekle" butonuna tıklayın</p>
                  </>
                )}
                </div>
            )}
          </div>
        )}
      </div>

      <CreateBotDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {editingBot && (
        <EditBotDialog
          isOpen={true}
          onClose={() => setEditingBot(null)}
          bot={editingBot}
        />
      )}
      
      {/* Bot silme onay modalı */}
      {botToDelete && (
        <Modal
          isOpen={!!botToDelete}
          onClose={closeDeleteModal}
          title="Bot Silme Onayı"
        >
          <div className="p-4">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 bg-red-100 rounded-full p-2 mr-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Bu botu silmek istediğinizden emin misiniz?
                </h3>
                <p className="text-gray-500">
                  <strong>{botToDelete.name}</strong> adlı bot ve ona ait tüm veriler (aboneler, gruplar, duyurular) kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={closeDeleteModal}
                disabled={isDeleting}
              >
                İptal
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Botu Sil
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
};

export default Sidebar;