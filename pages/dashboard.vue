<template>
  <div class="p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Your Medications</h1>
        <!-- Changed to call a function -->
        <button class="btn btn-primary" @click="openAddModal">
          Add Medication
        </button>
      </div>

      <!-- Medication List -->
      <div class="bg-base-100 p-4 rounded-box shadow">
        <div v-if="medications.length > 0" class="space-y-2">
          <div v-for="med in medications" :key="med.id" class="flex justify-between items-center p-2 rounded-lg hover:bg-base-200">
            <div>
              <p class="font-bold">{{ med.name }}</p>
              <p class="text-sm text-gray-500">{{ med.dosage }} {{ med.unit }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <div v-for="time in med.schedule" :key="time" class="badge badge-accent">
                  {{ time }}
                </div>
              </div>
            </div>
            <!-- Container for Edit/Delete buttons -->
            <div class="flex gap-2">
              <button @click="openEditModal(med)" class="btn btn-xs btn-outline btn-info">Edit</button>
              <button @click="handleDelete(med.id)" class="btn btn-xs btn-error btn-outline">Delete</button>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">You have no medications yet.</p>
      </div>

      <div class="text-center mt-8">
        <button @click="handleSignOut" class="btn btn-sm btn-ghost">Sign Out</button>
      </div>
    </div>

    <!-- Reusable Add/Edit Modal -->
    <dialog id="med_modal" class="modal">
      <div class="modal-box">
        <!-- Dynamic Title -->
        <h3 class="font-bold text-lg mb-4">{{ editingMedId ? 'Edit' : 'Add a New' }} Medication</h3>
        <!-- Changed submit handler -->
        <form @submit.prevent="handleSaveMedication">
          <!-- Name Input -->
          <div class="form-control">
            <label class="label"><span class="label-text">Medication Name</span></label>
            <input v-model="medName" type="text" placeholder="e.g., Paracetamol" class="input input-bordered" required />
          </div>

          <!-- Dosage and Unit Inputs -->
          <div class="form-control mt-4">
            <label class="label"><span class="label-text">Dosage</span></label>
            <div class="flex gap-2">
              <input v-model="medDosage" type="number" placeholder="e.g., 1" class="input input-bordered w-1/2" required />
              <select v-model="medUnit" class="select select-bordered w-1/2">
                <option v-for="unitOption in unitOptions" :key="unitOption" :value="unitOption">
                  {{ unitOption }}
                </option>
              </select>
            </div>
          </div>

          <!-- Schedule Times Input -->
          <div class="form-control mt-4">
            <label class="label"><span class="label-text">Schedule Times</span></label>
            <div v-for="(time, index) in newMedSchedule" :key="index" class="flex items-center gap-2 mb-2">
              <input v-model="newMedSchedule[index]" type="time" class="input input-bordered w-full" required />
              <button @click="removeTime(index)" type="button" class="btn btn-sm btn-error btn-outline" :disabled="newMedSchedule.length <= 1">&times;</button>
            </div>
            <button @click="addTime" type="button" class="btn btn-sm btn-block btn-ghost mt-2">Add Time</button>
          </div>

          <div class="modal-action">
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn" onclick="med_modal.close()">Close</button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, type Unsubscribe, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Medication } from '~/types';

const { $auth, $firestore } = useNuxtApp();
const medications = ref<Medication[]>([]);
let unsubscribe: Unsubscribe | null = null;

// --- State for the modal ---
const editingMedId = ref<string | null>(null); // To track if we are editing
const medName = ref('');
const medDosage = ref('');
const unitOptions = ['tablet(s)', 'capsule(s)', 'mg', 'ml', 'packet(s)', 'tablespoon(s)', 'teaspoon(s)', 'spray(s)', 'drop(s)'];
const medUnit = ref(unitOptions[0]);
const newMedSchedule = ref(['08:00']);

const getModal = () => document.getElementById('med_modal') as HTMLDialogElement | null;

// --- Modal and Form Functions ---
const resetForm = () => {
  editingMedId.value = null;
  medName.value = '';
  medDosage.value = '';
  medUnit.value = unitOptions[0];
  newMedSchedule.value = ['08:00'];
};

const addTime = () => {
  newMedSchedule.value.push('20:00'); 
};

const removeTime = (index: number) => {
  // Prevent removing the last item
  if (newMedSchedule.value.length > 1) {
    newMedSchedule.value.splice(index, 1);
  }
};

const openAddModal = () => {
  resetForm();
  getModal()?.showModal();
};

const openEditModal = (med: Medication) => {
  editingMedId.value = med.id;
  medName.value = med.name;
  medDosage.value = med.dosage;
  medUnit.value = med.unit;
  newMedSchedule.value = [...med.schedule]; // Create a copy
  getModal()?.showModal();
};

const handleSaveMedication = async () => {
  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  const medData = {
    name: medName.value,
    dosage: medDosage.value,
    unit: medUnit.value,
    schedule: newMedSchedule.value,
    userId: currentUser.uid,
  };

  if (editingMedId.value) {
    // Update existing medication
    const medRef = doc($firestore, 'medications', editingMedId.value);
    await updateDoc(medRef, medData);
  } else {
    // Add new medication
    await addDoc(collection($firestore, 'medications'), medData);
  }

  getModal()?.close();
  resetForm();
};

// --- Firestore and Auth Functions ---
onMounted(() => {
  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  const medCollection = collection($firestore, 'medications');
  const q = query(medCollection, where('userId', '==', currentUser.uid));

  unsubscribe = onSnapshot(q, (querySnapshot) => {
    medications.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Medication));
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const handleDelete = async (medicationId: string) => {
  const medRef = doc($firestore, 'medications', medicationId);
  await deleteDoc(medRef);
};

const handleSignOut = async () => {
  await signOut($auth);
};
</script> 