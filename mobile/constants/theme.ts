/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const primaryColor = '#E6B800'; // Yellow/Gold from web
const primaryColorDark = '#E6B800';

export const Colors = {
  light: {
    text: '#09090B', // foreground
    background: '#FFFFFF', // background
    tint: primaryColor,
    icon: '#71717A', // muted-foreground
    tabIconDefault: '#71717A',
    tabIconSelected: primaryColor,
    border: '#E4E4E7',
    card: '#FFFFFF',
    muted: '#F4F4F5',
    destructive: '#EF4444',
  },
  dark: {
    text: '#F8FAFC', // foreground (slate-50ish)
    background: '#0F172A', // --background: 222 47% 11%
    tint: '#E1AD0F',      // --primary: 48 96% 45%
    icon: '#94A3B8',      // --muted-foreground: 215 20% 65%
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#E1AD0F',
    border: '#1E293B',    // --border: 217 33% 17% (Slate 800ish)
    card: '#111C31',      // --card: 222 47% 13%
    muted: '#1E293B',     // --muted: 217 33% 17%
    destructive: '#EF4444',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
