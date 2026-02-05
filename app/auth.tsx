import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

export default function AuthScreen() {
    const [isSignup, setIsSignup] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [error, setError] = useState<string | null>("");

    const theme = useTheme();

    const { signUp, signIn } = useAuth();

    const router = useRouter();

    const handleSwitchMode = () => {
        setIsSignup(prev => !prev);
    }

    const handleAuth = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }
        setError(null);

        if (isSignup) {
            const error = await signUp(email, password);
            if (error) {
                setError(error);
                return;
            }
        } else {
            const error = await signIn(email, password);
            if (error) {
                setError(error);
                return;
            }
            router.replace("/");
        }
    }


    return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>{isSignup ? "Create Account" : "Login"}</Text>

            <TextInput 
                label="Email" 
                autoCapitalize="none" 
                keyboardType="email-address" 
                placeholder="example@gmail.com" 
                mode="outlined" 
                style={styles.input} 
                value={email}
                onChangeText={setEmail}
            />
            <TextInput 
                label="Password" 
                autoCapitalize="none" 
                keyboardType="default" 
                secureTextEntry={true} 
                mode="outlined" 
                style={styles.input}
                value={password}
                onChangeText={setPassword}
            />
            {error && <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{error}</Text>}
            <Button 
                mode="contained" 
                onPress={handleAuth} 
                style={styles.button}
                >{isSignup ? "Create Account" : "Login"}
            </Button>
            <Button 
                mode="text" onPress={handleSwitchMode} 
                style={styles.switchModeButton}
                >{isSignup ? "Already have an account? Login" : "Don't have an account? Create Account"}
            </Button>
        </View>
    </KeyboardAvoidingView>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5f5F5",
    },
    content: {
        flex: 1,
        backgroundColor: "#F5f5F5",
        padding: 16,
        justifyContent: "center",
    },
    title: {
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
    },
    errorText: {
        color: "red",
    },
    switchModeButton: {
        marginTop: 16,
    },
});