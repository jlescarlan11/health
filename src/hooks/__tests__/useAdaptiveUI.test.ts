import { renderHook } from '@testing-library/react-native';
import { useAdaptiveUI } from '../useAdaptiveUI';
import { useAppSelector } from '../reduxHooks';

// Mock useAppSelector
jest.mock('../reduxHooks', () => ({
  useAppSelector: jest.fn(),
}));

describe('useAdaptiveUI', () => {
  const mockUseAppSelector = useAppSelector as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default values when no specialized modes are enabled', () => {
    mockUseAppSelector.mockReturnValue({
      isSenior: false,
      isPWD: false,
      isChronic: false,
    });

    const { result } = renderHook(() => useAdaptiveUI());

    expect(result.current.scaleFactor).toBe(1.0);
    expect(result.current.isSimplified).toBe(false);
  });

  it('returns scaleFactor 1.25 and isSimplified true when isSenior is enabled', () => {
    mockUseAppSelector.mockReturnValue({
      isSenior: true,
      isPWD: false,
      isChronic: false,
    });

    const { result } = renderHook(() => useAdaptiveUI());

    expect(result.current.scaleFactor).toBe(1.25);
    expect(result.current.isSimplified).toBe(true);
  });

  it('returns isSimplified true when isPWD is enabled', () => {
    mockUseAppSelector.mockReturnValue({
      isSenior: false,
      isPWD: true,
      isChronic: false,
    });

    const { result } = renderHook(() => useAdaptiveUI());

    expect(result.current.scaleFactor).toBe(1.0);
    expect(result.current.isSimplified).toBe(true);
  });

  it('returns both when both are enabled', () => {
    mockUseAppSelector.mockReturnValue({
      isSenior: true,
      isPWD: true,
      isChronic: false,
    });

    const { result } = renderHook(() => useAdaptiveUI());

    expect(result.current.scaleFactor).toBe(1.25);
    expect(result.current.isSimplified).toBe(true);
  });
});
