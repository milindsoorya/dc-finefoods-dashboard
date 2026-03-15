"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types/database";

interface UserRoleContextValue {
  role: UserRole;
  userName: string;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  role: "worker",
  userName: "",
});

export function UserRoleProvider({
  role,
  userName,
  children,
}: UserRoleContextValue & { children: React.ReactNode }) {
  return (
    <UserRoleContext.Provider value={{ role, userName }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(UserRoleContext);
}
