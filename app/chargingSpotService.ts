import supabase from "./supabaseClient";

type SpotData = {
  address: string;
  latitude: string;
  longitude: string;
  email_id: string;
  chargingspot_image1_url: string;
  chargingspot_image2_url: string;
  chargingspot_image3_url: string;
  comments: string;
  provider_account_addr: string;
  provider_evm_addr: string;
};

export const chargingSpotService = async (spotData: SpotData) => {
  const {
    address,
    latitude,
    longitude,
    email_id,
    chargingspot_image1_url,
    chargingspot_image2_url,
    chargingspot_image3_url,
    comments,
    provider_account_addr,
    provider_evm_addr,
  } = spotData;

  try {
    // Ensure user is authenticated
    const { data: authData, error: authError } =
      await supabase.auth.getSession();

    if (authError || !authData.session) {
      throw new Error("Authentication required: User is not authenticated");
    }

    const { data, error } = await supabase.from("Chargers").insert([
      {
        address,
        latitude,
        longitude,
        email_id,
        chargingspot_image1_url: chargingspot_image1_url || "",
        chargingspot_image2_url: chargingspot_image2_url || "",
        chargingspot_image3_url: chargingspot_image3_url || "",
        comments,
        provider_account_addr,
        provider_evm_addr,
      },
    ]);

    if (error) {
      console.error("Error creating charging spot:", error);
      throw error;
    }

    // Return a success message if data is inserted successfully
    return { success: true, message: "Charging spot added successfully!" };
  } catch (error) {
    console.error("Error in charging spot service:", error);
    throw error;
  }
};
