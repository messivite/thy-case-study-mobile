jest.mock('@/api/user.api', () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
  uploadAvatar: jest.fn(),
}));

import { getMe, updateMe, uploadAvatar } from '@/api/user.api';
import type { MeResponse } from '@/types/user.api.types';

const mockGetMe = getMe as jest.MockedFunction<typeof getMe>;
const mockUpdateMe = updateMe as jest.MockedFunction<typeof updateMe>;
const mockUploadAvatar = uploadAvatar as jest.MockedFunction<typeof uploadAvatar>;

const mockMeResponse: MeResponse = {
  user: {
    id: 'u1',
    email: 'test@example.com',
    appMetadata: { roles: [] },
  },
  profile: {
    displayName: 'Test',
    role: 'user',
    isAnonymous: false,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    onboardingCompleted: false,
    avatarUrl: null,
    preferredProvider: 'openai',
    preferredModel: 'gpt-4o',
  },
};

describe('user.api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getMe — başarılı yanıt', async () => {
    mockGetMe.mockResolvedValueOnce(mockMeResponse);
    const result = await getMe();
    expect(result).toEqual(mockMeResponse);
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  it('getMe — hata fırlatırsa rethrow', async () => {
    mockGetMe.mockRejectedValueOnce(new Error('Network error'));
    await expect(getMe()).rejects.toThrow('Network error');
  });

  it('updateMe — payload ile çağrılır', async () => {
    mockUpdateMe.mockResolvedValueOnce(mockMeResponse);
    const result = await updateMe({ displayName: 'New Name' });
    expect(result).toEqual(mockMeResponse);
    expect(mockUpdateMe).toHaveBeenCalledWith({ displayName: 'New Name' });
  });

  it('uploadAvatar — uri ve mimeType ile çağrılır', async () => {
    mockUploadAvatar.mockResolvedValueOnce(mockMeResponse);
    const result = await uploadAvatar('file://photo.jpg', 'image/jpeg');
    expect(result).toEqual(mockMeResponse);
    expect(mockUploadAvatar).toHaveBeenCalledWith('file://photo.jpg', 'image/jpeg');
  });
});
