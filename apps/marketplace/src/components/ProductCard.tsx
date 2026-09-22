import { Image } from 'expo-image';
import { Heart, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Font, Radius, Shadow, tintFor } from '@/constants/theme';
import { formatPrice, type Product } from '@/lib/catalog';
import { isLightSwatch, swatchFor } from '@/lib/colours';

const MAX_DOTS = 4;

interface ProductCardProps {
  product: Product;
  /** Every colour the product family comes in (see colourFamilies). */
  colours: string[];
  /** Fixed width for horizontal rows; omit to fill a grid cell. */
  width?: number;
  imageHeight?: number;
  onPress?: () => void;
}

/**
 * The product card from the app design: a white tile with a rounded,
 * category-tinted photo well, a two-line title, the star rating, colours and
 * sizes when the product has them, and the price. No add button — sizes and
 * stock are chosen on the product page, as on the website.
 */
export function ProductCard({ product, colours, width, imageHeight = 140, onPress }: ProductCardProps) {
  const discounted = !!product.oldPrice && product.oldPrice > product.price;
  const discount = discounted ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100) : 0;
  const soldOut = product.stock === 0;
  const sizeCount = product.sizeOptions?.length || 0;
  const photo = product.image || product.images?.[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, width ? { width } : styles.fill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${formatPrice(product.price)}`}
    >
      <View style={[styles.well, { height: imageHeight, backgroundColor: tintFor(product.categoryId) }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : null}
        {discounted && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{discount}%</Text>
          </View>
        )}
        {/* Saving to the wishlist arrives with accounts; the heart is
            shown now so the card matches the design. */}
        <View style={styles.heart}>
          <Heart size={13} color={Colors.ink} strokeWidth={2} />
        </View>
        {soldOut && (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>

        {/* A product nobody has reviewed yet says so, rather than "0.0 (0)". */}
        <View style={styles.row}>
          {(product.reviews || 0) > 0 ? (
            <>
              <Star size={11} color={Colors.amber} fill={Colors.amber} />
              <Text style={styles.rating}>{(product.rating || 0).toFixed(1)}</Text>
              <Text style={styles.reviews}>({product.reviews})</Text>
            </>
          ) : (
            <Text style={styles.newItem}>New</Text>
          )}
        </View>

        {/* Colours and sizes, only for products that have them. The line keeps
            its height either way, so cards in a row line up. */}
        <View style={[styles.row, styles.variants]}>
          {(colours.length > 0 || sizeCount > 0) && (<>
            {colours.length > 0 && (
              <View style={styles.dots}>
                {colours.slice(0, MAX_DOTS).map(name => {
                  const hex = swatchFor(name);
                  return (
                    <View
                      key={name}
                      style={[styles.dot, { backgroundColor: hex }, isLightSwatch(hex) && styles.dotEdge]}
                      accessibilityLabel={name}
                    />
                  );
                })}
                {colours.length > MAX_DOTS && <Text style={styles.more}>+{colours.length - MAX_DOTS}</Text>}
              </View>
            )}
            {sizeCount > 0 && (
              <Text style={styles.sizes}>{sizeCount} {sizeCount === 1 ? 'size' : 'sizes'}</Text>
            )}
          </>)}
        </View>

        <View style={[styles.row, styles.priceRow]}>
          <Text style={[styles.price, discounted && styles.priceSale]}>{formatPrice(product.price)}</Text>
          {discounted && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice!)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: 6,
    ...Shadow.card,
  },
  fill: { flex: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  well: {
    borderRadius: Radius.well,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: Colors.coral,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontFamily: Font.semibold, fontSize: 10, lineHeight: 12 },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOut: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,26,46,0.72)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  soldOutText: { color: '#fff', fontFamily: Font.semibold, fontSize: 10.5, letterSpacing: 0.3 },
  body: { paddingTop: 9, paddingHorizontal: 4, paddingBottom: 2, gap: 5 },
  title: {
    fontFamily: Font.medium,
    fontSize: 12,
    lineHeight: 16,
    height: 32,
    color: Colors.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: Font.semibold, fontSize: 10.5, color: Colors.ink },
  reviews: { fontFamily: Font.regular, fontSize: 10.5, color: Colors.faint },
  newItem: { fontFamily: Font.medium, fontSize: 10.5, color: Colors.blue, lineHeight: 14 },
  variants: { gap: 7, height: 15 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 11, height: 11, borderRadius: Radius.pill },
  dotEdge: { borderWidth: 1, borderColor: '#d7dbe3' },
  more: { fontFamily: Font.medium, fontSize: 10, color: Colors.muted, marginLeft: 1 },
  sizes: { fontFamily: Font.medium, fontSize: 10.5, color: Colors.muted },
  priceRow: { gap: 5, alignItems: 'baseline', marginTop: 1 },
  price: { fontFamily: Font.semibold, fontSize: 15, letterSpacing: -0.15, color: Colors.ink },
  priceSale: { color: Colors.coral },
  oldPrice: {
    fontFamily: Font.regular,
    fontSize: 10.5,
    color: Colors.faint,
    textDecorationLine: 'line-through',
  },
});
