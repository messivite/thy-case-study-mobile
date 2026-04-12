jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('@/api/models.api', () => ({
  getModels: jest.fn(),
}));

import { MODELS_QUERY_KEY } from '@/hooks/api/useModels';

describe('MODELS_QUERY_KEY', () => {
  it('sabit değer — ["models"]', () => {
    expect(MODELS_QUERY_KEY).toEqual(['models']);
  });

  it('ilk eleman "models" string', () => {
    expect(MODELS_QUERY_KEY[0]).toBe('models');
  });

  it('tek elemanlı dizi', () => {
    expect(MODELS_QUERY_KEY).toHaveLength(1);
  });
});
