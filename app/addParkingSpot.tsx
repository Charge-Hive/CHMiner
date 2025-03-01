import React, { useState, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import supabase from "./supabaseClient";
import { router } from "expo-router";

// Define the type for the parking spot data
type SpotData = {
  type: string;
  status: string;
  address: string;
  latitude: string;
  longitude: string;
  comments: string;
  parkingspot_image1_url: string;
  parkingspot_image2_url: string;
  parkingspot_image3_url: string;
  email_id: string;
  provider_account_addr: string; // Add provider_account_addr
  provider_evm_addr: string; // Add provider_evm_addr
};

export const addParkingSpot = () => {
  const [type, setType] = useState("Outdoor");
  const [status, setStatus] = useState("Inactive");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [tempLatLng, setTempLatLng] = useState<{
    latitude: string;
    longitude: string;
  }>({ latitude: "", longitude: "" });

  // Request location permissions and set initial region
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  // Request camera and gallery permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || galleryStatus !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to camera and gallery."
      );
      return false;
    }
    return true;
  };

  // Take a photo using the camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Pick a photo from the gallery
  const pickPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Upload photos to Supabase Storage
  const uploadPhotos = async () => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const base64 = await FileSystem.readAsStringAsync(photo, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;

      const { data, error: uploadError } = await supabase.storage
        .from("parking_images")
        .upload(fileName, arrayBuffer, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError.message);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("parking_images")
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      } else {
        throw new Error("Could not retrieve public URL.");
      }
    }

    return uploadedUrls;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert("Error", "Please add at least one photo.");
      return;
    }

    setIsLoading(true);

    try {
      // Get the logged-in user's email and wallet details
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not logged in");
      }

      // Fetch the user's wallet details from the user table
      const { data: userData, error: userError } = await supabase
        .from("user")
        .select("hedera_account_id, hedera_evm_addr")
        .eq("email_id", user.email)
        .single();

      if (userError || !userData) {
        throw new Error("Failed to fetch user wallet details");
      }

      const uploadedUrls = await uploadPhotos();

      const spotData: SpotData = {
        type,
        status,
        address,
        latitude,
        longitude,
        comments,
        parkingspot_image1_url: uploadedUrls[0],
        parkingspot_image2_url: uploadedUrls[1],
        parkingspot_image3_url: uploadedUrls[2],
        email_id: user.email!,
        provider_account_addr: userData.hedera_account_id, // Add provider_account_addr
        provider_evm_addr: userData.hedera_evm_addr, // Add provider_evm_addr
      };

      // Insert the parking spot into the Parking table
      const { data, error } = await supabase
        .from("Parking")
        .insert([spotData])
        .select();

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Parking spot added successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/parking"),
        },
      ]);
    } catch (error) {
      console.error("Error adding parking spot:", error);
      Alert.alert("Error", "Failed to add parking spot. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding an address using the map
  const handleAddAddress = async () => {
    if (!region) {
      Alert.alert("Error", "Unable to fetch current location.");
      return;
    }

    setShowMap(true);
  };

  // Handle map press to select a location
  const handleMapPress = async (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode.length > 0) {
      const selectedAddress = `${geocode[0].name}, ${geocode[0].city}, ${geocode[0].region}, ${geocode[0].postalCode}, ${geocode[0].country}`;
      setTempAddress(selectedAddress);
      setTempLatLng({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });
    }
  };

  // Confirm the selected address
  const confirmAddress = () => {
    setAddress(tempAddress);
    setLatitude(tempLatLng.latitude);
    setLongitude(tempLatLng.longitude);
    setShowMap(false);
  };

  return (
    <SafeAreaView className="h-full bg-[#161622]">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-3xl font-bold text-yellow-400 font-pbold mb-6 text-center">
          Add Parking Spot
        </Text>

        {/* Type Selection */}
        <Text className="text-white font-psemibold mb-2">Type:</Text>
        <View className="flex-row space-x-4 mb-4">
          <TouchableOpacity
            onPress={() => setType("Indoor")}
            className={`py-2 px-4 rounded-lg ${
              type === "Indoor" ? "bg-yellow-400" : "bg-gray-700"
            }`}
          >
            <Text className="text-white font-psemibold">Indoor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType("Outdoor")}
            className={`py-2 px-4 rounded-lg ${
              type === "Outdoor" ? "bg-yellow-400" : "bg-gray-700"
            }`}
          >
            <Text className="text-white font-psemibold">Outdoor</Text>
          </TouchableOpacity>
        </View>

        {/* Status Selection */}
        <Text className="text-white font-psemibold mb-2">Status:</Text>
        <View className="flex-row space-x-4 mb-4">
          <TouchableOpacity
            onPress={() => setStatus("Active")}
            className={`py-2 px-4 rounded-lg ${
              status === "Active" ? "bg-yellow-400" : "bg-gray-700"
            }`}
          >
            <Text className="text-white font-psemibold">Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setStatus("Inactive")}
            className={`py-2 px-4 rounded-lg ${
              status === "Inactive" ? "bg-yellow-400" : "bg-gray-700"
            }`}
          >
            <Text className="text-white font-psemibold">Inactive</Text>
          </TouchableOpacity>
        </View>

        {/* Address Selection */}
        <Text className="text-white font-psemibold mb-2">Address:</Text>
        <TouchableOpacity
          onPress={handleAddAddress}
          className="w-full bg-yellow-400 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-gray-900 font-pbold">
            Add Address
          </Text>
        </TouchableOpacity>

        {address && (
          <View className="mb-4">
            <Text className="text-white font-psemibold">Selected Address:</Text>
            <Text className="text-white">{address}</Text>
            <Text className="text-white">Latitude: {latitude}</Text>
            <Text className="text-white">Longitude: {longitude}</Text>
          </View>
        )}

        {/* Comments */}
        <Text className="text-white font-psemibold mb-2">Comments:</Text>
        <TextInput
          className="bg-gray-700 text-white rounded-lg p-4 mb-4"
          placeholder="Any comments about the parking spot"
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={4}
          value={comments}
          onChangeText={setComments}
        />

        {/* Add Photos */}
        <Text className="text-white font-psemibold mb-2">Add Photos:</Text>
        <View className="flex-row flex-wrap justify-between mb-4">
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              className="w-[30%] h-32 rounded-lg mb-4"
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={takePhoto}
          className="w-full bg-yellow-400 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-gray-900 font-pbold">
            Take Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickPhoto}
          className="w-full bg-yellow-400 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-gray-900 font-pbold">
            Pick from Gallery
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full bg-yellow-400 py-4 rounded-lg mt-6 ${
            isLoading ? "opacity-50" : ""
          }`}
        >
          <Text className="text-center text-xl text-gray-900 font-pbold">
            {isLoading ? "Submitting..." : "Submit Parking Spot"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Map View for Address Selection */}
      {showMap && region && (
        <View
          style={{
            flex: 1,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            onPress={handleMapPress}
          >
            <Marker coordinate={region} />
          </MapView>
          {tempAddress && (
            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: "white",
                padding: 10,
                borderRadius: 5,
              }}
            >
              <Text>{tempAddress}</Text>
              <TouchableOpacity
                onPress={confirmAddress}
                style={{
                  backgroundColor: "#FFD700",
                  padding: 10,
                  borderRadius: 5,
                  marginTop: 10,
                }}
              >
                <Text style={{ textAlign: "center" }}>Confirm Address</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowMap(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "white",
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text>Close Map</Text>
          </TouchableOpacity>
        </View>
      )}

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

export default addParkingSpot;
