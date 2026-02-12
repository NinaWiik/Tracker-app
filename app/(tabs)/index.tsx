import { client, DATABASE_ID, HABITS_DATABASE_ID, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit } from "@/types/database.type";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import { Button, Surface, Text } from "react-native-paper";

export default function Index() {
  const { signOut, user } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);

  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  
  // Ref to store the unsubscribe function for the real-time subscription
  // This allows us to clean up the subscription when needed
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Fetches habits from the database for the current user
   * This function queries Appwrite to get all habits where user_id matches the current user
   */
  const fetchHabits = useCallback(async () => {
    if (!user) return;

    try {
      // Query the habits table filtered by the current user's ID
      const habits = await tablesDB.listRows<Habit>({
        databaseId: DATABASE_ID,
        tableId: HABITS_DATABASE_ID,
        queries: [Query.equal("user_id", user.$id)],
      });
      // Update the habits state with the fetched data
      setHabits(habits.rows);
      console.log('Habits:', habits.rows);
    } catch (error) {
      console.error(error);
    }
  }, [user]);

  /**
   * Sets up a real-time subscription to listen for changes to habits
   * When a habit is created, updated, or deleted, the UI will update automatically
   */
  const setupSubscription = useCallback(() => {
    if (!user) return;

    // Construct the channel name for Appwrite real-time subscription
    // Format: databases.{databaseId}.tables.{tableId}.rows
    const channel = `databases.${DATABASE_ID}.tables.${HABITS_DATABASE_ID}.rows`;
    
    // Clean up any existing subscription before creating a new one
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to real-time events on the habits table
    unsubscribeRef.current = client.subscribe(channel, (response: any) => {
      const events = response.events || [];
      
      events.forEach((event: any) => {
        const payload = event.payload;
        if (!payload || payload.user_id !== user.$id) return;
        const eventType = event.events?.[0] || '';
        
        if (eventType.includes('create')) {
          // When a new habit is created, add it to the list (avoid duplicates)
          setHabits((prev) => 
            prev.some((h) => h.$id === payload.$id) 
              ? prev 
              : [...prev, payload as Habit]
          );
        } else if (eventType.includes('update')) {
          // When a habit is updated, replace it in the list
          setHabits((prev) =>
            prev.map((habit) => (habit.$id === payload.$id ? payload as Habit : habit))
          );
        } else if (eventType.includes('delete')) {
          // When a habit is deleted, remove it from the list
          setHabits((prev) => prev.filter((habit) => habit.$id !== payload.$id));
        }
      });
    });
  }, [user]);

  /**
   * Main effect: Initialize data fetching and subscription when user is available
   * - Fetches habits from the database
   * - Sets up real-time subscription for live updates
   * - Cleans up subscription when component unmounts or user changes
   */
  useEffect(() => {
    if (user) {
      fetchHabits();
      setupSubscription();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, fetchHabits, setupSubscription]);

  /**
   * Refetch habits when the screen comes into focus
   * This ensures the latest data is shown when navigating back to this screen
   * (e.g., after adding a new habit on another screen)
   */
  useFocusEffect(
    useCallback(() => {
      if (user) fetchHabits();
    }, [user, fetchHabits])
  );

  /**
   * Debug effect: Log habits whenever the state changes
   * Useful for tracking state updates during development
   */
  useEffect(() => {
    console.log('Habits state updated:', habits);
  }, [habits]);

  const handleDeleteHabit = async (id: string) => {
    try {
      // Optimistically remove the habit from the UI immediately
      setHabits((prev) => prev.filter((habit) => habit.$id !== id));
      
      // Delete the row from the database
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: HABITS_DATABASE_ID,
        rowId: id,
      });
    } catch (error) {
      console.error(error);
      // If deletion fails, refetch to restore the correct state
      fetchHabits();
    }
  }

  const renderRightActions = () => (
    <View style={styles.swipeRightActions}>
      <MaterialCommunityIcons name="check-circle-outline" size={32} color="#fff" />
    </View>
  );
  
  const renderLeftActions = () => 
    (
      <View style={styles.swipeLeftActions}>
        <MaterialCommunityIcons name="trash-can-outline" size={32} color="#fff" />
      </View>
    );

  return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Today&apos;s Habits</Text>
          <Button mode="text" onPress={signOut} icon="logout">Sign Out</Button>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>  
        {habits.length === 0 ? (
          <Surface style={styles.card} elevation={0}>
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={styles.emptyText}>No habits found</Text>
            </View>
          </Surface>
        ) : (
          habits.map((habit, key) => (
            <Swipeable 
              ref={(ref) => {
                swipeableRefs.current[habit.$id] = ref
                }} 
                key={key}
                overshootLeft={false}
                overshootRight={false}
                renderRightActions={renderRightActions}
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={(direction) => {
                  if (direction === 'left') {
                    handleDeleteHabit(habit.$id);
                  }
                  swipeableRefs.current[habit.$id]?.close();
                }}
                >
              <Surface style={styles.card} elevation={0}>
                <View style={styles.cardContent}>
                  <Text variant="bodyMedium" style={styles.cardTitle}>{habit.title}</Text>
                  
                  <Text variant="bodyMedium" style={styles.cardDescription}>{habit.description}</Text>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.streakBadge}>
                      <MaterialCommunityIcons name="fire" size={18} color="#ff9800" />
                      <Text variant="bodyMedium" style={styles.streakText}>{habit.streak_count} days streak</Text>
                    </View>
                    
                    <View style={styles.frequencyBadge}>
                      <Text variant="bodyMedium" style={styles.frequencyText}>
                        {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Surface>
            </Swipeable>
            ))
          )}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "bold",
  },
  card: {
    marginBottom: 18,
    backgroundColor: "#f7f2fa",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#22223b",
  },
  cardDescription: {
    fontSize: 15,
    color: "#6c6c80",
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    marginLeft: 6,
    color: "#ff9800",
    fontWeight: "bold",
    fontSize: 14,
  },
  frequencyBadge: {
    backgroundColor: "#ede7f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    color: "#7c4dff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666666",
  },
  swipeRightActions: {
    backgroundColor: "#4c8f50",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingRight: 16,
    justifyContent: "center",
    alignItems: "flex-end",
    flex: 1,
  },
  swipeLeftActions: {
    backgroundColor: "#e53935",
    borderRadius: 18,
    marginBottom: 18,
    marginTop: 2,
    paddingLeft: 16,
    justifyContent: "center",
    alignItems: "flex-start",
    flex: 1,
  },
});