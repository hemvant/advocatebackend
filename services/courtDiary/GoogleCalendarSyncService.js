'use strict';

/**
 * Stub for Google Calendar sync: OAuth login, push hearing to user's Google Calendar, update on reschedule.
 * Multi-org: tokens/credentials would be per user or per org.
 * To implement: add googleapis dependency, store refresh_token per user/org, create calendar event on hearing create/update, update event on reschedule.
 */
class GoogleCalendarSyncService {
  /** @param {Object} user - req.user @param {Object} hearing - CaseHearing with Case */
  static async pushHearingToCalendar(user, hearing) {
    return { success: false, message: 'Google Calendar sync not configured. Add OAuth and calendar API.' };
  }

  /** @param {Object} user @param {number} hearingId @param {Date} newDate */
  static async updateCalendarEvent(user, hearingId, newDate) {
    return { success: false, message: 'Google Calendar sync not configured.' };
  }
}

module.exports = GoogleCalendarSyncService;
