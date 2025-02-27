import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import supabase from "./supabaseClient";

const ParkingPage = () => {
  const router = useRouter();
  const [parkingSpots, setParkingSpots] = useState<
    { latitude: number; longitude: number; address: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch the user's current location
  const fetchUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please enable location permissions.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Error fetching user location:", error);
      Alert.alert("Error", "Failed to fetch your location.");
    }
  };

  // Fetch parking spots for the logged-in user
  const fetchParkingSpots = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not logged in");
      }

      const { data, error } = await supabase
        .from("Parking")
        .select("latitude, longitude, address")
        .eq("email_id", user.email);

      if (error) {
        throw error;
      }

      console.log("Fetched parking spots:", data); // Log fetched data

      // Convert latitude and longitude to numbers
      const spots = data.map((spot) => ({
        latitude: parseFloat(spot.latitude),
        longitude: parseFloat(spot.longitude),
        address: spot.address,
      }));

      console.log("Processed parking spots:", spots); // Log processed data
      setParkingSpots(spots);
    } catch (error) {
      console.error("Error fetching parking spots:", error);
      Alert.alert("Error", "Failed to fetch parking spots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserLocation();
    fetchParkingSpots();
  }, []);

  const handleAddParkingSpot = () => {
    router.push("/addParkingSpot");
  };

  return (
    <View className="flex-1 bg-gray-900 p-6">
      <Text className="text-5xl font-bold text-yellow-400 font-pbold">
        Parking
      </Text>
      <Text className="text-xl mt-2 text-gray-300 font-psemibold">
        Find and share parking spots.
      </Text>

      {/* Map View */}
      <View className="flex-1 mt-8">
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: parkingSpots[0]?.latitude || 37.78825, // Use the first marker's location or a fallback
            longitude: parkingSpots[0]?.longitude || -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {parkingSpots.map((spot, index) => {
            console.log("Rendering marker for spot:", spot); // Log each marker
            return (
              <Marker
                key={index}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
                title={spot.address}
                pinColor="blue"
              />
            );
          })}
        </MapView>
      </View>

      {/* Add Parking Spot Button */}
      <TouchableOpacity
        onPress={handleAddParkingSpot}
        className="mt-8 w-full bg-blue-500 py-4 rounded-lg"
      >
        <Text className="text-center text-xl text-white font-pbold">
          Add Parking Spot
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ParkingPage;
