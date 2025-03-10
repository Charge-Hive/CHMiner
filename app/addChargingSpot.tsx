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

// Define the type for the charging spot data
type SpotData = {
  address: string;
  latitude: string;
  longitude: string;
  comments: string;
  chargingspot_image1_url: string;
  chargingspot_image2_url: string;
  chargingspot_image3_url: string;
  email_id: string;
  provider_account_addr: string;
  provider_evm_addr: string;
};

export const addChargingSpot = () => {
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
        .from("charging_images")
        .upload(fileName, arrayBuffer, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError.message);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("charging_images")
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

    if (!address) {
      Alert.alert("Error", "Please select an address.");
      return;
    }

    setIsLoading(true);

    try {
      // Get the logged-in user's email
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not logged in");
      }

      // Fetch hedera_account_id and hedera_evm_addr from user table
      const { data: userData, error: userError } = await supabase
        .from("user")
        .select("hedera_account_id, hedera_evm_addr")
        .eq("email_id", user.email)
        .single();

      if (userError) {
        console.error("Error fetching user data:", userError);
        throw new Error("Failed to fetch user wallet details");
      }

      if (!userData) {
        throw new Error("User wallet details not found");
      }

      const uploadedUrls = await uploadPhotos();

      const spotData: SpotData = {
        address,
        latitude,
        longitude,
        comments,
        chargingspot_image1_url: uploadedUrls[0] || "",
        chargingspot_image2_url: uploadedUrls[1] || "",
        chargingspot_image3_url: uploadedUrls[2] || "",
        email_id: user.email!,
        provider_account_addr: userData.hedera_account_id,
        provider_evm_addr: userData.hedera_evm_addr,
      };

      // Insert the charging spot into the Chargers table
      const { data, error } = await supabase
        .from("Chargers")
        .insert([spotData])
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      // Successfully added charging spot
      Alert.alert("Success", "Charging spot added successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/charging"),
        },
      ]);
    } catch (error) {
      console.error("Error adding charging spot:", error);
      Alert.alert("Error", "Failed to add charging spot. Please try again.");
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
    <SafeAreaView className="h-full bg-gray-900">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-3xl font-bold text-yellow-400 font-pbold mb-6 text-center">
          Add Charging Spot
        </Text>

        {/* Address Selection */}
        <Text className="text-white font-psemibold mb-2">Address:</Text>
        <TouchableOpacity
          onPress={handleAddAddress}
          className="w-full bg-green-500 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Add Address
          </Text>
        </TouchableOpacity>

        {address && (
          <View className="mb-4 bg-gray-800 p-4 rounded-lg">
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
          placeholder="Any details about the charging spot (type, power, etc.)"
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
          className="w-full bg-green-500 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Take Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickPhoto}
          className="w-full bg-green-500 py-4 rounded-lg mb-4"
        >
          <Text className="text-center text-xl text-white font-pbold">
            Pick from Gallery
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          className={`w-full bg-green-500 py-4 rounded-lg mt-6 ${
            isLoading ? "opacity-50" : ""
          }`}
        >
          <Text className="text-center text-xl text-white font-pbold">
            {isLoading ? "Submitting..." : "Submit Charging Spot"}
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
            backgroundColor: "#161622",
          }}
        >
          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            onPress={handleMapPress}
          >
            {tempLatLng.latitude && tempLatLng.longitude ? (
              <Marker
                coordinate={{
                  latitude: parseFloat(tempLatLng.latitude),
                  longitude: parseFloat(tempLatLng.longitude),
                }}
              />
            ) : (
              <Marker coordinate={region} />
            )}
          </MapView>
          {tempAddress && (
            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: "#333",
                padding: 15,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: "white" }}>{tempAddress}</Text>
              <TouchableOpacity
                onPress={confirmAddress}
                style={{
                  backgroundColor: "#22c55e",
                  padding: 10,
                  borderRadius: 5,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  Confirm Address
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShowMap(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              backgroundColor: "#333",
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: "white" }}>Close Map</Text>
          </TouchableOpacity>
        </View>
      )}

      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

export default addChargingSpot;
