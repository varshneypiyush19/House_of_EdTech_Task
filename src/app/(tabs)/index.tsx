import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LegendList } from '@legendapp/list/react-native';
import { Image } from 'expo-image';
import { Search, BookOpen, AlertCircle, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCourses, Course } from '../../context/CourseContext';
import { CourseCard } from '../../components/CourseCard';
import { Colors } from '../../constants/theme';
import { useColorScheme } from 'react-native';
  
export default function HomeScreen() {
  const { user } = useAuth();
  const { courses, bookmarks, toggleBookmark, isLoading, isRefreshing, error, fetchCourses } = useCourses();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [searchQuery, setSearchQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  // Filtering courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  const handleRefresh = useCallback(() => {
    fetchCourses(true);
  }, [fetchCourses]);

  const renderItem = useCallback(
    ({ item }: { item: Course }) => {
      const isBookmarked = bookmarks.includes(item.id);
      return (
        <CourseCard
          course={item}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggleBookmark}
        />
      );
    },
    [bookmarks, toggleBookmark]
  );

  const keyExtractor = useCallback((item: Course) => item.id.toString(), []);

  const isDark = scheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        {/* Welcome Header Section with User Avatar */}
        <View style={styles.headerRow}>
          <View style={styles.welcomeInfo}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {user?.username || 'Learner'} 👋
            </Text>
          </View>
          {!avatarError ? (
            <Image
              source={{ uri: user?.avatar?.url || 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.userAvatar}
              contentFit="cover"
              transition={200}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View style={[styles.userAvatarPlaceholder, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <UserIcon size={20} color="#208AEF" />
            </View>
          )}
        </View>

        {/* Search Bar with drop-shadow and modern layout */}
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: colors.backgroundElement,
            borderColor: isDark ? '#2e3135' : '#f1f5f9' 
          }
        ]}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search courses..."
            placeholderTextColor={isDark ? '#666' : '#a0aec0'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        {/* Error Alert */}
        {error && !isLoading && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#c53030" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* List Content */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
              Loading courses...
            </Text>
          </View>
        ) : (
          <LegendList
            data={filteredCourses}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            recycleItems={true}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={300}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#208AEF']}
                tintColor="#208AEF"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BookOpen size={48} color={colors.textSecondary} style={styles.emptyIcon} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Courses Found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery ? 'Try searching with different keywords.' : 'Pull down to refresh course catalog.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#cbd5e1',
    borderWidth: 1.5,
    borderColor: '#208AEF',
  },
  userAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fed7d7',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  errorText: {
    color: '#c53030',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
