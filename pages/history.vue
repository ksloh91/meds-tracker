<template>
  <div class="p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Medication History</h1>
        <button class="btn btn-primary" @click="navigateTo('/dashboard')">
          Back to Dashboard
        </button>
      </div>

      <div class="bg-base-100 p-4 rounded-box shadow">
        <div v-if="doses.length > 0" class="space-y-2">
          <div v-for="dose in formattedDoses" :key="dose.id" class="flex justify-between items-center p-2 rounded-lg hover:bg-base-200">
            <div>
              <p class="font-bold">{{ dose.medicationName }}</p>
              <p class="text-sm text-gray-500">{{ dose.takenAt }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">You have no medication history yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { collection, query, where, onSnapshot, type Unsubscribe, orderBy } from 'firebase/firestore';
import type { Dose, Medication } from '~/types';

const { $auth, $firestore } = useNuxtApp();

const doses = ref<Dose[]>([]);
const medications = ref<Medication[]>([]);
let dosesUnsubscribe: Unsubscribe | null = null;
let medsUnsubscribe: Unsubscribe | null = null;

const formattedDoses = computed(() => {
  return doses.value.map(dose => {
    const med = medications.value.find(m => m.id === dose.medicationId);
    return {
      ...dose,
      medicationName: med ? med.name : 'Unknown Medication',
      takenAt: new Date(dose.takenAt).toLocaleString(),
    };
  });
});

onMounted(() => {
  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  // Fetch medications to map IDs to names
  const medCollection = collection($firestore, 'medications');
  const medQuery = query(medCollection, where('userId', '==', currentUser.uid));
  medsUnsubscribe = onSnapshot(medQuery, (querySnapshot) => {
    medications.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Medication));
  });

  // Fetch doses
  const doseCollection = collection($firestore, 'doses');
  const doseQuery = query(doseCollection, where('userId', '==', currentUser.uid), orderBy('takenAt', 'desc'));
  dosesUnsubscribe = onSnapshot(doseQuery, (querySnapshot) => {
    doses.value = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        takenAt: data.takenAt.toDate(), // Convert Firestore Timestamp to JS Date
      } as Dose;
    });
  });
});

onUnmounted(() => {
  if (dosesUnsubscribe) dosesUnsubscribe();
  if (medsUnsubscribe) medsUnsubscribe();
});
</script>
