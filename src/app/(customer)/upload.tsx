import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, Chip, Field } from '@/components/ui';
import { useOrderDraft } from '@/context/OrderDraftContext';
import { colors, fonts, radius } from '@/constants/theme';
import { STYLE_TAGS } from '@/lib/pricing';
import { pickImages } from '@/lib/storage';

const MAX_IMAGES = 3;

// "screen-upload" in the design
export default function UploadDesign() {
  const router = useRouter();
  const { draft, update } = useOrderDraft();

  const add = async () => {
    const room = MAX_IMAGES - draft.images.length;
    if (room <= 0) return Alert.alert('Limit reached', `You can attach up to ${MAX_IMAGES} photos.`);
    try {
      const picked = await pickImages(room);
      if (picked.length) update({ images: [...draft.images, ...picked].slice(0, MAX_IMAGES) });
    } catch (e: any) {
      Alert.alert('Could not open photos', e.message);
    }
  };

  const toggleTag = (t: string) =>
    update({ styleTags: draft.styleTags.includes(t) ? draft.styleTags.filter((x) => x !== t) : [...draft.styleTags, t] });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Upload Design" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.drop} onPress={add}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={34} color={colors.gold} />
          <Text style={styles.dropTitle}>Tap to add your moodboard</Text>
          <Text style={styles.dropSub}>PNG or JPG, up to {MAX_IMAGES} photos</Text>
        </Pressable>

        <View style={{ gap: 8 }}>
          <Text style={styles.h}>Attached References</Text>
          <View style={styles.thumbs}>
            {draft.images.map((img, i) => (
              <View key={img.uri + i}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable
                  style={styles.remove}
                  onPress={() => update({ images: draft.images.filter((_, idx) => idx !== i) })}
                  accessibilityLabel="Remove photo"
                >
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {draft.images.length < MAX_IMAGES ? (
              <Pressable style={[styles.thumb, styles.add]} onPress={add} accessibilityLabel="Add photo">
                <MaterialCommunityIcons name="plus" size={26} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Field
          label="Baker’s Notes & Requests"
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          multiline
          placeholder="Colors, decorations, allergies, anything the baker should know."
        />

        <Field
          label="Message on the cake (optional)"
          value={draft.message}
          onChangeText={(message) => update({ message })}
          placeholder={'e.g. "Happy 25th!"'}
          maxLength={60}
        />

        <View style={{ gap: 8 }}>
          <Text style={styles.h}>Reference Style Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STYLE_TAGS.map((t) => (
              <Chip key={t} label={t} selected={draft.styleTags.includes(t)} onPress={() => toggleTag(t)} />
            ))}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Button title="Continue to Order Summary" onPress={() => router.push('/summary')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 20, paddingBottom: 30 },
  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    borderRadius: radius.lg,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF6',
  },
  dropTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  dropSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  h: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  thumbs: { flexDirection: 'row', gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.lilac },
  add: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.plum700, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
