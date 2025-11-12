import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Header from '../components/Header';

interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  inAppEnabled: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  notifyTicketCreated: boolean;
  notifyTicketAssigned: boolean;
  notifyQuoteSubmitted: boolean;
  notifyQuoteApproved: boolean;
  notifyTicketCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NotificationSettingsPage() {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // State for form values
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch current preferences
  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.getPreferences,
  });

  // Update preferences when data is loaded
  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
  }, [data]);

  // Mutation to update preferences
  const updateMutation = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      success('Notification preferences updated successfully');
    },
    onError: (err: any) => {
      showError(err?.response?.data?.message || 'Failed to update preferences');
    },
  });

  const handleCheckboxChange = (field: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      [field]: value,
    };
    setPreferences(updatedPreferences);
  };

  const handleSave = () => {
    if (!preferences) return;

    updateMutation.mutate({
      emailEnabled: preferences.emailEnabled,
      inAppEnabled: preferences.inAppEnabled,
      webhookEnabled: preferences.webhookEnabled,
      webhookUrl: preferences.webhookUrl || undefined,
      notifyTicketCreated: preferences.notifyTicketCreated,
      notifyTicketAssigned: preferences.notifyTicketAssigned,
      notifyQuoteSubmitted: preferences.notifyQuoteSubmitted,
      notifyQuoteApproved: preferences.notifyQuoteApproved,
      notifyTicketCompleted: preferences.notifyTicketCompleted,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load notification preferences
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Header />
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Notification Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage how you receive notifications from Property Manager
          </p>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Notification Channels */}
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Notification Channels
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailEnabled"
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) =>
                      handleCheckboxChange('emailEnabled', e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="emailEnabled"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-500">
                    Receive notifications via email
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="inAppEnabled"
                    type="checkbox"
                    checked={preferences.inAppEnabled}
                    onChange={(e) =>
                      handleCheckboxChange('inAppEnabled', e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="inAppEnabled"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    In-App Notifications
                  </label>
                  <p className="text-sm text-gray-500">
                    See notifications in the app
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Event Types */}
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Email Notification Types
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choose which events will send you email notifications
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="notifyTicketCreated"
                    type="checkbox"
                    checked={preferences.notifyTicketCreated}
                    onChange={(e) =>
                      handleCheckboxChange('notifyTicketCreated', e.target.checked)
                    }
                    disabled={!preferences.emailEnabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="notifyTicketCreated"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Ticket Created
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when a new ticket is created
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="notifyTicketAssigned"
                    type="checkbox"
                    checked={preferences.notifyTicketAssigned}
                    onChange={(e) =>
                      handleCheckboxChange('notifyTicketAssigned', e.target.checked)
                    }
                    disabled={!preferences.emailEnabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="notifyTicketAssigned"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Ticket Assigned
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when a ticket is assigned to you
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="notifyQuoteSubmitted"
                    type="checkbox"
                    checked={preferences.notifyQuoteSubmitted}
                    onChange={(e) =>
                      handleCheckboxChange('notifyQuoteSubmitted', e.target.checked)
                    }
                    disabled={!preferences.emailEnabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="notifyQuoteSubmitted"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Quote Submitted
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when a contractor submits a quote
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="notifyQuoteApproved"
                    type="checkbox"
                    checked={preferences.notifyQuoteApproved}
                    onChange={(e) =>
                      handleCheckboxChange('notifyQuoteApproved', e.target.checked)
                    }
                    disabled={!preferences.emailEnabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="notifyQuoteApproved"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Quote Approved
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when a quote is approved
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="notifyTicketCompleted"
                    type="checkbox"
                    checked={preferences.notifyTicketCompleted}
                    onChange={(e) =>
                      handleCheckboxChange('notifyTicketCompleted', e.target.checked)
                    }
                    disabled={!preferences.emailEnabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </div>
                <div className="ml-3">
                  <label
                    htmlFor="notifyTicketCompleted"
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    Ticket Completed
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when a ticket is marked as completed
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
