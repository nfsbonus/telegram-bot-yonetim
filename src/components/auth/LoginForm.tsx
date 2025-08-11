import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Card from '../ui/Card';
import { Bot } from 'lucide-react';
import { translations } from '../../lib/i18n';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const locationState = location.state as LocationState;
  const from = locationState?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setErrorMessage(translations.auth.invalidCredentials);
      }
    } catch (error) {
      setErrorMessage(translations.auth.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center">
          <Bot className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {translations.auth.title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {translations.auth.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 sm:px-10">
          {errorMessage && (
            <Alert 
              type="error" 
              message={errorMessage} 
              className="mb-4"
              onClose={() => setErrorMessage(null)}
            />
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label={translations.auth.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              placeholder="admin@example.com"
            />

            <Input
              label={translations.auth.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              placeholder="••••••••"
            />

            <div>
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
              >
                {translations.auth.signIn}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;