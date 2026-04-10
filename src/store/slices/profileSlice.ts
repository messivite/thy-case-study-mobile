import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MeResponse } from '@/types/user.api.types';

type ProfileState = {
  data: MeResponse | null;
  status: 'idle' | 'loading' | 'success' | 'error';
};

const initialState: ProfileState = {
  data: null,
  status: 'idle',
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<MeResponse>) {
      state.data = action.payload;
      state.status = 'success';
    },
    setProfileLoading(state) {
      state.status = 'loading';
    },
    setProfileError(state) {
      state.status = 'error';
    },
  },
});

export const { setProfile, setProfileLoading, setProfileError } = profileSlice.actions;
export default profileSlice.reducer;
