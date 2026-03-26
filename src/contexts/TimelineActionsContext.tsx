import { createContext, useContext, useState } from "react";

interface TimelineActionsContextType {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  activityOpen: boolean;
  setActivityOpen: (open: boolean) => void;
  activityUnreadCount: number;
  setActivityUnreadCount: (count: number) => void;
}

const TimelineActionsContext = createContext<TimelineActionsContextType>({
  createOpen: false,
  setCreateOpen: () => {},
  activityOpen: false,
  setActivityOpen: () => {},
  activityUnreadCount: 0,
  setActivityUnreadCount: () => {},
});

export const useTimelineActions = () => useContext(TimelineActionsContext);

export const TimelineActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  return (
    <TimelineActionsContext.Provider value={{ createOpen, setCreateOpen, activityOpen, setActivityOpen, activityUnreadCount, setActivityUnreadCount }}>
      {children}
    </TimelineActionsContext.Provider>
  );
};
