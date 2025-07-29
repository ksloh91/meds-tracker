import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();

  // If auth isn't ready yet, do nothing. This prevents redirect loops
  // on the initial page load while Firebase is checking the session.
  if (!authStore.isAuthReady) {
    return;
  }

  // Rule 1: If user is NOT logged in and tries to go somewhere other than the login page...
  if (!authStore.isLoggedIn && to.path !== '/') {
    console.log('User is not logged in, redirecting to login page');
    return navigateTo('/');
  }

  // Rule 2: If user IS logged in and tries to go to the login page...
  if (authStore.isLoggedIn && to.path === '/') {
    // ...redirect them to the dashboard.
    return navigateTo('/dashboard');
  }
});