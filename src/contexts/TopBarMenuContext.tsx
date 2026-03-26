import { createContext, useContext, useState } from "react";

interface TopBarMenuContextType {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const TopBarMenuContext = createContext<TopBarMenuContextType>({
  isMenuOpen: false,
  setIsMenuOpen: () => {},
});

export const useTopBarMenu = () => useContext(TopBarMenuContext);

export const TopBarMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <TopBarMenuContext.Provider value={{ isMenuOpen, setIsMenuOpen }}>
      {children}
    </TopBarMenuContext.Provider>
  );
};
