import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useCourses } from '../context/CourseContext';
import { Colors } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, BookOpen, Bookmark, Camera, ChevronRight, User as UserIcon, Settings, Bell, Shield, Award, AwardIcon, Compass } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const { courses, enrolledCourses, bookmarks } = useCourses();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  
  const [uploading, setUploading] = useState(false);

  // Map enrolled course IDs to actual course objects
  const activeCourses = useMemo(() => {
    return courses.filter((c) => enrolledCourses.includes(c.id));
  }, [courses, enrolledCourses]);

  // Generate mock static progress percentages using course ID seeds so it is stable per course
  const courseProgressList = useMemo(() => {
    return activeCourses.map((course) => {
      const progress = ((course.id * 17) % 65) + 30; // generates stable progress between 30% and 95%
      return {
        ...course,
        progress,
      };
    });
  }, [activeCourses]);

  // Calculate overall learning progress average
  const overallProgress = useMemo(() => {
    if (courseProgressList.length === 0) return 0;
    const sum = courseProgressList.reduce((acc, curr) => acc + curr.progress, 0);
    return Math.round(sum / courseProgressList.length);
  }, [courseProgressList]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
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

  const avatarUrl = useMemo(() => {
    const url = user?.avatar?.url;
    const username = user?.username || 'Learner';
    if (!url || url.includes('placeholder.com') || url.includes('via.placeholder.com')) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=208AEF&color=fff&size=150&bold=true`;
    }
    if (url.startsWith('/')) {
      return `https://api.freeapi.app${url}`;
    }
    if (url.startsWith('public/')) {
      return `https://api.freeapi.app/${url}`;
    }
    return url;
  }, [user?.avatar?.url, user?.username]);

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Decorative Header Banner */}
      <View style={styles.topBanner}>
        <View style={styles.bannerGlow} />
        <Text style={styles.bannerQuote}>Keep reaching for your learning goals!</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Details Overlay Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement, borderColor: isDark ? '#2e3135' : '#f1f5f9' }]}>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
              {uploading ? (
                <View style={styles.uploadLoader}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : (
                <View style={styles.cameraIconContainer}>
                  <Camera size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
                {user.email}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: isDark ? '#1e293b' : '#e0f2fe' }]}>
                <Text style={[styles.roleText, { color: isDark ? '#0284c7' : '#0369a1' }]}>{user.role.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsDivider, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} />
          
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.text }]}>{enrolledCourses.length}</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Enrolled</Text>
            </View>
            <View style={[styles.statSeparator, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: colors.text }]}>{bookmarks.length}</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Bookmarks</Text>
            </View>
            <View style={[styles.statSeparator, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} />
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: '#208AEF' }]}>{overallProgress}%</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Progress</Text>
            </View>
          </View>
        </View>

        {/* Learning Progress List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={18} color="#208AEF" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Learning Progress</Text>
          </View>

          {courseProgressList.length === 0 ? (
            <View style={[styles.emptyProgress, { backgroundColor: colors.backgroundElement, borderColor: isDark ? '#2d3748' : '#f1f5f9' }]}>
              <Compass size={36} color={colors.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyProgressTitle, { color: colors.text }]}>No enrolled courses</Text>
              <Text style={[styles.emptyProgressSub, { color: colors.textSecondary }]}>
                Enrolled courses will show progress tracking and course content access here.
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.browseButtonText}>Browse Catalog</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              {courseProgressList.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.progressCard, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => router.push(`/course/${course.id}`)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: course.thumbnail }} style={styles.courseMiniThumb} />
                  <View style={styles.progressDetail}>
                    <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <Text style={[styles.courseInstructor, { color: colors.textSecondary }]}>
                      {course.instructor.name.first} {course.instructor.name.last}
                    </Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressBarWrapper}>
                      <View style={[styles.progressBarBG, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
                        <View style={[styles.progressBarFill, { width: `${course.progress}%`, backgroundColor: '#208AEF' }]} />
                      </View>
                      <Text style={[styles.progressPercentText, { color: colors.text }]}>
                        {course.progress}%
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} style={styles.progressCardChevron} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Preferences Menu */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Preferences</Text>
          <View style={[styles.menuList, { backgroundColor: colors.backgroundElement }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#2d3748' : '#f1f5f9' }]}>
              <View style={styles.menuItemLeft}>
                <Settings size={18} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Account Settings</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDark ? '#2d3748' : '#f1f5f9' }]}>
              <View style={styles.menuItemLeft}>
                <Bell size={18} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Notification Settings</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Shield size={18} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy & Security</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBanner: {
    height: 180,
    backgroundColor: '#208AEF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  bannerGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -50,
    right: -40,
  },
  bannerQuote: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
    gap: 24,
  },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#208AEF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 13,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statsDivider: {
    height: 1,
    marginVertical: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  statSeparator: {
    width: 1,
    height: 24,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingLeft: 8,
  },
  emptyProgress: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyProgressTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyProgressSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  browseButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 12,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  courseMiniThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  progressDetail: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 2,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  courseInstructor: {
    fontSize: 11,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBarBG: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  progressCardChevron: {
    marginRight: 4,
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
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
