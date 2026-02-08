import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { PaperProvider, useTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { user, isLoadingUser } = useAuth();
  const segments = useSegments();


  useEffect(() => {
    // delay was set to get over the error, error: Attempted to navigate before mounting the Root Layout component
     const timerId = setTimeout(() => {
      const inAuthGroup = segments[0] === "auth";
      if (!user && !inAuthGroup && !isLoadingUser) {
        router.replace("/auth");
      } else if (user && inAuthGroup && !isLoadingUser) {
        router.replace("/");
      }
    }, 500); // 500 milliseconds = 2 second delay

    // Cleanup function to clear the timeout
    return () => {
      clearTimeout(timerId);
    };
  }, [user, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const theme = useTheme();
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <RouteGuard>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </RouteGuard>
        </SafeAreaProvider>
      </PaperProvider>
    </AuthProvider>
  );
}
