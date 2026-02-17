import { client, COMPLETED_HABITS_DATABASE_ID, DATABASE_ID, HABITS_DATABASE_ID, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit, HabitCompletion } from "@/types/database.type";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Card, Text } from "react-native-paper";

export default function StreaksScreen() {
    const { user } = useAuth();

    const unsubscribeRef = useRef<(() => void) | null>(null);

    const [habits, setHabits] = useState<Habit[]>([]);
    const [completedHabits, setCompletedHabits] = useState<HabitCompletion[]>([]);


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
        } catch (error) {
          console.error(error);
        }
      }, [user]);
    
      const fetchCompletions = useCallback(async () => {
        if (!user) return;
        
        try {
          const completionsResult = await tablesDB.listRows<HabitCompletion>({
            databaseId: DATABASE_ID,
            tableId: COMPLETED_HABITS_DATABASE_ID,
            queries: [Query.equal("user_id", user.$id)],
          });
          const completions = completionsResult.rows as HabitCompletion[]
          setCompletedHabits(completions);
        } catch (error) {
          console.error(error);
        }
      }, [user]);

    const setupSubscription = useCallback(() => {
        if (!user) return;
    
        // Construct the channel name for Appwrite real-time subscription
        // Format: databases.{databaseId}.tables.{tableId}.rows
        const habitsChannel = `databases.${DATABASE_ID}.tables.${HABITS_DATABASE_ID}.rows`;
        
        // Clean up any existing subscription before creating a new one
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
    
        // Subscribe to real-time events on the habits table
        const habitsUnsubscribe = client.subscribe(habitsChannel, (response: any) => {
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
    
        const completionsChannel = `databases.${DATABASE_ID}.tables.${COMPLETED_HABITS_DATABASE_ID}.rows`;
        const completionsUnsubscribe = client.subscribe(completionsChannel, (response: any) => {
          const events = response.events || [];
          events.forEach((event: any) => {
            const payload = event.payload;
            if (!payload || payload.user_id !== user.$id) return;
            const eventType = event.events?.[0] || '';
            
            if (eventType.includes('create')) {
              // When a completion is created, add it to the list (avoid duplicates)
              setCompletedHabits((prev) => 
                prev.some((c) => c.$id === payload.$id)
                  ? prev 
                  : [...prev, payload as HabitCompletion]
              );
            }
            // Refetch to ensure we have the latest completions
            fetchCompletions();
          });
        });
        
        // Store cleanup function for both subscriptions
        unsubscribeRef.current = () => {
          habitsUnsubscribe();
          completionsUnsubscribe();
        };
      }, [user, fetchCompletions]);

      useEffect(() => {
        if (user) {
          fetchHabits();
          fetchCompletions();
          setupSubscription();
        }
    
        return () => {
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
        };
      }, [user, fetchHabits, setupSubscription, fetchCompletions]);
    
      /**
       * Refetch habits and completions when the screen comes into focus
       * This ensures the latest data is shown when navigating back to this screen
       * (e.g., after adding a new habit or completing a habit on another screen)
       */
      useFocusEffect(
        useCallback(() => {
          if (user) {
            fetchHabits();
            fetchCompletions();
          }
        }, [user, fetchHabits, fetchCompletions])
      );

      const getStreakData = (habitId: string) => {
        const habitCompletions = completedHabits.filter((completion) => completion.habit_id === habitId).sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
        if (habitCompletions.length === 0) {
            return { streak: 0, bestStreak: 0, total: 0 };
        }
        // build streak data
        let streak = 0;
        let bestStreak = 0;
        let total = habitCompletions.length;
        
        let lastDate : Date | null = null;
        let currentStreak = 0;

        habitCompletions.forEach((completion) => {
            const date = new Date(completion.completed_at);
            if (lastDate) {
                const diff = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                if (diff <= 1.5) {
                    currentStreak += 1;
                } else {
                    currentStreak = 1;
                }
            } else {
                if (currentStreak > bestStreak) bestStreak = currentStreak;
                streak = currentStreak;
                lastDate = date;
            }
        });
        return { streak, bestStreak, total };
      };

      const habitStreaks = habits.map((habit) => {
        const { streak, bestStreak, total } = getStreakData(habit.$id);
        return { habit, bestStreak, streak, total };
      });

      const rankedHabits = habitStreaks.sort((a, b) => a.bestStreak - b.bestStreak);
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Habit Streaks</Text>

            {habits.length === 0 ? (
                <View>
                    <Text>No habits found</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
                    {rankedHabits.map(({ habit, streak, bestStreak, total }, key) => (
                        <Card
                            key={habit.$id}
                            style={[styles.card, key === 0 && styles.firstCard]}
                        >
                            <Card.Content>
                                <Text variant="titleMedium" style={styles.habitTitle}>{habit.title}</Text>
                                <Text style={styles.habitDescription}>{habit.description}</Text>
                                <View style={styles.statsRow}>
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statBadgeText}>🔥 {streak}</Text>
                                        <Text style={styles.statLabel}>Current</Text>
                                    </View>
                                    <View style={styles.statBadgeGold}>
                                        <Text style={styles.statBadgeText}>🏆 {bestStreak}</Text>
                                        <Text style={styles.statLabel}>Best</Text>
                                    </View>
                                    <View style={styles.statBadgeGreen}>
                                        <Text style={styles.statBadgeText}>✅ {total}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))}
                </ScrollView>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontWeight: "bold",
        marginBottom: 24,
    },
    card: {
        marginBottom: 18,
        borderRadius: 18,
        backgroundColor: "#fff",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: "#f0f0f0",
    },
    firstCard: {
        borderWidth: 2,
        borderColor: "#7c4dff",
    },
    habitTitle: {
        fontWeight: "bold",
        fontSize: 18,
        marginBottom: 2,
    },
    habitDescription: {
        color: "#6c6c80",
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        marginBottom: 12,
    },
    statBadge: {
        backgroundColor: "#fff3e0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        minWidth: 60,
    },
    statBadgeGold: {
        backgroundColor: "#fffde7",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        minWidth: 60,
    },
    statBadgeGreen: {
        backgroundColor: "#e8f5e9",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        minWidth: 60,
    },
    statBadgeText: {
        fontWeight: "bold",
        fontSize: 15,
        color: "#22223b",
    },
    statLabel: {
        fontSize: 11,
        color: "#888",
        marginTop: 2,
        fontWeight: "500",
    },
});