import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ProductCard } from '@/components/ProductCard';
import { Space } from '@/constants/theme';
import type { Product } from '@/lib/catalog';

/**
 * Two columns of product cards. Laid out by hand rather than with FlatList's
 * numColumns, because every screen that uses it puts the grid inside its own
 * scrolling page.
 */
export function ProductGrid({ products, colours }: { products: Product[]; colours: (p: Product) => string[] }) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map(row => (
        <View key={row.map(p => p.id).join('-')} style={styles.row}>
          {row.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              colours={colours(p)}
              imageHeight={164}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}
            />
          ))}
          {row.length === 1 && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: Space.lg, paddingTop: Space.md, gap: Space.md },
  row: { flexDirection: 'row', gap: Space.md },
  spacer: { flex: 1 },
});
