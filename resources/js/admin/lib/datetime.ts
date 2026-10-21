/**
 * The store works in Africa/Casablanca whatever the browser's timezone. Date-time
 * inputs therefore show and accept the store's wall-clock time: the API parses an
 * offset-less "YYYY-MM-DDTHH:MM:SS" in the application timezone (Casablanca).
 */
export const STORE_TIME_ZONE = 'Africa/Casablanca';

const wallClock = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

function wallClockParts(date: Date): Record<string, string> {
    return Object.fromEntries(wallClock.formatToParts(date).map((part) => [part.type, part.value]));
}

/** ISO 8601 from the API → value for `<input type="datetime-local">`, in store time. */
export function isoToLocalInput(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const parts = wallClockParts(date);

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Value of a datetime-local input → API value (store time, no offset), or null when empty. */
export function localInputToApi(value: string): string | null {
    const trimmed = value.trim();

    if (trimmed === '') {
        return null;
    }

    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed;
}

/** Today's date in the store ("2026-10-21"), for date inputs. */
export function storeToday(now: Date = new Date()): string {
    const parts = wallClockParts(now);

    return `${parts.year}-${parts.month}-${parts.day}`;
}
