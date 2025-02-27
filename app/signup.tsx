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
import supabase from "./supabaseClient"; // Import Supabase client
import { useRouter } from "expo-router";
import "../global.css";

const SignupPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const router = useRouter();

  const handleSignup = async () => {
    try {
      console.log("Checking if email is already registered...");
      // Check if the email is already registered
      const { data: existingUser, error: fetchError } = await supabase
        .from("user")
        .select("email_id")
        .eq("email_id", email)
        .maybeSingle(); // Use maybeSingle instead of single

      if (fetchError) {
        console.error("Error checking email:", fetchError);
        Alert.alert("Error", "Failed to check email availability.");
        return;
      }

      if (existingUser) {
        console.log("Email is already registered:", email);
        Alert.alert("Error", "Email is already registered.");
        return;
      }

      console.log("Signing up user with Supabase Auth...");
      // Sign up the user with Supabase Auth
      const { data: authData, error: signupError } = await supabase.auth.signUp(
        {
          email,
          password,
        }
      );

      if (signupError) {
        console.error("Error signing up:", signupError);
        Alert.alert("Error", signupError.message);
        return;
      }

      console.log("User signed up successfully. Saving user details...");
      // Save user details to the user table
      const { data, error: insertError } = await supabase.from("user").insert([
        {
          email_id: email,
          pwd: password, // Note: In production, never store plain-text passwords
          age,
        },
      ]);

      if (insertError) {
        console.error("Error saving user details:", insertError);
        Alert.alert("Error", insertError.message);
        return;
      }

      console.log(
        "User details saved successfully. Navigating to home screen..."
      );
      // Navigate to the home screen
      router.replace("home" as any);
    } catch (error) {
      console.error("Unexpected error during signup:", error);
      Alert.alert("Error", "An error occurred during signup.");
    }
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
          <View className="relative h-full flex-1 flex-col justify-between px-6 py-4">
            <View className="pt-16">
              <Text className="text-5xl font-bold text-yellow-400 font-pbold">
                HiveMiner
              </Text>
              <Text className="text-xl mt-2 text-gray-300 font-psemibold">
                Share Parking & EV Charging Spots
              </Text>
            </View>
            <View className="space-y-6 mb-1">
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                className="w-full bg-white p-3 rounded-lg"
              />
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="w-full bg-white p-3 rounded-lg"
              />
              <TextInput
                placeholder="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                className="w-full bg-white p-3 rounded-lg"
              />
              <TouchableOpacity
                onPress={handleSignup}
                className="w-full bg-green-500 text-white py-4 rounded-lg font-semibold"
              >
                <Text className="text-center text-xl text-white font-pbold">
                  Sign Up
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

export default SignupPage;
