import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

let Notifications: any = null;
if (Constants.appOwnership !== 'expo') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('Failed to load expo-notifications:', e);
  }
}

export interface Instructor {
  id: number;
  name: {
    title: string;
    first: string;
    last: string;
  };
  email: string;
  picture: {
    large: string;
    medium: string;
    thumbnail: string;
  };
  location?: {
    city: string;
    country: string;
  };
}

export interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  rating: number;
  thumbnail: string;
  images: string[];
  brand: string;
  category: string;
  instructor: Instructor;
}

interface CourseContextType {
  courses: Course[];
  bookmarks: number[];
  enrolledCourses: number[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchCourses: (forceRefresh?: boolean) => Promise<void>;
  toggleBookmark: (courseId: number) => Promise<void>;
  enrollInCourse: (courseId: number) => Promise<void>;
  isBookmarked: (courseId: number) => boolean;
  isEnrolled: (courseId: number) => boolean;
}

function rewriteDummyJsonUrl(url: string, category: string, title: string): string {
  if (url && url.includes('dummyjson.com')) {
    if (url.includes('product-images/') || url.includes('data/products/')) {
      const titleEncoded = encodeURIComponent(title);
      const match = url.match(/\/([^\/]+)\.(jpg|png|jpeg|webp)$/i);
      const filename = match ? match[1] : 'thumbnail';
      return `https://cdn.dummyjson.com/products/images/${category}/${titleEncoded}/${filename}.png`;
    }
  }
  return url;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const COURSES_CACHE_KEY = 'courses_cache';
const BOOKMARKS_CACHE_KEY = 'bookmarks_cache';
const ENROLLED_CACHE_KEY = 'enrolled_cache';

// Set up the foreground notification handler if notifications package is loaded
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
}

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize notifications permissions
  const requestNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('lms-alerts', {
          name: 'LMS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#208AEF',
        });
      }
      
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return false;
    }
  }, []);

  // Schedule a 24-hour reminder
  const schedule24hReminder = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      // Cancel previous scheduled reminder
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule a new reminder for 24 hours from now
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 Time to Learn!",
          body: "You haven't opened the LMS App in 24 hours. Jump back in to continue your courses!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 24 * 3600, // 24 hours
        },
      });
      console.log('24h reminder scheduled successfully');
    } catch (err) {
      console.log('Failed to schedule 24h reminder', err);
    }
  }, []);

  // Fetch courses and instructors from FreeAPI
  const fetchCourses = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 1. Fetch instructors
      const instructorsData = await apiRequest<{ data: Instructor[] }>('/public/randomusers?page=1&limit=30', {
        method: 'GET',
        skipAuth: true,
      });
      
      // 2. Fetch products (courses)
      const productsData = await apiRequest<{ data: Course[] }>('/public/randomproducts?page=1&limit=30', {
        method: 'GET',
        skipAuth: true,
      });

      const rawInstructors = instructorsData?.data || [];
      const rawProducts = productsData?.data || [];

      if (rawProducts.length === 0) {
        throw new Error('No courses found');
      }

      // Map courses to random instructors using index seed
      const combined: Course[] = rawProducts.map((product, idx) => {
        const instructor = rawInstructors[idx % rawInstructors.length] || {
          id: 999,
          name: { title: 'Mr', first: 'Admin', last: 'Instructor' },
          email: 'admin@lms.com',
          picture: {
            large: 'https://randomuser.me/api/portraits/men/99.jpg',
            medium: 'https://randomuser.me/api/portraits/med/men/99.jpg',
            thumbnail: 'https://randomuser.me/api/portraits/thumb/men/99.jpg',
          },
        };

        const thumbnail = rewriteDummyJsonUrl(product.thumbnail, product.category, product.title);
        const images = (product.images || []).map((img) => 
          rewriteDummyJsonUrl(img, product.category, product.title)
        );

        return {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          rating: product.rating,
          thumbnail,
          images,
          brand: product.brand,
          category: product.category,
          instructor,
        };
      });

      setCourses(combined);
      
      // Cache in AsyncStorage
      await AsyncStorage.setItem(COURSES_CACHE_KEY, JSON.stringify(combined));
    } catch (err: any) {
      console.warn('API error while fetching courses, loading from cache:', err.message);
      setError(err.message || 'Failed to fetch new course data.');
      
      // Load from cache if offline or failed
      const cached = await AsyncStorage.getItem(COURSES_CACHE_KEY);
      if (cached) {
        setCourses(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load cached user state (bookmarks, enrollments) on start
  useEffect(() => {
    async function loadState() {
      try {
        const savedBookmarks = await AsyncStorage.getItem(BOOKMARKS_CACHE_KEY);
        if (savedBookmarks) {
          setBookmarks(JSON.parse(savedBookmarks));
        }

        const savedEnrolled = await AsyncStorage.getItem(ENROLLED_CACHE_KEY);
        if (savedEnrolled) {
          setEnrolledCourses(JSON.parse(savedEnrolled));
        }
      } catch (err) {
        console.error('Failed to load user state from cache', err);
      } finally {
        // Fetch remote courses
        await fetchCourses();
        
        if (Notifications) {
          // Request notifications permission & schedule inactivity trigger
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await schedule24hReminder();
          }
        }
      }
    }
    loadState();
  }, [fetchCourses, requestNotificationPermission, schedule24hReminder]);

  const toggleBookmark = async (courseId: number) => {
    try {
      let updated: number[];
      const isAlreadyBookmarked = bookmarks.includes(courseId);

      if (isAlreadyBookmarked) {
        updated = bookmarks.filter((id) => id !== courseId);
      } else {
        updated = [...bookmarks, courseId];
        
        // Trigger notification when user bookmarks 5+ courses
        if (updated.length >= 5 && Notifications) {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "🔥 Keep it Up!",
                body: `You have bookmarked ${updated.length} courses. Time to start learning and achieve your goals!`,
                sound: true,
              },
              trigger: null, // immediate
            });
          }
        }
      }

      setBookmarks(updated);
      await AsyncStorage.setItem(BOOKMARKS_CACHE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update bookmark state', err);
    }
  };

  const enrollInCourse = async (courseId: number) => {
    if (enrolledCourses.includes(courseId)) return;
    try {
      const updated = [...enrolledCourses, courseId];
      setEnrolledCourses(updated);
      await AsyncStorage.setItem(ENROLLED_CACHE_KEY, JSON.stringify(updated));

      // Immediate notification on enrollment
      if (Notifications) {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const course = courses.find((c) => c.id === courseId);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🎉 Enrolled Successfully!",
              body: `You are now enrolled in "${course?.title || 'your new course'}". Open details to start learning!`,
              sound: true,
            },
            trigger: null, // immediate
          });
        }
      }
    } catch (err) {
      console.error('Failed to update enroll state', err);
    }
  };

  const isBookmarked = (courseId: number) => bookmarks.includes(courseId);
  const isEnrolled = (courseId: number) => enrolledCourses.includes(courseId);

  return (
    <CourseContext.Provider
      value={{
        courses,
        bookmarks,
        enrolledCourses,
        isLoading,
        isRefreshing,
        error,
        fetchCourses,
        toggleBookmark,
        enrollInCourse,
        isBookmarked,
        isEnrolled,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
}
