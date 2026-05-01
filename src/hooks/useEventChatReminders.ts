import { useEffect, useRef } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ChatService } from "@/services/chat";
import { markEventNotified } from "@/services/athleteEventsService";
import { getAssignmentsByAthlete } from "@/services/workoutAssignmentsService";
import { getUserById, getUsersByRole } from "@/services/usersService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AthleteEvent } from "@/types/athleteEvent";

const THRESHOLDS = [14, 7, 3, 1, 0];

export const useEventChatReminders = (
  athleteId: string | undefined,
  events: AthleteEvent[]
): void => {
  const { t } = useLanguage();
  const reminders = t.athlete.events.reminders;

  const buildMessage = (event: AthleteEvent, days: number): string => {
    if (days === 0) return reminders.today.replace("{{title}}", event.title);
    if (days === 1) return reminders.tomorrow.replace("{{title}}", event.title);
    return reminders.days.replace("{{count}}", String(days)).replace("{{title}}", event.title);
  };

  const ranRef = useRef(false);

  useEffect(() => {
    if (!athleteId || events.length === 0 || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const assignments = await getAssignmentsByAthlete(athleteId);
        let coachId = assignments[0]?.assignedBy;
        let coachName = "Coach";

        if (!coachId) {
          const admins = await getUsersByRole("admin");
          coachId = admins[0]?.id;
          coachName = admins[0]?.displayName || "Coach";
        } else {
          const coach = await getUserById(coachId);
          coachName = coach?.displayName || "Coach";
        }

        if (!coachId) return;

        const athlete = await getUserById(athleteId);
        const athleteName = athlete?.displayName || "Athlete";

        for (const event of events) {
          const days = differenceInCalendarDays(event.eventDate, new Date());
          if (days < 0) continue;
          const threshold = THRESHOLDS.find((th) => days === th);
          if (threshold === undefined) continue;
          if ((event.notifiedDays ?? []).includes(threshold)) continue;

          const chat = await ChatService.createOrGetChat(athleteId, athleteName, coachId);
          await ChatService.sendMessage(
            chat.id,
            coachId,
            buildMessage(event, threshold),
            coachName
          );
          await markEventNotified(event.id, threshold);
        }
      } catch (e) {
        console.warn("Event reminders skipped:", e);
      }
    })();
  }, [athleteId, events]);
};
