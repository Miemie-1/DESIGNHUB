import { THEME_KEY, applyTheme, getStoredTheme, resolveTheme } from '@/lib/theme';

const prefersDark = (dark) => vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: dark }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('theme', () => {
  it('defaults to system', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('resolves system from the OS preference', () => {
    prefersDark(true);
    expect(resolveTheme('system')).toBe('dark');
    prefersDark(false);
    expect(resolveTheme('system')).toBe('light');
  });

  it('passes explicit choices through', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('applyTheme sets the attribute and persists explicit choices', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('choosing system removes the stored preference', () => {
    prefersDark(false);
    applyTheme('dark');
    applyTheme('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => applyTheme('dark')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(getStoredTheme()).toBe('system');
  });
});
