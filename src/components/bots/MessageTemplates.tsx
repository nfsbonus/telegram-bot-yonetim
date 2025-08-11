import React, { useState, useEffect } from 'react';
import { useBot } from '../../context/BotContext';
import Card, { CardHeader, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Table from '../ui/Table';
import Alert from '../ui/Alert';
import Modal from '../ui/Modal';
import { Plus, Edit, Trash2, Copy, Check, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Template {
  id: string;
  bot_id: string;
  name: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

const MessageTemplates: React.FC = () => {
  const { selectedBot, isLoading } = useBot();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

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
        .select('*')
        .eq('bot_id', selectedBot.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setAlertMessage({
        type: 'error',
        message: 'Şablonlar yüklenirken bir hata oluştu.'
      });
    }
  };

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setTitle(template.title);
      setContent(template.content);
      setImageUrl(template.image_url || '');
    } else {
      setEditingTemplate(null);
      setName('');
      setTitle('');
      setContent('');
      setImageUrl('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const validateImageUrl = (url: string) => {
    if (!url.trim()) return true;
    return url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !title.trim() || !content.trim()) {
      setAlertMessage({
        type: 'error',
        message: 'Lütfen tüm zorunlu alanları doldurun.'
      });
      return;
    }

    if (imageUrl && !validateImageUrl(imageUrl)) {
      setAlertMessage({
        type: 'error',
        message: 'Lütfen geçerli bir görsel URL\'si girin.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const templateData = {
        bot_id: selectedBot?.id,
        name,
        title,
        content,
        image_url: imageUrl.trim() || null
      };

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        
        setAlertMessage({
          type: 'success',
          message: 'Şablon başarıyla güncellendi.'
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('message_templates')
          .insert(templateData);

        if (error) throw error;
        
        setAlertMessage({
          type: 'success',
          message: 'Şablon başarıyla oluşturuldu.'
        });
      }

      // Reload templates
      await loadTemplates();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save template:', err);
      setAlertMessage({
        type: 'error',
        message: 'Şablon kaydedilirken bir hata oluştu.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAlertMessage({
        type: 'success',
        message: 'Şablon başarıyla silindi.'
      });
      
      // Reload templates
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setAlertMessage({
        type: 'error',
        message: 'Şablon silinirken bir hata oluştu.'
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleCopyTemplate = (template: Template) => {
    // Copy template to the clipboard in a formatted way
    const formattedTemplate = 
`Başlık: ${template.title}
${template.content}${template.image_url ? `\nGörsel: ${template.image_url}` : ''}`;

    navigator.clipboard.writeText(formattedTemplate).then(() => {
      setCopySuccess(template.id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Mesaj Şablonları</h2>
          <Button
            onClick={() => handleOpenModal()}
            className="flex items-center"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Şablon Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <Table
              data={templates}
              columns={[
                {
                  key: 'name',
                  header: 'Şablon Adı',
                  render: (template) => (
                    <div className="font-medium text-gray-900">{template.name}</div>
                  ),
                },
                {
                  key: 'title',
                  header: 'Başlık',
                  render: (template) => template.title,
                },
                {
                  key: 'content_preview',
                  header: 'İçerik Önizleme',
                  render: (template) => (
                    <div className="truncate max-w-xs text-gray-600">
                      {template.content.length > 50 
                        ? `${template.content.substring(0, 50)}...` 
                        : template.content}
                    </div>
                  ),
                },
                {
                  key: 'has_image',
                  header: 'Görsel',
                  render: (template) => (
                    template.image_url ? (
                      <div className="flex items-center text-green-600">
                        <Image className="h-4 w-4 mr-1" />
                        Var
                      </div>
                    ) : (
                      <span className="text-gray-400">Yok</span>
                    )
                  ),
                },
                {
                  key: 'created_at',
                  header: 'Oluşturulma',
                  render: (template) => formatDate(template.created_at),
                },
                {
                  key: 'actions',
                  header: 'İşlemler',
                  render: (template) => (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyTemplate(template)}
                        className="flex items-center"
                      >
                        {copySuccess === template.id ? (
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copySuccess === template.id ? 'Kopyalandı' : 'Kopyala'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(template)}
                        className="flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteConfirmId(template.id)}
                        className="flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Sil
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Henüz kayıtlı bir mesaj şablonu yok.</p>
              <p className="text-sm mt-2">Sık kullandığınız mesajları şablon olarak kaydedebilirsiniz.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Ekle'}
      >
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <Input
              label="Şablon Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Şablon için kolay hatırlanabilir bir isim"
              fullWidth
              required
            />
            
            <Input
              label="Mesaj Başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mesajın başlığı"
              fullWidth
              required
            />
            
            <TextArea
              label="Mesaj İçeriği"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mesaj içeriği"
              rows={6}
              fullWidth
              required
            />
            
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
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || !name || !title || !content}
            >
              {editingTemplate ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Şablonu Sil"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-4">
            Bu şablonu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              İptal
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Şablonu Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessageTemplates; 