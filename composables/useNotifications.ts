import { LocalNotifications } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';
import type { Medication } from '~/types';

export const useNotifications = () => {
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
        
        let id = '';
        const medIdPart = med.id.replace(/[^0-9]/g, '');
        id += medIdPart.slice(-4);
        id += index.toString();
        const numericId = parseInt(id, 10);

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
            medicationId: med.id
          },
          smallIcon: 'ic_stat_icon_name',
          sound: 'default'
        };
      });
      await Toast.show({ text: 'notificationsToSchedule:' + JSON.stringify(notificationsToSchedule) });
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule,
        });
        await Toast.show({ text: `SUCCESS: Scheduled ${notificationsToSchedule.length} reminders!` });
      }

    } catch (error: any) {
      await Toast.show({ text: `!!! NOTIFICATION ERROR: ${error.message}` });
      console.error("Error scheduling notifications:", error);
    }
  };

  return {
    scheduleMedicationReminders,
    cancelMedicationReminders,
    requestPermissions,
  };
}; 