import uiReducer, {
  setGlobalLoading,
  setModelSelectorOpen,
} from '@/store/slices/uiSlice';

describe('uiSlice', () => {
  it('initial state', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.globalLoading).toBe(false);
    expect(state.modelSelectorOpen).toBe(false);
  });

  it('setGlobalLoading — true', () => {
    const state = uiReducer(undefined, setGlobalLoading(true));
    expect(state.globalLoading).toBe(true);
  });

  it('setGlobalLoading — false', () => {
    const withLoading = uiReducer(undefined, setGlobalLoading(true));
    const state = uiReducer(withLoading, setGlobalLoading(false));
    expect(state.globalLoading).toBe(false);
  });

  it('setModelSelectorOpen — true', () => {
    const state = uiReducer(undefined, setModelSelectorOpen(true));
    expect(state.modelSelectorOpen).toBe(true);
  });

  it('setModelSelectorOpen — false', () => {
    const withOpen = uiReducer(undefined, setModelSelectorOpen(true));
    const state = uiReducer(withOpen, setModelSelectorOpen(false));
    expect(state.modelSelectorOpen).toBe(false);
  });

  it('globalLoading ve modelSelectorOpen bağımsız', () => {
    let state = uiReducer(undefined, setGlobalLoading(true));
    state = uiReducer(state, setModelSelectorOpen(true));
    expect(state.globalLoading).toBe(true);
    expect(state.modelSelectorOpen).toBe(true);
  });
});
