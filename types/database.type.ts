import { Models } from "react-native-appwrite";


export interface Habit extends Models.Row {
    title: string;
    description: string;
    frequency: string;
    user_id: string;
    streak_count: number;
    last_completed: string;
    created_at: string;
}

export interface HabitCompletion extends Models.Row {
    habit_id: string;
    user_id: string;
    completed_at: string;
}