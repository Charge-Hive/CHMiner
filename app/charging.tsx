import React from "react";
import { View, Text } from "react-native";

const ChargingPage = () => {
  return (
    <View className="flex-1 bg-gray-900 p-6">
      <Text className="text-5xl font-bold text-yellow-400 font-pbold">
        Charging
      </Text>
      <Text className="text-xl mt-2 text-gray-300 font-psemibold">
        Find and share EV charging spots.
      </Text>
    </View>
  );
};

export default ChargingPage;
