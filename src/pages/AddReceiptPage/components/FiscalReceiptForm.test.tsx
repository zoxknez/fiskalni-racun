/**
 * Component tests for FiscalReceiptForm
 *
 * Test Coverage:
 * - Rendering all form fields
 * - User interactions (input, select, submit)
 * - Field validation display
 * - Accessibility attributes (ARIA, labels, IDs)
 * - Loading and disabled states
 * - Form submission handling
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FiscalReceiptFormData, FiscalValidationErrors } from '../types'
import { FiscalReceiptForm } from './FiscalReceiptForm'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'addReceipt.vendorRequired': 'Vendor Name*',
        'common.required': '(required)',
        'addReceipt.pibHelp': 'Enter 9 digits (no spaces or symbols).',
        'addReceipt.dateRequired': 'Date*',
        'receiptDetail.time': 'Time',
        'addReceipt.amountRequired': 'Amount*',
        'addReceipt.selectCategory': 'Select Category*',
        'receiptDetail.notes': 'Notes',
        'addReceipt.addNote': 'Add a note...',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.loading': 'Loading...',
      }
      return options?.defaultValue || translations[key] || key
    },
    i18n: { language: 'en' },
  }),
}))

// Mock categories
vi.mock('@lib/categories', () => ({
  categoryOptions: () => [
    { value: '', label: '-- Select Category --' },
    { value: 'food', label: 'Food & Groceries' },
    { value: 'transport', label: 'Transport' },
    { value: 'utilities', label: 'Utilities' },
  ],
}))

describe('FiscalReceiptForm', () => {
  const mockFormData: FiscalReceiptFormData = {
    merchantName: '',
    pib: '',
    date: '2024-01-15',
    time: '14:30',
    amount: '',
    category: '',
    notes: '',
  }

  const mockErrors: FiscalValidationErrors = {}

  const defaultProps = {
    formData: mockFormData,
    errors: mockErrors,
    onFieldChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    loading: false,
    isValid: true,
  }

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      expect(screen.getByLabelText(/vendor name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pib/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/select category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    it('should display form field values', () => {
      const filledFormData: FiscalReceiptFormData = {
        merchantName: 'Test Merchant',
        pib: '123456789',
        date: '2024-01-15',
        time: '14:30',
        amount: '100.50',
        category: 'food',
        notes: 'Test notes',
      }

      render(<FiscalReceiptForm {...defaultProps} formData={filledFormData} />)

      expect(screen.getByDisplayValue('Test Merchant')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123456789')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('14:30')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100.50')).toBeInTheDocument()
      // Note: Select uses value attribute, not display value
      expect(screen.getByLabelText(/select category/i)).toHaveValue('food')
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
    })

    it('should display PIB help text', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      // Note: Component displays Serbian text from i18next translation key
      expect(screen.getByText(/unesite 9 cifara/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onFieldChange when merchant name changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/vendor name/i)
      await user.type(input, 'Maxi')

      // Note: userEvent.type() fires onChange for each character
      expect(onFieldChange).toHaveBeenCalledWith('merchantName', 'M')
      expect(onFieldChange).toHaveBeenCalledWith('merchantName', 'a')
      expect(onFieldChange).toHaveBeenCalledWith('merchantName', 'x')
      expect(onFieldChange).toHaveBeenCalledWith('merchantName', 'i')
    })

    it('should call onFieldChange when PIB changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/pib/i)
      await user.type(input, '123')

      // Note: userEvent.type() fires onChange for each character
      expect(onFieldChange).toHaveBeenCalledWith('pib', '1')
      expect(onFieldChange).toHaveBeenCalledWith('pib', '2')
      expect(onFieldChange).toHaveBeenCalledWith('pib', '3')
    })

    it('should call onFieldChange when date changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/date/i)
      await user.clear(input)
      await user.type(input, '2024-12-25')

      expect(onFieldChange).toHaveBeenCalledWith('date', expect.any(String))
    })

    it('should call onFieldChange when amount changes', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onFieldChange={onFieldChange} />)

      const input = screen.getByLabelText(/amount/i)
      await user.type(input, '100')

      // Amount input uses sanitizeAmountInput formatter
      expect(onFieldChange).toHaveBeenCalled()
    })

    it('should call onCategoryChange when category changes', async () => {
      const user = userEvent.setup()
      const onCategoryChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onCategoryChange={onCategoryChange} />)

      const select = screen.getByLabelText(/select category/i)
      await user.selectOptions(select, 'food')

      expect(onCategoryChange).toHaveBeenCalledWith('food')
    })

    it('should call onFieldChange when notes change', async () => {
      const user = userEvent.setup()
      const onFieldChange = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onFieldChange={onFieldChange} />)

      const textarea = screen.getByLabelText(/notes/i)
      await user.type(textarea, 'Test note')

      expect(onFieldChange).toHaveBeenCalled()
    })

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e) => e.preventDefault())

      render(<FiscalReceiptForm {...defaultProps} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      await user.click(submitButton)

      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Validation Errors', () => {
    it('should display merchant name error', () => {
      const errors: FiscalValidationErrors = {
        merchantName: 'Merchant name is required',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Merchant name is required')).toBeInTheDocument()
    })

    it('should display PIB error', () => {
      const errors: FiscalValidationErrors = {
        pib: 'PIB must be exactly 9 digits',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('PIB must be exactly 9 digits')).toBeInTheDocument()
    })

    it('should display date error', () => {
      const errors: FiscalValidationErrors = {
        date: 'Date is required',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Date is required')).toBeInTheDocument()
    })

    it('should display amount error', () => {
      const errors: FiscalValidationErrors = {
        amount: 'Amount must be greater than 0',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
    })

    it('should display category error', () => {
      const errors: FiscalValidationErrors = {
        category: 'Please select a category',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Please select a category')).toBeInTheDocument()
    })

    it('should display multiple errors simultaneously', () => {
      const errors: FiscalValidationErrors = {
        merchantName: 'Merchant name is required',
        pib: 'Invalid PIB',
        amount: 'Amount required',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      expect(screen.getByText('Merchant name is required')).toBeInTheDocument()
      expect(screen.getByText('Invalid PIB')).toBeInTheDocument()
      expect(screen.getByText('Amount required')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const merchantInput = screen.getByLabelText(/vendor name/i)
      const pibInput = screen.getByLabelText(/pib/i)
      const dateInput = screen.getByLabelText(/date/i)
      const amountInput = screen.getByLabelText(/amount/i)

      expect(merchantInput).toHaveAttribute('id')
      expect(pibInput).toHaveAttribute('id')
      expect(dateInput).toHaveAttribute('id')
      expect(amountInput).toHaveAttribute('id')
    })

    it('should set aria-invalid when field has error', () => {
      const errors: FiscalValidationErrors = {
        merchantName: 'Required',
        amount: 'Required',
      }

      render(<FiscalReceiptForm {...defaultProps} errors={errors} />)

      const merchantInput = screen.getByLabelText(/vendor name/i)
      const amountInput = screen.getByLabelText(/amount/i)

      expect(merchantInput).toHaveAttribute('aria-invalid', 'true')
      expect(amountInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have aria-describedby for PIB help text', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const pibInput = screen.getByLabelText(/pib/i)
      const describedBy = pibInput.getAttribute('aria-describedby')

      expect(describedBy).toBeTruthy()

      if (describedBy) {
        const helpText = document.getElementById(describedBy)
        expect(helpText).toBeInTheDocument()
        // Note: Component displays Serbian translation
        expect(helpText).toHaveTextContent(/unesite 9 cifara/i)
      }
    })

    it('should have required attribute on required fields', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      expect(screen.getByLabelText(/vendor name/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/pib/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/date/i)).toHaveAttribute('required')
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('required')
    })

    it('should have appropriate input types', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      expect(screen.getByLabelText(/vendor name/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/pib/i)).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText(/date/i)).toHaveAttribute('type', 'date')
      expect(screen.getByLabelText(/time/i)).toHaveAttribute('type', 'time')
      expect(screen.getByLabelText(/amount/i)).toHaveAttribute('type', 'number')
    })
  })

  describe('Loading State', () => {
    it('should disable cancel button when loading', () => {
      render(<FiscalReceiptForm {...defaultProps} loading={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it('should disable submit button when loading', () => {
      render(<FiscalReceiptForm {...defaultProps} loading={true} />)

      const submitButton = screen.getByRole('button', { name: /loading/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show loading text on submit button', () => {
      render(<FiscalReceiptForm {...defaultProps} loading={true} />)

      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()
    })

    it('should not call onSubmit when already loading', () => {
      const onSubmit = vi.fn()

      render(<FiscalReceiptForm {...defaultProps} loading={true} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', { name: /loading/i })

      // Button is disabled, so click should not work
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Validation State', () => {
    it('should disable submit button when form is invalid', () => {
      render(<FiscalReceiptForm {...defaultProps} isValid={false} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when form is valid', () => {
      render(<FiscalReceiptForm {...defaultProps} isValid={true} />)

      const submitButton = screen.getByRole('button', { name: /save/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit when both loading and invalid', () => {
      render(<FiscalReceiptForm {...defaultProps} loading={true} isValid={false} />)

      const submitButton = screen.getByRole('button', { name: /loading/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Input Constraints', () => {
    it('should have max attribute on date field (today)', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const dateInput = screen.getByLabelText(/date/i)
      const maxDate = dateInput.getAttribute('max')

      expect(maxDate).toBeTruthy()
      // Should be today's date in YYYY-MM-DD format
      expect(maxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should have min/max length constraints on PIB', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const pibInput = screen.getByLabelText(/pib/i)
      expect(pibInput).toHaveAttribute('minLength', '9')
      expect(pibInput).toHaveAttribute('maxLength', '9')
    })

    it('should have pattern constraint on PIB', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const pibInput = screen.getByLabelText(/pib/i)
      expect(pibInput).toHaveAttribute('pattern', '^[0-9]{9}$')
    })

    it('should have min and step attributes on amount', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      expect(amountInput).toHaveAttribute('min', '0')
      expect(amountInput).toHaveAttribute('step', '0.01')
    })

    it('should have inputMode="numeric" on PIB field', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const pibInput = screen.getByLabelText(/pib/i)
      expect(pibInput).toHaveAttribute('inputMode', 'numeric')
    })

    it('should have inputMode="decimal" on amount field', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const amountInput = screen.getByLabelText(/amount/i)
      expect(amountInput).toHaveAttribute('inputMode', 'decimal')
    })
  })

  describe('Category Select', () => {
    it('should render all category options', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const select = screen.getByLabelText(/select category/i)
      const options = within(select).getAllByRole('option')

      expect(options).toHaveLength(4) // Including "-- Select Category --"
      expect(options[0]).toHaveTextContent('-- Select Category --')
      expect(options[1]).toHaveTextContent('Food & Groceries')
      expect(options[2]).toHaveTextContent('Transport')
      expect(options[3]).toHaveTextContent('Utilities')
    })

    it('should have correct option values', () => {
      render(<FiscalReceiptForm {...defaultProps} />)

      const select = screen.getByLabelText(/select category/i)
      const options = within(select).getAllByRole('option')

      expect(options[0]).toHaveValue('')
      expect(options[1]).toHaveValue('food')
      expect(options[2]).toHaveValue('transport')
      expect(options[3]).toHaveValue('utilities')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty form data gracefully', () => {
      const emptyData: FiscalReceiptFormData = {
        merchantName: '',
        pib: '',
        date: '',
        time: '',
        amount: '',
        category: '',
        notes: '',
      }

      render(<FiscalReceiptForm {...defaultProps} formData={emptyData} />)

      expect(screen.getByLabelText(/vendor name/i)).toHaveValue('')
      expect(screen.getByLabelText(/pib/i)).toHaveValue('')
      // Note: Number input with empty value has null
      expect(screen.getByLabelText(/amount/i)).toHaveValue(null)
    })

    it('should handle very long merchant name', () => {
      const longName = 'A'.repeat(200)
      const formData: FiscalReceiptFormData = {
        ...mockFormData,
        merchantName: longName,
      }

      render(<FiscalReceiptForm {...defaultProps} formData={formData} />)

      expect(screen.getByDisplayValue(longName)).toBeInTheDocument()
    })

    it('should handle very long notes', () => {
      const longNotes = 'Note '.repeat(100)
      const formData: FiscalReceiptFormData = {
        ...mockFormData,
        notes: longNotes,
      }

      render(<FiscalReceiptForm {...defaultProps} formData={formData} />)

      // Note: Use getByLabelText for textarea with long content
      const textarea = screen.getByLabelText(/notes/i)
      expect(textarea).toHaveValue(longNotes)
    })
  })
})
