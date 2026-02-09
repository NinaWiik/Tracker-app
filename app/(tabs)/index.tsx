import { DATABASE_ID, HABITS_DATABASE_ID, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { Habit } from "@/types/database.type";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Query } from "react-native-appwrite";
import { Button, Surface, Text } from "react-native-paper";

export default function Index() {
  const { signOut, user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    fetchHabits()

  }, []);

  const fetchHabits = async () => {
    try {
      const habits = await tablesDB.listRows<Habit>({
        databaseId: DATABASE_ID,
        tableId: HABITS_DATABASE_ID,
        queries: [
          Query.equal("user_id", user?.$id || ""),
        ],
      });
      setHabits(habits.rows);
      console.log(habits);
    } catch (error) {
      console.error(error);
    }
  }

  return (

      <View
        style={styles.container}
      >
        
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>Today&apos;s Habits</Text>
          <Button mode="text" onPress={signOut} icon="logout">Sign Out</Button>
        </View>
        {habits.length === 0 ? (
          <Surface style={styles.card} elevation={0}>
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={styles.emptyText}>No habits found</Text>
            </View>
          </Surface>
        ) : (
          habits.map((habit, key) => (
            <Surface key={key} style={styles.card} elevation={0}>
              <View style={styles.cardContent}>
                <Text variant="bodyMedium" style={styles.cardTitle}>{habit.title}</Text>
                <Text variant="bodyMedium" style={styles.cardDescription}>{habit.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.streakBadge}>
                    <MaterialCommunityIcons name="fire" size={18} color="#ff9800" />
                    <Text variant="bodyMedium" style={styles.streakText}>{habit.streak_count} days streak</Text>
                  </View>
                  <View style={styles.frequencyBadge}>
                    <Text variant="bodyMedium" style={styles.frequencyText}>{habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}</Text>
                  </View>
                </View>
              </View>
            </Surface>
          ))
        )}
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
});