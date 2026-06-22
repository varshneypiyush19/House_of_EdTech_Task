import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  if (Constants.appOwnership === 'expo') {
    console.log('NOTE: Notifications are disabled in Expo Go (removed in SDK 53+). Create a Development Build to test notification features.');
  } else {
    try {
      Notifications = require('expo-notifications');
    } catch (e) {
      console.warn('Failed to load expo-notifications:', e);
    }
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
  if (!url) return '';
  
  // 1. Force HTTPS to bypass Android cleartext traffic restrictions
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  // 2. Only rewrite old/broken legacy URLs (like i.dummyjson.com or data/products)
  if (url.includes('i.dummyjson.com') || url.includes('product-images/') || url.includes('data/products/')) {
    try {
      const titleEncoded = encodeURIComponent(title);
      const match = url.match(/\/([^\/]+)\.(jpg|png|jpeg|webp)$/i);
      const filename = match ? match[1] : 'thumbnail';
      const extension = match ? match[2] : 'png';
      return `https://cdn.dummyjson.com/products/images/${category}/${titleEncoded}/${filename}.${extension}`;
    } catch (e) {
      return url;
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
      // 24h reminder scheduled successfully
    } catch (err) {
      // Failed to schedule 24h reminder
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
          const parsed = JSON.parse(savedBookmarks);
          if (Array.isArray(parsed)) {
            setBookmarks(parsed.map((id) => Number(id)).filter((id) => !isNaN(id)));
          }
        }

        const savedEnrolled = await AsyncStorage.getItem(ENROLLED_CACHE_KEY);
        if (savedEnrolled) {
          const parsed = JSON.parse(savedEnrolled);
          if (Array.isArray(parsed)) {
            setEnrolledCourses(parsed.map((id) => Number(id)).filter((id) => !isNaN(id)));
          }
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
      const numericId = Number(courseId);
      const isAlreadyBookmarked = bookmarks.some((id) => Number(id) === numericId);

      if (isAlreadyBookmarked) {
        updated = bookmarks.filter((id) => Number(id) !== numericId);
      } else {
        updated = [...bookmarks, numericId];
        
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

  const isBookmarked = (courseId: number) => bookmarks.some((id) => Number(id) === Number(courseId));
  const isEnrolled = (courseId: number) => enrolledCourses.some((id) => Number(id) === Number(courseId));

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
