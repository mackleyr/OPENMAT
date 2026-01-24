import React, { useState } from "react";
import Profile from "./screens/Profile";
import Inbox from "./screens/Inbox";
import "./styles.css";

const TABS = {
  PROFILE: "PROFILE",
  INBOX: "INBOX",
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

const DEFAULT_USER_ID = 1;

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>(TABS.PROFILE);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setIsCreateOpen(false);
  };

  const handleCreateClick = () => {
    setActiveTab(TABS.PROFILE);
    setIsCreateOpen(true);
  };

  const content = (
    <div className="app">
      <header className="top-bar">
        <button
          className={activeTab === TABS.PROFILE ? "tab active" : "tab"}
          onClick={() => handleTabChange(TABS.PROFILE)}
          type="button"
        >
          Profile
        </button>
        <button
          className={activeTab === TABS.INBOX ? "tab active" : "tab"}
          onClick={() => handleTabChange(TABS.INBOX)}
          type="button"
        >
          Inbox
        </button>
      </header>

      <main className="content">
        {activeTab === TABS.PROFILE ? (
          <Profile
            userId={DEFAULT_USER_ID}
            isCreateOpen={isCreateOpen}
            onCreateClosed={() => setIsCreateOpen(false)}
          />
        ) : (
          <Inbox userId={DEFAULT_USER_ID} />
        )}
      </main>

      <button className="floating-button" onClick={handleCreateClick} type="button">
        +
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="desktopShell">
        <div className="deviceFrame">{content}</div>
      </div>
    );
  }

  return content;
};

export default App;
