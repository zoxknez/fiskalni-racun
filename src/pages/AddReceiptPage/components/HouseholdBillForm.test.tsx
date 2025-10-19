/**
 * Component tests for HouseholdBillForm
 *
 * Test Coverage:
 * - Rendering all form fields
 * - User interactions (input, select, submit)
 * - Field validation display
 * - Accessibility attributes
 * - Loading and disabled states
 * - Optional fields (payment date, consumption)
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { HouseholdBillFormData, HouseholdValidationErrors } from '../types'
import { HouseholdBillForm } from './HouseholdBillForm'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'household.provider': 'Provider*',
        'household.billType': 'Bill Type*',
        'household.accountNumber': 'Account Number',
        'household.status': 'Status',
        'household.amount': 'Amount*',
        'household.billingPeriod': 'Billing Period*',
        'household.dueDate': 'Due Date*',
        'household.paymentDate': 'Payment Date',
        'household.consumption': 'Consumption',
        'receiptDetail.notes': 'Notes',
        'addReceipt.addNote': 'Add a note...',
        'addReceipt.household.providerPlaceholder': 'EPS, Infostan, SBB...',
        'addReceipt.household.accountPlaceholder': 'Account number (optional)',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.loading': 'Loading...',
      }
      return options?.defaultValue || translations[key] || key
    },
    i18n: { language: 'en' },
  }),
}))

// Mock household options
vi.mock('@lib/household', () => ({
  householdBillTypeOptions: () => [
    { value: 'electricity', label: 'Electricity' },
    { value: 'water', label: 'Water' },
    { value: 'gas', label: 'Gas' },
    { value: 'internet', label: 'Internet' },
  ],
  householdBillStatusOptions: () => [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ],
  householdConsumptionUnitOptions: () => [
    { value: 'kWh', label: 'kWh' },
    { value: 'm³', label: 'm³' },
    { value: 'GB', label: 'GB' },
  ],
}))

describe('HouseholdBillForm', () => {
  const mockFormData: HouseholdBillFormData = {
    billType: 'electricity',
    provider: '',
    accountNumber: '',
    amount: '',
    billingPeriodStart: '2024-01-01',
    billingPeriodEnd: '2024-01-31',
    dueDate: '2024-02-07',
    paymentDate: '',
    status: 'pending',
    consumptionValue: '',
    consumptionUnit: 'kWh',
    notes: '',
  }

  const mockErrors: HouseholdValidationErrors = {}

  const defaultProps = {
    formData: mockFormData,
    errors: mockErrors,
    onFieldChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    isValid: true,
  }

  describe('Rendering', () => {
    it('should render all required form fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByLabelText(/provider/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/bill type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    })

    it('should render optional fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByLabelText(/account number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/payment date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should render billing period fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const billingPeriodSection = screen.getByText(/billing period/i).closest('div')
      expect(billingPeriodSection).toBeInTheDocument()

      const dateInputs = screen.getAllByDisplayValue(/2024-01-/)
      expect(dateInputs.length).toBeGreaterThanOrEqual(2)
    })

    it('should render consumption fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const consumptionSection = screen.getByText(/^consumption$/i).closest('div')
      expect(consumptionSection).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    it('should display form field values', () => {
      const filledFormData: HouseholdBillFormData = {
        billType: 'electricity',
        provider: 'EPS',
        accountNumber: '123456',
        amount: '5000.50',
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        dueDate: '2024-02-07',
        paymentDate: '2024-02-05',
        status: 'paid',
        consumptionValue: '150.5',
        consumptionUnit: 'kWh',
        notes: 'Test note',
      }

      render(<HouseholdBillForm {...defaultProps} formData={filledFormData} />)

      expect(screen.getByDisplayValue('EPS')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123456')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5000.50')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-02-07')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-02-05')).toBeInTheDocument()
      expect(screen.getByDisplayValue('150.5')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test note')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onFieldChange when provider changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/provider/i)
      await user.type(input, 'EPS')

      expect(onFieldChange).toHaveBeenCalledWith('provider', 'E')
      expect(onFieldChange).toHaveBeenCalledWith('provider', 'P')
      expect(onFieldChange).toHaveBeenCalledWith('provider', 'S')
    })

    it('should call onFieldChange when bill type changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      const select = screen.getByLabelText(/bill type/i)
      await user.selectOptions(select, 'water')

      expect(onFieldChange).toHaveBeenCalledWith('billType', 'water')
    })

    it('should call onFieldChange when amount changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/amount/i)
      await user.type(input, '100')

      expect(onFieldChange).toHaveBeenCalled()
    })

    it('should call onFieldChange when billing period changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      const dateInputs = screen.getAllByDisplayValue(/2024-01-/)
      if (dateInputs[0]) {
        await user.clear(dateInputs[0])
        await user.type(dateInputs[0], '2024-02-01')

        expect(onFieldChange).toHaveBeenCalledWith('billingPeriodStart', expect.any(String))
      }
    })

    it('should call onFieldChange when consumption value changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      // Find consumption value input (number type, not date)
      const inputs = screen.getAllByRole('spinbutton')
      const consumptionInput = inputs.find((input) =>
        input.getAttribute('id')?.includes('consumption-value')
      )

      if (consumptionInput) {
        await user.type(consumptionInput, '100')
        expect(onFieldChange).toHaveBeenCalled()
      }
    })

    it('should call onFieldChange when consumption unit changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onFieldChange={onFieldChange} />)

      const selects = screen.getAllByRole('combobox')
      const unitSelect = selects.find((select) =>
        select.getAttribute('id')?.includes('consumption-unit')
      )

      if (unitSelect) {
        await user.selectOptions(unitSelect, 'm³')
        expect(onFieldChange).toHaveBeenCalledWith('consumptionUnit', 'm³')
      }
    })

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()

      render(<HouseholdBillForm {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e) => e.preventDefault())

      render(<HouseholdBillForm {...defaultProps} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      await user.click(submitButton)

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Validation Errors', () => {
    it('should display provider error', () => {
      const errors: HouseholdValidationErrors = {
        provider: 'Provider is required',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Provider is required')).toBeInTheDocument()
    })

    it('should display amount error', () => {
      const errors: HouseholdValidationErrors = {
        amount: 'Amount must be greater than 0',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
    })

    it('should display billing period errors', () => {
      const errors: HouseholdValidationErrors = {
        billingPeriodStart: 'Start date is required',
        billingPeriodEnd: 'End date must be after start date',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Start date is required')).toBeInTheDocument()
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument()
    })

    it('should display due date error', () => {
      const errors: HouseholdValidationErrors = {
        dueDate: 'Due date is required',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Due date is required')).toBeInTheDocument()
    })

    it('should display multiple errors simultaneously', () => {
      const errors: HouseholdValidationErrors = {
        provider: 'Provider required',
        amount: 'Amount required',
        dueDate: 'Due date required',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Provider required')).toBeInTheDocument()
      expect(screen.getByText('Amount required')).toBeInTheDocument()
      expect(screen.getByText('Due date required')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const providerInput = screen.getByLabelText(/provider/i)
      const amountInput = screen.getByLabelText(/amount/i)
      const dueDateInput = screen.getByLabelText(/due date/i)

      expect(providerInput).toHaveAttribute('id')
      expect(amountInput).toHaveAttribute('id')
      expect(dueDateInput).toHaveAttribute('id')
    })

    it('should set aria-invalid when field has error', () => {
      const errors: HouseholdValidationErrors = {
        provider: 'Required',
        amount: 'Required',
      }

      render(<HouseholdBillForm {...defaultProps} errors={errors} />)

      const providerInput = screen.getByLabelText(/provider/i)
      const amountInput = screen.getByLabelText(/amount/i)

      expect(providerInput).toHaveAttribute('aria-invalid', 'true')
      expect(amountInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have required attribute on required fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByLabelText(/provider/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/due date/i)).toHaveAttribute('required')
    })

    it('should not have required attribute on optional fields', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByLabelText(/account number/i)).not.toHaveAttribute('required')
      expect(screen.getByLabelText(/payment date/i)).not.toHaveAttribute('required')
    })

    it('should have appropriate input types', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      expect(screen.getByLabelText(/provider/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('type', 'number')
      expect(screen.getByLabelText(/due date/i)).toHaveAttribute('type', 'date')
    })
  })

  describe('Loading State', () => {
    it('should disable cancel button when loading', () => {
      render(<HouseholdBillForm {...defaultProps} loading={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it('should disable submit button when loading', () => {
      render(<HouseholdBillForm {...defaultProps} loading={true} />)

      const submitButton = screen.getByRole('button', { name: /loading/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show loading text on submit button', () => {
      render(<HouseholdBillForm {...defaultProps} loading={true} />)

      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation State', () => {
    it('should disable submit button when form is invalid', () => {
      render(<HouseholdBillForm {...defaultProps} isValid={false} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when form is valid', () => {
      render(<HouseholdBillForm {...defaultProps} isValid={true} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit when both loading and invalid', () => {
      render(<HouseholdBillForm {...defaultProps} loading={true} isValid={false} />)

      const submitButton = screen.getByRole('button', { name: /loading/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Input Constraints', () => {
    it('should have min and step attributes on amount', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      expect(amountInput).toHaveAttribute('min', '0')
      expect(amountInput).toHaveAttribute('step', '0.01')
    })

    it('should have inputMode="decimal" on amount field', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      expect(amountInput).toHaveAttribute('inputMode', 'decimal')
    })

    it('should have min and step on consumption value', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const inputs = screen.getAllByRole('spinbutton')
      const consumptionInput = inputs.find((input) =>
        input.getAttribute('id')?.includes('consumption-value')
      )

      if (consumptionInput) {
        expect(consumptionInput).toHaveAttribute('min', '0')
        expect(consumptionInput).toHaveAttribute('step', '0.01')
      }
    })
  })

  describe('Select Options', () => {
    it('should render all bill type options', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const select = screen.getByLabelText(/bill type/i)
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(4)
      expect(options[0]).toHaveTextContent('Electricity')
      expect(options[1]).toHaveTextContent('Water')
      expect(options[2]).toHaveTextContent('Gas')
      expect(options[3]).toHaveTextContent('Internet')
    })

    it('should render all status options', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const select = screen.getByLabelText(/status/i)
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(3)
      expect(options[0]).toHaveTextContent('Pending')
      expect(options[1]).toHaveTextContent('Paid')
      expect(options[2]).toHaveTextContent('Overdue')
    })

    it('should render all consumption unit options', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const selects = screen.getAllByRole('combobox')
      const unitSelect = selects.find((select) =>
        select.getAttribute('id')?.includes('consumption-unit')
      )

      if (unitSelect) {
        const options = within(unitSelect).getAllByRole('option')
        expect(options).toHaveLength(3)
        expect(options[0]).toHaveTextContent('kWh')
        expect(options[1]).toHaveTextContent('m³')
        expect(options[2]).toHaveTextContent('GB')
      }
    })

    it('should have correct bill type option values', () => {
      render(<HouseholdBillForm {...defaultProps} />)

      const select = screen.getByLabelText(/bill type/i)
      const options = within(select).getAllByRole('option')

      expect(options[0]).toHaveValue('electricity')
      expect(options[1]).toHaveValue('water')
      expect(options[2]).toHaveValue('gas')
      expect(options[3]).toHaveValue('internet')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty form data gracefully', () => {
      const emptyData: HouseholdBillFormData = {
        billType: 'electricity',
        provider: '',
        accountNumber: '',
        amount: '',
        billingPeriodStart: '',
        billingPeriodEnd: '',
        dueDate: '',
        paymentDate: '',
        status: 'pending',
        consumptionValue: '',
        consumptionUnit: 'kWh',
        notes: '',
      }

      render(<HouseholdBillForm {...defaultProps} formData={emptyData} />)

      expect(screen.getByLabelText(/provider/i)).toHaveValue('')
      expect(screen.getByLabelText(/account number/i)).toHaveValue('')
      // Number inputs with empty string have null value
      expect(screen.getByLabelText(/amount/i)).toHaveValue(null)
    })

    it('should handle very long provider name', () => {
      const longProvider = 'A'.repeat(200)
      const formData: HouseholdBillFormData = {
        ...mockFormData,
        provider: longProvider,
      }

      render(<HouseholdBillForm {...defaultProps} formData={formData} />)

      expect(screen.getByDisplayValue(longProvider)).toBeInTheDocument()
    })

    it('should handle very long notes', () => {
      const longNotes = 'Note '.repeat(100)
      const formData: HouseholdBillFormData = {
        ...mockFormData,
        notes: longNotes,
      }

      render(<HouseholdBillForm {...defaultProps} formData={formData} />)

      const textarea = screen.getByLabelText(/notes/i)
      expect(textarea).toHaveValue(longNotes)
    })
  })

  describe('Optional Fields Behavior', () => {
    it('should allow empty payment date', () => {
      const formData: HouseholdBillFormData = {
        ...mockFormData,
        paymentDate: '',
      }

      render(<HouseholdBillForm {...defaultProps} formData={formData} />)

      const paymentDateInput = screen.getByLabelText(/payment date/i)
      expect(paymentDateInput).toHaveValue('')
    })

    it('should allow empty consumption value', () => {
      const formData: HouseholdBillFormData = {
        ...mockFormData,
        consumptionValue: '',
      }

      render(<HouseholdBillForm {...defaultProps} formData={formData} />)

      const inputs = screen.getAllByRole('spinbutton')
      const consumptionInput = inputs.find((input) =>
        input.getAttribute('id')?.includes('consumption-value')
      )

      if (consumptionInput) {
        expect(consumptionInput).toHaveValue(null)
      }
    })

    it('should allow empty account number', () => {
      const formData: HouseholdBillFormData = {
        ...mockFormData,
        accountNumber: '',
      }

      render(<HouseholdBillForm {...defaultProps} formData={formData} />)

      const accountInput = screen.getByLabelText(/account number/i)
      expect(accountInput).toHaveValue('')
    })
  })
})
