import React, { createContext, useState, useContext } from 'react';

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  const addActivity = (activity) => {
    setActivities((prevActivities) => [activity, ...prevActivities]);
  };

  const getActivitiesByDealId = (dealId) => {
    return activities.filter((activity) => activity.dealId === dealId);
  };

  const getActivitiesByUser = (userId) => {
    return activities.filter((activity) => activity.userId === userId);
  };

  const resetActivitiesForDeal = (dealId) => {
    setActivities((prevActivities) =>
      prevActivities.filter((activity) => activity.dealId !== dealId)
    );
  };

  return (
    <ActivityContext.Provider
      value={{
        activities,
        addActivity,
        getActivitiesByDealId,
        getActivitiesByUser,
        resetActivitiesForDeal,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
