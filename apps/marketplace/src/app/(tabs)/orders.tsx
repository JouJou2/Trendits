import { Image } from 'expo-image';
import { router } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { ChevronRight, Package } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space, TabBarClearance } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/catalog';
import { db } from '@/lib/firebase';

/** The shopper's own orders — the same list the website shows them. */
interface Order {
  id: string;
  orderNumber?: string;
  status?: string;
  createdAt?: string;
  total?: number;
  items?: { productName?: string; productImage?: string | null; quantity?: number }[];
}

/** Status colours: settled states read calm, cancelled reads red. */
const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  delivered: { bg: '#e6f4ec', text: '#2f7d4f' },
  shipped: { bg: '#e7efff', text: '#0452c8' },
  dispatched: { bg: '#e7efff', text: '#0452c8' },
  confirmed: { bg: '#e7efff', text: '#0452c8' },
  processing: { bg: '#fff4e0', text: '#a06a15' },
  pending: { bg: '#fff4e0', text: '#a06a15' },
  new: { bg: '#fff4e0', text: '#a06a15' },
  cancelled: { bg: '#ffe9e8', text: '#c0392b' },
};

export default function OrdersScreen() {
  const auth = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'users', auth.user.id, 'orders'), snap => {
      setOrders(snap.docs
        .map(d => ({ ...(d.data() as Order), id: d.id }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      setLoading(false);
    }, err => {
      console.error('Could not read your orders:', err);
      setLoading(false);
    });
    return unsub;
  }, [auth.user]);

  if (!auth.ready || loading) {
    return (
      <Screen>
        <Header />
        <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
      </Screen>
    );
  }

  if (!auth.user) {
    return (
      <Screen>
        <Header />
        <Empty
          title="Sign in to see your orders"
          note="Your orders follow your account, on the app and the website."
          action={{ label: 'Sign in', onPress: () => router.push('/sign-in') }}
        />
      </Screen>
    );
  }

  if (orders.length === 0) {
    return (
      <Screen>
        <Header />
        <Empty
          title="No orders yet"
          note="Once you order something, you can follow it here."
          action={{ label: 'Start shopping', onPress: () => router.push('/') }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header />
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {orders.map(order => {
          const status = (order.status || 'pending').toLowerCase();
          const tone = STATUS_TONE[status] || { bg: Colors.fill, text: Colors.muted };
          const items = order.items || [];
          const pieces = items.reduce((n, item) => n + (item.quantity || 1), 0);
          return (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.orderNumber}>#{order.orderNumber || order.id.slice(0, 6)}</Text>
                  <Text style={styles.orderDate}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}
                  </Text>
                </View>
                <View style={[styles.status, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusText, { color: tone.text }]}>{status}</Text>
                </View>
              </View>

              <View style={styles.thumbs}>
                {items.slice(0, 4).map((item, index) => (
                  <View key={`${order.id}-${index}`} style={styles.thumb}>
                    {item.productImage ? (
                      <Image source={{ uri: item.productImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Package size={16} color={Colors.faint} />
                    )}
                  </View>
                ))}
                {items.length > 4 && (
                  <View style={[styles.thumb, styles.thumbMore]}>
                    <Text style={styles.thumbMoreText}>+{items.length - 4}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFoot}>
                <Text style={styles.pieces}>{pieces} {pieces === 1 ? 'item' : 'items'}</Text>
                <Text style={styles.total}>{formatPrice(Number(order.total || 0))}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>My orders</Text>
      <Text style={styles.subtitle}>Everything you have ordered on Trendit</Text>
    </View>
  );
}

function Empty({ title, note, action }: { title: string; note: string; action: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Package size={26} color={Colors.faint} strokeWidth={1.8} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyNote}>{note}</Text>
      <Pressable style={styles.primary} onPress={action.onPress}>
        <Text style={styles.primaryText}>{action.label}</Text>
        <ChevronRight size={16} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.lg, paddingTop: 14, paddingBottom: 2 },
  title: { fontFamily: Font.semibold, fontSize: 22, color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontFamily: Font.regular, fontSize: 12, color: Colors.muted, marginTop: 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  list: { padding: Space.lg, gap: 10, paddingBottom: TabBarClearance },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 14, ...Shadow.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  orderNumber: { fontFamily: Font.semibold, fontSize: 14, color: Colors.ink },
  orderDate: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.faint, marginTop: 2 },
  status: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: Font.semibold, fontSize: 10.5, textTransform: 'capitalize' },

  thumbs: { flexDirection: 'row', gap: 6, marginTop: 12 },
  thumb: {
    width: 48, height: 48, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbMore: { backgroundColor: '#eef1f5' },
  thumbMoreText: { fontFamily: Font.semibold, fontSize: 11.5, color: Colors.muted },

  cardFoot: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f2f5',
  },
  pieces: { fontFamily: Font.regular, fontSize: 12, color: Colors.muted },
  total: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink, textAlign: 'center' },
  emptyNote: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  primary: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.blue, borderRadius: Radius.pill, paddingHorizontal: 22, minHeight: 46,
    justifyContent: 'center',
  },
  primaryText: { fontFamily: Font.semibold, fontSize: 13.5, color: '#fff' },
});
