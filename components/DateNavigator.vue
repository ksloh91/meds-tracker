<template>
  <div class="flex items-center justify-between p-2 bg-base-200 rounded-box mb-6">
    <button @click="changeWeek(-1)" class="btn btn-ghost btn-sm">&lt;</button>
    <div class="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
      <div v-for="day in week" :key="day.date.toISOString()" @click="selectDate(day.date)"
           :class="['text-center p-2 rounded-lg cursor-pointer flex-shrink-0', { 'bg-primary text-primary-content': isSelected(day.date) }]">
        <div class="text-xs">{{ day.dayName }}</div>
        <div class="font-bold text-lg">{{ day.dayNumber }}</div>
      </div>
    </div>
    <button @click="changeWeek(1)" class="btn btn-ghost btn-sm">&gt;</button>
    <button @click="goToToday" class="btn btn-ghost btn-sm ml-2">Today</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: Date;
}>();

const emit = defineEmits(['update:modelValue']);

// Use a local ref to manage the "view" of the calendar (which week is shown)
const viewDate = ref(new Date(props.modelValue.getTime()));

// If the parent changes the selected date, update our view
watch(() => props.modelValue, (newDate) => {
  viewDate.value = new Date(newDate.getTime());
});

const week = computed(() => {
  // Start the week on Sunday for calculation purposes
  const startOfWeek = new Date(viewDate.value);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      dayName: date.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: date.getDate(),
    });
  }
  return days;
});

const isSelected = (date: Date) => {
  return date.toDateString() === props.modelValue.toDateString();
};

const selectDate = (date: Date) => {
  // Tell the parent component that the selected date has changed
  emit('update:modelValue', new Date(date));
};

const changeWeek = (direction: number) => {
  const newDate = new Date(viewDate.value);
  newDate.setDate(newDate.getDate() + 7 * direction);
  viewDate.value = newDate;
};

const goToToday = () => {
  const today = new Date();
  viewDate.value = today;
  emit('update:modelValue', today);
};
</script>
