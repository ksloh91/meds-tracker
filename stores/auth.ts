import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { User } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const isAuthReady = ref(false);

  // Getters
  const isLoggedIn = computed(() => !!user.value);

  // Actions
  function setAuth(newUser: User | null) {
    user.value = newUser;
    // Once this runs for the first time, we know Firebase has initialized.
    if (isAuthReady.value === false) {
      isAuthReady.value = true;
    }
  }

  return {
    user,
    isAuthReady,
    isLoggedIn,
    setAuth,
  };
}); 