import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Heart, Home, LayoutGrid, ShoppingBag, User, type LucideIcon } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Font, Radius, Shadow } from '@/constants/theme';

/**
 * The floating white tab bar from the app design. Built on Expo Router's
 * headless tabs so it looks the same on Android and iPhone, rather than the
 * platform's own bar.
 */

const TABS: { name: string; href: '/' | '/categories' | '/wishlist' | '/orders' | '/profile'; label: string; icon: LucideIcon }[] = [
  { name: 'index', href: '/', label: 'Home', icon: Home },
  { name: 'categories', href: '/categories', label: 'Categories', icon: LayoutGrid },
  { name: 'wishlist', href: '/wishlist', label: 'Wishlist', icon: Heart },
  { name: 'orders', href: '/orders', label: 'Orders', icon: ShoppingBag },
  { name: 'profile', href: '/profile', label: 'Profile', icon: User },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <FloatingBar>
          {TABS.map(tab => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </FloatingBar>
      </TabList>
    </Tabs>
  );
}

function FloatingBar({ children, style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  // TabList's own default style (a row) goes first so ours wins — applied
  // last, it made the white bar shrink to its content and squeezed the labels.
  return (
    <View {...props} style={[style, styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>{children}</View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: LucideIcon; label: string };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton({ icon: Icon, label, isFocused, ...props }, ref) {
  const colour = isFocused ? Colors.blue : Colors.faint;
  return (
    <Pressable
      ref={ref}
      {...props}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
    >
      <Icon size={20} color={colour} strokeWidth={isFocused ? 2.2 : 1.9} fill={isFocused && label === 'Home' ? colour : 'none'} />
      <Text style={[styles.label, { color: colour }, isFocused && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    paddingHorizontal: 12,
    paddingTop: 8,
    // Taps outside the white bar reach the screen underneath.
    pointerEvents: 'box-none',
  },
  bar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.tabBar,
    paddingVertical: 10,
    paddingHorizontal: 4,
    ...Shadow.tabBar,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontFamily: Font.regular, fontSize: 9.5 },
  labelActive: { fontFamily: Font.semibold },
});
