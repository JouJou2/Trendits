import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowRight, Search, ShoppingBag, SlidersHorizontal, Tag } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { ProductGrid } from '@/components/ProductGrid';
import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Space, TabBarClearance, tintFor } from '@/constants/theme';
import {
  colourFamilies, useBanners, useProducts, useShopCategories, type Banner,
} from '@/lib/catalog';
import { useCart } from '@/lib/cart';

const PAD = Space.lg;
const ROW_CARD_WIDTH = 148;
const NEW_ARRIVALS = 6;

/**
 * Home, as in the app design: header, the admin's banners, search, the
 * category row, then product rows. Everything is live from the same
 * database as the website.
 */
export default function HomeScreen() {
  const products = useProducts();
  const banners = useBanners();
  const shop = useShopCategories(products.items);
  const colours = useMemo(() => colourFamilies(products.items), [products.items]);

  // Most-reviewed first — the closest thing to "best selling" the catalog
  // records — then the rating as a tie-break.
  const bestSellers = useMemo(
    () => [...products.items]
      .filter(p => p.stock !== 0)
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 10),
    [products.items],
  );
  const newArrivals = useMemo(
    () => [...products.items]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, NEW_ARRIVALS),
    [products.items],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TabBarClearance }} showsVerticalScrollIndicator={false}>
        <Header />
        <Banners banners={banners.items} />
        <SearchRow />

        {shop.topLevel.length > 0 && (
          <FlatList
            horizontal
            data={shop.topLevel}
            keyExtractor={c => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.circles}
            renderItem={({ item }) => (
              <Pressable
                style={styles.circleItem}
                onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: item.slug } })}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <View style={[styles.circleRing, { backgroundColor: tintFor(item.slug) }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.circleImage} contentFit="cover" />
                  ) : (
                    <Tag size={22} color={Colors.blue} />
                  )}
                </View>
                <Text style={styles.circleLabel} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            )}
          />
        )}

        {products.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.blue} />
          </View>
        ) : products.error ? (
          <Text style={styles.error}>{products.error}</Text>
        ) : (
          <>
            <SectionHeader title="Best sellers" onViewAll={() => router.push('/search')} />
            <FlatList
              horizontal
              data={bestSellers}
              keyExtractor={p => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  colours={colours(item)}
                  width={ROW_CARD_WIDTH}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
                />
              )}
            />

            <SectionHeader title="New arrivals" onViewAll={() => router.push('/search')} />
            <ProductGrid products={newArrivals} colours={colours} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Header() {
  const cart = useCart();
  return (
    <View style={styles.header}>
      <View style={styles.logo}>
        <Text style={styles.logoLetter}>T</Text>
      </View>
      <View style={styles.headerText}>
        <Text style={styles.hello}>Welcome to</Text>
        <Text style={styles.brand}>Trendit</Text>
        <Text style={styles.subline} numberOfLines={1}>Lebanese sellers, one checkout</Text>
      </View>
      <Pressable
        style={styles.iconButton}
        onPress={() => router.push('/cart')}
        accessibilityRole="button"
        accessibilityLabel={cart.count > 0 ? `Cart, ${cart.count} items` : 'Cart'}
      >
        <ShoppingBag size={18} color={Colors.ink} strokeWidth={1.9} />
        {cart.count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cart.count > 9 ? '9+' : cart.count}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/** The admin's homepage banners, swiped through; 3:1 so nothing is cropped. */
function Banners({ banners }: { banners: Banner[] }) {
  const { width } = useWindowDimensions();
  const slideWidth = width - PAD * 2;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Banner>>(null);

  if (banners.length === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / (slideWidth + Space.sm)));

  return (
    <View style={styles.bannerWrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={banners}
        keyExtractor={b => b.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth + Space.sm}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ paddingHorizontal: PAD, gap: Space.sm }}
        renderItem={({ item }) => (
          <View style={[styles.banner, { width: slideWidth, height: slideWidth / 3 }]}>
            <Image
              source={{ uri: item.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={{ left: `${item.focalX ?? 50}%`, top: `${item.focalY ?? 50}%` }}
              accessibilityLabel={item.title || 'Promotion'}
            />
          </View>
        )}
      />
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function SearchRow() {
  return (
    <View style={styles.searchRow}>
      <Pressable
        style={styles.search}
        onPress={() => router.push('/search')}
        accessibilityRole="search"
        accessibilityLabel="Search products"
      >
        <Search size={16} color={Colors.faint} strokeWidth={2.2} />
        <Text style={styles.searchText}>Search for products...</Text>
      </Pressable>
      <Pressable style={styles.filterButton} accessibilityRole="button" accessibilityLabel="Filters">
        <SlidersHorizontal size={18} color="#fff" strokeWidth={1.9} />
      </Pressable>
    </View>
  );
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable style={styles.viewAll} onPress={onViewAll} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.viewAllText}>View all</Text>
        <ArrowRight size={12} color={Colors.muted} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: PAD, paddingTop: 12 },
  logo: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontFamily: Font.bold, fontSize: 20, color: '#fff', marginTop: 2 },
  headerText: { flex: 1, minWidth: 0 },
  hello: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted },
  brand: { fontFamily: Font.semibold, fontSize: 18, letterSpacing: -0.36, color: Colors.ink, lineHeight: 23 },
  subline: { fontFamily: Font.regular, fontSize: 10.5, color: '#8b94a8' },
  iconButton: {
    width: 40, height: 40, borderRadius: Radius.button, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: Radius.pill, backgroundColor: Colors.coral,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#eef1fc',
  },
  badgeText: { fontFamily: Font.semibold, fontSize: 9, color: '#fff' },

  bannerWrap: { paddingTop: 14 },
  banner: { borderRadius: Radius.hero, overflow: 'hidden', backgroundColor: '#dbe6ff' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 9 },
  dot: { width: 4, height: 4, borderRadius: Radius.pill, backgroundColor: '#bcc7e2' },
  dotActive: { width: 16, backgroundColor: Colors.blue },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: PAD, paddingTop: 11 },
  search: {
    flex: 1, height: 46, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
  },
  searchText: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.faint },
  filterButton: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: Colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },

  circles: { paddingHorizontal: PAD, paddingTop: 16, gap: 13 },
  circleItem: { width: 58, alignItems: 'center', gap: 6 },
  circleRing: {
    width: 54, height: 54, borderRadius: Radius.pill, padding: 3,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  circleImage: { width: '100%', height: '100%', borderRadius: Radius.pill },
  circleLabel: { fontFamily: Font.regular, fontSize: 10, color: Colors.body, textAlign: 'center' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: PAD, paddingTop: 20,
  },
  sectionTitle: { fontFamily: Font.semibold, fontSize: 15, letterSpacing: -0.15, color: Colors.ink },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontFamily: Font.regular, fontSize: 11.5, color: Colors.muted },

  row: { paddingHorizontal: PAD, paddingTop: 12, paddingBottom: 6, gap: 12 },
  grid: { paddingHorizontal: PAD, paddingTop: 12, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridSpacer: { flex: 1 },

  loading: { paddingVertical: 40, alignItems: 'center' },
  error: { fontFamily: Font.regular, fontSize: 13, color: Colors.coral, textAlign: 'center', paddingVertical: 30 },
});
