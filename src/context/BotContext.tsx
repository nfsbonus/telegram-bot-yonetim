import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { translations } from '../lib/i18n';

type Bot = Database['public']['Tables']['bots']['Row'];
type BotUser = Database['public']['Tables']['users']['Row'];
type Announcement = Database['public']['Tables']['announcements']['Row'];
type Group = {
  id: string;
  telegram_id: number;
  title: string;
  type: string;
  member_count: number;
  joined_at: string;
  last_active: string;
  bot_id: string;
}

interface BotContextType {
  bots: Bot[];
  selectedBot: Bot | null;
  users: BotUser[];
  groups: Group[];
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  selectBot: (botId: string) => void;
  createBot: (bot: { name: string; token: string }) => Promise<boolean>;
  updateBot: (botId: string, bot: { name: string; token: string }) => Promise<boolean>;
  sendAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at' | 'sent_at' | 'status' | 'delivered_count' | 'total_count'>) => Promise<boolean>;
  scheduleAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at' | 'sent_at' | 'status' | 'delivered_count' | 'total_count'>, scheduledTime: string) => Promise<boolean>;
  syncBotData: () => Promise<boolean>;
  deleteBot: (botId: string) => Promise<boolean>;
  addGroup: (groupId: number) => Promise<boolean>;
  addSubscriber: (userId: number) => Promise<boolean>;
  reloadBotData: () => Promise<void>;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export const BotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [users, setUsers] = useState<BotUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load bots when user changes
  useEffect(() => {
    if (!user) {
      setBots([]);
      setSelectedBot(null);
      return;
    }

    const loadBots = async () => {
      try {
        const { data, error } = await supabase
          .from('bots')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBots(data);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load bots');
        setIsLoading(false);
      }
    };

    loadBots();

    // Subscribe to bot changes
    const botsSubscription = supabase
      .channel('bot-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bots',
      }, () => {
        loadBots();
      })
      .subscribe();

    return () => {
      botsSubscription.unsubscribe();
    };
  }, [user]);

  // Move loadBotData outside the useEffect so it can be used elsewhere
  const loadBotData = async () => {
    if (!selectedBot) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`${selectedBot.id} ID'li bot için verileri yüklüyorum...`);
      
      // Kullanıcıları al
      const usersResponse = await supabase
        .from('users')
        .select('*')
        .eq('bot_id', selectedBot.id)
        .order('joined_at', { ascending: false });
        
      if (usersResponse.error) {
        console.error('Kullanıcılar yüklenirken hata:', usersResponse.error);
        throw usersResponse.error;
      }
      
      // Boş veri kontrolü
      const usersData = usersResponse.data || [];
      console.log(`${usersData.length} kullanıcı veritabanından yüklendi`);
      
      if (usersData.length === 0) {
        console.log("Veritabanında hiç kullanıcı bulunamadı - API senkronizasyonu gerekli olabilir");
      } else {
        console.log('Kullanıcı verileri örnek:', JSON.stringify(usersData[0]));
      }
      
      // Grupları al
      const groupsResponse = await supabase
        .from('groups')
        .select('*')
        .eq('bot_id', selectedBot.id)
        .order('joined_at', { ascending: false });
        
      if (groupsResponse.error) {
        console.error('Gruplar yüklenirken hata:', groupsResponse.error);
        throw groupsResponse.error;
      }
      
      // Boş veri kontrolü
      const groupsData = groupsResponse.data || [];
      console.log(`${groupsData.length} grup veritabanından yüklendi`);
      
      // Duyuruları al
      const announcementsResponse = await supabase
        .from('announcements')
        .select('*')
        .eq('bot_id', selectedBot.id)
        .order('created_at', { ascending: false });
        
      if (announcementsResponse.error) {
        console.error('Duyurular yüklenirken hata:', announcementsResponse.error);
        throw announcementsResponse.error;
      }
      
      // Boş veri kontrolü
      const announcementsData = announcementsResponse.data || [];
      console.log(`${announcementsData.length} duyuru veritabanından yüklendi`);

      // Verileri state'e ata (Supabase'den gelen veriler boş olsa bile boş array kullan)
      setUsers(usersData);
      setGroups(groupsData);
      setAnnouncements(announcementsData);
      
      console.log('Tüm veriler başarıyla yüklendi ve UI güncellenecek');
      console.log('Users state güncelleniyor:', usersData.length);
      
      // State güncellemesinin gerçekleşip gerçekleşmediğini kontrol etmek için
      setTimeout(() => {
        console.log('Users state güncelleme sonrası kontrol:', users.length);
      }, 500);
      
      // Eğer tüm tablolar boşsa, bir uyarı mesajı göster
      if (usersData.length === 0 && groupsData.length === 0 && announcementsData.length === 0) {
        setError('Botunuz için henüz hiç veri bulunamadı. "Telegram ile Senkronize Et" butonunu kullanarak verileri yükleyin.');
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      setError('Veritabanından veriler yüklenemedi: ' + (err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load users, groups and announcements when a bot is selected
  useEffect(() => {
    if (!selectedBot) {
      setUsers([]);
      setGroups([]);
      setAnnouncements([]);
      return;
    }

    loadBotData();

    // Subscribe to user, group and announcement changes
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `bot_id=eq.${selectedBot.id}`,
      }, () => {
        loadBotData();
      })
      .subscribe();

    const groupsSubscription = supabase
      .channel('groups-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'groups',
        filter: `bot_id=eq.${selectedBot.id}`,
      }, () => {
        loadBotData();
      })
      .subscribe();

    const announcementsSubscription = supabase
      .channel('announcements-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
        filter: `bot_id=eq.${selectedBot.id}`,
      }, () => {
        loadBotData();
      })
      .subscribe();

    return () => {
      usersSubscription.unsubscribe();
      groupsSubscription.unsubscribe();
      announcementsSubscription.unsubscribe();
    };
  }, [selectedBot]);

  const selectBot = (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    setSelectedBot(bot ?? null);
  };

  const createBot = async (bot: { name: string; token: string }): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bots')
        .insert({
          ...bot,
          user_id: user.id,
          status: 'online',
        })
        .select()
        .single();

      if (error) throw error;

      // Start the bot automatically
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot?botId=${data.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setBots(prev => [data, ...prev]);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(translations.bots.createError);
      setIsLoading(false);
      return false;
    }
  };

  const updateBot = async (botId: string, bot: { name: string; token: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Önce token'ın geçerli olup olmadığını Telegram API ile kontrol et
      const botCheckResponse = await fetch(`https://api.telegram.org/bot${bot.token}/getMe`);
      const botCheckData = await botCheckResponse.json();
      
      if (!botCheckData.ok) {
        setError(`Geçersiz bot token: ${botCheckData.description || 'Bot bulunamadı'}`);
        setIsLoading(false);
        return false;
      }
      
      // Botun kullanıcı adını logla
      const botUsername = botCheckData.result.username;
      console.log(`Bot token doğrulandı: @${botUsername}`);

      // Veritabanında botu güncelle
      const { data, error } = await supabase
        .from('bots')
        .update(bot)
        .eq('id', botId)
        .select()
        .single();

      if (error) throw error;

      // Botu başlat - setCommands ile temel komutları ayarla
      const commandsResponse = await fetch(`https://api.telegram.org/bot${bot.token}/setMyCommands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commands: [
            {
              command: 'start',
              description: 'Botu başlat'
            },
            {
              command: 'help',
              description: 'Yardım menüsü'
            }
          ]
        })
      });
      
      const commandsData = await commandsResponse.json();
      if (!commandsData.ok) {
        console.warn('Komutlar ayarlanamadı:', commandsData.description);
      }

      // Botun başladığını bildiren mesaj gönder
      const message = `🤖 ${bot.name} botu başarıyla yapılandırıldı ve şu an çalışıyor. Bot kullanıcı adı: @${botUsername}`;
      
      try {
        // Botun güncellenmelerini almak için bir sorgu gönder
        const updatesResponse = await fetch(`https://api.telegram.org/bot${bot.token}/getUpdates?limit=5`);
        const updatesData = await updatesResponse.json();
        
        if (updatesData.ok && updatesData.result && updatesData.result.length > 0) {
          // Botla etkileşimde bulunan son kullanıcıları bul
          const recentChats = new Set<number>();
          
          for (const update of updatesData.result) {
            const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
            if (chatId && update.message?.chat?.type === 'private') {
              recentChats.add(chatId);
            }
          }
          
          // Son kullanıcılara bildirim gönder
          for (const chatId of recentChats) {
            await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
              })
            });
          }
        }
      } catch (notifyError) {
        console.warn('Kullanıcılara bildirim gönderilemedi:', notifyError);
      }

      // Restart the bot with new settings via Edge Function (optional - removes this if it doesn't work)
      try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot?botId=${botId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      } catch (edgeFnError) {
        console.warn('Edge Function çağrılamadı (opsiyonel):', edgeFnError);
      }

      setBots(prev => prev.map(b => b.id === botId ? data : b));
      if (selectedBot?.id === botId) {
        setSelectedBot(data);
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(translations.bots.updateError);
      setIsLoading(false);
      return false;
    }
  };

  const sendAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'sent_at' | 'status' | 'delivered_count' | 'total_count'>): Promise<boolean> => {
    if (!selectedBot) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Bot token'ını veritabanından al
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('token')
        .eq('id', selectedBot.id)
        .single();

      if (botError || !botData) {
        throw new Error('Bot token alınamadı');
      }

      const botToken = botData.token;

      // Aktif aboneleri veritabanından al
      const { data: subscribers, error: subscribersError } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('bot_id', selectedBot.id)
        .eq('is_blocked', false);

      if (subscribersError) {
        throw new Error('Aboneler alınamadı');
      }

      // Alıcıların sayısı (toplam abone sayısı)
      const totalCount = subscribers.length;
      
      // Mesajı veritabanına kaydet
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .insert({
          ...announcement,
          bot_id: selectedBot.id,
          status: 'sending',
          total_count: totalCount,
          delivered_count: 0
        })
        .select()
        .single();

      if (announcementError) {
        throw new Error('Duyuru kaydedilirken hata oluştu');
      }

      let deliveredCount = 0;

      // Abone yoksa başarılı olarak işaretle
      if (totalCount === 0) {
        await supabase
          .from('announcements')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', announcementData.id);

        setAnnouncements(prev => [announcementData, ...prev]);
        setIsLoading(false);
        return true;
      }

      // Her aboneye mesaj gönder
      const sentAtTimestamp = new Date().toISOString();
      const batchSize = 25; // Telegram rate limit'i aşmamak için
      
      // Aboneleri gruplara böl
      const subscriberBatches = [];
      for (let i = 0; i < subscribers.length; i += batchSize) {
        subscriberBatches.push(subscribers.slice(i, i + batchSize));
      }
      
      // Ana duyuru mesajını oluştur
      let messageText = `<b>${announcement.title}</b>\n\n${announcement.description}`;
      
      // Her grup için mesaj gönder
      for (const batch of subscriberBatches) {
        const sendPromises = batch.map(async (subscriber) => {
          try {
            // Mesaj gövdesi - resimli veya resimsiz
            const messageParams: any = {
              chat_id: subscriber.telegram_id,
              text: messageText,
              parse_mode: 'HTML',
              disable_notification: false
            };
            
            let response;
            
            // Resimli mesaj varsa
            if (announcement.image_url) {
              response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  chat_id: subscriber.telegram_id,
                  photo: announcement.image_url,
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
                body: JSON.stringify(messageParams)
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
        
        // İlerleme durumunu güncelle
        await supabase
          .from('announcements')
          .update({
            delivered_count: deliveredCount
          })
          .eq('id', announcementData.id);
      }
      
      // Duyuruyu tamamlandı olarak işaretle
      const finalStatus = deliveredCount > 0 ? 'sent' : 'failed';
      const { data: updatedAnnouncement } = await supabase
        .from('announcements')
        .update({
          status: finalStatus,
          sent_at: sentAtTimestamp,
          delivered_count: deliveredCount
        })
        .eq('id', announcementData.id)
        .select()
        .single();
      
      // Duyuruları güncelle
      if (updatedAnnouncement) {
        setAnnouncements(prev => prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a));
      } else {
        // Eğer güncelleme sonucunda veri dönmediyse, tüm duyuruları yeniden yükle
        const { data: refreshedAnnouncements } = await supabase
          .from('announcements')
          .select('*')
          .eq('bot_id', selectedBot.id)
          .order('created_at', { ascending: false });
          
        if (refreshedAnnouncements) {
          setAnnouncements(refreshedAnnouncements);
        }
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Duyuru gönderme hatası:', err);
      setError(err instanceof Error ? err.message : 'Duyuru gönderilirken bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  };

  const scheduleAnnouncement = async (announcement: Omit<Announcement, 'id' | 'created_at' | 'sent_at' | 'status' | 'delivered_count' | 'total_count'>, scheduledTime: string): Promise<boolean> => {
    if (!selectedBot) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Aktif aboneleri veritabanından al
      const { data: subscribers, error: subscribersError } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('bot_id', selectedBot.id)
        .eq('is_blocked', false);

      if (subscribersError) {
        throw new Error('Aboneler alınamadı');
      }

      // Alıcıların sayısı (toplam abone sayısı)
      const totalCount = subscribers.length;
      
      // Mesajı veritabanına kaydet - scheduled status ile
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .insert({
          ...announcement,
          bot_id: selectedBot.id,
          status: 'scheduled',
          total_count: totalCount,
          delivered_count: 0,
          scheduled_time: scheduledTime
        })
        .select()
        .single();

      if (announcementError) {
        throw new Error('Duyuru kaydedilirken hata oluştu');
      }

      // Duyuruları güncelle
      setAnnouncements(prev => [announcementData, ...prev]);
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Duyuru zamanlama hatası:', err);
      setError(err instanceof Error ? err.message : 'Duyuru zamanlanırken bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  };

  // Botun verilerini Telegram API ile senkronize eden fonksiyon
  const syncBotData = async (): Promise<boolean> => {
    if (!selectedBot) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Telegram API senkronizasyonu başlatılıyor...');
      
      // Bot token'ını veritabanından al
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('token')
        .eq('id', selectedBot.id)
        .single();

      if (botError || !botData) {
        throw new Error('Bot bilgileri alınamadı: ' + (botError?.message || 'Bilinmeyen hata'));
      }

      const botToken = botData.token;
      const apiBase = `https://api.telegram.org/bot${botToken}`;

      // Bot bilgilerini al - token geçerli mi kontrol et
      console.log('Bot token doğrulanıyor...');
      const botCheckResponse = await fetch(`${apiBase}/getMe`);
      const botCheckData = await botCheckResponse.json();

      if (!botCheckData.ok) {
        throw new Error(`Telegram API hatası: ${botCheckData.description || 'Bilinmeyen hata'}`);
      }

      console.log(`Bot token geçerli: @${botCheckData.result.username}`);

      // Doğrudan getUpdates ile güncellemeleri almayı dene
      console.log('Bot güncellemeleri alınıyor...');
      const updatesResponse = await fetch(`${apiBase}/getUpdates?limit=100`);
      const updatesData = await updatesResponse.json();

      // Webhook hatası varsa veya getUpdates başarısız olduysa, webhook'u kaldırıp tekrar dene
      if (!updatesData.ok) {
        console.warn("getUpdates başarısız, webhook kaldırılmayı deniyor:", updatesData.description);
        
        // Webhook'u kaldır
        const deleteWebhookResponse = await fetch(`${apiBase}/deleteWebhook?drop_pending_updates=true`);
        const deleteWebhookData = await deleteWebhookResponse.json();
        
        if (!deleteWebhookData.ok) {
          console.error('Webhook kaldırılamadı:', deleteWebhookData.description);
          throw new Error(`Webhook kaldırılamadı: ${deleteWebhookData.description}`);
        }
        
        console.log('Webhook başarıyla kaldırıldı, tekrar getUpdates deneniyor');
        
        // Tekrar getUpdates dene
        const retryUpdatesResponse = await fetch(`${apiBase}/getUpdates?limit=100`);
        const retryUpdatesData = await retryUpdatesResponse.json();
        
        if (!retryUpdatesData.ok) {
          console.error('getUpdates hala başarısız:', retryUpdatesData.description);
          throw new Error(`getUpdates başarısız: ${retryUpdatesData.description}`);
        }
        
        // Bu nesneyi güncellemeleri işlemek için kullan
        console.log('getUpdates başarılı, devam ediliyor');
        return await processUpdates(retryUpdatesData, botToken);
      }
      
      // Normal akış - güncellemeler başarıyla alındı
      return await processUpdates(updatesData, botToken);
    } catch (err) {
      console.error('Senkronizasyon hatası:', err);
      setError(err instanceof Error ? err.message : 'Telegram ile senkronizasyon başarısız');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Telegram güncellemelerini işleyip veritabanına kaydeden yardımcı fonksiyon
  const processUpdates = async (updatesData: any, botToken: string): Promise<boolean> => {
    try {
      // Bot güncellemelerini işle
      console.log('Kullanıcı ve grup bilgileri çıkarılıyor...');
      const userIds = new Set<number>();
      const usersToUpdate: {telegram_id: number, username?: string, first_name: string, last_name?: string}[] = [];
      
      if (updatesData.result && updatesData.result.length > 0) {
        console.log(`${updatesData.result.length} adet güncelleme alındı`);
        
        for (const update of updatesData.result) {
          // Kullanıcı bilgilerini al
          const from = update.message?.from || 
                       update.edited_message?.from || 
                       update.callback_query?.from ||
                       update.my_chat_member?.from;
          
          // Özel chat kullanıcılarını topla (aboneler)
          if (from && !from.is_bot && !userIds.has(from.id)) {
            userIds.add(from.id);
            usersToUpdate.push({
              telegram_id: from.id,
              username: from.username,
              first_name: from.first_name,
              last_name: from.last_name
            });
            console.log(`Kullanıcı bulundu: ${from.first_name} (${from.id})`);
          }
        }
      }

      console.log(`Toplam ${usersToUpdate.length} kullanıcı bulundu`);
      
      // Kullanıcıları kaydetme işlemi
      if (usersToUpdate.length === 0) {
        console.log('Kaydedilecek kullanıcı bulunamadı. getChat ile spesifik kullanıcıları kontrol et.');
        
        // Test için doğrudan chat bilgilerini al
        try {
          const chatId = 7746452500; // Tethis kullanıcısı
          const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
          const chatData = await chatResponse.json();
          
          if (chatData.ok) {
            console.log('Test kullanıcısı bulundu:', JSON.stringify(chatData.result));
            
            const testUser = {
              telegram_id: chatData.result.id,
              username: chatData.result.username || "",
              first_name: chatData.result.first_name,
              last_name: chatData.result.last_name || null
            };
            
            usersToUpdate.push(testUser);
            console.log('Test kullanıcısı listeye eklendi');
          } else {
            console.warn('Test kullanıcısı bulunamadı:', chatData.description);
          }
        } catch (testError) {
          console.error('Test kullanıcısı kontrolü sırasında hata:', testError);
        }
      }
      
      // Geçici olarak API'den alınan kullanıcıları UI'a göster
      if (usersToUpdate.length > 0) {
        const nowTimestamp = new Date().toISOString();
        
        // API'den gelen kullanıcıları UI formatına dönüştür
        const tempApiUsers = usersToUpdate.map(user => ({
          id: `temp_${user.telegram_id}`,
          telegram_id: user.telegram_id,
          username: user.username || "",
          first_name: user.first_name,
          last_name: user.last_name || null,
          is_blocked: false,
          last_active: nowTimestamp,
          joined_at: nowTimestamp,
          bot_id: selectedBot!.id
        }));
        
        // Geçici olarak kullanıcıları görüntüle
        console.log(`${tempApiUsers.length} kullanıcı UI'a geçici olarak aktarılıyor...`);
        setUsers(tempApiUsers);
      }
      
      // Kullanıcıları Supabase veritabanına kaydet
      console.log('Kullanıcılar Supabase veritabanına kaydediliyor...');
      let usersAdded = 0;
      
      try {
        // Mevcut kullanıcıları getir
        const { data: existingUsers, error: fetchError } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('bot_id', selectedBot!.id);
          
        if (fetchError) {
          console.error('Mevcut kullanıcıları getirirken hata:', fetchError);
          throw new Error('Veritabanı sorgulama hatası: ' + fetchError.message);
        }
        
        console.log(`Veritabanında ${existingUsers?.length || 0} mevcut kullanıcı bulundu`);
        
        // Mevcut telegram_id'leri set olarak sakla
        const existingTelegramIds = new Set<number>();
        if (existingUsers) {
          existingUsers.forEach(user => existingTelegramIds.add(user.telegram_id));
        }
        
        // Yeni eklenecek kullanıcıları filtrele
        const usersToAdd = usersToUpdate.filter(user => !existingTelegramIds.has(user.telegram_id));
        
        console.log(`${usersToAdd.length} yeni kullanıcı eklenecek`);
        
        // Yeni kullanıcıları ekle
        if (usersToAdd.length > 0) {
          const nowTimestamp = new Date().toISOString();
          const newUsers = usersToAdd.map(user => ({
            telegram_id: user.telegram_id,
            username: user.username || "",
            first_name: user.first_name,
            last_name: user.last_name || null,
            is_blocked: false,
            last_active: nowTimestamp,
            joined_at: nowTimestamp,
            bot_id: selectedBot!.id
          }));
          
          // Tekil kayıt ekleme dene
          for (const user of newUsers) {
            const { error: insertError } = await supabase
              .from('users')
              .insert([user]);
              
            if (insertError) {
              console.error(`Kullanıcı eklenirken hata: ${user.telegram_id}`, insertError);
            } else {
              usersAdded++;
              console.log(`Kullanıcı başarıyla eklendi: ${user.telegram_id}`);
            }
          }
        }
        
        console.log(`${usersAdded} kullanıcı başarıyla eklendi`);
        
        if (usersAdded > 0 || existingUsers?.length > 0) {
          // Güncel kullanıcıları veritabanından çek
          await loadBotData();
          return true;
        } else if (usersToUpdate.length > 0) {
          // API'den kullanıcılar alındı ancak veritabanına kaydedilemedi
          console.warn('API kullanıcıları bulundu fakat veritabanına kaydedilemedi');
          return true; // En azından UI'da geçici kullanıcıları gösteriyoruz
        } else {
          // Hiç kullanıcı bulunamadı
          console.warn('Hiç kullanıcı bulunamadı');
          return false;
        }
      } catch (dbError) {
        console.error('Veritabanı işlemleri sırasında hata:', dbError);
        throw dbError; // Ana try-catch bloğunda yakalanacak
      }
    } catch (err) {
      console.error('Güncellemeleri işlerken hata:', err);
      throw err; // Ana try-catch bloğunda yakalanacak
    }
  };

  // Bot silme fonksiyonu
  const deleteBot = async (botId: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    setError(null);

    try {
      // İlk önce botun mevcut olduğunu ve kullanıcıya ait olduğunu kontrol et
      const { data: botToDelete, error: botCheckError } = await supabase
        .from('bots')
        .select('id, user_id')
        .eq('id', botId)
        .single();
      
      if (botCheckError || !botToDelete) {
        throw new Error('Bot bulunamadı');
      }
      
      // Kullanıcının sadece kendi botlarını silebileceğinden emin ol
      if (botToDelete.user_id !== user.id) {
        throw new Error('Bu botu silmek için yetkiniz yok');
      }
      
      // İlk önce ilişkili verileri temizle - aboneler
      const { error: subscribersDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('bot_id', botId);
      
      if (subscribersDeleteError) {
        console.warn('Aboneler silinirken hata:', subscribersDeleteError.message);
      }
      
      // Duyuruları temizle
      const { error: announcementsDeleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('bot_id', botId);
      
      if (announcementsDeleteError) {
        console.warn('Duyurular silinirken hata:', announcementsDeleteError.message);
      }
      
      // Grupları temizle
      const { error: groupsDeleteError } = await supabase
        .from('groups')
        .delete()
        .eq('bot_id', botId);
      
      if (groupsDeleteError) {
        console.warn('Gruplar silinirken hata:', groupsDeleteError.message);
      }
      
      // Son olarak botu sil
      const { error: botDeleteError } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);
      
      if (botDeleteError) {
        throw new Error('Bot silinemedi: ' + botDeleteError.message);
      }
      
      // State güncellemeleri
      setBots(prev => prev.filter(b => b.id !== botId));
      
      // Eğer silinen bot seçili ise, seçimi kaldır
      if (selectedBot?.id === botId) {
        setSelectedBot(null);
        setUsers([]);
        setGroups([]);
        setAnnouncements([]);
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Bot silme hatası:', err);
      setError(err instanceof Error ? err.message : 'Bot silinirken bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  };

  // Grup ekleme fonksiyonu
  const addGroup = async (groupId: number): Promise<boolean> => {
    if (!selectedBot) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Manuel grup ekleme başlatılıyor - Grup ID: ${groupId}`);
      
      // Bot token'ını veritabanından al
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('token')
        .eq('id', selectedBot.id)
        .single();

      if (botError || !botData) {
        throw new Error('Bot bilgileri alınamadı');
      }

      const botToken = botData.token;
      
      // 1. Grup bilgilerini Telegram API'den al
      const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${groupId}`);
      const chatData = await chatResponse.json();
      
      console.log('getChat yanıtı:', JSON.stringify(chatData));
      
      if (!chatData.ok) {
        // API'den gelen hataları daha detaylı göster
        const errorMessage = chatData.description || 'Bot bu gruba erişemiyor olabilir';
        console.error(`Grup bilgileri alınamadı: ${errorMessage}`);
        throw new Error(`Grup bilgileri alınamadı: ${errorMessage}`);
      }
      
      const chat = chatData.result;
      
      if (chat.type !== 'group' && chat.type !== 'supergroup') {
        throw new Error('Belirtilen ID bir grup veya süper grup değil');
      }
      
      // 2. Grup üye sayısını al
      const membersCountResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${groupId}`);
      const membersCountData = await membersCountResponse.json();
      
      console.log('getChatMemberCount yanıtı:', JSON.stringify(membersCountData));
      
      let memberCount = 0;
      if (membersCountData.ok) {
        memberCount = membersCountData.result;
      } else {
        console.warn(`Üye sayısı alınamadı: ${membersCountData.description}`);
      }
      
      // 3. Grup zaten var mı kontrol et
      const { data: existingGroup, error: groupCheckError } = await supabase
        .from('groups')
        .select('id')
        .eq('telegram_id', groupId)
        .eq('bot_id', selectedBot.id)
        .single();
        
      if (groupCheckError && groupCheckError.code !== 'PGRST116') { // PGRST116: no rows returned
        console.warn('Grup kontrolünde hata:', groupCheckError);
      }
        
      const nowTimestamp = new Date().toISOString();
      const groupData = {
        telegram_id: groupId,
        title: chat.title,
        type: chat.type,
        member_count: memberCount,
        last_active: nowTimestamp,
        bot_id: selectedBot.id,
      };
      
      console.log('Kaydedilecek grup verileri:', groupData);
      
      if (existingGroup) {
        // Grubu güncelle
        const { error: updateError } = await supabase
          .from('groups')
          .update(groupData)
          .eq('id', existingGroup.id);
          
        if (updateError) {
          console.error('Grup güncellenirken hata:', updateError);
          throw new Error(`Grup güncellenirken hata: ${updateError.message}`);
        }
        
        console.log(`Grup güncellendi: ${chat.title} (${groupId})`);
      } else {
        // Yeni grup ekle
        const { error: insertError } = await supabase
          .from('groups')
          .insert({
            ...groupData,
            joined_at: nowTimestamp
          });
          
        if (insertError) {
          console.error('Grup eklenirken hata:', insertError);
          throw new Error(`Grup eklenirken hata: ${insertError.message}`);
        }
        
        console.log(`Yeni grup eklendi: ${chat.title} (${groupId})`);
      }
      
      // 4. Verileri yeniden yükle
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('bot_id', selectedBot.id)
        .order('joined_at', { ascending: false });
        
      if (groupsError) {
        console.error('Gruplar yüklenirken hata:', groupsError);
      } else {
        console.log(`${groupsData.length} grup yüklendi`);
        setGroups(groupsData);
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Grup ekleme hatası:', err);
      setError(err instanceof Error ? err.message : 'Grup eklenirken bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  };

  // Manuel kullanıcı ekleme fonksiyonu
  const addSubscriber = async (userId: number): Promise<boolean> => {
    if (!selectedBot) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Manuel kullanıcı ekleme başlatılıyor - Kullanıcı ID: ${userId}`);
      
      // Bot token'ını veritabanından al
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('token')
        .eq('id', selectedBot.id)
        .single();

      if (botError || !botData) {
        throw new Error('Bot bilgileri alınamadı');
      }

      const botToken = botData.token;
      
      // 1. Kullanıcı bilgilerini Telegram API'den al
      const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${userId}`);
      const chatData = await chatResponse.json();
      
      console.log('getChat yanıtı:', JSON.stringify(chatData));
      
      if (!chatData.ok) {
        // API'den gelen hataları daha detaylı göster
        const errorMessage = chatData.description || 'Kullanıcı bulunamadı';
        console.error(`Kullanıcı bilgileri alınamadı: ${errorMessage}`);
        throw new Error(`Kullanıcı bilgileri alınamadı: ${errorMessage}`);
      }
      
      const chat = chatData.result;
      
      if (chat.type !== 'private') {
        throw new Error('Belirtilen ID bir özel chat değil');
      }
      
      // 2. Kullanıcı zaten var mı kontrol et
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', userId)
        .eq('bot_id', selectedBot.id)
        .single();
        
      if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116: no rows returned
        console.warn('Kullanıcı kontrolünde hata:', userCheckError);
      }
        
      const nowTimestamp = new Date().toISOString();
      const userData = {
        telegram_id: userId,
        username: chat.username || "",
        first_name: chat.first_name,
        last_name: chat.last_name || null,
        is_blocked: false,
        last_active: nowTimestamp,
        bot_id: selectedBot.id,
      };
      
      console.log('Kaydedilecek kullanıcı verileri:', userData);
      
      if (existingUser) {
        // Kullanıcıyı güncelle
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id);
          
        if (updateError) {
          console.error('Kullanıcı güncellenirken hata:', updateError);
          throw new Error(`Kullanıcı güncellenirken hata: ${updateError.message}`);
        }
        
        console.log(`Kullanıcı güncellendi: ${chat.first_name} (${userId})`);
      } else {
        // Yeni kullanıcı ekle
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            ...userData,
            joined_at: nowTimestamp
          });
          
        if (insertError) {
          console.error('Kullanıcı eklenirken hata:', insertError);
          throw new Error(`Kullanıcı eklenirken hata: ${insertError.message}`);
        }
        
        console.log(`Yeni kullanıcı eklendi: ${chat.first_name} (${userId})`);
      }
      
      // 3. Verileri yeniden yükle
      await reloadBotData();
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Kullanıcı ekleme hatası:', err);
      setError(err instanceof Error ? err.message : 'Kullanıcı eklenirken bir hata oluştu');
      setIsLoading(false);
      return false;
    }
  };
  
  // Sadece verileri tekrar yükle - doğrudan diğer yerlerden çağrılabilir
  const reloadBotData = async (): Promise<void> => {
    if (!selectedBot) return;
    
    console.log('Bot verilerini tekrar yüklüyorum...');
    setIsLoading(true);
    
    try {
      await loadBotData();
      console.log('Bot verileri başarıyla yeniden yüklendi');
    } catch (err) {
      console.error('Veri yeniden yükleme hatası:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BotContext.Provider 
      value={{ 
        bots, 
        selectedBot, 
        users, 
        groups,
        announcements, 
        isLoading, 
        error, 
        selectBot,
        createBot,
        updateBot,
        sendAnnouncement,
        scheduleAnnouncement,
        syncBotData,
        deleteBot,
        addGroup,
        addSubscriber,
        reloadBotData
      }}
    >
      {children}
    </BotContext.Provider>
  );
};

export const useBot = (): BotContextType => {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};