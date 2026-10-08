import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { statusTone } from '@/lib/format';

// ------------------------------------------------------------------ Button
type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'soft';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, icon, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.plum700, fg: '#fff', border: colors.plum700 },
    gold: { bg: colors.gold, fg: colors.plum900, border: colors.gold },
    outline: { bg: 'transparent', fg: colors.plum700, border: colors.plum700 },
    ghost: { bg: 'transparent', fg: colors.plum700, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
    soft: { bg: colors.lilac, fg: colors.plum700, border: colors.lilac },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <MaterialCommunityIcons name={icon} size={small ? 16 : 18} color={palette.fg} /> : null}
          <Text style={[styles.btnText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// -------------------------------------------------------------------- Chip
export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------- Field
export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string | null; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#A395A8"
        {...props}
        style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// ------------------------------------------------------------ StatusBadge
export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = statusTone(status);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

// -------------------------------------------------------------- CakeThumb
export function CakeThumb({ uri, size, style }: { uri?: string | null; size?: number; style?: ViewStyle }) {
  const dim = size ? { width: size, height: size } : null;
  if (uri) {
    return <Image source={{ uri }} style={[styles.thumb, dim, style as object]} resizeMode="cover" />;
  }
  return (
    <View style={[styles.thumb, styles.thumbEmpty, dim, style]}>
      <MaterialCommunityIcons name="cake-variant" size={size ? size * 0.45 : 36} color={colors.mauve} />
    </View>
  );
}

// ------------------------------------------------------------ small pieces
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.plum700} size="large" />
      {label ? <Text style={[styles.muted, { marginTop: 10 }]}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'cake-variant-outline',
  title,
  hint,
  action,
}: {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name={icon} size={44} color={colors.mauve} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={[styles.muted, { textAlign: 'center', maxWidth: 320 }]}>{hint}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={[styles.error, { flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: fonts.semibold, fontSize: 15 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.plum700, borderColor: colors.plum700 },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: 12,
  },
  badge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.lilac },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.text, marginTop: 6 },
});
