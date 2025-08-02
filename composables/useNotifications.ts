import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';
import type { Medication, Dose } from '~/types';
import { useNuxtApp } from '#app';
import { collection, addDoc } from 'firebase/firestore';

export const useNotifications = () => {
  const { $firestore, $auth } = useNuxtApp();
  
  const registerActionTypes = async () => {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'REMINDER_ACTIONS',
          actions: [
            { id: 'TAKE', title: 'Take' },
            { id: 'SNOOZE', title: 'Snooze for 5 mins' }
          ]
        }
      ]
    });
  };

  const addNotificationListeners = async () => {
    await LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction: ActionPerformed) => {
      const { actionId, notification } = notificationAction;
      const medication = notification.extra?.medication as Medication;
      const scheduledTime = notification.extra?.scheduledTime as string;

      if (actionId === 'TAKE') {
        // Mark as taken
        const currentUser = $auth.currentUser;
        if (currentUser && medication && scheduledTime) {
          const doseData: Dose = {
            medicationId: medication.id,
            medicationName: medication.name,
            userId: currentUser.uid,
            actionAt: new Date(),
            scheduledTime: scheduledTime,
            status: 'taken',
          };
          await addDoc(collection($firestore, 'doses'), doseData);
          await Toast.show({ text: `${medication.name} marked as taken.` });
        }
      } else if (actionId === 'SNOOZE') {
        // Snooze for 5 minutes
        const inFiveMinutes = new Date(Date.now() + 5 * 60 * 1000);
        await LocalNotifications.schedule({
          notifications: [{
            ...notification,
            id: notification.id,
            schedule: { at: inFiveMinutes },
          }]
        });
        await Toast.show({ text: `Snoozed ${medication?.name} for 5 minutes.` });
      }
    });
  };

  const requestPermissions = async () => {
    try {
      await Toast.show({ text: 'Checking permissions...' });
      let { display: currentStatus } = await LocalNotifications.checkPermissions();
      await Toast.show({ text: `Current status: ${currentStatus}` });

      if (currentStatus === 'prompt' || currentStatus === 'prompt-with-rationale') {
        await Toast.show({ text: 'Requesting new permissions...' });
        const { display: newStatus } = await LocalNotifications.requestPermissions();
        await Toast.show({ text: `New status: ${newStatus}` });
        return newStatus === 'granted';
      }

      // if already granted, return true
      // if already denied, this will correctly return false
      return currentStatus === 'granted';
    } catch (error: any) {
      await Toast.show({ text: `!!! PERMISSION CHECK ERROR: ${error.message}` });
      return false;
    }
  };

  const cancelMedicationReminders = async (medicationId: string) => {
    try {
        const pending = await LocalNotifications.getPending();
        const notificationsToCancel = pending.notifications.filter(
            notification => notification.extra?.medicationId === medicationId
        );
        if (notificationsToCancel.length > 0) {
            await Toast.show({ text: `Cancelling ${notificationsToCancel.length} old reminders.`});
            await LocalNotifications.cancel({ notifications: notificationsToCancel });
        }
    } catch(error: any) {
        await Toast.show({ text: `!!! CANCEL ERROR: ${error.message}` });
        console.error("Error cancelling notifications:", error);
    }
  };

  const scheduleMedicationReminders = async (med: Medication) => {
    try {
      await Toast.show({ text: `Scheduling for ${med.name}...` });

      // First, clear out any old reminders for this specific medication
      await cancelMedicationReminders(med.id);
      
      const notificationsToSchedule = med.schedule.map((time, index) => {
        const [hour, minute] = time.split(':').map(Number);
        
        // Simple unique ID generation
        const medIdPart = med.id.replace(/[^0-9]/g, '');
        const numericId = parseInt(medIdPart.slice(-4) + index.toString(), 10);

        return {
          id: numericId,
          title: `Time for your medication: ${med.name}`,
          body: `It's time to take your dose of ${med.dosage} ${med.unit}.`,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          extra: {
            medicationId: med.id,
            scheduledTime: time,
            medication: med, // Pass the whole medication object
          },
          actionTypeId: 'REMINDER_ACTIONS',
          smallIcon: 'ic_stat_icon_name',
          sound: 'default'
        };
      });
      await Toast.show({ text: 'notificationsToSchedule:' + JSON.stringify(notificationsToSchedule) });
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
        await Toast.show({ text: `SUCCESS: Scheduled ${notificationsToSchedule.length} reminders for ${med.name}!` });
      }
    } catch (error: any) {
      await Toast.show({ text: `!!! NOTIFICATION ERROR: ${error.message}` });
      console.error("Error scheduling notifications:", error);
    }
  };

  return {
    registerActionTypes,
    addNotificationListeners,
    scheduleMedicationReminders,
    cancelMedicationReminders,
    requestPermissions,
  };
};
