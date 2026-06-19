import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, BookOpen, Bookmark, Camera, ChevronRight, User as UserIcon, Settings, Bell, Shield } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const { enrolledCourses, bookmarks } = useCourses();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setUploading(true);
      try {
        await updateAvatar(selectedUri);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } catch (err: any) {
        Alert.alert('Upload Failed', err.message || 'Could not upload profile picture.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const isDark = scheme === 'dark';

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Avatar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.avatarWrapper}>
            {user.avatar?.url ? (
              <Image source={{ uri: user.avatar.url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundElement }]}>
                <UserIcon size={50} color={colors.textSecondary} />
              </View>
            )}
            {uploading ? (
              <View style={styles.uploadLoader}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <View style={styles.cameraIconContainer}>
                <Camera size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.username, { color: colors.text }]}>{user.username}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: '#e0f2fe' }]}>
            <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#e0f2fe' }]}>
              <BookOpen size={24} color="#0284c7" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{enrolledCourses.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Enrolled Courses</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <Bookmark size={24} color="#d97706" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{bookmarks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bookmarked</Text>
          </View>
        </View>

        {/* Settings Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          
          <View style={[styles.menuList, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Settings size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Account Settings</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Bell size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Notification Settings</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Shield size={20} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy & Security</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#208AEF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: 8,
  },
  menuList: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
    marginTop: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
