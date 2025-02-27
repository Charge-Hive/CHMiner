import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient"; // For gradient backgrounds
import { MaterialIcons } from "@expo/vector-icons"; // For icons
import supabase from "./supabaseClient"; // Import Supabase client
import { useRouter } from "expo-router";
import "../global.css";

const LoginPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      // Check if the email exists in the user table
      const { data: userData, error: fetchError } = await supabase
        .from("user")
        .select("email_id, pwd")
        .eq("email_id", email)
        .single();

      if (fetchError || !userData) {
        Alert.alert("Error", "Email not found. Please sign up.");
        return;
      }

      // Verify the password
      if (userData.pwd !== password) {
        Alert.alert("Error", "Incorrect password.");
        return;
      }

      // Sign in the user with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        Alert.alert("Error", signInError.message);
        return;
      }

      // Navigate to the home screen
      router.replace("home" as any);
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert("Error", "An error occurred during login.");
    }
  };

  const handleSignupNavigation = () => {
    router.push("signup" as any);
  };

  return (
    <ImageBackground
      source={require("../assets/onboarding/bg.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
      className="h-full"
    >
      <SafeAreaView edges={["bottom", "left", "right"]} className="h-full">
        <ScrollView contentContainerStyle={{ height: "100%" }}>
          <View className="relative h-full flex-1 flex-col justify-center px-6 py-4">
            {/* Login Box */}
            <View className="bg-white/20 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-lg">
              {/* Logo or Branding */}
              <View className="items-center mb-8">
                <Text className="text-5xl font-bold text-yellow-400 font-pbold">
                  HiveMiner
                </Text>
                <Text className="text-xl mt-2 text-gray-300 font-psemibold">
                  Share Parking & EV Charging Spots
                </Text>
              </View>

              {/* Email Input */}
              <View className="mb-6">
                <View className="flex-row items-center bg-white/20 rounded-lg p-3">
                  <MaterialIcons name="email" size={24} color="#FBBF24" />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#A0AEC0"
                    value={email}
                    onChangeText={setEmail}
                    className="flex-1 ml-3 text-white"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-8">
                <View className="flex-row items-center bg-white/20 rounded-lg p-3">
                  <MaterialIcons name="lock" size={24} color="#FBBF24" />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#A0AEC0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="flex-1 ml-3 text-white"
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity onPress={handleLogin}>
                <LinearGradient
                  colors={["#FBBF24", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full py-4 rounded-lg"
                >
                  <Text className="text-center text-xl text-white font-pbold">
                    Login
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignupNavigation}
                className="mt-4"
              >
                <Text className="text-center text-gray-300 font-psemibold">
                  Don't have an account?{" "}
                  <Text className="text-yellow-400">Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <StatusBar backgroundColor="transparent" translucent />
      </SafeAreaView>
    </ImageBackground>
  );
};

export default LoginPage;
