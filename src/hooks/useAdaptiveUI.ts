import { useMemo } from 'react';
import { useAppSelector } from './reduxHooks';

/**
 * A global hook that derives adaptive UI settings from the Redux settingsSlice.
 * It provides a scaleFactor for typography and a simplified UI flag based on
 * specialized user modes (Senior/PWD).
 *
 * @returns {Object} Adaptive UI settings
 * @returns {number} returns.scaleFactor - multiplier for typography (1.25 for seniors, else 1.0)
 * @returns {boolean} returns.isSimplified - flag for simplified UI (true if Senior or PWD)
 */
export const useAdaptiveUI = () => {
  const specializedModes = useAppSelector((state) => state.settings.specializedModes);

  return useMemo(() => {
    // Safety guard if specializedModes is undefined (e.g. legacy persisted state)
    const modes = specializedModes || { isSenior: false, isPWD: false, isChronic: false };
    const { isSenior, isPWD } = modes;

    // Scale factor is 1.25 for seniors, otherwise default 1.0
    const scaleFactor = isSenior ? 1.25 : 1.0;

    // UI is simplified if either isSenior or isPWD is enabled
    const isSimplified = isSenior || isPWD;

    return {
      scaleFactor,
      isSimplified,
    };
  }, [specializedModes]);
};
