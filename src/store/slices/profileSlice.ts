import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MeResponse, UpdateMeProfileRequest } from '@/types/user.api.types';
import type { ProfileLoadStatus } from '@/types/settings.types';

type ProfileState = {
  data: MeResponse | null;
  status: ProfileLoadStatus;
  serverUnavailable: boolean;
};

const initialState: ProfileState = {
  data: null,
  status: 'idle',
  serverUnavailable: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<MeResponse>) {
      state.data = action.payload;
      state.status = 'success';
    },
    patchProfile(state, action: PayloadAction<UpdateMeProfileRequest>) {
      if (!state.data) return;
      const p = action.payload;
      if (p.displayName !== undefined) state.data.profile.displayName = p.displayName;
      if (p.preferredProvider !== undefined) state.data.profile.preferredProvider = p.preferredProvider;
      if (p.preferredModel !== undefined) state.data.profile.preferredModel = p.preferredModel;
      if (p.locale !== undefined) state.data.profile.locale = p.locale;
      if (p.timezone !== undefined) state.data.profile.timezone = p.timezone;
      if (p.onboardingCompleted !== undefined) state.data.profile.onboardingCompleted = p.onboardingCompleted;
    },
    setProfileLoading(state) {
      state.status = 'loading';
    },
    setProfileError(state) {
      state.status = 'error';
      state.serverUnavailable = true;
    },
    clearServerUnavailable(state) {
      state.serverUnavailable = false;
    },
  },
});

export const { setProfile, patchProfile, setProfileLoading, setProfileError, clearServerUnavailable } = profileSlice.actions;
export default profileSlice.reducer;
