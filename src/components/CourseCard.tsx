import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Star, Bookmark } from 'lucide-react-native';
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

    const handlePress = () => {
      // Navigate to course details using router push
      router.push(`/course/${course.id}`);
    };

    const isDark = scheme === 'dark';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundElement }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Thumbnail Image */}
        <Image
          source={{ uri: course.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.content}>
          {/* Category Badge & Rating */}
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                {course.category.replace('-', ' ')}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Star size={14} color="#eab308" fill="#eab308" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {course.rating.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Title and Description */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {course.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {course.description}
          </Text>

          {/* Instructor & Action Row */}
          <View style={styles.footerRow}>
            <View style={styles.instructorInfo}>
              <Image
                source={{ uri: course.instructor.picture.thumbnail }}
                style={styles.instructorAvatar}
                contentFit="cover"
              />
              <View>
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
              <Text style={[styles.price, { color: '#208AEF' }]}>
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
                  size={18}
                  color={isBookmarked ? '#fff' : '#64748b'}
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
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  thumbnail: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginTop: 4,
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  instructorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  instructorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  instructorRole: {
    fontSize: 11,
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  bookmarkActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
});
