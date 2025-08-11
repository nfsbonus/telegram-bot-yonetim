import React, { useState, useEffect } from 'react';
import { useBot } from '../../context/BotContext';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { Megaphone, Check, AlertCircle, Image as ImageIcon, X, ArrowLeft, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Checkbox from '../ui/Checkbox';
import Alert from '../ui/Alert';

type BotWithCount = {
  id: string;
  name: string;
  subscriberCount: number;
  selected: boolean;
};

const BulkAnnouncementPage: React.FC = () => {
  const { bots } = useBot();
  const navigate = useNavigate();
  const [botsWithCounts, setBotsWithCounts] = useState<BotWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [totalSelectedSubscribers, setTotalSelectedSubscribers] = useState(0);
  const [selectAll, setSelectAll] = useState(true);

  // Bot verilerini ve abone sayılarını yükle
  useEffect(() => {
    const loadBotSubscribers = async () => {
      setIsLoading(true);
      
      try {
        const botsData: BotWithCount[] = [];
        
        for (const bot of bots) {
          const { data, error } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('bot_id', bot.id)
            .eq('is_blocked', false);
            
          if (error) {
            console.error(`Bot ${bot.id} için abone sayısı alınamadı:`, error);
            botsData.push({
              id: bot.id,
              name: bot.name,
              subscriberCount: 0,
              selected: true
            });
          } else {
            botsData.push({
              id: bot.id,
              name: bot.name,
              subscriberCount: data?.length || 0,
              selected: true
            });
          }
        }
        
        setBotsWithCounts(botsData);
        calculateTotalSubscribers(botsData);
      } catch (err) {
        console.error('Bot verileri yüklenirken hata:', err);
        setError('Bot verileri yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBotSubscribers();
  }, [bots]);

  // Toplam seçili abone sayısını hesapla
  const calculateTotalSubscribers = (botList: BotWithCount[]) => {
    const total = botList
      .filter(bot => bot.selected)
      .reduce((sum, bot) => sum + bot.subscriberCount, 0);
    
    setTotalSelectedSubscribers(total);
  };

  // Bot seçim durumunu değiştir
  const toggleBotSelection = (botId: string) => {
    const updatedBots = botsWithCounts.map(bot => 
      bot.id === botId ? { ...bot, selected: !bot.selected } : bot
    );
    
    setBotsWithCounts(updatedBots);
    calculateTotalSubscribers(updatedBots);
    
    // Tümü seçili mi kontrol et
    const allSelected = updatedBots.every(bot => bot.selected);
    setSelectAll(allSelected);
  };

  // Tüm botları seç/kaldır
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    const updatedBots = botsWithCounts.map(bot => ({
      ...bot,
      selected: newSelectAll
    }));
    
    setSelectAll(newSelectAll);
    setBotsWithCounts(updatedBots);
    calculateTotalSubscribers(updatedBots);
  };

  // Duyuru gönder
  const sendAnnouncement = async () => {
    if (!title || !description) {
      setError('Lütfen başlık ve açıklama alanlarını doldurun.');
      return;
    }
    
    if (totalSelectedSubscribers === 0) {
      setError('Lütfen en az bir bot seçin ve seçilen botların aboneleri olduğundan emin olun.');
      return;
    }
    
    setIsSending(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Seçili botların ID'lerini al
      const selectedBotIds = botsWithCounts
        .filter(bot => bot.selected)
        .map(bot => bot.id);
      
      if (selectedBotIds.length === 0) {
        throw new Error('Lütfen en az bir bot seçin.');
      }
      
      // Her bot için duyuru oluştur
      const announcementPromises = selectedBotIds.map(async (botId) => {
        const announcement = {
          bot_id: botId,
          title,
          description,
          image_url: imageUrl || null
        };
        
        // Duyuruyu veritabanına kaydet
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            ...announcement,
            status: 'sending',
            total_count: botsWithCounts.find(b => b.id === botId)?.subscriberCount || 0,
            delivered_count: 0
          })
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        // Bot token'ını al
        const { data: botData, error: botError } = await supabase
          .from('bots')
          .select('token')
          .eq('id', botId)
          .single();
          
        if (botError || !botData) {
          throw new Error(`Bot ${botId} token'ı alınamadı`);
        }
        
        // Aboneleri al
        const { data: subscribers, error: subscribersError } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('bot_id', botId)
          .eq('is_blocked', false);
          
        if (subscribersError) {
          throw subscribersError;
        }
        
        const botToken = botData.token;
        let deliveredCount = 0;
        
        // Mesaj metni
        const messageText = `<b>${title}</b>\n\n${description}`;
        
        // Her aboneye mesaj gönder
        const batchSize = 25; // Telegram rate limit'i aşmamak için
        
        // Aboneleri gruplara böl
        const subscriberBatches = [];
        for (let i = 0; i < subscribers.length; i += batchSize) {
          subscriberBatches.push(subscribers.slice(i, i + batchSize));
        }
        
        // Her grup için mesaj gönder
        for (const batch of subscriberBatches) {
          const sendPromises = batch.map(async (subscriber) => {
            try {
              let response;
              
              // Resimli mesaj varsa
              if (imageUrl) {
                response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    chat_id: subscriber.telegram_id,
                    photo: imageUrl,
                    caption: messageText,
                    parse_mode: 'HTML'
                  })
                });
              } else {
                // Sadece metin mesajı
                response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    chat_id: subscriber.telegram_id,
                    text: messageText,
                    parse_mode: 'HTML'
                  })
                });
              }
              
              const result = await response.json();
              
              if (result.ok) {
                deliveredCount++;
                return true;
              } else {
                console.error('Mesaj gönderilirken hata:', result);
                return false;
              }
            } catch (error) {
              console.error('Telegram API hatası:', error);
              return false;
            }
          });
          
          await Promise.all(sendPromises);
          
          // Telegram rate limit'i aşmamak için bekle
          if (subscriberBatches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Duyuruyu güncelle
        await supabase
          .from('announcements')
          .update({
            status: deliveredCount > 0 ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            delivered_count: deliveredCount
          })
          .eq('id', data.id);
          
        return {
          botId,
          announcementId: data.id,
          totalSubscribers: subscribers.length,
          deliveredCount
        };
      });
      
      // Tüm duyuruları gönder
      const results = await Promise.all(announcementPromises);
      
      const totalDelivered = results.reduce((sum, result) => sum + result.deliveredCount, 0);
      const totalSubscribers = results.reduce((sum, result) => sum + result.totalSubscribers, 0);
      
      setSuccess(true);
      setTitle('');
      setDescription('');
      setImageUrl('');
      
      // Başarı mesajı
      const successMessage = `Duyurunuz başarıyla gönderildi! ${totalDelivered}/${totalSubscribers} kişiye ulaştı.`;
      setError(successMessage);
    } catch (err) {
      console.error('Duyuru gönderme hatası:', err);
      setError(err instanceof Error ? err.message : 'Duyuru gönderilirken bir hata oluştu.');
      setSuccess(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Megaphone className="h-6 w-6 mr-2 text-indigo-600" />
          Toplu Duyuru Gönder
        </h1>
      </div>
      
      {error && (
        <Alert
          type={success ? 'success' : 'error'}
          message={error}
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-800">Duyuru İçeriği</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block mb-1 font-medium text-gray-700">
                    Başlık
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Duyuru başlığı"
                    disabled={isSending}
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block mb-1 font-medium text-gray-700">
                    Mesaj
                  </label>
                  <TextArea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Duyuru içeriği"
                    rows={6}
                    disabled={isSending}
                  />
                </div>
                
                <div>
                  <label htmlFor="image-url" className="block mb-1 font-medium text-gray-700">
                    Görsel URL (opsiyonel)
                  </label>
                  <div className="relative">
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="pr-10"
                      disabled={isSending}
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setImageUrl('')}
                        disabled={isSending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {!imageUrl && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Görsel eklemek opsiyoneldir. Mesajla birlikte görsel göndermek için geçerli bir URL girin.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-800">Duyuru Gönder</h2>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg mb-4 flex items-center">
                <div className="mr-3 bg-indigo-100 rounded-full p-2">
                  <AlertCircle className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    Bu duyuru seçtiğiniz tüm botların abonelerine gönderilecektir.
                    Gönderim durumuna göre istatistikler her bot için ayrı olarak kaydedilecektir.
                  </p>
                </div>
              </div>
              
              <Button
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center"
                onClick={sendAnnouncement}
                disabled={isSending || isLoading || totalSelectedSubscribers === 0}
                isLoading={isSending}
              >
                {!isSending && <Megaphone className="h-5 w-5 mr-2" />}
                {isSending ? 'Duyuru Gönderiliyor...' : 'Duyuruyu Gönder'}
              </Button>
              
              {totalSelectedSubscribers === 0 && !isLoading && (
                <p className="mt-2 text-sm text-red-500 text-center">
                  Lütfen en az bir bot seçin ve seçilen botların aboneleri olduğundan emin olun.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Botlar</h2>
              <div className="flex items-center">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  disabled={isLoading || isSending}
                />
                <label htmlFor="select-all" className="ml-2 text-sm text-gray-700">
                  Tümünü Seç
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : botsWithCounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Henüz hiçbir bot eklenmemiş</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {botsWithCounts.map((bot) => (
                    <div 
                      key={bot.id}
                      className={`p-3 rounded-lg border ${
                        bot.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                      } transition-colors duration-150`}
                    >
                      <div className="flex items-center">
                        <Checkbox
                          id={`bot-${bot.id}`}
                          checked={bot.selected}
                          onChange={() => toggleBotSelection(bot.id)}
                          disabled={isSending}
                        />
                        <div className="ml-3 flex-grow">
                          <label 
                            htmlFor={`bot-${bot.id}`}
                            className="font-medium text-gray-900 block cursor-pointer"
                          >
                            {bot.name}
                          </label>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Users className="h-3 w-3 mr-1" />
                            {bot.subscriberCount} abone
                          </div>
                        </div>
                        {bot.selected && (
                          <div className="text-indigo-600">
                            <Check className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">Toplam Alıcı:</span>
                      <span className="font-bold text-indigo-700">{totalSelectedSubscribers} kişi</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BulkAnnouncementPage; 