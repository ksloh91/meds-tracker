<template>
  <dialog :id="modalId" class="modal">
    <div class="modal-box" v-if="item">
      <div class="text-center">
        <h2 class="text-2xl font-bold">{{ item.medication.name }}</h2>
        <p v-if="item.dose?.status === 'taken'" class="text-green-500">Taken at {{ formattedActionAt }}</p>
        <p v-else-if="item.dose?.status === 'skipped'" class="text-yellow-500">Skipped at {{ formattedActionAt }}</p>
        <p v-else-if="isPast" class="text-red-500">Missed</p>
        <p v-else class="text-blue-500">Pending</p>
      </div>

      <div class="mt-6 space-y-4">
        <div class="flex items-center">
          <span class="mr-4">🗓️</span>
          <p>Scheduled for {{ item.time }}, {{ formattedScheduledDate }}</p>
        </div>
        <div class="flex items-center">
          <span class="mr-4">💊</span>
          <p>{{ item.medication.dosage }} {{ item.medication.unit }}</p>
        </div>
      </div>

      <div class="modal-action justify-center mt-6 grid grid-cols-3 gap-2">
        <template v-if="item.status === 'pending' || item.status === 'missed'">
          <button @click="$emit('skip', item, item.time)" class="btn btn-ghost">Skip</button>
          <button @click="$emit('take', item, item.time)" class="btn btn-primary">Take</button>
          <button @click="$emit('reschedule', item)" class="btn btn-ghost">Reschedule</button>
        </template>
        <template v-else-if="item.status === 'taken'">
          <button @click="$emit('un-take', item.dose.id)" class="btn btn-primary col-span-3">Un-take</button>
        </template>
        <template v-else-if="item.status === 'skipped'">
          <div></div>
          <button @click="$emit('take', item, item.time)" class="btn btn-primary col-start-2">Take</button>
          <div></div>
          <!-- <button @click="$emit('un-take', item.dose.id)" class="btn btn-ghost col-span-2">Un-skip</button> -->
        </template>
      </div>

      <div class="modal-action">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="$emit('close')">✕</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Medication, Dose } from '~/types';

interface ScheduleItem {
  medication: Medication;
  dose: Dose | null;
  time: string;
}

const props = defineProps<{
  item: ScheduleItem | null;
  isPast: boolean;
}>();

defineEmits(['close', 'skip', 'take', 'un-take', 'reschedule']);

const modalId = 'medication_detail_modal';

const formattedActionAt = computed(() => {
  if (!props.item?.dose?.actionAt) return '';
  const date = new Date(props.item.dose.actionAt);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${time}, ${dateStr}`;
});

const formattedScheduledDate = computed(() => {
  if (!props.item) return '';
  const now = new Date();
  return now.toLocaleDateString([], { month: 'long', day: 'numeric' });
});
</script>
