import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Search as SearchIcon, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { ProductGrid } from '@/components/ProductGrid';
import { Screen } from '@/components/Screen';
import { Colors, Font, Radius, Space, TabBarClearance } from '@/constants/theme';
import { colourFamilies, useProducts, type Product } from '@/lib/catalog';
import { rankSearchResults } from '@web/utils/searchRanking';

const RECENT_KEY = 'trendit.recentSearches.v1';
const MAX_RECENT = 6;

/**
 * Search, using the website's own ranking (@web/utils/searchRanking), so a
 * shopper who searches "jbl 720" gets the same results in both places —
 * including its model-number and near-miss handling.
 */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { items, loading, error } = useProducts();
  const [term, setTerm] = useState(params.q || '');
  const [recent, setRecent] = useState<string[]>([]);
  const colours = useMemo(() => colourFamilies(items), [items]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then(raw => { if (raw) setRecent(JSON.parse(raw) as string[]); })
      .catch(err => console.error('Could not read recent searches:', err));
  }, []);

  const remember = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setRecent(prev => {
      const next = [clean, ...prev.filter(r => r.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const brands = useMemo(
    () => [...new Set(items.map(p => p.brand).filter(Boolean) as string[])],
    [items],
  );

  const results = useMemo(() => {
    const query = term.trim();
    if (!query) return [];
    // rankSearchResults groups by how well each product matches.
    return rankSearchResults(query, items as never[], { brands }).flatMap(group => group.products) as Product[];
  }, [term, items, brands]);

  const searching = term.trim().length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Back">
          <ChevronLeft size={18} color={Colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.field}>
          <SearchIcon size={16} color={Colors.faint} strokeWidth={2.2} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Search for products..."
            placeholderTextColor={Colors.faint}
            style={styles.input}
            autoFocus={!params.q}
            returnKeyType="search"
            onSubmitEditing={() => { remember(term); Keyboard.dismiss(); }}
            accessibilityLabel="Search products"
          />
          {searching && (
            <Pressable onPress={() => setTerm('')} accessibilityLabel="Clear search" hitSlop={8}>
              <X size={15} color={Colors.faint} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: TabBarClearance }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centre}><ActivityIndicator color={Colors.blue} /></View>
        ) : error ? (
          <Text style={styles.message}>{error}</Text>
        ) : !searching ? (
          recent.length > 0 && (
            <View style={styles.recent}>
              <Text style={styles.recentTitle}>Recent searches</Text>
              {recent.map(value => (
                <Pressable key={value} style={styles.recentRow} onPress={() => setTerm(value)}>
                  <Clock size={14} color={Colors.faint} strokeWidth={2} />
                  <Text style={styles.recentText}>{value}</Text>
                </Pressable>
              ))}
            </View>
          )
        ) : results.length === 0 ? (
          <View style={styles.centre}>
            <Text style={styles.emptyTitle}>Nothing matched “{term.trim()}”</Text>
            <Text style={styles.emptyNote}>Try fewer words, or check the spelling.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </Text>
            <ProductGrid products={results} colours={colours} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Space.lg, paddingTop: 12, paddingBottom: 4 },
  back: {
    width: 38, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  field: {
    flex: 1, height: 46, borderRadius: Radius.pill, backgroundColor: Colors.surface,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
  },
  input: { flex: 1, fontFamily: Font.regular, fontSize: 13, color: Colors.ink, paddingVertical: 0 },
  centre: { paddingTop: 60, alignItems: 'center', gap: 6, paddingHorizontal: 40 },
  message: { fontFamily: Font.regular, fontSize: 13, color: Colors.coral, textAlign: 'center', paddingTop: 40 },
  emptyTitle: { fontFamily: Font.semibold, fontSize: 15, color: Colors.ink, textAlign: 'center' },
  emptyNote: { fontFamily: Font.regular, fontSize: 12.5, color: Colors.muted, textAlign: 'center' },
  count: { fontFamily: Font.medium, fontSize: 12.5, color: Colors.muted, paddingHorizontal: Space.lg, paddingTop: 14 },
  recent: { paddingHorizontal: Space.lg, paddingTop: 18, gap: 2 },
  recentTitle: { fontFamily: Font.semibold, fontSize: 13, color: Colors.ink, marginBottom: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  recentText: { fontFamily: Font.regular, fontSize: 13, color: Colors.body },
});
