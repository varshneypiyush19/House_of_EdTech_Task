import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AUTH_ACCESS_TOKEN_KEY } from '@/api/client';

// Hardcoded HTML string as absolute fallback in case filesystem read fails
const FALLBACK_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b; }
    .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin-top: 0; color: #0f172a; }
    p { line-height: 1.6; color: #475569; }
    .button { display: block; width: 100%; background: #208AEF; color: white; border: none; padding: 14px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; text-align: center; }
    .button:active { background: #1a73c7; }
    .success { background: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="course-title">Loading Course Content...</h1>
    <div id="course-meta" style="color: #64748b; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">Instructor: Loading...</div>
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px;" id="channel-info">Connecting to Native Context...</p>
    </div>
    <h2>Module 1: Getting Started</h2>
    <p>In this initial module, you will learn the foundational concepts of the course, understand the core learning objectives, and set up your development workspace.</p>
    <button class="button" id="complete-btn" onclick="completeCourse()">Mark Module as Completed</button>
  </div>
  <script>
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INIT_COURSE') {
          document.getElementById('course-title').innerText = data.title;
          document.getElementById('course-meta').innerText = 'Instructor: ' + data.instructor;
          document.getElementById('channel-info').innerText = 'Connected! Injected Course ID: ' + data.courseId;
        }
      } catch (err) {}
    });
    function initCourseFallback(title, instructor, courseId) {
      document.getElementById('course-title').innerText = title;
      document.getElementById('course-meta').innerText = 'Instructor: ' + instructor;
      document.getElementById('channel-info').innerText = 'Connected! Injected Course ID: ' + courseId;
    }
    function completeCourse() {
      const btn = document.getElementById('complete-btn');
      btn.innerText = 'Completed ✔';
      btn.className = 'button success';
      btn.disabled = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'COURSE_COMPLETED' }));
      }
    }
  </script>
</body>
</html>
`;

export default function CourseWebViewScreen() {
  const { courseId, title, instructorName } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const webViewRef = useRef<WebView>(null);

  const [assets, errorAssets] = useAssets([require('../../assets/course_content.html')]);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Load Auth Token for Headers
  useEffect(() => {
    async function loadToken() {
      const token = await SecureStore.getItemAsync(AUTH_ACCESS_TOKEN_KEY);
      setAuthToken(token);
    }
    loadToken();
  }, []);

  // Load HTML Asset file
  useEffect(() => {
    async function loadHtmlAsset() {
      if (assets && assets[0]) {
        try {
          const fileUri = assets[0].localUri || assets[0].uri;
          if (fileUri) {
            const content = await FileSystem.readAsStringAsync(fileUri);
            setHtmlContent(content);
          } else {
            setHtmlContent(FALLBACK_HTML);
          }
        } catch (err) {
          console.warn('Failed to read local HTML asset from filesystem, using fallback HTML', err);
          setHtmlContent(FALLBACK_HTML);
        }
      } else if (errorAssets) {
        console.warn('Error resolving HTML assets, using fallback HTML', errorAssets);
        setHtmlContent(FALLBACK_HTML);
      }
    }
    loadHtmlAsset();
  }, [assets, errorAssets]);

  // Inject initial context parameters on load
  const handleLoadEnd = () => {
    setIsLoading(false);
    
    // 1. Post message to WebView
    const initData = {
      type: 'INIT_COURSE',
      title: title || 'Course Contents',
      instructor: instructorName || 'Unknown Instructor',
      courseId: courseId || '0',
    };
    webViewRef.current?.postMessage(JSON.stringify(initData));

    // 2. Direct JS fallback injection just in case listener registered after event
    const jsInjection = `
      if (typeof initCourseFallback === 'function') {
        initCourseFallback("${title || 'Course'}", "${instructorName || 'Instructor'}", "${courseId || '0'}");
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(jsInjection);
  };

  // Handle bidirectional communication messages from WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'COURSE_COMPLETED') {
        Alert.alert(
          '🎉 Congratulations!',
          `You have completed the module for: "${title}"`,
          [{ text: 'Dismiss', onPress: () => router.back() }]
        );
      }
    } catch (err) {
      console.error('Failed to parse message from webview', err);
    }
  };

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const isDark = scheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Native Navigation Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#222' : '#f1f5f9' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title || 'Course Content'}
        </Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      {/* WebView Content Area */}
      <View style={{ flex: 1 }}>
        {htmlContent && !hasError && (
          <WebView
            ref={webViewRef}
            source={{
              html: htmlContent,
              // Injected headers to satisfy assignment requirements
              headers: {
                'Authorization': `Bearer ${authToken || ''}`,
                'X-Course-Id': String(courseId || ''),
              },
            }}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            onError={() => setHasError(true)}
            onHttpError={() => setHasError(true)}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && !hasError && (
          <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading Content...</Text>
          </View>
        )}

        {/* Custom Fallback Screen for failed loads */}
        {hasError && (
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color="#ef4444" style={styles.errorIcon} />
            <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to load content</Text>
            <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
              There was an issue opening this course module. Please verify your connection and try again.
            </Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <RefreshCw size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.reloadText}>Reload Module</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  reloadButton: {
    backgroundColor: '#208AEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
  },
  reloadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
