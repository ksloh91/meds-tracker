<template>
  <div class="hero min-h-screen">
    <div class="hero-content flex-col lg:flex-row-reverse">
      <div class="text-center lg:text-left">
        <h1 class="text-5xl font-bold">Login now!</h1>
        <p class="py-6">
          Welcome to Meds Tracker. Please log in to continue.
        </p>
      </div>
      <div class="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
        <form class="card-body" @submit.prevent="handleLogin">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="email"
              class="input input-bordered"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Password</span>
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="password"
              class="input input-bordered"
              required
            />
          </div>
          <p v-if="errorMessage" class="text-error text-sm mt-2">
            {{ errorMessage }}
          </p>
          <div class="form-control mt-6">
            <button type="submit" class="btn btn-primary">Login / Sign Up</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

const email = ref('');
const password = ref('');
const errorMessage = ref('');

const { $auth } = useNuxtApp();

const handleLogin = async () => {
  errorMessage.value = '';
  try {
    // 1. Attempt to sign in
    await signInWithEmailAndPassword($auth, email.value, password.value);
    
    // On success, navigate to the dashboard
    navigateTo('/dashboard');

  } catch (error: any) {
    // 2. If user doesn't exist, try to create an account
    if (error.code === 'auth/user-not-found') {
      try {
        await createUserWithEmailAndPassword($auth, email.value, password.value);
        
        // On success, navigate to the dashboard
        navigateTo('/dashboard');

      } catch (signUpError: any) {
        errorMessage.value = 'Error: ' + signUpError.message;
      }
    } else {
      // 3. Handle all other errors
      errorMessage.value = 'Error: ' + error.message;
    }
  }
};
</script>