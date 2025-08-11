import React, { useState, useEffect } from 'react';
import { useBot } from '../../context/BotContext';
import Card, { CardHeader, CardContent, CardFooter } from '../ui/Card';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import Table from '../ui/Table';
import Alert from '../ui/Alert';
import Badge from '../ui/Badge';
import { Send, Check, AlertTriangle, Image, Eye, Users, Calendar, Clock, FileText } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

interface Template {
  id: string;
  name: string;
  title: string;
  content: string;
  image_url: string | null;
}

type Announcement = Database['public']['Tables']['announcements']['Row'];

const AnnouncementBroadcast: React.FC = () => {
  const { selectedBot, announcements, users, sendAnnouncement, scheduleAnnouncement, isLoading, error } = useBot();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  // Scheduling related states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Template related states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const activeSubscribersCount = Array.isArray(users) ? users.filter(user => !user.is_blocked).length : 0;

  useEffect(() => {
    if (selectedBot) {
      loadTemplates();
    }
  }, [selectedBot]);

  const loadTemplates = async () => {
    if (!selectedBot) return;
    
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, name, title, content, image_url')
        .eq('bot_id', selectedBot.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setAlertMessage({
        type: 'error',
        message: 'Lütfen başlık ve açıklama alanlarını doldurun',
      });
      return;
    }

    // Scheduled time validation check
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        setAlertMessage({
          type: 'error',
          message: 'Lütfen zamanlama için tarih ve saat seçin',
        });
        return;
      }
      
      // Create a Date object from the scheduled date and time
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      
      // Validate that the scheduled time is in the future
      if (scheduledDateTime.getTime() <= Date.now()) {
        setAlertMessage({
          type: 'error',
          message: 'Zamanlama gelecekte bir zaman olmalıdır',
        });
        return;
      }
    }

    setSendingStatus('sending');
    
    try {
      const announcementData = {
        bot_id: selectedBot?.id || '',
        title,
        description,
        image_url: imageUrl.trim() || null,
      };
      
      let success = false;
      
      if (isScheduled) {
        // Schedule the announcement for later
        const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
        success = await scheduleAnnouncement(announcementData, scheduledDateTime);
        
        if (success) {
          setTitle('');
          setDescription('');
          setImageUrl('');
          setIsPreviewMode(false);
          setScheduledDate('');
          setScheduledTime('');
          setIsScheduled(false);
          setAlertMessage({
            type: 'success',
            message: `Duyuru başarıyla zamanlandı! ${formatDate(scheduledDateTime)} tarihinde ${activeSubscribersCount} kullanıcıya gönderilecek.`,
          });
        }
      } else {
        // Send the announcement immediately
        success = await sendAnnouncement(announcementData);

      if (success) {
        setTitle('');
        setDescription('');
        setImageUrl('');
        setIsPreviewMode(false);
        setAlertMessage({
          type: 'success',
            message: `Duyuru başarıyla gönderildi! ${activeSubscribersCount} kullanıcıya mesaj iletilecek.`,
          });
        }
      }
      
      if (success) {
        setSendingStatus('success');
        
        // 3 saniye sonra başarı mesajını kaldır
        setTimeout(() => {
          setSendingStatus('idle');
          setAlertMessage(null);
        }, 3000);
      } else {
        setAlertMessage({
          type: 'error',
          message: error || 'Duyuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
        });
        setSendingStatus('error');
      }
    } catch (err) {
      setAlertMessage({
        type: 'error',
        message: 'Bir hata oluştu. Lütfen tekrar deneyin.',
      });
      setSendingStatus('error');
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const validateImageUrl = (url: string) => {
    if (!url.trim()) return true;
    return url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
  };

  // Generate a minimum date string for the date picker (today)
  const getCurrentDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return (
        <Badge variant="success" className="flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Gönderildi
        </Badge>
      );
    } else if (status === 'failed') {
      return (
        <Badge variant="danger" className="flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Başarısız
        </Badge>
      );
    } else if (status === 'sending') {
      return <Badge variant="warning">Gönderiliyor</Badge>;
    } else if (status === 'scheduled') {
      return (
        <Badge variant="info" className="flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          Zamanlandı
        </Badge>
      );
    } else {
      return <Badge variant="info">Taslak</Badge>;
    }
  };

  // Open template selection modal
  const openTemplateModal = () => {
    setIsTemplateModalOpen(true);
  };

  // Close template selection modal
  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setSelectedTemplate(null);
  };

  // Apply selected template
  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setDescription(template.content);
    setImageUrl(template.image_url || '');
    closeTemplateModal();
  };

  if (!selectedBot) {
    return null;
  }

  return (
    <div className="space-y-6">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Toplu Mesaj Gönder</h2>
            <p className="text-sm text-gray-500 mt-1">
              Bu mesaj tüm bot abonelerine gönderilecektir
            </p>
          </div>
          <div className="flex items-center bg-indigo-50 px-3 py-1 rounded-full">
            <Users className="h-4 w-4 text-indigo-600 mr-2" />
            <span className="text-sm font-medium text-indigo-700">
              {activeSubscribersCount} aktif abone
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isPreviewMode ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">{title || 'Duyuru Başlığı'}</h3>
              
              {imageUrl && validateImageUrl(imageUrl) && (
                <div className="mb-4">
                  <img
                    src={imageUrl}
                    alt="Duyuru Görseli"
                    className="rounded-lg max-h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <p className="text-gray-700 whitespace-pre-line">{description || 'Duyuru açıklaması burada görünecek.'}</p>
              
              {isScheduled && scheduledDate && scheduledTime && (
                <div className="mt-4 flex items-center text-indigo-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('tr-TR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })} tarihinde gönderilecek
                  </span>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={togglePreview}>
                  Düzenle
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                <Input
                    label="Mesaj Başlığı"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                    placeholder="Duyuru başlığını girin"
                  fullWidth
                />
                  
                  {templates.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openTemplateModal}
                      className="flex items-center mt-6 ml-2"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Şablon Seç
                    </Button>
                  )}
                </div>
                
                <div>
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Duyuru mesajınızı buraya yazın..."
                  rows={6}
                  fullWidth
                />
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="schedule"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="schedule"
                      className="ml-2 block text-sm text-gray-700 font-medium"
                    >
                      Mesajı daha sonra gönder
                    </label>
                  </div>
                  
                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tarih
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={getCurrentDateString()}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Saat
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={togglePreview}
                  disabled={(!title && !description) || sendingStatus === 'sending'}
                  className="flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Önizleme
                </Button>
                <Button
                  type="submit"
                  isLoading={sendingStatus === 'sending'}
                  disabled={!title || !description || sendingStatus === 'sending' || (isScheduled && (!scheduledDate || !scheduledTime))}
                  className={`flex items-center ${sendingStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {sendingStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {isScheduled ? 'Zamanlandı' : 'Gönderildi'}
                    </>
                  ) : (
                    <>
                      {isScheduled ? (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Zamanla
                        </>
                      ) : (
                        <>
                  <Send className="h-4 w-4 mr-2" />
                          {activeSubscribersCount} Aboneye Gönder
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-800">Önceki Duyurular</h2>
        </CardHeader>
        <CardContent>
          {announcements && announcements.length > 0 ? (
          <Table
            data={announcements}
            columns={[
              {
                key: 'title',
                  header: 'Başlık',
                render: (announcement) => (
                  <div className="font-medium text-gray-900">{announcement.title}</div>
                ),
              },
              {
                  key: 'created_at',
                  header: 'Oluşturulma',
                  render: (announcement) => formatDate(announcement.created_at),
              },
              {
                  key: 'scheduled_time',
                  header: 'Zamanlanma',
                  render: (announcement) => 
                    announcement.status === 'scheduled' ? (
                      <div className="flex items-center text-indigo-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(announcement.scheduled_time)}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )
                },
                {
                  key: 'sent_at',
                  header: 'Gönderilme',
                  render: (announcement) => 
                    announcement.status !== 'scheduled' ? 
                      formatDate(announcement.sent_at) : 
                      <span className="text-gray-400">-</span>,
              },
              {
                key: 'status',
                  header: 'Durum',
                  render: (announcement) => getStatusBadge(announcement.status),
              },
              {
                key: 'delivered',
                  header: 'Teslim Edilen',
                render: (announcement) => (
                  <div className="text-sm">
                      <span className="font-medium">{announcement.delivered_count}</span>
                      <span className="text-gray-500"> / {announcement.total_count}</span>
                      {announcement.status !== 'scheduled' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{
                              width: `${
                                announcement.total_count > 0
                                  ? Math.round((announcement.delivered_count / announcement.total_count) * 100)
                                  : 0
                              }%`,
                        }}
                          />
                  </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
          ) : (
            <div className="text-center py-6 text-gray-500">
              Henüz hiç duyuru gönderilmemiş
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Selection Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Şablon Seç</h3>
              <button
                onClick={closeTemplateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-grow">
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition ${
                        selectedTemplate?.id === template.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>Başlık:</strong> {template.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>İçerik:</strong>{' '}
                        {template.content.length > 100
                          ? `${template.content.substring(0, 100)}...`
                          : template.content}
                      </div>
                      {template.image_url && (
                        <div className="text-sm text-gray-600 mt-1 flex items-center">
                          <Image className="h-4 w-4 mr-1 text-green-600" />
                          Görsel içeriyor
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Henüz hiç şablon oluşturulmamış.</p>
                  <p className="text-sm mt-2">Şablon eklemek için "Mesaj Şablonları" sekmesine gidin.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button
                variant="outline"
                onClick={closeTemplateModal}
                className="mr-2"
              >
                İptal
              </Button>
              <Button
                onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
              >
                Şablonu Uygula
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementBroadcast;