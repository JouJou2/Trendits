import { router } from 'expo-router';
import {
  ChevronRight, Heart, LogOut, Mail, MapPin, ShieldCheck, ShoppingBag, Store, UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space, TabBarClearance } from '@/constants/theme';
import { describeAuthError, useAuth } from '@/lib/auth';
import { useWishlist } from '@/lib/wishlist';

/**
 * The shopper's account. Signed out it explains what an account is for;
 * signed in it shows their details and the way into orders and saved
 * products — the same account as the website.
 */
export default function ProfileScreen() {
  const auth = useAuth();
  const wishlist = useWishlist();

  if (!auth.ready) {
    return (
      <Screen>
        <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
      </Screen>
    );
  }

  if (!auth.user) return <SignedOut />;
  if (auth.needsEmailVerification) return <VerifyEmail />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarClearance }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{auth.user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{auth.user.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{auth.user.email}</Text>
            {!!auth.user.phone && <Text style={styles.phone}>{auth.user.phone}</Text>}
          </View>
        </View>

        <View style={styles.group}>
          <Row icon={ShoppingBag} label="My orders" onPress={() => router.push('/orders')} />
          <Row
            icon={Heart}
            label="Saved products"
            note={wishlist.ids.length ? String(wishlist.ids.length) : undefined}
            onPress={() => router.push('/wishlist')}
          />
        </View>

        <View style={styles.group}>
          <Row icon={MapPin} label="Delivery addresses" note="At checkout" />
          <Row icon={Store} label="Selling on Trendit?" note="Use the website" />
        </View>

        <Pressable style={styles.signOut} onPress={() => auth.signOutShopper()}>
          <LogOut size={16} color={Colors.coral} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SignedOut() {
  return (
    <Screen>
      <View style={styles.promptWrap}>
        <View style={styles.promptIcon}><UserRound size={26} color={Colors.blue} strokeWidth={1.8} /></View>
        <Text style={styles.promptTitle}>Your Trendit account</Text>
        <Text style={styles.promptNote}>
          Sign in to check out, follow your orders and keep your saved products on every device.
        </Text>
        <Pressable style={styles.primary} onPress={() => router.push('/sign-in')}>
          <Text style={styles.primaryText}>Sign in or create an account</Text>
        </Pressable>
        <Text style={styles.promptFoot}>You can browse and fill your cart without one.</Text>
      </View>
    </Screen>
  );
}

/** An older account whose email was never proven still has to prove it once. */
function VerifyEmail() {
  const auth = useAuth();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await action(); } catch (err) { setError(describeAuthError(err)); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={styles.promptWrap}>
        <View style={styles.promptIcon}><ShieldCheck size={26} color={Colors.blue} strokeWidth={1.8} /></View>
        <Text style={styles.promptTitle}>Confirm your email</Text>
        <Text style={styles.promptNote}>
          {sent ? `Enter the code we emailed to ${auth.user?.email}.` : 'One quick check before you can order.'}
        </Text>

        {sent ? (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={Colors.faint}
              keyboardType="number-pad"
              style={styles.codeInput}
              accessibilityLabel="Verification code"
            />
            <Pressable style={styles.primary} disabled={busy} onPress={() => run(() => auth.verifyEmailCode(code))}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm</Text>}
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.primary} disabled={busy} onPress={() => run(async () => { await auth.sendVerificationCode(); setSent(true); })}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.primaryRow}>
                <Mail size={16} color="#fff" />
                <Text style={styles.primaryText}>Email me a code</Text>
              </View>
            )}
          </Pressable>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={() => auth.signOutShopper()} style={styles.linkButton}>
          <Text style={styles.linkText}>Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Row({ icon: Icon, label, note, onPress }: {
  icon: typeof ShoppingBag; label: string; note?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowIcon}><Icon size={17} color={Colors.blue} strokeWidth={1.9} /></View>
      <Text style={styles.rowLabel}>{label}</Text>
      {!!note && <Text style={styles.rowNote}>{note}</Text>}
      {!!onPress && <ChevronRight size={17} color={Colors.faint} strokeWidth={2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: Space.lg, paddingTop: 18, paddingBottom: 6 },
  avatar: {
    width: 58, height: 58, borderRadius: Radius.pill, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: Font.bold, fontSize: 22, color: '#fff' },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontFamily: Font.semibold, fontSize: 19, color: Colors.ink, letterSpacing: -0.3 },
  email: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted, marginTop: 2 },
  phone: { fontFamily: Font.regular, fontSize: 12, color: Colors.faint, marginTop: 1 },

  group: {
    marginTop: 16, marginHorizontal: Space.lg, backgroundColor: Colors.surface,
    borderRadius: Radius.card, paddingHorizontal: 12, ...Shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: Font.medium, fontSize: 13.5, color: Colors.ink },
  rowNote: { fontFamily: Font.regular, fontSize: 12, color: Colors.faint },

  signOut: {
    marginTop: 22, marginHorizontal: Space.lg, minHeight: 48, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffe9e8',
  },
  signOutText: { fontFamily: Font.semibold, fontSize: 13.5, color: Colors.coral },

  promptWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 80 },
  promptIcon: {
    width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Colors.blueTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  promptTitle: { fontFamily: Font.semibold, fontSize: 19, color: Colors.ink, textAlign: 'center' },
  promptNote: {
    fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center',
    marginTop: 8, lineHeight: 20,
  },
  promptFoot: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.faint, textAlign: 'center', marginTop: 14 },
  primary: {
    marginTop: 22, alignSelf: 'stretch', minHeight: 52, borderRadius: Radius.pill,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryText: { fontFamily: Font.semibold, fontSize: 14.5, color: '#fff' },
  codeInput: {
    marginTop: 18, alignSelf: 'stretch', backgroundColor: Colors.surface, borderRadius: 14,
    minHeight: 52, paddingHorizontal: 16, fontFamily: Font.regular, fontSize: 16,
    color: Colors.ink, textAlign: 'center', letterSpacing: 4,
  },
  error: { marginTop: 14, fontFamily: Font.medium, fontSize: 12.5, color: Colors.coral, textAlign: 'center' },
  linkButton: { marginTop: 16, minHeight: 32, justifyContent: 'center' },
  linkText: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.muted },
});
