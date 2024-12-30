import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import defaultProfile from "../../assets/profile.svg";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [profileData, setProfileData] = useState({
    email: "",
    name: "",
    profileImage: defaultProfile,
    userId: null,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  const resetProfileData = useCallback(() => {
    console.log("AuthContext.resetProfileData(): Resetting profile data.");
    setProfileData({
      email: "",
      name: "",
      profileImage: defaultProfile,
      userId: null,
    });
    setIsOnboarded(false);
    setIsVerified(false);
    setAuthUser(null);
    setProfileLoading(false);
  }, []);

  const createUserIfNotExists = useCallback(async (userId, email) => {
    console.log("AuthContext.createUserIfNotExists(): Checking user existence:", userId);
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, email, name, profile_image_url")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.warn("Error checking existing user:", fetchError);
        return null;
      }

      if (!existingUser) {
        console.log("No existing user row, creating one...");
        const { data: newUser, error: upsertError } = await supabase
          .from("users")
          .upsert({
            id: userId,
            email: email || "",
            name: "",
            profile_image_url: "",
          })
          .select("id, email, name, profile_image_url")
          .single();

        if (upsertError) {
          console.warn("Error creating user row:", upsertError);
          return null;
        }

        console.log("New user row created:", newUser);
        return newUser;
      }

      console.log("User row already exists:", existingUser);
      return existingUser;
    } catch (err) {
      console.warn("Unexpected error ensuring user row:", err);
      return null;
    }
  }, []);

  const fetchUserProfile = useCallback(async (identifier) => {
    if (!identifier) {
      console.warn("No identifier for fetchUserProfile.");
      return;
    }

    console.log("fetchUserProfile(): Fetching profile for:", identifier);
    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, profile_image_url")
        .eq("id", identifier)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching profile:", error);
        resetProfileData();
        return;
      }

      if (!data) {
        console.warn("No user record found for:", identifier);
        resetProfileData();
        return;
      }

      console.log("Profile data fetched:", data);
      setProfileData({
        email: data.email || "",
        name: data.name || "",
        profileImage: data.profile_image_url || defaultProfile,
        userId: data.id || null,
      });

      const onboarded = !!data.name && !!data.email && !!data.profile_image_url;
      setIsOnboarded(onboarded);
      setProfileLoading(false);
      console.log("Profile updated in state:", profileData, "Onboarded:", onboarded);
    } catch (err) {
      console.warn("Unexpected error fetching profile:", err);
      resetProfileData();
    }
  }, [resetProfileData, profileData]);

  const fetchSession = useCallback(async () => {
    console.log("fetchSession(): Checking session...");
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || !session.user?.id) {
      console.warn("No active session found.");
      resetProfileData();
      return;
    }

    setAuthUser(session.user);
    setIsVerified(true);
    console.log("Session found. User is verified:", session.user);
  }, [resetProfileData]);

  useEffect(() => {
    fetchSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext.onAuthStateChange(): event:", event, "session:", session);
        if (event === "SIGNED_IN" && session?.user?.id) {
          setAuthUser(session.user);
          setIsVerified(true);
          console.log("AuthUser after sign-in:", session.user.id);
          const ensuredUser = await createUserIfNotExists(session.user.id, session.user.email);
          if (!ensuredUser) {
            resetProfileData();
            return;
          }
          await fetchUserProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          resetProfileData();
        }
      }
    );

    return () => subscription?.unsubscribe?.();
  }, [fetchSession, createUserIfNotExists, fetchUserProfile, resetProfileData]);

  const updateUserProfile = async (newProfileData) => {
    console.log("updateUserProfile(): Attempting profile update with:", newProfileData);
    if (!authUser?.id) {
      console.warn("No authUser present. Re-checking session...");
      await fetchSession();
      if (!authUser?.id) {
        console.error("Still no authUser after re-checking session. Cannot update profile.");
        return;
      }
    }

    const email = newProfileData.email || profileData.email || "";
    const name = newProfileData.name || profileData.name || "";
    const profile_image_url = newProfileData.profile_image_url || profileData.profileImage || "";

    console.log("updateUserProfile(): Performing upsert...");
    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: profileData.userId || authUser.id,
        email,
        name,
        profile_image_url,
      })
      .select("id, email, name, profile_image_url")
      .single();

    console.log("updateUserProfile(): Upsert result:", { data, error });
    if (error) {
      console.warn("Error updating user profile:", error);
      throw error;
    }

    setProfileData({
      email: data.email,
      name: data.name,
      profileImage: data.profile_image_url,
      userId: data.id,
    });

    const onboarded = !!data.name && !!data.email && !!data.profile_image_url;
    setIsOnboarded(onboarded);

    console.log("Profile updated successfully:", data, "Onboarded:", onboarded);
  };

  const refreshProfile = async () => {
    if (authUser?.id) {
      console.log("refreshProfile(): Refreshing profile for user:", authUser.id);
      await fetchUserProfile(authUser.id);
      console.log("After refresh, profileData:", profileData, "isOnboarded:", isOnboarded);
    } else {
      console.warn("refreshProfile(): No authUser available.");
    }
  };

  const deleteUser = async () => {
    if (!authUser?.id) return;
    console.log("deleteUser(): Deleting user from DB:", authUser.id);
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", authUser.id);

    if (deleteError) {
      console.warn("Error deleting user from DB:", deleteError);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("Error signing out user:", signOutError);
      return;
    }

    resetProfileData();
    console.log("User deleted and signed out.");
  };

  console.log("AuthContext: Current state:", {
    authUser,
    isVerified,
    isOnboarded,
    profileData,
    profileLoading,
  });

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isVerified,
        isOnboarded,
        profileData,
        profileLoading,
        updateUserProfile,
        refreshProfile,
        deleteUser,
        setIsVerified,
        setIsOnboarded,
        fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
