import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Tag } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space, TabBarClearance, tintFor } from '@/constants/theme';
import { useProducts, useShopCategories } from '@/lib/catalog';

/**
 * Every category with something in it, in the order set in the admin, each
 * showing its subcategories. Empty ones are left out, exactly as on the
 * website, so no tap leads to an empty screen.
 */
export default function CategoriesScreen() {
  const products = useProducts();
  const shop = useShopCategories(products.items);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Browse everything on Trendit</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: TabBarClearance }} showsVerticalScrollIndicator={false}>
        {products.loading || shop.loading ? (
          <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
        ) : shop.topLevel.length === 0 ? (
          <Text style={styles.empty}>No categories yet. Check back soon.</Text>
        ) : (
          <View style={styles.list}>
            {shop.topLevel.map(category => {
              const children = shop.childrenOf(category);
              return (
                <View key={category.id} style={styles.card}>
                  <Pressable
                    style={styles.cardRow}
                    onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: category.slug } })}
                    accessibilityRole="button"
                    accessibilityLabel={category.name}
                  >
                    <View style={[styles.thumb, { backgroundColor: tintFor(category.slug) }]}>
                      {category.image ? (
                        <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Tag size={20} color={Colors.blue} />
                      )}
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{category.name}</Text>
                      <Text style={styles.cardCount}>
                        {shop.counts[category.slug]} {shop.counts[category.slug] === 1 ? 'product' : 'products'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.faint} strokeWidth={2} />
                  </Pressable>

                  {children.length > 0 && (
                    <View style={styles.children}>
                      {children.map(child => (
                        <Pressable
                          key={child.id}
                          style={styles.childChip}
                          onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: child.slug } })}
                        >
                          <Text style={styles.childText}>{child.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.lg, paddingTop: 14, paddingBottom: 2 },
  title: { fontFamily: Font.semibold, fontSize: 22, color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontFamily: Font.regular, fontSize: 12, color: Colors.muted, marginTop: 2 },
  list: { paddingHorizontal: Space.lg, paddingTop: 14, gap: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 10, ...Shadow.card },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  thumb: { width: 52, height: 52, borderRadius: Radius.well, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: Font.semibold, fontSize: 14, color: Colors.ink },
  cardCount: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted, marginTop: 1 },
  children: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, paddingHorizontal: 2 },
  childChip: { backgroundColor: Colors.fill, borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  childText: { fontFamily: Font.medium, fontSize: 11.5, color: Colors.body },
  centre: { paddingTop: 60, alignItems: 'center' },
  empty: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center', paddingTop: 50 },
});
