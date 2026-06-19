import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showConnected, setShowConnected] = useState(false);
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // NetInfo returns false if there's no internet connection
      const offline = state.isConnected === false;
      
      if (offline !== isOffline) {
        setIsOffline(offline);
        
        if (!offline) {
          // Changed from offline to online
          setShowConnected(true);
          setTimeout(() => {
            setShowConnected(false);
          }, 3000); // Hide connected banner after 3 seconds
        }
      }
    });

    return () => unsubscribe();
  }, [isOffline]);

  // Animate banner slide in/out
  useEffect(() => {
    const visible = isOffline || showConnected;
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -100 - insets.top,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [isOffline, showConnected, insets.top]);

  const bannerColor = isOffline ? '#ef4444' : '#10b981';
  const BannerIcon = isOffline ? WifiOff : Wifi;
  const bannerText = isOffline 
    ? 'Offline Mode - Viewing Cached Data' 
    : 'Internet Reconnected!';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: bannerColor,
          paddingTop: Math.max(insets.top, 10),
        },
      ]}
    >
      <View style={styles.content}>
        <BannerIcon size={16} color="#fff" />
        <Text style={styles.text}>{bannerText}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
