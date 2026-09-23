import { router } from 'expo-router';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, ChevronLeft, CircleCheck, MapPin, Truck, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/catalog';
import { db } from '@/lib/firebase';
import {
  EXPRESS_FEE, FREE_SHIPPING_THRESHOLD, STANDARD_FEE, estimateDelivery, placeOrder,
  type DeliveryAddress,
} from '@/lib/orders';
import { LEBANON_ZONES } from '@web/data/products';

interface SavedAddress extends DeliveryAddress {
  id: string;
  isDefault?: boolean;
}

/**
 * Checkout: who it goes to, how it travels, and cash on delivery. The totals
 * shown are an estimate of what the server will charge — it recomputes them
 * and its figures win, which is why the confirmation shows what was charged.
 */
export default function CheckoutScreen() {
  const auth = useAuth();
  const cart = useCart();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState<string>(LEBANON_ZONES[0]);
  const [note, setNote] = useState('');
  const [promo, setPromo] = useState('');
  const [express, setExpress] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<{ orderId: string; total: number } | null>(null);

  // The shopper's saved addresses, the same ones the website uses.
  useEffect(() => {
    if (!auth.user) return;
    const unsub = onSnapshot(collection(db, 'users', auth.user.id, 'addresses'), snap => {
      const list = snap.docs.map(d => ({ ...(d.data() as DeliveryAddress), id: d.id })) as SavedAddress[];
      setAddresses(list);
      setChosenId(prev => prev ?? (list.find(a => a.isDefault)?.id || list[0]?.id || null));
    }, err => console.error('Could not read your addresses:', err));
    return unsub;
  }, [auth.user]);

  // Prefill from the account.
  useEffect(() => {
    if (!auth.user) return;
    setName(current => current || auth.user!.name);
    setPhone(current => current || auth.user!.phone || '');
  }, [auth.user]);

  const chosen = addresses.find(a => a.id === chosenId) || null;
  const usingSaved = !!chosen;

  const delivery = useMemo(() => estimateDelivery(cart.subtotal, express), [cart.subtotal, express]);
  const estimatedTotal = Math.round((cart.subtotal + delivery) * 100) / 100;

  const canPlace = cart.lines.length > 0 && !!auth.user && !auth.needsEmailVerification
    && (usingSaved || (name.trim() && phone.trim() && street.trim() && city.trim()));

  const submit = async () => {
    setPlacing(true);
    setError('');
    try {
      const address: DeliveryAddress = usingSaved
        ? { name: chosen!.name, phone: chosen!.phone, address: chosen!.address, city: chosen!.city, zone: chosen!.zone }
        : { name: name.trim(), phone: phone.trim(), address: street.trim(), city: city.trim(), zone };

      const result = await placeOrder({
        lines: cart.lines,
        customerName: address.name,
        customerPhone: address.phone,
        customerEmail: auth.user?.email || '',
        deliveryAddress: address,
        express,
        promoCode: promo,
        note,
      });

      // Keep a new address for next time, in the shape the website stores.
      if (!usingSaved && saveAddress && auth.user) {
        setDoc(doc(collection(db, 'users', auth.user.id, 'addresses')), {
          label: 'Home',
          ...address,
          isDefault: addresses.length === 0,
          createdAt: new Date().toISOString(),
        }).catch(err => console.error('Could not save the address:', err));
      }

      cart.clear();
      setPlaced({ orderId: result.orderId, total: result.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (placed) return <OrderPlaced orderId={placed.orderId} total={placed.total} />;

  if (!auth.user) {
    return (
      <Screen>
        <Header />
        <Gate
          title="Sign in to check out"
          note="Your order needs an account so you can follow it afterwards."
          action={{ label: 'Sign in', onPress: () => router.push('/sign-in') }}
        />
      </Screen>
    );
  }

  if (auth.needsEmailVerification) {
    return (
      <Screen>
        <Header />
        <Gate
          title="Confirm your email first"
          note="One quick check on your account before your first order."
          action={{ label: 'Go to profile', onPress: () => router.push('/profile') }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Header />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Where it goes */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <MapPin size={16} color={Colors.blue} />
              <Text style={styles.cardTitle}>Delivery address</Text>
            </View>

            {addresses.map(saved => (
              <Pressable
                key={saved.id}
                style={[styles.choice, chosenId === saved.id && styles.choiceActive]}
                onPress={() => setChosenId(saved.id)}
              >
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>{saved.label || 'Saved'} · {saved.name}</Text>
                  <Text style={styles.choiceNote}>{saved.address}, {saved.city} · {saved.zone}</Text>
                </View>
                {chosenId === saved.id && <Check size={16} color={Colors.blue} strokeWidth={2.6} />}
              </Pressable>
            ))}

            {addresses.length > 0 && (
              <Pressable
                style={[styles.choice, !chosenId && styles.choiceActive]}
                onPress={() => setChosenId(null)}
              >
                <Text style={styles.choiceTitle}>Use a new address</Text>
                {!chosenId && <Check size={16} color={Colors.blue} strokeWidth={2.6} />}
              </Pressable>
            )}

            {!usingSaved && (
              <View style={styles.form}>
                <Field label="Full name" value={name} onChangeText={setName} placeholder="Jawad" autoCapitalize="words" />
                <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="03 000 000" keyboardType="phone-pad" />
                <Field label="Street address" value={street} onChangeText={setStreet} placeholder="Rue Gouraud, building, floor" />
                <Field label="City or area" value={city} onChangeText={setCity} placeholder="Gemmayzeh" />

                <Text style={styles.fieldLabel}>Region</Text>
                <View style={styles.zones}>
                  {LEBANON_ZONES.map(option => (
                    <Pressable
                      key={option}
                      style={[styles.zone, zone === option && styles.zoneActive]}
                      onPress={() => setZone(option)}
                    >
                      <Text style={[styles.zoneText, zone === option && styles.zoneTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={styles.checkbox} onPress={() => setSaveAddress(v => !v)}>
                  <View style={[styles.box, saveAddress && styles.boxOn]}>
                    {saveAddress && <Check size={12} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text style={styles.checkboxText}>Save this address for next time</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* How it travels */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Truck size={16} color={Colors.blue} />
              <Text style={styles.cardTitle}>Delivery speed</Text>
            </View>
            <Pressable style={[styles.choice, !express && styles.choiceActive]} onPress={() => setExpress(false)}>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>Standard · 1–3 days</Text>
                <Text style={styles.choiceNote}>
                  {cart.subtotal >= FREE_SHIPPING_THRESHOLD
                    ? 'Free on orders over $50'
                    : `${formatPrice(STANDARD_FEE)} · free over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`}
                </Text>
              </View>
              {!express && <Check size={16} color={Colors.blue} strokeWidth={2.6} />}
            </Pressable>
            <Pressable style={[styles.choice, express && styles.choiceActive]} onPress={() => setExpress(true)}>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>Express</Text>
                <Text style={styles.choiceNote}>{formatPrice(EXPRESS_FEE)} · fastest available</Text>
              </View>
              {express && <Check size={16} color={Colors.blue} strokeWidth={2.6} />}
            </Pressable>
          </View>

          {/* Payment */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Wallet size={16} color={Colors.blue} />
              <Text style={styles.cardTitle}>Payment</Text>
            </View>
            <View style={[styles.choice, styles.choiceActive]}>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>Cash on delivery</Text>
                <Text style={styles.choiceNote}>Pay the driver when your order arrives</Text>
              </View>
              <Check size={16} color={Colors.blue} strokeWidth={2.6} />
            </View>
          </View>

          {/* Extras */}
          <View style={styles.card}>
            <Field label="Promo code (optional)" value={promo} onChangeText={setPromo} placeholder="TRENDIT10" autoCapitalize="characters" />
            <Field label="Note for the driver (optional)" value={note} onChangeText={setNote} placeholder="Ring the bell twice" />
          </View>

          {/* Summary */}
          <View style={styles.card}>
            <SummaryRow label={`Items (${cart.count})`} value={formatPrice(cart.subtotal)} />
            <SummaryRow label="Delivery" value={delivery === 0 ? 'Free' : formatPrice(delivery)} />
            <View style={styles.divider} />
            <SummaryRow label="Total" value={formatPrice(estimatedTotal)} strong />
            <Text style={styles.summaryNote}>
              Confirmed by Trendit when the order is placed. A promo code is applied then.
            </Text>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={styles.bar}>
          <Pressable
            style={[styles.place, (!canPlace || placing) && styles.placeDisabled]}
            disabled={!canPlace || placing}
            onPress={submit}
          >
            {placing ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.placeText}>Place order · {formatPrice(estimatedTotal)}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
        <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.headerTitle}>Checkout</Text>
      <View style={styles.back} />
    </View>
  );
}

function OrderPlaced({ orderId, total }: { orderId: string; total: number }) {
  return (
    <Screen>
      <View style={styles.doneWrap}>
        <View style={styles.doneIcon}><CircleCheck size={34} color="#3f9a5a" strokeWidth={1.8} /></View>
        <Text style={styles.doneTitle}>Order placed</Text>
        <Text style={styles.doneNote}>
          Order #{orderId} · {formatPrice(total)} to pay on delivery. The seller has been notified.
        </Text>
        <Pressable style={styles.donePrimary} onPress={() => router.replace('/orders')}>
          <Text style={styles.donePrimaryText}>Track my order</Text>
        </Pressable>
        <Pressable style={styles.doneLink} onPress={() => router.replace('/')}>
          <Text style={styles.doneLinkText}>Keep shopping</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Gate({ title, note, action }: { title: string; note: string; action: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.doneWrap}>
      <Text style={styles.doneTitle}>{title}</Text>
      <Text style={styles.doneNote}>{note}</Text>
      <Pressable style={styles.donePrimary} onPress={action.onPress}>
        <Text style={styles.donePrimaryText}>{action.label}</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor={Colors.faint} accessibilityLabel={label} />
    </View>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryLabelStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space.lg, paddingTop: 12, paddingBottom: 6,
  },
  back: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink },
  body: { padding: Space.lg, gap: 10, paddingBottom: 30 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 14, ...Shadow.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontFamily: Font.semibold, fontSize: 13.5, color: Colors.ink },

  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52,
    borderRadius: 14, paddingHorizontal: 12, backgroundColor: Colors.fill, marginBottom: 8,
  },
  choiceActive: { backgroundColor: Colors.blueTint },
  choiceText: { flex: 1, minWidth: 0 },
  choiceTitle: { fontFamily: Font.medium, fontSize: 13, color: Colors.ink },
  choiceNote: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted, marginTop: 2 },

  form: { marginTop: 4 },
  field: { marginTop: 10 },
  fieldLabel: { fontFamily: Font.medium, fontSize: 11.5, color: Colors.muted, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: Colors.fill, borderRadius: 12, minHeight: 46, paddingHorizontal: 14,
    fontFamily: Font.regular, fontSize: 13.5, color: Colors.ink,
  },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  zone: { borderRadius: Radius.pill, backgroundColor: Colors.fill, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  zoneActive: { backgroundColor: Colors.ink },
  zoneText: { fontFamily: Font.medium, fontSize: 11.5, color: Colors.body },
  zoneTextActive: { color: '#fff' },

  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14, minHeight: 36 },
  box: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  checkboxText: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.body },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 4 },
  summaryLabel: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted },
  summaryLabelStrong: { fontFamily: Font.semibold, color: Colors.ink },
  summaryValue: { fontFamily: Font.medium, fontSize: 13, color: Colors.ink },
  summaryValueStrong: { fontFamily: Font.bold, fontSize: 18 },
  divider: { height: 1, backgroundColor: '#f0f2f5', marginVertical: 8 },
  summaryNote: { fontFamily: Font.regular, fontSize: 11, color: Colors.faint, marginTop: 6, lineHeight: 16 },

  error: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.coral, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  bar: { paddingHorizontal: Space.lg, paddingTop: 10, paddingBottom: 26, backgroundColor: 'rgba(238,241,252,0.96)' },
  place: {
    minHeight: 52, borderRadius: Radius.pill, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  placeDisabled: { opacity: 0.45 },
  placeText: { fontFamily: Font.semibold, fontSize: 14.5, color: '#fff' },

  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 60 },
  doneIcon: {
    width: 72, height: 72, borderRadius: Radius.pill, backgroundColor: '#e6f4ec',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  doneTitle: { fontFamily: Font.semibold, fontSize: 20, color: Colors.ink, textAlign: 'center' },
  doneNote: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  donePrimary: {
    marginTop: 22, alignSelf: 'stretch', minHeight: 52, borderRadius: Radius.pill,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  donePrimaryText: { fontFamily: Font.semibold, fontSize: 14.5, color: '#fff' },
  doneLink: { marginTop: 14, minHeight: 36, justifyContent: 'center' },
  doneLinkText: { fontFamily: Font.medium, fontSize: 13, color: Colors.muted },
});
