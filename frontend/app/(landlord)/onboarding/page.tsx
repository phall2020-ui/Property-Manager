"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Select } from '@/components/Select';
import { DateInput } from '@/components/DateInput';
import { MoneyInput } from '@/components/MoneyInput';

/**
 * Landlord Onboarding Wizard (Simplified MVP)
 * 
 * This is a consolidated onboarding flow that captures essential information
 * in a single form. For a production implementation, this would be split into
 * multiple steps with progress tracking, draft persistence, and validation.
 */

type OnboardingData = {
  // Property
  address1: string;
  address2?: string;
  city: string;
  postcode: string;
  bedrooms?: number;
  propertyType?: string;
  
  // Tenancy
  startDate: string;
  rentAmount: number;
  rentFrequency: string;
  depositAmount: number;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    rentFrequency: 'Monthly',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 3; // Simplified to 3 main steps

  const updateField = (field: keyof OnboardingData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      // Property address validation
      if (!formData.address1) newErrors.address1 = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.postcode) newErrors.postcode = 'Postcode is required';
      else if (!/^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i.test(formData.postcode)) {
        newErrors.postcode = 'Enter a valid UK postcode';
      }
    } else if (currentStep === 2) {
      // Tenancy details validation
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.rentAmount || formData.rentAmount <= 0) {
        newErrors.rentAmount = 'Rent amount is required';
      }
    } else if (currentStep === 3) {
      // Deposit validation
      if (!formData.depositAmount || formData.depositAmount < 0) {
        newErrors.depositAmount = 'Deposit amount is required';
      }
      // Warn if deposit > 5 weeks rent
      if (formData.rentAmount && formData.depositAmount) {
        const weeklyRent = (formData.rentAmount * 12) / 52;
        const maxDeposit = weeklyRent * 5;
        if (formData.depositAmount > maxDeposit) {
          // This is a warning, not a blocking error
          console.warn(`Deposit exceeds 5 weeks rent (max £${maxDeposit.toFixed(2)})`);
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < totalSteps) {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      // TODO: Implement API call to create property and tenancy
      // const response = await apiRequest('/onboarding', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      
      // Temporary: Show success message and redirect
      // In production, this should be a proper modal/toast notification
      console.log('Onboarding data:', formData);
      
      // Redirect to properties list
      // TODO: Replace with success toast notification
      router.push('/properties?onboarding=success');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // TODO: Replace with proper error toast notification
      setErrors({ general: 'Failed to complete onboarding. Please try again.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Landlord Onboarding</h1>
        <p className="mt-2 text-gray-600">
          Let's get your property set up. This will only take a few minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((step / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Card className="p-6">
        {/* Step 1: Property Address */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Property Address</h2>
            
            <TextField
              label="Address Line 1"
              value={formData.address1 || ''}
              onChange={(e) => updateField('address1', e.target.value)}
              error={errors.address1}
              required
              placeholder="123 Main Street"
            />

            <TextField
              label="Address Line 2"
              value={formData.address2 || ''}
              onChange={(e) => updateField('address2', e.target.value)}
              placeholder="Apartment 4B (optional)"
            />

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="City"
                value={formData.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
                error={errors.city}
                required
                placeholder="London"
              />

              <TextField
                label="Postcode"
                value={formData.postcode || ''}
                onChange={(e) => updateField('postcode', e.target.value.toUpperCase())}
                error={errors.postcode}
                required
                placeholder="SW1A 1AA"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms || ''}
                onChange={(e) => updateField('bedrooms', parseInt(e.target.value) || undefined)}
                placeholder="2"
              />

              <Select
                label="Property Type"
                options={[
                  { value: 'House', label: 'House' },
                  { value: 'Flat', label: 'Flat' },
                  { value: 'Maisonette', label: 'Maisonette' },
                  { value: 'Bungalow', label: 'Bungalow' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={formData.propertyType || ''}
                onChange={(e) => updateField('propertyType', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Tenancy Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Tenancy Details</h2>

            <DateInput
              label="Tenancy Start Date"
              value={formData.startDate || ''}
              onChange={(e) => updateField('startDate', e.target.value)}
              error={errors.startDate}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <MoneyInput
                label="Monthly Rent"
                value={formData.rentAmount || ''}
                onChange={(e) => updateField('rentAmount', parseFloat(e.target.value) || 0)}
                error={errors.rentAmount}
                required
              />

              <Select
                label="Rent Frequency"
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Weekly', label: 'Weekly' },
                ]}
                value={formData.rentFrequency || 'Monthly'}
                onChange={(e) => updateField('rentFrequency', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Deposit */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Deposit Information</h2>

            <MoneyInput
              label="Deposit Amount"
              value={formData.depositAmount || ''}
              onChange={(e) => updateField('depositAmount', parseFloat(e.target.value) || 0)}
              error={errors.depositAmount}
              helperText="Typically 5 weeks' rent for properties under £50,000/year"
              required
            />

            {formData.rentAmount && formData.depositAmount && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Maximum deposit:</strong> £
                  {(((formData.rentAmount * 12) / 52) * 5).toFixed(2)} (5 weeks' rent)
                </p>
                {formData.depositAmount > ((formData.rentAmount * 12) / 52) * 5 && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ This deposit exceeds the 5-week limit. Consider reducing it.
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Your property will be created</li>
                <li>You'll be able to invite tenants</li>
                <li>You can upload required documents (Gas Safety, EPC, etc.)</li>
                <li>Set up compliance reminders</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
          >
            ← Back
          </Button>

          {step < totalSteps ? (
            <Button variant="primary" onClick={handleNext}>
              Continue →
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit}>
              Finish Setup →
            </Button>
          )}
        </div>
      </Card>

      {/* Save & exit option */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Save and exit (resume later)
        </button>
      </div>
    </div>
  );
}
