import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DataContext = createContext(null);

const EMPTY = {
  employees: [],
  leaves: [],
  attendance: [],
  announcements: [],
  trainings: [],
  notifications: [],
  registrations: [],
  activity: [],
  preferences: {},
};

export function DataProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const employeeId = user?.id || user?._id;

  const safe = useCallback(async (promise, fallback) => {
    try {
      const result = await promise;
      return result ?? fallback;
    } catch (error) {
      console.warn('[StaffSync] Request failed.', error.message);
      return fallback;
    }
  }, []);

  const loadEverything = useCallback(
    async ({ silent = false } = {}) => {
      if (!employeeId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const failures = [];
      const attempt = async (promise, fallback) => {
        try {
          const result = await promise;
          return result ?? fallback;
        } catch (error) {
          failures.push(error);
          console.warn('[StaffSync] Request failed.', error.message);
          return fallback;
        }
      };

      const [
        employees,
        leaves,
        attendance,
        announcements,
        trainings,
        notifications,
        registrations,
        activity,
        preferences,
      ] = await Promise.all([
        attempt(api.employees.list(), []),
        attempt(api.leaves.list(), []),
        attempt(api.attendance.list(), []),
        attempt(api.announcements.list(), []),
        attempt(api.training.list(), []),
        attempt(api.notifications.list(user), []),
        user?.systemRole === 'hr' || user?.role === 'hr' ? attempt(api.registrations.list(), []) : Promise.resolve([]),
        attempt(api.activity.list(10), []),
        attempt(api.settings.get(employeeId), {}),
      ]);

      // Surface connection / server failures instead of silently showing an
      // empty workspace. Authorization (403) and validation (400) responses
      // are handled by the screen that triggered them.
      const fatal = failures.find(
        (error) => !error.status || error.status >= 500 || error.status === 401,
      );
      setLoadError(fatal ? fatal.message || 'We couldn’t reach the API.' : null);

      setState({
        employees,
        leaves,
        attendance,
        announcements,
        trainings,
        notifications,
        registrations,
        activity,
        preferences,
      });
      setLoading(false);
      setRefreshing(false);
    },
    [employeeId, user],
  );

  useEffect(() => {
    if (!employeeId) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const refresh = useCallback(() => loadEverything({ silent: true }), [loadEverything]);
  const clearLoadError = useCallback(() => setLoadError(null), []);

  const refreshEmployees = useCallback(async () => {
    const employees = await safe(api.employees.list(), []);
    setState((s) => ({ ...s, employees }));
  }, [safe]);

  const refreshLeaves = useCallback(async () => {
    const leaves = await safe(api.leaves.list(), []);
    setState((s) => ({ ...s, leaves }));
  }, [safe]);

  const refreshAttendance = useCallback(async () => {
    const attendance = await safe(api.attendance.list(), []);
    setState((s) => ({ ...s, attendance }));
  }, [safe]);

  const refreshAnnouncements = useCallback(async () => {
    const announcements = await safe(api.announcements.list(), []);
    setState((s) => ({ ...s, announcements }));
  }, [safe]);

  const refreshTrainings = useCallback(async () => {
    const trainings = await safe(api.training.list(), []);
    setState((s) => ({ ...s, trainings }));
  }, [safe]);

  const refreshNotifications = useCallback(async () => {
    const notifications = await safe(api.notifications.list(user), []);
    setState((s) => ({ ...s, notifications }));
  }, [safe, user]);

  const refreshRegistrations = useCallback(async () => {
    const registrations = await safe(api.registrations.list(), []);
    setState((s) => ({ ...s, registrations }));
  }, [safe]);

  const refreshActivity = useCallback(async () => {
    const activity = await safe(api.activity.list(10), []);
    setState((s) => ({ ...s, activity }));
  }, [safe]);

  /* ------------------------------ Actions ------------------------------ */

  const createEmployee = useCallback(
    async (payload) => {
      const employee = await api.employees.create(payload);
      await Promise.all([refreshEmployees(), refreshActivity()]);
      toast.success(`${employee.name} was added to the team.`, { title: 'Employee created' });
      return employee;
    },
    [refreshEmployees, refreshActivity, toast],
  );

  const updateEmployee = useCallback(
    async (id, payload) => {
      const employee = await api.employees.update(id, payload);
      await Promise.all([refreshEmployees(), refreshActivity()]);
      toast.success('Profile changes saved.');
      return employee;
    },
    [refreshEmployees, refreshActivity, toast],
  );

  const removeEmployee = useCallback(
    async (id) => {
      await api.employees.remove(id);
      await Promise.all([refreshEmployees(), refreshLeaves(), refreshActivity()]);
      toast.success('Employee removed from the workspace.');
      return true;
    },
    [refreshEmployees, refreshLeaves, refreshActivity, toast],
  );

  const applyLeave = useCallback(
    async (payload) => {
      const leave = await api.leaves.apply({ ...payload, employeeId }, user);
      await Promise.all([refreshLeaves(), refreshNotifications(), refreshActivity()]);
      toast.success('Your request is with your manager and HR for review.', {
        title: 'Leave requested',
      });
      return leave;
    },
    [employeeId, user, refreshLeaves, refreshNotifications, refreshActivity, toast],
  );

  const decideLeave = useCallback(
    async ({ id, status, note }) => {
      await api.leaves.decide({ id, status, note }, user);
      await Promise.all([refreshLeaves(), refreshNotifications(), refreshActivity()]);
      toast.success(
        status === 'Approved'
          ? 'Approved. The employee has been notified.'
          : 'Request declined. The employee has been notified.',
        { title: status === 'Approved' ? 'Leave approved' : 'Leave declined' },
      );
    },
    [user, refreshLeaves, refreshNotifications, refreshActivity, toast],
  );

  const cancelLeave = useCallback(
    async (id) => {
      await api.leaves.cancel({ id, employeeId });
      await refreshLeaves();
      toast.info('Your leave request was withdrawn.');
    },
    [employeeId, refreshLeaves, toast],
  );

  const clockIn = useCallback(
    async (mode = 'office') => {
      await api.attendance.clockIn({ employeeId, mode }, user);
      await refreshAttendance();
      toast.success(
        mode === 'remote' ? 'Checked in from home. Have a focused day.' : 'Checked in. Have a good day!',
        { title: 'You’re clocked in' },
      );
    },
    [employeeId, user, refreshAttendance, toast],
  );

  const clockOut = useCallback(async () => {
    await api.attendance.clockOut({ employeeId }, user);
    await refreshAttendance();
    toast.success('Your hours have been logged for today.', { title: 'Clocked out' });
  }, [employeeId, user, refreshAttendance, toast]);

  const createAnnouncement = useCallback(
    async (payload) => {
      const announcement = await api.announcements.create(payload, user);
      await Promise.all([refreshAnnouncements(), refreshNotifications(), refreshActivity()]);
      toast.success('The announcement is live for everyone.', { title: 'Published' });
      return announcement;
    },
    [user, refreshAnnouncements, refreshNotifications, refreshActivity, toast],
  );

  const updateAnnouncement = useCallback(
    async (id, payload) => {
      await api.announcements.update(id, payload);
      await refreshAnnouncements();
      toast.success('Announcement updated.');
    },
    [refreshAnnouncements, toast],
  );

  const deleteAnnouncement = useCallback(
    async (id) => {
      await api.announcements.remove(id);
      await refreshAnnouncements();
      toast.info('Announcement deleted.');
    },
    [refreshAnnouncements, toast],
  );

  const markAnnouncementRead = useCallback(
    async (id) => {
      await api.announcements.markRead({ id, employeeId });
      setState((s) => ({
        ...s,
        announcements: s.announcements.map((item) =>
          item.id === id && !item.readBy.includes(employeeId)
            ? { ...item, readBy: [...item.readBy, employeeId] }
            : item,
        ),
      }));
    },
    [employeeId],
  );

  const enrollTraining = useCallback(
    async (trainingId) => {
      await api.training.enroll({ trainingId, employeeId });
      await refreshTrainings();
      toast.success('Added to your learning plan.', { title: 'You’re enrolled' });
    },
    [employeeId, refreshTrainings, toast],
  );

  const updateTrainingProgress = useCallback(
    async (trainingId, progress) => {
      await api.training.progress({ trainingId, employeeId, progress });
      await refreshTrainings();
      const numeric = Number(progress);
      toast.success(
        numeric >= 100 ? 'Course completed. Certificates live under My learning.' : 'Progress saved.',
        { title: numeric >= 100 ? 'Nice work!' : 'Updated' },
      );
    },
    [employeeId, refreshTrainings, toast],
  );

  const assignTraining = useCallback(
    async ({ trainingId, employeeIds, dueDate }) => {
      await api.training.assign({ trainingId, employeeIds, dueDate }, user);
      await Promise.all([refreshTrainings(), refreshNotifications()]);
      toast.success(
        employeeIds.length === 1
          ? 'Training assigned and the teammate notified.'
          : `Training assigned to ${employeeIds.length} teammates.`,
        { title: 'Assignment sent' },
      );
    },
    [user, refreshTrainings, refreshNotifications, toast],
  );

  const markNotificationRead = useCallback(
    async (id) => {
      await api.notifications.markRead({ id, employeeId });
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      }));
    },
    [employeeId],
  );

  const markAllNotificationsRead = useCallback(async () => {
    await api.notifications.markAllRead(user);
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((item) => ({ ...item, read: true })),
    }));
    toast.info('All notifications marked as read.');
  }, [user, toast]);

  const decideRegistration = useCallback(
    async ({ id, status, note }) => {
      await api.registrations.decide({ id, status, note }, user);
      await Promise.all([refreshRegistrations(), refreshEmployees(), refreshNotifications()]);
      toast.success(
        status === 'Approved'
          ? 'Account activated. They can sign in now.'
          : 'Registration declined.',
        { title: status === 'Approved' ? 'Employee approved' : 'Request declined' },
      );
    },
    [user, refreshRegistrations, refreshEmployees, refreshNotifications, toast],
  );

  const savePreferences = useCallback(
    async (payload) => {
      const preferences = await api.settings.update(employeeId, payload);
      setState((s) => ({ ...s, preferences }));
      toast.success('Preferences saved.');
    },
    [employeeId, toast],
  );

  const resetDemoData = useCallback(async () => {
    await api.resetDemoData();
  }, []);

  const currentEmployee = useMemo(
    () => state.employees.find((employee) => employee.id === employeeId) || user || null,
    [state.employees, employeeId, user],
  );

  const unreadCount = useMemo(
    () => state.notifications.filter((notification) => !notification.read).length,
    [state.notifications],
  );

  const pendingApprovals = useMemo(() => {
    if (!currentEmployee) return [];
    const isHR = currentEmployee.systemRole === 'hr' || currentEmployee.role === 'hr';
    return state.leaves.filter(
      (leave) =>
        leave.status === 'Pending' &&
        (isHR || state.employees.find((e) => e.id === leave.employeeId)?.managerId === currentEmployee.id),
    );
  }, [state.leaves, state.employees, currentEmployee]);

  const value = useMemo(
    () => ({
      ...state,
      loading,
      refreshing,
      currentEmployee,
      unreadCount,
      pendingApprovals,
      loadError,
      clearLoadError,
      refresh,
      refreshEmployees,
      refreshLeaves,
      refreshAttendance,
      refreshAnnouncements,
      refreshTrainings,
      refreshNotifications,
      refreshRegistrations,
      refreshActivity,
      createEmployee,
      updateEmployee,
      removeEmployee,
      applyLeave,
      decideLeave,
      cancelLeave,
      clockIn,
      clockOut,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markAnnouncementRead,
      enrollTraining,
      updateTrainingProgress,
      assignTraining,
      markNotificationRead,
      markAllNotificationsRead,
      decideRegistration,
      savePreferences,
      resetDemoData,
    }),
    [
      state,
      loading,
      refreshing,
      currentEmployee,
      unreadCount,
      pendingApprovals,
      loadError,
      clearLoadError,
      refresh,
      refreshEmployees,
      refreshLeaves,
      refreshAttendance,
      refreshAnnouncements,
      refreshTrainings,
      refreshNotifications,
      refreshRegistrations,
      refreshActivity,
      createEmployee,
      updateEmployee,
      removeEmployee,
      applyLeave,
      decideLeave,
      cancelLeave,
      clockIn,
      clockOut,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markAnnouncementRead,
      enrollTraining,
      updateTrainingProgress,
      assignTraining,
      markNotificationRead,
      markAllNotificationsRead,
      decideRegistration,
      savePreferences,
      resetDemoData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside <DataProvider>');
  return context;
}
