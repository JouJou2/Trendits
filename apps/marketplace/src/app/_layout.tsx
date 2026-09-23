import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts,
} from '@expo-google-fonts/poppins';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { CartProvider } from '@/lib/cart';

// Keep the splash up until Poppins is ready, so text never flashes in the
// system font first.
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', primary: Colors.blue, text: Colors.ink },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  useEffect(() => {
    // A font failure must not keep the app stuck on the splash screen.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        <CartProvider>
          {/* The tab bar lives in (tabs); product, search and cart are pushed
              on top of it, each with its own back button. */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </CartProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
