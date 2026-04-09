import { AIModelId } from '@/constants/models';

export type MessageRole = 'user' | 'assistant';

export type AttachmentType = 'image' | 'pdf' | 'file';

export type AttachmentStatus = 'picking' | 'uploading' | 'done' | 'error';

export type Attachment = {
  id: string;
  type: AttachmentType;
  name: string;
  uri: string;           // local URI
  remoteUrl?: string;    // after upload
  mimeType?: string;
  size?: number;         // bytes
  width?: number;        // images only
  height?: number;       // images only
  status: AttachmentStatus;
  progress?: number;     // 0-1
  error?: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  modelId?: AIModelId;
  timestamp: number;
  isLoading?: boolean;
  liked?: boolean | null;
  attachments?: Attachment[];
};

export type ChatState = {
  messages: Message[];
  selectedModel: AIModelId;
  isTyping: boolean;
  sessionId: string | null;
};
