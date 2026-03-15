"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types/database";

interface UserRoleContextValue {
  role: UserRole;
  userName: string;
  assignedStage: string | null;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  role: "worker",
  userName: "",
  assignedStage: null,
});

export function UserRoleProvider({
  role,
  userName,
  assignedStage,
  children,
}: UserRoleContextValue & { children: React.ReactNode }) {
  return (
    <UserRoleContext.Provider value={{ role, userName, assignedStage }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(UserRoleContext);
}
