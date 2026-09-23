import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProductGrid } from '@/components/ProductGrid';
import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Space, TabBarClearance } from '@/constants/theme';
import { colourFamilies, useProducts, useShopCategories } from '@/lib/catalog';
import { findBySlug, productCategorySlugs, productInCategory } from '@web/utils/categories';

/**
 * Everything in one category, with its subcategories as filter chips — the
 * same rule as the website: a category page includes what is filed under its
 * subcategories.
 */
export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const products = useProducts();
  const shop = useShopCategories(products.items);
  const colours = useMemo(() => colourFamilies(products.items), [products.items]);
  const [sub, setSub] = useState<string | null>(null);

  const category = findBySlug(slug || '', shop.all);
  const subcategories = category ? shop.childrenOf(category) : [];

  const inCategory = useMemo(
    () => products.items.filter(p => productInCategory(p, slug || '', shop.all)),
    [products.items, slug, shop.all],
  );
  const shown = useMemo(
    () => (sub ? inCategory.filter(p => productCategorySlugs(p).includes(sub.toLowerCase())) : inCategory),
    [inCategory, sub],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{category?.name || slug}</Text>
          <Text style={styles.count}>
            {shown.length} {shown.length === 1 ? 'product' : 'products'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarClearance }} showsVerticalScrollIndicator={false}>
        {subcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip label="All" active={!sub} onPress={() => setSub(null)} />
            {subcategories.map(child => (
              <Chip
                key={child.id}
                label={child.name}
                active={sub === child.slug}
                onPress={() => setSub(child.slug)}
              />
            ))}
          </ScrollView>
        )}

        {products.loading ? (
          <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
        ) : shown.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet. Check back soon.</Text>
        ) : (
          <ProductGrid products={shown} colours={colours} />
        )}
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Space.lg, paddingTop: 12, paddingBottom: 4 },
  back: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: Font.semibold, fontSize: 18, color: Colors.ink, letterSpacing: -0.3 },
  count: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted, marginTop: 1 },
  chips: { paddingHorizontal: Space.lg, paddingTop: 14, gap: 8 },
  chip: {
    minHeight: 36, paddingHorizontal: 15, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.ink },
  chipText: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.body },
  chipTextActive: { color: '#fff' },
  centre: { paddingTop: 60, alignItems: 'center' },
  empty: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingTop: 50 },
});
