<template>
  <div class="p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Your Medications</h1>
        <div class="flex gap-2">
          <button class="btn btn-secondary" @click="navigateTo('/history')">View History</button>
          <button class="btn btn-primary" @click="openAddModal">
            Add Medication
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div role="tablist" class="tabs tabs-boxed mb-6">
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'today' }" @click="activeTab = 'today'">Today</a>
        <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'all' }" @click="activeTab = 'all'">All Medications</a>
      </div>

      <!-- Today's Medication List -->
      <div v-if="activeTab === 'today'" class="bg-base-100 p-4 rounded-box shadow">
        <div v-if="todaysMedications.length > 0" class="space-y-4">
          <div v-for="group in todaysMedications" :key="group.time">
            <h2 class="text-xl font-bold mb-2">{{ group.time }}</h2>
            <div class="space-y-2">
              <div v-for="med in group.meds" :key="med.medication.id" @click="openDetailModal(med, group.time)" class="flex justify-between items-center p-2 rounded-lg hover:bg-base-200 cursor-pointer">
                <div>
                  <p class="font-bold">{{ med.medication.name }}</p>
                  <p class="text-sm text-gray-500">{{ med.medication.dosage }} {{ med.medication.unit }}</p>
                </div>
                <div class="flex gap-2 items-center">
                  <p v-if="med.status === 'taken'" class="text-sm text-green-500">Taken at: {{ formatTime(med.actionAt) }}</p>
                  <p v-else-if="med.status === 'skipped'" class="text-sm text-yellow-500">Skipped at: {{ formatTime(med.actionAt) }}</p>
                  <p v-else-if="med.status === 'missed'" class="text-sm text-red-500">Missed</p>
                  <p v-else class="text-sm text-blue-500">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">You have no medications scheduled for today.</p>
      </div>

      <!-- All Medications List -->
      <div v-if="activeTab === 'all'" class="bg-base-100 p-4 rounded-box shadow">
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
            <div class="flex gap-2">
              <button @click="openEditModal(med)" class="btn btn-xs btn-outline btn-info">Edit</button>
              <button @click="handleDeleteMedication(med.id)" class="btn btn-xs btn-error btn-outline">Delete</button>
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
        <h3 class="font-bold text-lg mb-4">{{ editingMedId ? 'Edit' : 'Add a New' }} Medication</h3>
        <form @submit.prevent="handleSaveMedication">
          <!-- Form fields... -->
          <div class="form-control">
            <label class="label"><span class="label-text">Medication Name</span></label>
            <input v-model="medName" type="text" placeholder="e.g., Paracetamol" class="input input-bordered" required />
          </div>
          <div class="form-control mt-4">
            <label class="label"><span class="label-text">Dosage</span></label>
            <div class="flex gap-2">
              <input v-model="medDosage" type="number" placeholder="e.g., 1" class="input input-bordered w-1/2" required />
              <select v-model="medUnit" class="select select-bordered w-1/2">
                <option v-for="unitOption in unitOptions" :key="unitOption" :value="unitOption">{{ unitOption }}</option>
              </select>
            </div>
          </div>
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

    <MedicationDetailModal 
      :item="selectedMed" 
      :is-past="isPast(selectedMed?.time || '')"
      @close="closeDetailModal" 
      @un-take="handleUnTake"
      @take="handleDoseAction(selectedMed, selectedMed.time, 'taken')"
      @skip="handleDoseAction(selectedMed, selectedMed.time, 'skipped')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, type Unsubscribe, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Medication, Dose } from '~/types';
import { useNotifications } from '~/composables/useNotifications';
import { Toast } from '@capacitor/toast';
import MedicationDetailModal from '~/components/MedicationDetailModal.vue';

type ScheduleStatus = 'taken' | 'skipped' | 'missed' | 'pending';
interface ScheduleItem {
  medication: Medication;
  dose: Dose | null;
  time: string;
  status: ScheduleStatus;
  actionAt: Date | null;
}

const { $auth, $firestore } = useNuxtApp();
const { scheduleMedicationReminders, cancelMedicationReminders, requestPermissions } = useNotifications();
const medications = ref<Medication[]>([]);
const doses = ref<Dose[]>([]);
let medsUnsubscribe: Unsubscribe | null = null;
let dosesUnsubscribe: Unsubscribe | null = null;
let timeInterval: any = null;

const activeTab = ref('today');
const currentTime = ref(new Date());

const selectedMed = ref<ScheduleItem | null>(null);

const editingMedId = ref<string | null>(null);
const medName = ref('');
const medDosage = ref('');
const unitOptions = ['tablet(s)', 'capsule(s)', 'mg', 'ml', 'packet(s)', 'tablespoon(s)', 'teaspoon(s)', 'spray(s)', 'drop(s)'];
const medUnit = ref(unitOptions[0]);
const newMedSchedule = ref(['08:00']);

const getModal = (id: string) => document.getElementById(id) as HTMLDialogElement | null;

const isPast = (time: string) => {
  if (!time) return false;
  const now = currentTime.value;
  const [hours, minutes] = time.split(':').map(Number);
  const scheduleTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  return now > scheduleTime;
};

const formatTime = (date: Date | null) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const todaysDoses = computed(() => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return doses.value.filter(d => {
    const actionAt = new Date(d.actionAt);
    return actionAt >= startOfDay && actionAt < endOfDay;
  });
});

const todaysMedications = computed(() => {
  const todaySchedules: { time: string; meds: ScheduleItem[] }[] = [];
  const now = currentTime.value;

  medications.value.forEach(med => {
    med.schedule.forEach(time => {
      const dose = todaysDoses.value.find(d => d.medicationId === med.id && d.scheduledTime === time);
      
      let status: ScheduleStatus = 'pending';
      if (dose) {
        status = dose.status;
      } else if (isPast(time)) {
        status = 'missed';
      }

      let group = todaySchedules.find(g => g.time === time);
      if (!group) {
        group = { time, meds: [] };
        todaySchedules.push(group);
      }
      group.meds.push({ 
        medication: med, 
        dose: dose || null,
        status: status,
        actionAt: dose?.actionAt || null,
        time: time
      });
    });
  });

  return todaySchedules.sort((a, b) => a.time.localeCompare(b.time));
});

const openDetailModal = (med: ScheduleItem, time: string) => {
  selectedMed.value = { ...med, time };
  getModal('medication_detail_modal')?.showModal();
};

const closeDetailModal = () => {
  getModal('medication_detail_modal')?.close();
};

const handleUnTake = async (doseId: string) => {
  if (!doseId) return;
  await deleteDoc(doc($firestore, 'doses', doseId));
  closeDetailModal();
};

const handleDoseAction = async (item: ScheduleItem | null, time: string | undefined, status: 'taken' | 'skipped') => {
  const currentUser = $auth.currentUser;
  if (!currentUser || !item || !time) return;

  const dose: Dose = {
    medicationId: item.medication.id,
    medicationName: item.medication.name,
    userId: currentUser.uid,
    actionAt: new Date(),
    scheduledTime: time,
    status: status,
  };

  try {
    await addDoc(collection($firestore, 'doses'), dose);
    await Toast.show({
      text: `${item.medication.name} dose ${status}!`,
      duration: 'short'
    });
  } catch (error) {
    console.error(`Error recording dose as ${status}:`, error);
    await Toast.show({
      text: `Error recording dose as ${status}.`,
      duration: 'short'
    });
  }
  closeDetailModal();
};

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
  if (newMedSchedule.value.length > 1) {
    newMedSchedule.value.splice(index, 1);
  }
};

const openAddModal = () => {
  resetForm();
  getModal('med_modal')?.showModal();
};

const openEditModal = (med: Medication) => {
  editingMedId.value = med.id;
  medName.value = med.name;
  medDosage.value = med.dosage;
  medUnit.value = med.unit;
  newMedSchedule.value = [...med.schedule];
  getModal('med_modal')?.showModal();
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

  let savedMedId = editingMedId.value;

  if (editingMedId.value) {
    await updateDoc(doc($firestore, 'medications', editingMedId.value), medData);
  } else {
    const docRef = await addDoc(collection($firestore, 'medications'), medData);
    savedMedId = docRef.id;
  }

  if (savedMedId) {
    const medicationToSchedule: Medication = {
      id: savedMedId,
      ...medData
    };
    await scheduleMedicationReminders(medicationToSchedule);
  }

  getModal('med_modal')?.close();
  resetForm();
};

onMounted(async () => {
  await requestPermissions();

  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000); // Update every minute

  const currentUser = $auth.currentUser;
  if (!currentUser) return;

  // Fetch medications
  const medCollection = collection($firestore, 'medications');
  const medQuery = query(medCollection, where('userId', '==', currentUser.uid));
  medsUnsubscribe = onSnapshot(medQuery, (querySnapshot) => {
    medications.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Medication));
  });

  // Fetch today's doses
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const doseCollection = collection($firestore, 'doses');
  const doseQuery = query(doseCollection, where('userId', '==', currentUser.uid));
  dosesUnsubscribe = onSnapshot(doseQuery, (querySnapshot) => {
    doses.value = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        actionAt: data.actionAt.toDate(),
      } as Dose;
    });
  });
});

onUnmounted(() => {
  if (medsUnsubscribe) medsUnsubscribe();
  if (dosesUnsubscribe) dosesUnsubscribe();
  if (timeInterval) clearInterval(timeInterval);
});

const handleDeleteMedication = async (medicationId: string) => {
  await cancelMedicationReminders(medicationId);
  await deleteDoc(doc($firestore, 'medications', medicationId));
};

const handleSignOut = async () => {
  try {
    await signOut($auth);
    navigateTo('/');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
</script>
