import { User, Streak } from "@shared/api";

interface AuthResponse {
    user: User;
    streaks?: Streak;
}

export const authService = {
    async login(email: string, password: string): Promise<User> {
        console.log('🔵 [AUTH SERVICE] login() called for:', email);
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });
        console.log('🔵 [AUTH SERVICE] login response status:', response.status);

        if (!response.ok) {
            const error = await response.json();
            console.error('🔴 [AUTH SERVICE] login failed:', error);
            throw new Error(error.message || "Login failed");
        }

        const user = await response.json();
        console.log('🟢 [AUTH SERVICE] login successful, user:', user);
        return user;
    },

    async signup(
        name: string,
        email: string,
        password: string,
        examType?: string,
        preparationStage?: string,
        gender?: string
    ): Promise<User> {
        const response = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email,
                password,
                examType,
                preparationStage,
                gender,
            }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Signup failed");
        }

        return response.json();
    },

    async logout(): Promise<void> {
        await fetch("/api/auth/logout", {
            method: "POST",
            credentials: 'include',
        });
    },

    async getCurrentUser(): Promise<AuthResponse | null> {
        console.log('🔵 [AUTH SERVICE] getCurrentUser() called');
        try {
            const response = await fetch("/api/auth/me", {
                credentials: 'include',
            });
            console.log('🔵 [AUTH SERVICE] getCurrentUser response status:', response.status);
            if (!response.ok) {
                console.log('🔴 [AUTH SERVICE] getCurrentUser failed, status:', response.status);
                return null;
            }
            const data = await response.json();
            console.log('🟢 [AUTH SERVICE] getCurrentUser successful:', data);
            return data;
        } catch (error) {
            console.error('🔴 [AUTH SERVICE] getCurrentUser error:', error);
            return null;
        }
    },

    async updateProfile(data: { name?: string; examType?: string; preparationStage?: string; gender?: string }): Promise<User> {
        const response = await fetch("/api/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update profile");
        }

        return response.json();
    },

    async getLoginHistory(): Promise<{ timestamp: string }[]> {
        try {
            const response = await fetch("/api/auth/login-history", {
                credentials: 'include',
            });
            if (!response.ok) return [];
            return response.json();
        } catch (error) {
            console.error('getLoginHistory error:', error);
            return [];
        }
    },
};
