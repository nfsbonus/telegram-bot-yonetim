import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Send, Image, Check } from 'lucide-react';
import { useBot } from '../../context/BotContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';

type User = Database['public']['Tables']['subscribers']['Row'];

interface UserMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const UserMessageDialog: React.FC<UserMessageDialogProps> = ({ isOpen, onClose, user }) => {
  const { selectedBot } = useBot();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const validateImageUrl = (url: string) => {
    if (!url.trim()) return true;
    return url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setAlertMessage({
        type: 'error',
        message: 'Lütfen başlık ve mesaj içeriğini doldurun.',
      });
      return;
    }

    if (imageUrl && !validateImageUrl(imageUrl)) {
      setAlertMessage({
        type: 'error',
        message: 'Lütfen geçerli bir görsel URL\'si girin.',
      });
      return;
    }

    if (!selectedBot) {
      setAlertMessage({
        type: 'error',
        message: 'Bot bulunamadı.',
      });
      return;
    }

    setIsLoading(true);
    setSendingStatus('sending');
    
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
      
      // Mesaj metnini oluştur
      let messageText = `<b>${title}</b>\n\n${content}`;
      let success = false;
      
      // Mesajı gönder
      if (imageUrl && validateImageUrl(imageUrl)) {
        // Resimli mesaj
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: user.telegram_id,
            photo: imageUrl,
            caption: messageText,
            parse_mode: 'HTML'
          })
        });
        
        const result = await response.json();
        success = result.ok;
      } else {
        // Sadece metin mesajı
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: user.telegram_id,
            text: messageText,
            parse_mode: 'HTML'
          })
        });
        
        const result = await response.json();
        success = result.ok;
      }
      
      if (success) {
        setSendingStatus('success');
        setAlertMessage({
          type: 'success',
          message: `Mesaj başarıyla @${user.username} kullanıcısına gönderildi.`
        });
        
        // Kullanıcının son aktif zamanını güncelle
        await supabase
          .from('subscribers')
          .update({ last_active: new Date().toISOString() })
          .eq('id', user.id);
        
        // 3 saniye sonra dialog'u kapat
        setTimeout(() => {
          setTitle('');
          setContent('');
          setImageUrl('');
          onClose();
        }, 3000);
      } else {
        setSendingStatus('error');
        setAlertMessage({
          type: 'error',
          message: 'Mesaj gönderilemedi. Kullanıcı botu engellemiş olabilir.'
        });
      }
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
      setSendingStatus('error');
      setAlertMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Mesaj gönderilirken bir hata oluştu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${user.first_name} ${user.last_name || ''} Kullanıcısına Mesaj`}
    >
      <div className="p-4">
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
            className="mb-4"
          />
        )}
        
        <div className="bg-gray-100 p-3 rounded mb-4">
          <p className="text-sm">
            <strong>Kullanıcı:</strong> {user.first_name} {user.last_name || ''}
          </p>
          <p className="text-sm">
            <strong>Telegram Kullanıcı Adı:</strong> @{user.username || 'yok'}
          </p>
          <p className="text-sm">
            <strong>Telegram ID:</strong> {user.telegram_id}
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Mesaj Başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mesajınızın başlığını girin"
            fullWidth
            className="mb-4"
          />
          
          <div className="mb-4">
            <Input
              label="Görsel URL (opsiyonel)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ornek.com/resim.jpg"
              fullWidth
              error={imageUrl && !validateImageUrl(imageUrl) ? 'Lütfen geçerli bir görsel URL\'si girin' : undefined}
            />
            <p className="mt-1 text-xs text-gray-500">Desteklenen formatlar: JPG, JPEG, PNG, GIF</p>
          </div>
          
          <TextArea
            label="Mesaj İçeriği"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Kullanıcıya göndermek istediğiniz mesajı yazın..."
            rows={5}
            fullWidth
            className="mb-6"
          />
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!title || !content || isLoading}
              className={`flex items-center ${sendingStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {sendingStatus === 'success' ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Gönderildi
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Gönder
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UserMessageDialog; 