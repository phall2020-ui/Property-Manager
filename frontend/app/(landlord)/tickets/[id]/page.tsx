"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Ticket, TicketStatus } from '@/types/models';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ApproveQuoteModal } from '@/components/ApproveQuoteModal';
import { DeclineQuoteModal } from '@/components/DeclineQuoteModal';
import { ArrowLeft, Calendar, MapPin, User, AlertCircle, CheckCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  ticketId: string;
  eventType: string;
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export default function LandlordTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  
  // Fetch ticket details
  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () => apiRequest<Ticket>(`/tickets/${ticketId}`),
    enabled: typeof ticketId === 'string',
  });

  // Fetch timeline
  const { data: timeline = [] } = useQuery<TimelineEvent[]>({
    queryKey: ['ticket', ticketId, 'timeline'],
    queryFn: () => apiRequest<TimelineEvent[]>(`/tickets/${ticketId}/timeline`),
    enabled: typeof ticketId === 'string',
  });
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Approve mutation
  const approveMutation = useMutation<unknown, any, { notes?: string }>({
    mutationFn: async ({ notes }: { notes?: string }) => {
      return apiRequest(`/tickets/${ticketId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: true, notes }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      setSuccessMessage('Quote approved successfully');
      setActionError(null);
      setIsApproveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to approve quote');
      setSuccessMessage(null);
    },
  });

  // Decline mutation
  const declineMutation = useMutation<unknown, any, string>({
    mutationFn: async (reason: string) => {
      return apiRequest(`/tickets/${ticketId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: false, reason }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      setSuccessMessage('Quote declined');
      setActionError(null);
      setIsDeclineModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to decline quote');
      setSuccessMessage(null);
    },
  });

  // Complete ticket mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/tickets/${ticketId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      setSuccessMessage('Ticket marked as complete');
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId, 'timeline'] });
    },
    onError: (err: any) => {
      setActionError(err.detail || 'Failed to complete ticket');
      setSuccessMessage(null);
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading ticket details...</p>
      </div>
    );
  }
  
  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Ticket</h3>
          <p className="text-gray-600 mb-4">The ticket you're looking for could not be found.</p>
          <Button variant="primary" onClick={() => router.push('/tickets')}>
            Back to Tickets
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case TicketStatus.COMPLETED:
        return 'success';
      case TicketStatus.NEEDS_APPROVAL:
        return 'warning';
      case TicketStatus.REJECTED:
        return 'danger';
      case TicketStatus.IN_PROGRESS:
        return 'info';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Ticket Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
                <p className="text-sm text-gray-500 mt-1">Ticket #{ticket.id.substring(0, 8)}</p>
              </div>
              <Badge color={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </Card>

          {/* Timeline */}
          {timeline.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="ml-4 h-full w-0.5 bg-gray-200"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-gray-900">{event.eventType}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.metadata && (
                        <pre className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          {/* Details Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{ticket.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority || 'STANDARD'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{ticket.propertyId}</p>
              </div>
              {ticket.quoteAmount && (
                <div>
                  <p className="text-sm text-gray-600">Quote Amount</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">£{ticket.quoteAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Actions Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {ticket.status === TicketStatus.NEEDS_APPROVAL && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => setIsApproveModalOpen(true)}
                    className="w-full"
                  >
                    Approve Quote
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setIsDeclineModalOpen(true)}
                    className="w-full"
                  >
                    Decline Quote
                  </Button>
                </>
              )}
              
              {ticket.status === TicketStatus.IN_PROGRESS && (
                <Button
                  variant="primary"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="w-full"
                >
                  {completeMutation.isPending ? 'Marking Complete...' : 'Mark as Complete'}
                </Button>
              )}
              
              {ticket.status === TicketStatus.COMPLETED && (
                <div className="flex items-center space-x-2 text-green-600 text-sm">
                  <CheckCircle className="h-5 w-5" />
                  <span>Ticket completed</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Quote Modal */}
      <ApproveQuoteModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onApprove={(notes) => approveMutation.mutate({ notes })}
        isSubmitting={approveMutation.isPending}
        quoteAmount={ticket.quoteAmount}
        ticketTitle={ticket.title}
      />

      {/* Decline Quote Modal */}
      <DeclineQuoteModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onDecline={(reason) => declineMutation.mutate(reason)}
        isSubmitting={declineMutation.isPending}
        quoteAmount={ticket.quoteAmount}
        ticketTitle={ticket.title}
      />
    </div>
  );
}