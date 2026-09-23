import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { BadgeCheck, ChevronLeft, CreditCard, Heart, Star, Store, Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Shadow, Space } from '@/constants/theme';
import { formatPrice, useProducts, type Product } from '@/lib/catalog';
import { useCart } from '@/lib/cart';
import { isLightSwatch, swatchFor } from '@/lib/colours';
import { db } from '@/lib/firebase';

/** Below this, the page warns how few are left — same idea as the website. */
const LOW_STOCK = 15;

/**
 * One product: gallery, colours (which are separate linked listings, as on
 * the website), sizes with their own stock, and add to cart. Prices shown are
 * what the shopper pays; the server re-checks them at checkout.
 */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const catalog = useProducts();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  // Live, so a price or stock change while the shopper reads shows at once.
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSize(null);
    setPhoto(null);
    const unsub = onSnapshot(doc(db, 'products', id), snap => {
      if (!snap.exists()) {
        setMissing(true);
      } else {
        setProduct({ ...(snap.data() as Product), id: snap.id });
        setMissing(false);
      }
      setLoading(false);
    }, err => {
      console.error('Product read failed:', err);
      setLoading(false);
      setMissing(true);
    });
    return unsub;
  }, [id]);

  /** The other colours of this product, each its own listing. */
  const siblings = useMemo(() => {
    if (!product?.variantGroupId) return [];
    return catalog.items
      .filter(p => p.variantGroupId === product.variantGroupId && p.variantColor)
      .sort((a, b) => (a.variantColor || '').localeCompare(b.variantColor || ''));
  }, [catalog.items, product?.variantGroupId]);

  const photos = useMemo(() => {
    if (!product) return [];
    return [...new Set([product.image, ...(product.images || [])].filter(Boolean) as string[])];
  }, [product]);

  const sizes = product?.sizeOptions || [];
  const variant = product?.variants?.find(v => v.size === size);
  const price = variant?.price ?? product?.price ?? 0;
  const stock = sizes.length > 0
    ? (size ? variant?.stock ?? 0 : product?.variants?.reduce((n, v) => n + (v.stock || 0), 0) ?? 0)
    : product?.stock ?? 0;
  const discounted = !!product?.oldPrice && product.oldPrice > price;
  const needsSize = sizes.length > 0 && !size;

  if (loading) {
    return (
      <Screen>
        <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
      </Screen>
    );
  }

  if (missing || !product) {
    return (
      <Screen>
        <View style={styles.centre}>
          <Text style={styles.missingTitle}>Product not found</Text>
          <Text style={styles.missingNote}>It may have been removed by the seller.</Text>
          <Pressable style={styles.missingButton} onPress={() => router.back()}>
            <Text style={styles.missingButtonText}>Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const mainPhoto = photo || photos[0];

  const addToCart = () => {
    cart.add({
      productId: product.id,
      title: product.title,
      image: mainPhoto,
      price,
      size: size || undefined,
      colour: product.variantColor,
      vendorId: product.vendorId,
      maxQuantity: Math.max(stock, 1),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View style={styles.galleryCard}>
          <View style={styles.topRow}>
            <Pressable style={styles.roundButton} onPress={() => router.back()} accessibilityLabel="Back">
              <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
            </Pressable>
            <Text style={styles.topTitle}>Product</Text>
            <Pressable style={styles.roundButton} accessibilityLabel="Save to wishlist">
              <Heart size={17} color={Colors.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.gallery}>
            <View style={styles.mainPhoto}>
              {mainPhoto ? (
                <Image source={{ uri: mainPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : null}
              {discounted && (
                <View style={styles.saleTag}>
                  <Text style={styles.saleTagText}>
                    -{Math.round(((product.oldPrice! - price) / product.oldPrice!) * 100)}% Sale
                  </Text>
                </View>
              )}
            </View>
            {photos.length > 1 && (
              <View style={styles.thumbs}>
                {photos.slice(0, 4).map(url => (
                  <Pressable
                    key={url}
                    onPress={() => setPhoto(url)}
                    style={[styles.thumb, url === mainPhoto && styles.thumbActive]}
                    accessibilityLabel="Show photo"
                  >
                    <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Pressable>
                ))}
                {photos.length > 4 && (
                  <View style={[styles.thumb, styles.thumbMore]}>
                    <Text style={styles.thumbMoreText}>+{photos.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Title and price */}
        <View style={[styles.card, styles.cardTop]}>
          {!!product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.ratingRow}>
            {(product.reviews || 0) > 0 ? (
              <>
                <Star size={14} color={Colors.amber} fill={Colors.amber} />
                <Text style={styles.ratingValue}>{(product.rating || 0).toFixed(1)}</Text>
                <Text style={styles.ratingNote}>{product.reviews} reviews</Text>
              </>
            ) : (
              <Text style={styles.newNote}>New listing</Text>
            )}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(price)}</Text>
            {discounted && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice!)}</Text>}
            {discounted && (
              <View style={styles.savePill}>
                <Text style={styles.savePillText}>Save {formatPrice(product.oldPrice! - price)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Colours: sibling listings sharing this product's family */}
        {siblings.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Colour <Text style={styles.sectionValue}>· {product.variantColor}</Text>
            </Text>
            <View style={styles.swatches}>
              {siblings.map(sib => {
                const hex = swatchFor(sib.variantColor || '');
                const active = sib.id === product.id;
                return (
                  <Pressable
                    key={sib.id}
                    onPress={() => !active && router.replace({ pathname: '/product/[id]', params: { id: sib.id } })}
                    style={[styles.swatch, { backgroundColor: hex }, isLightSwatch(hex) && styles.swatchEdge, active && styles.swatchActive]}
                    accessibilityLabel={sib.variantColor}
                    accessibilityState={{ selected: active }}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Sizes, each with its own stock */}
        {sizes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Size {size ? <Text style={styles.sectionValue}>· {size}</Text> : null}
            </Text>
            <View style={styles.sizes}>
              {sizes.map(option => {
                const optionStock = product.variants?.find(v => v.size === option)?.stock ?? 0;
                const soldOut = optionStock <= 0;
                const active = option === size;
                return (
                  <Pressable
                    key={option}
                    disabled={soldOut}
                    onPress={() => setSize(option)}
                    style={[styles.sizeChip, active && styles.sizeChipActive, soldOut && styles.sizeChipSoldOut]}
                    accessibilityState={{ selected: active, disabled: soldOut }}
                  >
                    <Text style={[styles.sizeText, active && styles.sizeTextActive, soldOut && styles.sizeTextSoldOut]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Stock */}
        <View style={styles.card}>
          {stock <= 0 ? (
            <Text style={styles.soldOut}>Sold out</Text>
          ) : stock <= LOW_STOCK ? (
            <Text style={styles.lowStock}>Only {stock} left in stock</Text>
          ) : (
            <Text style={styles.inStock}>In stock</Text>
          )}
        </View>

        {/* Delivery, as the website's checkout charges it */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><CreditCard size={19} color={Colors.blue} strokeWidth={1.9} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Cash on delivery</Text>
              <Text style={styles.infoNote}>Pay the driver when it arrives</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Truck size={19} color={Colors.blue} strokeWidth={1.9} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Delivery across Lebanon</Text>
              <Text style={styles.infoNote}>Standard $4 · Express $8</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {!!(product as { description?: string }).description && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>About this product</Text>
            <Text style={styles.description}>{(product as { description?: string }).description}</Text>
          </View>
        )}

        {/* Seller */}
        {!!product.vendorId && (
          <Pressable style={[styles.card, styles.sellerCard]} accessibilityLabel="Seller">
            <View style={styles.sellerAvatar}><Store size={18} color={Colors.muted} /></View>
            <View style={styles.infoText}>
              <View style={styles.sellerName}>
                <Text style={styles.infoTitle}>{product.brand || 'Trendit seller'}</Text>
                <BadgeCheck size={13} color={Colors.blue} />
              </View>
              <Text style={styles.infoNote}>Sold and shipped by the store</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky buy bar */}
      <View style={[styles.buyBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.buyBarInner}>
          <Pressable
            style={[styles.addButton, (stock <= 0 || needsSize) && styles.buttonDisabled]}
            disabled={stock <= 0 || needsSize}
            onPress={addToCart}
          >
            <Text style={styles.addButtonText}>
              {stock <= 0 ? 'Sold out' : needsSize ? 'Choose a size' : added ? 'Added ✓' : 'Add to cart'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.buyButton, (stock <= 0 || needsSize) && styles.buttonDisabled]}
            disabled={stock <= 0 || needsSize}
            onPress={() => { addToCart(); router.push('/cart'); }}
          >
            <Text style={styles.buyButtonText}>Buy now</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  missingTitle: { fontFamily: Font.semibold, fontSize: 17, color: Colors.ink },
  missingNote: { fontFamily: Font.regular, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  missingButton: { marginTop: 10, backgroundColor: Colors.blue, borderRadius: Radius.pill, paddingHorizontal: 22, paddingVertical: 12 },
  missingButtonText: { fontFamily: Font.semibold, fontSize: 13, color: '#fff' },

  galleryCard: { backgroundColor: Colors.surface, paddingHorizontal: Space.lg, paddingTop: 14, paddingBottom: Space.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontFamily: Font.semibold, fontSize: 14, color: Colors.ink },
  roundButton: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.fill,
    alignItems: 'center', justifyContent: 'center',
  },
  gallery: { flexDirection: 'row', gap: 11, marginTop: 14 },
  mainPhoto: { flex: 1, height: 268, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Colors.fill },
  saleTag: {
    position: 'absolute', top: 11, left: 11, backgroundColor: Colors.coral,
    borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 4,
  },
  saleTagText: { fontFamily: Font.semibold, fontSize: 11.5, color: '#fff' },
  thumbs: { width: 54, gap: 8 },
  thumb: { height: 54, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.fill },
  thumbActive: { borderWidth: 2, borderColor: Colors.blue },
  thumbMore: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef1f5' },
  thumbMoreText: { fontFamily: Font.semibold, fontSize: 11.5, color: Colors.muted },

  card: { backgroundColor: Colors.surface, marginTop: 8, padding: Space.lg },
  cardTop: { borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
  brand: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted },
  title: { fontFamily: Font.semibold, fontSize: 17, lineHeight: 23, color: Colors.ink, marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  ratingValue: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.ink },
  ratingNote: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.faint },
  newNote: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.blue },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 13 },
  price: { fontFamily: Font.bold, fontSize: 27, color: Colors.blue },
  oldPrice: { fontFamily: Font.regular, fontSize: 14, color: Colors.faint, textDecorationLine: 'line-through' },
  savePill: { backgroundColor: '#ffe9e8', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  savePillText: { fontFamily: Font.semibold, fontSize: 11.5, color: Colors.coral },

  sectionLabel: { fontFamily: Font.semibold, fontSize: 13.5, color: Colors.ink },
  sectionValue: { fontFamily: Font.regular, color: Colors.faint },
  sectionTitle: { fontFamily: Font.semibold, fontSize: 15, color: Colors.ink, marginBottom: 8 },
  swatches: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: Radius.pill },
  swatchEdge: { borderWidth: 1, borderColor: '#d7dbe3' },
  swatchActive: { borderWidth: 2.5, borderColor: Colors.blue },

  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sizeChip: {
    minWidth: 52, minHeight: 44, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: Colors.fill, alignItems: 'center', justifyContent: 'center',
  },
  sizeChipActive: { backgroundColor: Colors.blue },
  sizeChipSoldOut: { opacity: 0.45 },
  sizeText: { fontFamily: Font.medium, fontSize: 13, color: Colors.ink },
  sizeTextActive: { color: '#fff', fontFamily: Font.semibold },
  sizeTextSoldOut: { textDecorationLine: 'line-through' },

  inStock: { fontFamily: Font.medium, fontSize: 12.5, color: '#3f9a5a' },
  lowStock: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.coral },
  soldOut: { fontFamily: Font.semibold, fontSize: 12.5, color: Colors.muted },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.blueTint,
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1, minWidth: 0 },
  infoTitle: { fontFamily: Font.semibold, fontSize: 13.5, color: Colors.ink },
  infoNote: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f2f5', marginVertical: 14 },
  description: { fontFamily: Font.regular, fontSize: 12.5, lineHeight: 20, color: '#4b5364' },

  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: '#eef1f5',
    alignItems: 'center', justifyContent: 'center',
  },
  sellerName: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  buyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: Space.lg, paddingTop: 12, backgroundColor: '#eef1fc',
  },
  buyBarInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.ink, borderRadius: Radius.pill, padding: 7,
    ...Shadow.tabBar,
  },
  addButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { fontFamily: Font.medium, fontSize: 13.5, color: '#fff' },
  buyButton: {
    flex: 1, minHeight: 44, borderRadius: Radius.pill, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  buyButtonText: { fontFamily: Font.semibold, fontSize: 13.5, color: '#fff' },
  buttonDisabled: { opacity: 0.45 },
});
