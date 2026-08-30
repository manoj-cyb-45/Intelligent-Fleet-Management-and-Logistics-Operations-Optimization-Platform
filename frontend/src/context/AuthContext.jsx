import { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("fleetflow_user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("fleetflow_user");
      return null;
    }
  });

  const login = async (userId, password) => {
    const response = await api.post("/auth/login", {
      user_id: userId,
      password: password,
    });

    const loginData = response.data;

    localStorage.setItem(
      "fleetflow_token",
      loginData.access_token
    );

    const userData = {
      user_id: loginData.user_id,
      role: loginData.role,
    };

    localStorage.setItem(
      "fleetflow_user",
      JSON.stringify(userData)
    );

    setUser(userData);

    return loginData;
  };

  const logout = () => {
    localStorage.removeItem("fleetflow_token");
    localStorage.removeItem("fleetflow_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}