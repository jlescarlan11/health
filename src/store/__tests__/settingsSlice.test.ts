import reducer, { toggleSpecializedMode } from '../settingsSlice';

describe('settingsSlice', () => {
  const initialState = {
    theme: 'system' as const,
    fontSize: 'medium' as const,
    highContrastMode: false,
    notificationsEnabled: true,
    language: 'en' as const,
    hasPhilHealth: null,
    specializedModes: {
      isSenior: false,
      isPWD: false,
      isChronic: false,
    },
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should toggle specialized modes', () => {
    let state = reducer(initialState, toggleSpecializedMode('isSenior'));
    expect(state.specializedModes.isSenior).toBe(true);
    expect(state.specializedModes.isPWD).toBe(false);
    expect(state.specializedModes.isChronic).toBe(false);

    state = reducer(state, toggleSpecializedMode('isSenior'));
    expect(state.specializedModes.isSenior).toBe(false);

    state = reducer(state, toggleSpecializedMode('isPWD'));
    expect(state.specializedModes.isPWD).toBe(true);
    expect(state.specializedModes.isSenior).toBe(false);
    expect(state.specializedModes.isChronic).toBe(false);

    state = reducer(state, toggleSpecializedMode('isChronic'));
    expect(state.specializedModes.isChronic).toBe(true);
    expect(state.specializedModes.isPWD).toBe(true);
  });
});
