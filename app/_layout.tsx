import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
      <Stack.Screen name="home" options={{ title: "Home" }} />
      <Stack.Screen name="parking" options={{ title: "Parking" }} />
      <Stack.Screen name="charging" options={{ title: "Charging" }} />
      <Stack.Screen name="wallet" options={{ title: "Wallet" }} />
    </Stack>
  );
}
