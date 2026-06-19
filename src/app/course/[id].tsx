import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCourses } from '../../context/CourseContext';
import { Colors } from '../../constants/theme';
import { ArrowLeft, Star, Bookmark, Calendar, Globe, Mail, Share2, Play } from 'lucide-react-native';

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const { courses, toggleBookmark, enrollInCourse, isBookmarked, isEnrolled } = useCourses();

  const courseId = Number(id);
  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <SafeAreaView style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Course not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bookmarked = isBookmarked(courseId);
  const enrolled = isEnrolled(courseId);

  const handleEnrollOrStart = () => {
    if (!enrolled) {
      enrollInCourse(courseId);
    } else {
      // Start course - Navigate to webview, pass course context in query params
      router.push({
        pathname: '/webview',
        params: {
          courseId: course.id,
          title: course.title,
          instructorName: `${course.instructor.name.first} ${course.instructor.name.last}`,
        },
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this course: ${course.title}\nInstructed by: ${course.instructor.name.first} ${course.instructor.name.last}`,
      });
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  const isDark = scheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Absolute Header Navigation */}
      <SafeAreaView style={styles.customHeader} edges={['top']}>
        <TouchableOpacity
          style={[styles.headerIconCircle, { backgroundColor: colors.backgroundElement }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.headerIconCircle, { backgroundColor: colors.backgroundElement }]}
            onPress={handleShare}
          >
            <Share2 size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerIconCircle, 
              { backgroundColor: colors.backgroundElement },
              bookmarked && { backgroundColor: '#208AEF' }
            ]}
            onPress={() => toggleBookmark(courseId)}
          >
            <Bookmark size={20} color={bookmarked ? '#fff' : colors.text} fill={bookmarked ? '#fff' : 'none'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover Thumbnail */}
        <Image source={{ uri: course.thumbnail }} style={styles.coverImage} contentFit="cover" />

        {/* Content Body */}
        <View style={styles.body}>
          {/* Tag & Rating */}
          <View style={styles.metaRow}>
            <View style={[styles.tag, { backgroundColor: isDark ? '#1e293b' : '#f0f9ff' }]}>
              <Text style={styles.tagText}>{course.category.replace('-', ' ').toUpperCase()}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Star size={16} color="#eab308" fill="#eab308" />
              <Text style={[styles.ratingVal, { color: colors.text }]}>{course.rating.toFixed(1)}</Text>
              <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>(128 ratings)</Text>
            </View>
          </View>

          {/* Title & Brand */}
          <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
          <Text style={[styles.brand, { color: colors.textSecondary }]}>Offered by {course.brand}</Text>

          {/* Quick Info Bar */}
          <View style={[styles.infoBar, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.infoCol}>
              <Calendar size={18} color="#208AEF" />
              <Text style={[styles.infoVal, { color: colors.text }]}>6 Weeks</Text>
              <Text style={[styles.infoLbl, { color: colors.textSecondary }]}>Duration</Text>
            </View>
            <View style={styles.infoCol}>
              <Globe size={18} color="#10b981" />
              <Text style={[styles.infoVal, { color: colors.text }]}>English</Text>
              <Text style={[styles.infoLbl, { color: colors.textSecondary }]}>Language</Text>
            </View>
            <View style={styles.infoCol}>
              <Star size={18} color="#eab308" fill="#eab308" />
              <Text style={[styles.infoVal, { color: colors.text }]}>Online</Text>
              <Text style={[styles.infoLbl, { color: colors.textSecondary }]}>Format</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About Course</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{course.description} Learn how to build production ready applications step by step using robust design principles and clean architectures.</Text>
          </View>

          {/* Instructor Profile Card */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Course Instructor</Text>
            <View style={[styles.instructorCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.instructorHeader}>
                <Image source={{ uri: course.instructor.picture.large }} style={styles.instructorImage} />
                <View>
                  <Text style={[styles.instructorName, { color: colors.text }]}>
                    {course.instructor.name.title} {course.instructor.name.first} {course.instructor.name.last}
                  </Text>
                  <Text style={[styles.instructorSub, { color: colors.textSecondary }]}>
                    Senior LMS Academic Lead
                  </Text>
                </View>
              </View>
              
              <View style={styles.instructorDetails}>
                <View style={styles.detailRow}>
                  <Mail size={16} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>{course.instructor.email}</Text>
                </View>
                {course.instructor.location && (
                  <View style={styles.detailRow}>
                    <Globe size={16} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {course.instructor.location.city}, {course.instructor.location.country}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: isDark ? '#222' : '#f1f5f9' }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Enrollment Price</Text>
          <Text style={[styles.footerPrice, { color: colors.text }]}>${course.price}</Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, enrolled && styles.actionButtonEnrolled]}
          onPress={handleEnrollOrStart}
        >
          {enrolled && <Play size={16} color="#fff" style={{ marginRight: 6 }} />}
          <Text style={styles.actionButtonText}>
            {enrolled ? 'Start Learning' : 'Enroll Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#208AEF',
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  coverImage: {
    width: '100%',
    height: 280,
  },
  body: {
    padding: 24,
    gap: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: 'transparent',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  brand: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -8,
  },
  infoBar: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 16,
    marginTop: 8,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  instructorCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  instructorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instructorImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  instructorSub: {
    fontSize: 12,
  },
  instructorDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: 12,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  actionButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 32,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionButtonEnrolled: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
