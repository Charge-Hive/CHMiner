import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import supabase from "./supabaseClient";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";

// Define types for the balance response
interface BalanceResponse {
  success: boolean;
  accountId: string;
  balances: {
    hbar: {
      tinybars: string;
      hbar: string;
    };
    chargeHive: {
      tokenId: string;
      balance: string;
    };
  };
  accountDetails?: {
    key: string;
    balance: string;
    receiverSignatureRequired: boolean;
    expirationTime?: string;
  };
  error?: string;
}

const WalletPage = () => {
  const router = useRouter();
  const [hederaAccountId, setHederaAccountId] = useState<string | null>(null);
  const [hederaPrivateKey, setHederaPrivateKey] = useState<string | null>(null);
  const [hederaPublicKey, setHederaPublicKey] = useState<string | null>(null);
  const [hederaEvmAddr, setHederaEvmAddr] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  // Fetch the user's Hedera wallet details from Supabase
  const fetchHederaWalletDetails = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not logged in");
      }

      const { data, error: fetchError } = await supabase
        .from("user")
        .select(
          "hedera_account_id, hedera_private_key, hedera_public_key, hedera_evm_addr"
        )
        .eq("email_id", user.email)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // If wallet details exist, set them in state
      if (data) {
        setHederaAccountId(data.hedera_account_id);
        setHederaPrivateKey(data.hedera_private_key);
        setHederaPublicKey(data.hedera_public_key);
        setHederaEvmAddr(data.hedera_evm_addr);

        // Fetch balance after getting account details
        if (data.hedera_account_id && data.hedera_private_key) {
          fetchAccountBalance(data.hedera_account_id, data.hedera_private_key);
        }
      }
    } catch (error) {
      console.error("Error fetching Hedera wallet details:", error);
      setError("Failed to fetch wallet details.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to fetch wallet details.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch account balance from API
  const fetchAccountBalance = async (accountId: string, privateKey: string) => {
    try {
      setLoadingBalance(true);
      const response = await fetch(
        "https://hederaprovider-e5c7e6e44385.herokuapp.com/account-balance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId,
            privateKey,
            tokenId: "0.0.5630530",
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setBalanceData(data);
      } else {
        console.error("Failed to fetch balance:", data.error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: data.error || "Failed to fetch balance",
        });
      }
    } catch (error) {
      console.error("Error fetching account balance:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to connect to balance API",
      });
    } finally {
      setLoadingBalance(false);
    }
  };

  // Manually refresh balance
  const refreshBalance = () => {
    if (hederaAccountId && hederaPrivateKey) {
      fetchAccountBalance(hederaAccountId, hederaPrivateKey);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: "success",
      text1: "Copied!",
      text2: "Text copied to clipboard.",
    });
  };

  // Fetch Hedera wallet details on component mount
  useEffect(() => {
    fetchHederaWalletDetails();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900 p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-5xl font-bold text-yellow-400 font-pbold">
          Wallet
        </Text>
        <Text className="text-xl mt-2 mb-8 text-gray-300 font-psemibold">
          Manage your Hedera wallet.
        </Text>

        {hederaAccountId ? (
          <View className="space-y-8">
            {/* Balance Information - Added more padding */}
            <View className="bg-gray-800 p-6 rounded-lg">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-400 text-lg font-psemibold">
                  Account Balance
                </Text>
                <TouchableOpacity
                  onPress={refreshBalance}
                  disabled={loadingBalance}
                  className="bg-yellow-400 px-4 py-2 rounded-md"
                >
                  <Text className="text-gray-900 font-psemibold">
                    {loadingBalance ? "Loading..." : "Refresh"}
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingBalance ? (
                <ActivityIndicator
                  size="small"
                  color="#FBBF24"
                  className="my-4"
                />
              ) : balanceData ? (
                <View className="space-y-6">
                  <View className="bg-gray-700 p-4 rounded-md">
                    <Text className="text-gray-400 text-sm mb-2">
                      HBAR Balance
                    </Text>
                    <Text className="text-white text-xl font-pbold mb-1">
                      {balanceData.balances.hbar.hbar} HBAR
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {balanceData.balances.hbar.tinybars} tinybars
                    </Text>
                  </View>

                  <View className="bg-gray-700 p-4 rounded-md">
                    <Text className="text-gray-400 text-sm mb-2">
                      ChargeHive Token
                    </Text>
                    <Text className="text-white text-xl font-pbold mb-1">
                      {balanceData.balances.chargeHive.balance}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      Token ID: {balanceData.balances.chargeHive.tokenId}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-white text-center py-4">
                  Tap refresh to load your balance
                </Text>
              )}
            </View>

            {/* Section Title */}
            <Text className="text-gray-300 text-lg font-psemibold">
              Account Details
            </Text>

            {/* Hedera Account ID */}
            <KeyDisplayBox
              label="Hedera Account ID"
              value={hederaAccountId}
              onCopy={() => copyToClipboard(hederaAccountId)}
            />

            {/* Hedera Private Key */}
            <KeyDisplayBox
              label="Hedera Private Key"
              value={showPrivateKey ? hederaPrivateKey ?? "" : "••••••••••••"}
              secureTextEntry={!showPrivateKey}
              onToggleVisibility={() => setShowPrivateKey(!showPrivateKey)}
              onCopy={() => copyToClipboard(hederaPrivateKey!)}
            />

            {/* Hedera Public Key */}
            <KeyDisplayBox
              label="Hedera Public Key"
              value={hederaPublicKey ?? ""}
              onCopy={() => copyToClipboard(hederaPublicKey!)}
            />

            {/* Hedera EVM Address */}
            <KeyDisplayBox
              label="Hedera EVM Address"
              value={hederaEvmAddr ?? ""}
              onCopy={() => copyToClipboard(hederaEvmAddr!)}
            />
          </View>
        ) : (
          <Text className="text-white text-center mt-8">
            No wallet found. Please sign up to create a wallet.
          </Text>
        )}

        {/* Add extra padding at the bottom for better scrolling experience */}
        <View className="h-8" />
      </ScrollView>
      <Toast />
    </View>
  );
};

// Reusable component for displaying keys - added more padding
const KeyDisplayBox = ({
  label,
  value,
  secureTextEntry = false,
  onCopy,
  onToggleVisibility,
}: {
  label: string;
  value: string;
  secureTextEntry?: boolean;
  onCopy: () => void;
  onToggleVisibility?: () => void;
}) => (
  <View className="bg-gray-800 p-5 rounded-lg">
    <Text className="text-gray-400 text-sm mb-2">{label}</Text>
    <View className="flex-row justify-between items-center">
      <TextInput
        className="text-white text-lg flex-1 mr-2"
        value={value}
        secureTextEntry={secureTextEntry}
        editable={false}
      />
      {onToggleVisibility && (
        <TouchableOpacity onPress={onToggleVisibility} className="p-2 mr-2">
          <FontAwesome
            name={secureTextEntry ? "eye" : "eye-slash"}
            size={20}
            color="#FBBF24"
          />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onCopy} className="p-2">
        <FontAwesome name="copy" size={20} color="#FBBF24" />
      </TouchableOpacity>
    </View>
  </View>
);

export default WalletPage;
