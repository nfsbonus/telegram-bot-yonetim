export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In a real app, never store plain passwords
}

export interface Bot {
  id: string;
  name: string;
  token: string;
  status: 'online' | 'offline' | 'error';
  createdAt: string;
  subscribers: number;
  lastActive: string;
}

export interface BotSubscriber {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName: string;
  joinedAt: string;
  lastActive: string;
  isBlocked: boolean;
}

export interface Announcement {
  id: string;
  botId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
  sentAt: string | null;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  delivered: number;
  total: number;
}