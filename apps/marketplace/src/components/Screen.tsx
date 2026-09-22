import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Font, PageGradient } from '@/constants/theme';

/** The periwinkle page wash every screen sits on, with the status bar inset. */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[...PageGradient.colors]}
      locations={[...PageGradient.locations]}
      style={[styles.fill, { paddingTop: insets.top }]}
    >
      {children}
    </LinearGradient>
  );
}

/** A tab whose screen is still to be built, so the bar is complete meanwhile. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Screen>
      <View style={styles.centre}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 6 },
  title: { fontFamily: Font.semibold, fontSize: 18, color: Colors.ink },
  note: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 19 },
});
