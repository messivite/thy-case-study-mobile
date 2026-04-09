import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  addMessage,
  setSelectedModel,
  clearMessages,
  setLike,
} from '@/store/slices/chatSlice';
import { AIModelId } from '@/constants/models';
import { Message, Attachment } from '@/types/chat.types';

export const useChat = () => {
  const dispatch = useAppDispatch();
  const { messages, selectedModel, isTyping, sessionId } = useAppSelector((s) => s.chat);

  const sendMessage = (content: string, attachments: Attachment[] = []) => {
    const userMsg: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      modelId: selectedModel,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    dispatch(addMessage(userMsg));
    // API entegrasyonunda AI yanıtı buraya eklenecek
  };

  const changeModel = (modelId: AIModelId) => {
    dispatch(setSelectedModel(modelId));
  };

  const startNewChat = () => {
    dispatch(clearMessages());
  };

  const likeMessage = (id: string, liked: boolean | null) => {
    dispatch(setLike({ id, liked }));
  };

  return {
    messages,
    selectedModel,
    isTyping,
    sessionId,
    sendMessage,
    changeModel,
    startNewChat,
    likeMessage,
  };
};
