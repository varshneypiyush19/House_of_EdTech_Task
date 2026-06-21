import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CourseProvider } from '@/context/CourseContext';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import LoginScreen from '@/app/login';
import RegisterScreen from '@/app/register';
import OfflineBanner from '@/components/OfflineBanner';

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  const themeValue = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={themeValue}>
      <OfflineBanner />
      <AnimatedSplashOverlay />
      
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="webview" />
      </Stack>

      {!isAuthenticated && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: themeValue.colors.background, zIndex: 999 }]}>
          {authScreen === 'login' ? (
            <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />
          ) : (
            <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />
          )}
        </View>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CourseProvider>
        <RootLayoutContent />
      </CourseProvider>
    </AuthProvider>
  );
}
