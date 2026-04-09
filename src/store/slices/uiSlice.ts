import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type UIState = {
  globalLoading: boolean;
  modelSelectorOpen: boolean;
};

const initialState: UIState = {
  globalLoading: false,
  modelSelectorOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
    setModelSelectorOpen(state, action: PayloadAction<boolean>) {
      state.modelSelectorOpen = action.payload;
    },
  },
});

export const { setGlobalLoading, setModelSelectorOpen } = uiSlice.actions;
export default uiSlice.reducer;
