import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThrottledValue } from './useThrottledValue';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useThrottledValue', () => {
  it('shows the first change at once, then at most one update per interval', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 1000), {
      initialProps: { value: 0 },
    });
    expect(result.current).toBe(0);

    rerender({ value: 1 });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(1);

    // Changes inside the interval are held back, and only the latest one is shown.
    rerender({ value: 2 });
    act(() => vi.advanceTimersByTime(400));
    rerender({ value: 3 });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(3);

    // Nothing pending: the next change after a quiet interval shows straight away.
    act(() => vi.advanceTimersByTime(2000));
    rerender({ value: 4 });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe(4);
  });

  it('passes values through when the interval is 0', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 0), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    expect(result.current).toBe('b');
  });
});
