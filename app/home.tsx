import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import supabase from "./supabaseClient"; // Import Supabase client
import { FontAwesome } from "@expo/vector-icons"; // For logout icon

const HomePage = () => {
  const router = useRouter();

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut(); // Sign out from Supabase
      if (error) {
        throw error;
      }
      router.replace("/"); // Redirect to login page after logout
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-gray-900 p-6">
      {/* Header */}
      <View className="pt-16">
        <View className="flex-row justify-between items-center">
          <Text className="text-5xl font-bold text-yellow-400 font-pbold">
            HiveMiner
          </Text>
          {/* Logout Button */}
          <TouchableOpacity onPress={handleLogout}>
            <FontAwesome name="sign-out" size={24} color="#FBBF24" />
          </TouchableOpacity>
        </View>
        <Text className="text-xl mt-2 text-gray-300 font-psemibold">
          Share Parking & EV Charging Spots
        </Text>
      </View>

      {/* Buttons */}
      <View className="flex-1 justify-center space-y-6">
        <TouchableOpacity
          onPress={() => router.push("/parking")}
          className="w-full bg-blue-500 py-4 rounded-lg"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Parking
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/charging")}
          className="w-full bg-green-500 py-4 rounded-lg"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Charging
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/wallet")}
          className="w-full bg-purple-500 py-4 rounded-lg"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomePage;
