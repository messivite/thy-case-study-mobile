import { AI_MODELS, DEFAULT_MODEL, type AIModelId } from '@/constants/models';

describe('constants/models', () => {
  it('uses gpt as default model', () => {
    expect(DEFAULT_MODEL).toBe('gpt');
  });

  it('exposes four models with unique ids', () => {
    const ids = AI_MODELS.map((m) => m.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it.each(AI_MODELS)('model $id has required fields', (model) => {
    expect(model.nameKey).toBeTruthy();
    expect(model.description).toBeTruthy();
    expect(model.color).toMatch(/^#/);
    expect(model.icon.length).toBeGreaterThan(0);
  });

  it('covers all AIModelId union members', () => {
    const ids = new Set(AI_MODELS.map((m) => m.id));
    const expected: AIModelId[] = ['gemini', 'gpt', 'claude', 'custom'];
    expected.forEach((id) => expect(ids.has(id)).toBe(true));
  });
});
