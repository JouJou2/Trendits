import { router } from 'expo-router';
import { Check, ChevronLeft, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Space } from '@/constants/theme';
import { PASSWORD_RULES, describeAuthError, isPasswordStrong, useAuth } from '@/lib/auth';

type Mode = 'signIn' | 'signUp' | 'code' | 'reset';

/**
 * Sign in, or create an account. Creating one follows the website's steps:
 * a code is emailed to prove the address, then the backend creates the
 * account — the app never creates one on its own.
 */
export default function SignInScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () => run(async () => {
    await auth.signIn(email, password);
    router.back();
  });

  const handleStartSignUp = () => run(async () => {
    if (!name.trim()) throw new Error('Enter your name.');
    if (!isPasswordStrong(password)) throw new Error('Your password does not meet the requirements below.');
    await auth.sendSignupCode(email);
    setNote(`We emailed a code to ${email.trim()}.`);
    setMode('code');
  });

  const handleFinishSignUp = () => run(async () => {
    await auth.verifySignupCode(email, code);
    await auth.createAccount({ email, password, name, phone });
    router.back();
  });

  const handleReset = () => run(async () => {
    await auth.resetPassword(email);
    setNote(`If that account exists, a reset link is on its way to ${email.trim()}.`);
  });

  const passwordChecks = PASSWORD_RULES.map(rule => ({ label: rule.label, ok: rule.test(password) }));

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
            <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {mode === 'signUp' ? 'Create your account'
              : mode === 'code' ? 'Check your email'
              : mode === 'reset' ? 'Reset your password'
              : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signUp' ? 'One account for the app and the website.'
              : mode === 'code' ? note
              : mode === 'reset' ? 'We will email you a link to set a new one.'
              : 'Sign in to check out and follow your orders.'}
          </Text>

          {mode === 'code' ? (
            <>
              <View style={styles.codeIcon}><Mail size={22} color={Colors.blue} /></View>
              <Field
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
                autoFocus
              />
              <PrimaryButton label="Create account" busy={busy} onPress={handleFinishSignUp} />
              <LinkButton label="Use a different email" onPress={() => { setMode('signUp'); setCode(''); }} />
            </>
          ) : (
            <>
              {mode === 'signUp' && (
                <Field label="Your name" value={name} onChangeText={setName} placeholder="Jawad" autoCapitalize="words" />
              )}

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {mode === 'signUp' && (
                <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="03 000 000" keyboardType="phone-pad" />
              )}

              {mode !== 'reset' && (
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}

              {mode === 'signUp' && password.length > 0 && (
                <View style={styles.rules}>
                  {passwordChecks.map(check => (
                    <View key={check.label} style={styles.rule}>
                      <Check size={13} color={check.ok ? '#3f9a5a' : Colors.faint} strokeWidth={3} />
                      <Text style={[styles.ruleText, check.ok && styles.ruleTextOk]}>{check.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {mode === 'signIn' && (
                <PrimaryButton label="Sign in" busy={busy} onPress={handleSignIn} />
              )}
              {mode === 'signUp' && (
                <PrimaryButton label="Email me a code" busy={busy} onPress={handleStartSignUp} />
              )}
              {mode === 'reset' && (
                <PrimaryButton label="Send reset link" busy={busy} onPress={handleReset} />
              )}

              {mode === 'signIn' && (
                <>
                  <LinkButton label="Forgot your password?" onPress={() => { setMode('reset'); setNote(''); setError(''); }} />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>New to Trendit?</Text>
                    <Pressable onPress={() => { setMode('signUp'); setNote(''); setError(''); }} hitSlop={8}>
                      <Text style={styles.switchLink}>Create an account</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {mode !== 'signIn' && (
                <LinkButton label="Back to sign in" onPress={() => { setMode('signIn'); setNote(''); setError(''); }} />
              )}
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!note && mode !== 'code' && <Text style={styles.note}>{note}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={Colors.faint}
        accessibilityLabel={label}
      />
    </View>
  );
}

function PrimaryButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.primary, busy && styles.primaryBusy]} disabled={busy} onPress={onPress}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.linkButton} hitSlop={6}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: Space.lg, paddingTop: 12 },
  back: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: Space.lg, paddingTop: 18, paddingBottom: 60 },
  title: { fontFamily: Font.semibold, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, marginTop: 6, lineHeight: 19 },

  field: { marginTop: 18 },
  fieldLabel: { fontFamily: Font.medium, fontSize: 11.5, color: Colors.muted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 14, minHeight: 50, paddingHorizontal: 16,
    fontFamily: Font.regular, fontSize: 14, color: Colors.ink,
  },

  rules: { marginTop: 12, gap: 5 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ruleText: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.faint },
  ruleTextOk: { color: '#3f9a5a' },

  primary: {
    marginTop: 22, minHeight: 52, borderRadius: Radius.pill, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBusy: { opacity: 0.7 },
  primaryText: { fontFamily: Font.semibold, fontSize: 14.5, color: '#fff' },

  linkButton: { marginTop: 14, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.blue },

  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  switchText: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted },
  switchLink: { fontFamily: Font.semibold, fontSize: 12.5, color: Colors.blue },

  codeIcon: {
    width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: Colors.blueTint,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  error: {
    marginTop: 16, fontFamily: Font.medium, fontSize: 12.5, color: Colors.coral,
    textAlign: 'center', lineHeight: 18,
  },
  note: { marginTop: 14, fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
});
