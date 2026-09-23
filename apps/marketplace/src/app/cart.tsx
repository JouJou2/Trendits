import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space } from '@/constants/theme';
import { formatPrice } from '@/lib/catalog';
import { useCart } from '@/lib/cart';

/**
 * The basket. Placing the order comes next: it will post to the website's
 * own /api/orders, which re-prices everything and takes the stock, so the
 * app can never set its own prices.
 */
export default function CartScreen() {
  const cart = useCart();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.title}>Your cart</Text>
        <View style={styles.back} />
      </View>

      {cart.lines.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><ShoppingBag size={26} color={Colors.faint} strokeWidth={1.8} /></View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyNote}>Everything you add shows up here.</Text>
          <Pressable style={styles.shopButton} onPress={() => router.replace('/')}>
            <Text style={styles.shopButtonText}>Start shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {cart.lines.map(line => (
              <View key={line.key} style={styles.line}>
                <View style={styles.thumb}>
                  {line.image ? (
                    <Image source={{ uri: line.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : null}
                </View>
                <View style={styles.lineText}>
                  <Text style={styles.lineTitle} numberOfLines={2}>{line.title}</Text>
                  {!!(line.size || line.colour) && (
                    <Text style={styles.lineMeta}>
                      {[line.colour, line.size].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <Text style={styles.linePrice}>{formatPrice(line.price)}</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepButton}
                      onPress={() => cart.setQuantity(line.key, line.quantity - 1)}
                      accessibilityLabel="Reduce quantity"
                    >
                      <Minus size={14} color={Colors.ink} strokeWidth={2.4} />
                    </Pressable>
                    <Text style={styles.quantity}>{line.quantity}</Text>
                    <Pressable
                      style={[styles.stepButton, line.quantity >= line.maxQuantity && styles.stepDisabled]}
                      disabled={line.quantity >= line.maxQuantity}
                      onPress={() => cart.setQuantity(line.key, line.quantity + 1)}
                      accessibilityLabel="Increase quantity"
                    >
                      <Plus size={14} color={Colors.ink} strokeWidth={2.4} />
                    </Pressable>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => cart.remove(line.key)}
                      accessibilityLabel={`Remove ${line.title}`}
                    >
                      <Trash2 size={15} color={Colors.faint} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(cart.subtotal)}</Text>
            </View>
            <Text style={styles.summaryNote}>Delivery is added at checkout.</Text>
            <Pressable style={[styles.checkout, styles.checkoutDisabled]} disabled>
              <Text style={styles.checkoutText}>Checkout — coming next</Text>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Space.lg, paddingTop: 12, paddingBottom: 6,
  },
  back: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink },

  list: { padding: Space.lg, gap: 10, paddingBottom: 30 },
  line: { flexDirection: 'row', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 10, ...Shadow.card },
  thumb: { width: 84, height: 96, borderRadius: Radius.well, overflow: 'hidden', backgroundColor: Colors.fill },
  lineText: { flex: 1, minWidth: 0 },
  lineTitle: { fontFamily: Font.medium, fontSize: 13, lineHeight: 18, color: Colors.ink },
  lineMeta: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted, marginTop: 2 },
  linePrice: { fontFamily: Font.semibold, fontSize: 15, color: Colors.ink, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  stepButton: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.4 },
  quantity: { fontFamily: Font.semibold, fontSize: 13, color: Colors.ink, minWidth: 16, textAlign: 'center' },
  removeButton: { marginLeft: 'auto', width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  summary: { backgroundColor: Colors.surface, padding: Space.lg, paddingBottom: 28, gap: 6, ...Shadow.tabBar },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  summaryLabel: { fontFamily: Font.medium, fontSize: 13.5, color: Colors.body },
  summaryValue: { fontFamily: Font.bold, fontSize: 20, color: Colors.ink },
  summaryNote: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted },
  checkout: {
    marginTop: 8, minHeight: 50, borderRadius: Radius.pill, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  checkoutDisabled: { opacity: 0.45 },
  checkoutText: { fontFamily: Font.semibold, fontSize: 14, color: '#fff' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink },
  emptyNote: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted },
  shopButton: {
    marginTop: 12, backgroundColor: Colors.blue, borderRadius: Radius.pill,
    paddingHorizontal: 24, minHeight: 46, alignItems: 'center', justifyContent: 'center',
  },
  shopButtonText: { fontFamily: Font.semibold, fontSize: 13.5, color: '#fff' },
});
