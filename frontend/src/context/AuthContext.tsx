import React, { createContext, useState, useContext } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  totalPoints: number;
  completedChallenges: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updatePoints: (additionalPoints: number) => void;
  completeChallenge: (challengeId: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ecotrace_token'));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('ecotrace_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem('ecotrace_token'));

  React.useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('ecotrace_token');
      if (storedToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          const data = await response.json();
          if (response.ok && data.success) {
            setUser(data.user);
            localStorage.setItem('ecotrace_user', JSON.stringify(data.user));
          } else {
            // Token expired or invalid, clear session
            setToken(null);
            setUser(null);
            localStorage.removeItem('ecotrace_token');
            localStorage.removeItem('ecotrace_user');
          }
        } catch (error) {
          console.error('Session verification error:', error);
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('ecotrace_token', data.token);
        localStorage.setItem('ecotrace_user', JSON.stringify(data.user));
        return { success: true, message: 'Logged in successfully.' };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server is currently unreachable.' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('ecotrace_token', data.token);
        localStorage.setItem('ecotrace_user', JSON.stringify(data.user));
        return { success: true, message: 'Registered successfully.' };
      } else {
        return { success: false, message: data.message || 'Registration failed.' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Server is currently unreachable.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ecotrace_token');
    localStorage.removeItem('ecotrace_user');
  };

  const updatePoints = (additionalPoints: number) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updated = {
        ...prevUser,
        totalPoints: prevUser.totalPoints + additionalPoints,
        completedChallenges: prevUser.completedChallenges || [],
      };
      localStorage.setItem('ecotrace_user', JSON.stringify(updated));
      return updated;
    });
  };

  const completeChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/footprint/challenges/${challengeId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser((prevUser) => {
          if (!prevUser) return null;
          const updated = {
            ...prevUser,
            totalPoints: data.data.totalPoints,
            completedChallenges: data.data.completedChallenges,
          };
          localStorage.setItem('ecotrace_user', JSON.stringify(updated));
          return updated;
        });
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Failed to complete challenge.' };
      }
    } catch (error) {
      console.error('Complete challenge error:', error);
      return { success: false, message: 'Server is currently unreachable.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updatePoints,
        completeChallenge,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
