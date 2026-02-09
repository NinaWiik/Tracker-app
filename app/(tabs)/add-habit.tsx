import { DATABASE_ID, HABITS_DATABASE_ID, tablesDB } from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ID } from "react-native-appwrite";
import { Button, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";


const FREQUENCIES = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
]

type Frequency = (typeof FREQUENCIES)[number]["value"];

export default function AddHabitScreen() {
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const {user} = useAuth();
    const router = useRouter();
    const theme = useTheme();
    const [error, setError] = useState<string | null>(null);
    const handleSubmit = async () => {
        if (!user) {
            setError("You must be logged in to add a habit");
            return;
        }

        if (!title || !description) {
            setError("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            if (!DATABASE_ID || !HABITS_DATABASE_ID) {
                setError(`Database configuration is missing.`);
                setIsSubmitting(false);
                return;
            }

            const rowId = ID.unique();
            const rowData = {
                databaseId: DATABASE_ID,
                tableId: HABITS_DATABASE_ID,
                rowId: rowId,
                data: {
                    title,
                    description,
                    frequency,
                    user_id: user.$id,
                    streak_count: 0,
                    last_completed: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                },
            };

            await tablesDB.createRow(rowData);
            
            // Clear form on success
            setTitle("");
            setDescription("");
            setFrequency("daily");
            router.back();
            setError(null);

        } catch (error) {
            console.error("Error adding habit:", error);
            setError(error instanceof Error ? error.message : "Failed to add habit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <View style={styles.container}>
            <TextInput mode="outlined" label="Title" onChangeText={setTitle} style={styles.input} />
            <TextInput mode="outlined" label="Description" onChangeText={setDescription} style={styles.input} />
            <View style={styles.frequencyContainer}>
                <SegmentedButtons
                    value={frequency}
                    onValueChange={(value) => setFrequency(value as Frequency)}
                    buttons={FREQUENCIES.map(frequency => ({ label: frequency.label, value: frequency.value }))}    
                    
                />
            </View>
            <Button 
                mode="contained" 
                disabled={!title || !description || isSubmitting} 
                onPress={handleSubmit}
                loading={isSubmitting}
            >
                Add Habit
            </Button>
            {error && <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{error}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5f5F5",
        padding: 16,
        justifyContent: "center",
    },
    input: {
        marginBottom: 16,
    },
    frequencyContainer: {
        marginBottom: 24,
    },
})