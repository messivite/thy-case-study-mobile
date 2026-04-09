import { palette } from './colors';

export type AIModelId = 'gemini' | 'gpt' | 'claude' | 'custom';

export type AIModel = {
  id: AIModelId;
  nameKey: string;
  description: string;
  color: string;
  icon: string;
};

export const AI_MODELS: AIModel[] = [
  {
    id: 'gemini',
    nameKey: 'models.gemini',
    description: 'Google Gemini',
    color: palette.geminiBlue,
    icon: 'diamond-outline',
  },
  {
    id: 'gpt',
    nameKey: 'models.gpt',
    description: 'OpenAI ChatGPT',
    color: palette.gptGreen,
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'claude',
    nameKey: 'models.claude',
    description: 'Anthropic Claude',
    color: palette.claudeOrange,
    icon: 'flash-outline',
  },
  {
    id: 'custom',
    nameKey: 'models.custom',
    description: 'Özel LLM',
    color: palette.customPurple,
    icon: 'construct-outline',
  },
];

export const DEFAULT_MODEL: AIModelId = 'gpt';
