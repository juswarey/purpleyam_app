import { Platform } from 'react-native';

export const colors = {
  plum900: '#2E0F40', // splash / dark surfaces
  plum700: '#3F1456', // primary buttons
  mauve: '#8A4B87', // selected options
  lilac: '#E9DDF0',
  cream: '#FFFBF3', // app background
  card: '#FFFFFF',
  gold: '#E0B02C',
  border: '#E6DCEA',
  text: '#2A1B33',
  muted: '#7A6B80',
  danger: '#B3261E',
  dangerBg: '#FBE9E7',
  success: '#2E7D4F',
  successBg: '#E3F3E9',
  warn: '#9A6A00',
  warnBg: '#FFF1CC',
  info: '#3558A8',
  infoBg: '#E4EBFA',
};

export const fonts = {
  serif: 'PlayfairDisplay_700Bold',
  serifSemi: 'PlayfairDisplay_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const isWeb = Platform.OS === 'web';

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
