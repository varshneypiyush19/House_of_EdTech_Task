import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Star, Bookmark, BookOpen } from 'lucide-react-native';
import { Course } from '../context/CourseContext';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';

interface CourseCardProps {
  course: Course;
  isBookmarked: boolean;
  onToggleBookmark: (id: number) => void;
}

export const CourseCard = React.memo(
  ({ course, isBookmarked, onToggleBookmark }: CourseCardProps) => {
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const [imageError, setImageError] = useState(!course.thumbnail);

    const handlePress = () => {
      // Navigate to course details using router push
      router.push(`/course/${course.id}`);
    };

    const isDark = scheme === 'dark';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Thumbnail Image Container with Absolute-positioned Rating Badge */}
        <View style={[styles.thumbnailContainer, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
          {!imageError ? (
            <Image
              source={{ uri: course.thumbnail }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={300}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <BookOpen size={36} color="#208AEF" />
              <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
                {course.title ? course.title.substring(0, 2).toUpperCase() : 'ED'}
              </Text>
            </View>
          )}
          {/* Floating Rating Badge */}
          <View style={styles.floatingRating}>
            <Star size={12} color="#eab308" fill="#eab308" />
            <Text style={styles.ratingText}>
              {course.rating.toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Category Badge */}
          <View style={[
            styles.categoryBadge, 
            { backgroundColor: isDark ? 'rgba(32, 138, 239, 0.15)' : 'rgba(32, 138, 239, 0.08)' }
          ]}>
            <Text style={styles.categoryText}>
              {course.category.replace('-', ' ')}
            </Text>
          </View>

          {/* Title and Description */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {course.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {course.description}
          </Text>

          {/* Thin layout divider line */}
          <View style={[styles.divider, { backgroundColor: isDark ? '#2e3135' : '#f1f5f9' }]} />

          {/* Instructor & Action Row */}
          <View style={styles.footerRow}>
            <View style={styles.instructorInfo}>
              <Image
                source={{ uri: course.instructor.picture.thumbnail }}
                style={styles.instructorAvatar}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.instructorName, { color: colors.text }]} numberOfLines={1}>
                  {course.instructor.name.first} {course.instructor.name.last}
                </Text>
                <Text style={[styles.instructorRole, { color: colors.textSecondary }]}>
                  Instructor
                </Text>
              </View>
            </View>

            {/* Price & Bookmark Action */}
            <View style={styles.actionSection}>
              <Text style={styles.price}>
                ${course.price}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.bookmarkButton,
                  { backgroundColor: isDark ? '#2e3135' : '#f8fafc' },
                  isBookmarked && styles.bookmarkActive
                ]}
                onPress={() => onToggleBookmark(course.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Bookmark
                  size={16}
                  color={isBookmarked ? '#fff' : colors.textSecondary}
                  fill={isBookmarked ? '#fff' : 'none'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if course fields or bookmark state changes
    return (
      prevProps.isBookmarked === nextProps.isBookmarked &&
      prevProps.course.id === nextProps.course.id &&
      prevProps.course.title === nextProps.course.title &&
      prevProps.course.thumbnail === nextProps.course.thumbnail
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  thumbnailContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(32, 138, 239, 0.05)',
    gap: 6,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  floatingRating: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#208AEF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 0.65,
  },
  instructorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#cbd5e1',
  },
  instructorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  instructorRole: {
    fontSize: 11,
    marginTop: 1,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#208AEF',
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  bookmarkActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
});
