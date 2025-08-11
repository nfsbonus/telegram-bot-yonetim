import React, { useState } from 'react';
import { useBot } from '../../context/BotContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { translations } from '../../lib/i18n';

interface EditBotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bot: {
    id: string;
    name: string;
    token: string;
  };
}

const EditBotDialog: React.FC<EditBotDialogProps> = ({ isOpen, onClose, bot }) => {
  const [name, setName] = useState(bot.name);
  const [token, setToken] = useState(bot.token);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateBot } = useBot();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const success = await updateBot(bot.id, { name, token });
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(translations.bots.updateError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {translations.bots.edit}
          </h3>

          {error && (
            <Alert
              type="error"
              message={error}
              className="mb-4"
              onClose={() => setError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={translations.bots.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={translations.bots.namePlaceholder}
              required
              fullWidth
            />

            <Input
              label={translations.bots.token}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={translations.bots.tokenPlaceholder}
              required
              fullWidth
            />

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {translations.common.cancel}
              </Button>
              <Button
                type="submit"
                isLoading={isLoading}
              >
                {translations.common.save}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBotDialog;