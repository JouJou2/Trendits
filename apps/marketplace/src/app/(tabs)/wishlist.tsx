import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductGrid } from '@/components/ProductGrid';
import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Space, TabBarClearance } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { colourFamilies, useProducts } from '@/lib/catalog';
import { useWishlist } from '@/lib/wishlist';

/**
 * Saved products. They are kept on the device while signed out and move into
 * the account on sign-in, so the same list appears on the website.
 */
export default function WishlistScreen() {
  const { ids } = useWishlist();
  const auth = useAuth();
  const products = useProducts();
  const colours = useMemo(() => colourFamilies(products.items), [products.items]);

  const saved = useMemo(
    () => ids.map(id => products.items.find(p => p.id === id)).filter(Boolean) as typeof products.items,
    [ids, products.items],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.subtitle}>
          {saved.length > 0
            ? `${saved.length} ${saved.length === 1 ? 'product' : 'products'} you liked`
            : 'Tap the heart on anything you like'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarClearance }} showsVerticalScrollIndicator={false}>
        {products.loading ? (
          <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
        ) : saved.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Heart size={26} color={Colors.faint} strokeWidth={1.8} /></View>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyNote}>
              {auth.user
                ? 'The heart on any product keeps it here, on the app and the website.'
                : 'The heart on any product keeps it here. Sign in to keep it on every device.'}
            </Text>
            <Pressable style={styles.primary} onPress={() => router.push('/')}>
              <Text style={styles.primaryText}>Browse products</Text>
            </Pressable>
          </View>
        ) : (
          <ProductGrid products={saved} colours={colours} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.lg, paddingTop: 14, paddingBottom: 2 },
  title: { fontFamily: Font.semibold, fontSize: 22, color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontFamily: Font.regular, fontSize: 12, color: Colors.muted, marginTop: 2 },
  centre: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontFamily: Font.semibold, fontSize: 16, color: Colors.ink },
  emptyNote: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  primary: {
    marginTop: 18, backgroundColor: Colors.blue, borderRadius: Radius.pill,
    paddingHorizontal: 22, minHeight: 46, alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { fontFamily: Font.semibold, fontSize: 13.5, color: '#fff' },
});
