import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("fleetflow_user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem(
        "fleetflow_user"
      );

      localStorage.removeItem(
        "fleetflow_token"
      );

      return null;
    }
  });


  const [loading, setLoading] = useState(true);


  /*
   * Check whether the saved token is still valid.
   */
  useEffect(() => {

    const verifySession = async () => {

      const token =
        localStorage.getItem(
          "fleetflow_token"
        );

      const savedUser =
        localStorage.getItem(
          "fleetflow_user"
        );


      if (!token || !savedUser) {
        setUser(null);
        setLoading(false);
        return;
      }


      try {

        const response =
          await api.get("/auth/me");


        const currentUser = {
          user_id:
            response.data.user_id,

          role:
            response.data.role,
        };


        localStorage.setItem(
          "fleetflow_user",
          JSON.stringify(currentUser)
        );


        setUser(currentUser);

      } catch (error) {

        console.error(
          "Authentication session expired."
        );


        localStorage.removeItem(
          "fleetflow_token"
        );

        localStorage.removeItem(
          "fleetflow_user"
        );

        setUser(null);

      } finally {

        setLoading(false);

      }
    };


    verifySession();

  }, []);


  const login = async (
    userId,
    password
  ) => {

    const response =
      await api.post(
        "/auth/login",
        {
          user_id: userId,
          password: password,
        }
      );


    const loginData =
      response.data;


    localStorage.setItem(
      "fleetflow_token",
      loginData.access_token
    );


    const userData = {
      user_id:
        loginData.user_id,

      role:
        loginData.role,
    };


    localStorage.setItem(
      "fleetflow_user",
      JSON.stringify(userData)
    );


    setUser(userData);


    return loginData;
  };


  const logout = () => {

    localStorage.removeItem(
      "fleetflow_token"
    );

    localStorage.removeItem(
      "fleetflow_user"
    );

    setUser(null);
  };


  const hasRole = (...allowedRoles) => {

    if (!user) {
      return false;
    }

    return allowedRoles
      .map((role) =>
        role.toUpperCase()
      )
      .includes(
        user.role?.toUpperCase()
      );
  };


  const value = {
    user,

    login,

    logout,

    hasRole,

    isAuthenticated:
      Boolean(user),

    loading,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {

  return useContext(
    AuthContext
  );
}