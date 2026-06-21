import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LegendList } from '@legendapp/list/react-native';
import { Search, Bookmark } from 'lucide-react-native';
import { useCourses, Course } from '../../context/CourseContext';
import { CourseCard } from '../../components/CourseCard';
import { Colors, BottomTabInset } from '../../constants/theme';
import { useColorScheme } from 'react-native';

export default function BookmarksScreen() {
  const { courses, bookmarks, toggleBookmark } = useCourses();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [searchQuery, setSearchQuery] = useState('');

  // Filter courses that are bookmarked
  const bookmarkedCourses = useMemo(() => {
    return courses.filter((c) => bookmarks.includes(c.id));
  }, [courses, bookmarks]);

  // Apply search query to bookmarked courses
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarkedCourses;
    const q = searchQuery.toLowerCase().trim();
    return bookmarkedCourses.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [bookmarkedCourses, searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: Course }) => {
      return (
        <CourseCard
          course={item}
          isBookmarked={true}
          onToggleBookmark={toggleBookmark}
        />
      );
    },
    [toggleBookmark]
  );

  const keyExtractor = useCallback((item: Course) => item.id.toString(), []);

  const isDark = scheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.content, { paddingBottom: BottomTabInset }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            My Bookmarks
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Courses you have saved for later
          </Text>
        </View>

        {/* Search Input */}
        {bookmarkedCourses.length > 0 && (
          <View style={[styles.searchContainer, { backgroundColor: colors.backgroundElement }]}>
            <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search bookmarked courses..."
              placeholderTextColor={isDark ? '#666' : '#a0aec0'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>
        )}

        {/* LegendList List */}
        <LegendList
          data={filteredBookmarks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          recycleItems={true}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={300}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bookmark size={48} color={colors.textSecondary} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {bookmarkedCourses.length === 0 ? 'No Bookmarks Yet' : 'No Match Found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {bookmarkedCourses.length === 0
                  ? 'Tap the bookmark icon on any course to save it to this list.'
                  : 'Try searching with different keywords.'}
              </Text>
            </View>
          }
        />
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
    gap: 16,
  },
  header: {
    marginTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 96,
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
