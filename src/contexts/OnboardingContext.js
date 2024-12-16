// src/contexts/OnboardingContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './AuthContext';

export const OnboardingContext = createContext();

const OnboardingProvider = ({ children }) => {
  const { authUser, fetchSession } = useContext(AuthContext);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    console.log("OnboardingContext: Loading user profile:", userId);
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('phone_number, name, profile_image_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn("OnboardingContext: Error loading profile:", error.message);
      setProfileLoading(false);
      return;
    }

    if (data) {
      setPhoneNumber(data.phone_number || '');
      setName(data.name || '');
      setPhoto(data.profile_image_url || '');
      const complete = !!data.phone_number && !!data.name && !!data.profile_image_url;
      setIsOnboarded(complete);
    } else {
      console.warn("OnboardingContext: No user record found for:", userId);
      setIsOnboarded(false);
    }

    setProfileLoading(false);
  }, []);

  React.useEffect(() => {
    if (authUser?.id) {
      loadUserProfile(authUser.id);
    } else {
      setPhoneNumber('');
      setName('');
      setPhoto('');
      setIsOnboarded(false);
      setProfileLoading(false);
    }
  }, [authUser, loadUserProfile]);

  const updateUserProfileInDB = async () => {
    if (!authUser?.id) {
      console.warn("No authUser. Can't update profile.");
      return;
    }

    console.log("OnboardingContext: Updating user profile in DB with:", { phoneNumber, name, photo });
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        phone_number: phoneNumber,
        name: name,
        profile_image_url: photo
      })
      .select('id, phone_number, name, profile_image_url')
      .single();

    if (error) {
      console.error("OnboardingContext: Error updating profile:", error.message);
      throw error;
    }

    const complete = !!data.phone_number && !!data.name && !!data.profile_image_url;
    setIsOnboarded(complete);
    console.log("OnboardingContext: Profile updated successfully. Onboarded:", complete);
  };

  const completeOnboarding = async () => {
    console.log("OnboardingContext: completeOnboarding() started");
    if (!phoneNumber || !name || !photo) {
      console.warn("OnboardingContext: Missing data. Cannot complete onboarding.");
      return;
    }

    await updateUserProfileInDB();
    await fetchSession(); 
    await loadUserProfile(authUser.id);
    console.log("OnboardingContext: Onboarding complete. isOnboarded:", isOnboarded);
  };

  const refreshProfile = async () => {
    if (authUser?.id) {
      console.log("OnboardingContext: refreshProfile()");
      await loadUserProfile(authUser.id);
    } else {
      console.warn("OnboardingContext: No authUser, cannot refresh.");
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        phoneNumber,
        setPhoneNumber,
        name,
        setName,
        photo,
        setPhoto,
        isOnboarded,
        profileLoading,
        completeOnboarding,
        refreshProfile,
        updateUserProfileInDB
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingProvider;
