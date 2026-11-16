import {
  parseISO,
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  getDaysInMonth,
  setDate,
} from 'date-fns';
import type { RecurringPayment } from '@/types';

/**
 * Calculates the next billing occurrence while strictly preserving the user's intended billing day.
 * Prevents the month-end date drift bug (e.g., Jan 31 -> Feb 28 -> Mar 28 -> Apr 28).
 *
 * Example:
 * If original day is 31:
 * - Jan 31 + 1 month => Feb 28 (or Feb 29 in leap year)
 * - Feb 28 + 1 month => Mar 31 (reclaims the 31st)
 * - Mar 31 + 1 month => Apr 30 (clamps to month end 30)
 * - Apr 30 + 1 month => May 31 (reclaims 31)
 */
export function getNextOccurrenceWithDayPreservation(
  currentDateStr: string,
  frequency: RecurringPayment['frequency'],
  originalBillingDay?: number
): string {
  const date = parseISO(currentDateStr);
  const targetDay = originalBillingDay ?? date.getDate();

  if (frequency === 'daily') {
    return format(addDays(date, 1), 'yyyy-MM-dd');
  }
  if (frequency === 'weekly') {
    return format(addWeeks(date, 1), 'yyyy-MM-dd');
  }
  if (frequency === 'biweekly') {
    return format(addWeeks(date, 2), 'yyyy-MM-dd');
  }

  let nextTargetMonth: Date;
  if (frequency === 'monthly') {
    nextTargetMonth = addMonths(date, 1);
  } else if (frequency === 'quarterly') {
    nextTargetMonth = addMonths(date, 3);
  } else if (frequency === 'yearly') {
    nextTargetMonth = addYears(date, 1);
  } else {
    nextTargetMonth = addMonths(date, 1);
  }

  // Determine maximum days in next target month
  const maxDaysInTargetMonth = getDaysInMonth(nextTargetMonth);
  // Clamp to max days in month if targetDay exceeds month length (e.g. 31 in Feb or April)
  const clampedDay = Math.min(targetDay, maxDaysInTargetMonth);
  const adjustedDate = setDate(nextTargetMonth, clampedDay);

  return format(adjustedDate, 'yyyy-MM-dd');
}

/**
 * Generates an idempotent cycle occurrence key.
 * Used to ensure that clicking "Mark Paid & Log" multiple times cannot log duplicate transactions for the same cycle.
 */
export function generateCycleOccurrenceId(recurringPaymentId: string, cycleDate: string): string {
  return `rec-occ-${recurringPaymentId}-${cycleDate}`;
}

