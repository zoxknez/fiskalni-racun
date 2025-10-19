/**
 * ManualTypeSelector Component Tests
 *
 * Tests the manual entry type selector (fiscal vs household)
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ManualFormType } from '../types'
import { ManualTypeSelector } from './ManualTypeSelector'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'addReceipt.manualFiscal': 'Fiscal Receipt',
        'addReceipt.manualHousehold': 'Household Bill',
        'addReceipt.manualTypeSwitch': 'Select manual entry type',
      }
      return translations[key] || key
    },
  }),
}))

describe('ManualTypeSelector', () => {
  const defaultProps = {
    type: 'fiscal' as ManualFormType,
    onTypeChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render both type buttons', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /fiscal receipt type/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /household bill type/i })).toBeInTheDocument()
    })

    it('should render type labels on desktop', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      expect(screen.getByText(/fiscal receipt/i)).toBeInTheDocument()
      expect(screen.getByText(/household bill/i)).toBeInTheDocument()
    })

    it('should have tablist role on container', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      const tablist = screen.getByRole('tablist', { name: /select manual entry type/i })
      expect(tablist).toBeInTheDocument()
    })
  })

  describe('Active Type', () => {
    it('should mark fiscal type as selected when active', () => {
      render(<ManualTypeSelector {...defaultProps} type="fiscal" />)

      const fiscalButton = screen.getByRole('tab', { name: /fiscal receipt type/i })
      expect(fiscalButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark household type as selected when active', () => {
      render(<ManualTypeSelector {...defaultProps} type="household" />)

      const householdButton = screen.getByRole('tab', { name: /household bill type/i })
      expect(householdButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark only one type as selected at a time', () => {
      render(<ManualTypeSelector {...defaultProps} type="fiscal" />)

      const buttons = screen.getAllByRole('tab')
      const selectedButtons = buttons.filter(
        (button) => button.getAttribute('aria-selected') === 'true'
      )

      expect(selectedButtons).toHaveLength(1)
    })
  })

  describe('User Interactions', () => {
    it('should call onTypeChange with "fiscal" when fiscal button clicked', async () => {
      const user = userEvent.setup()
      const onTypeChange = vi.fn()

      render(<ManualTypeSelector {...defaultProps} type="household" onTypeChange={onTypeChange} />)

      const fiscalButton = screen.getByRole('tab', { name: /fiscal receipt type/i })
      await user.click(fiscalButton)

      expect(onTypeChange).toHaveBeenCalledWith('fiscal')
      expect(onTypeChange).toHaveBeenCalledTimes(1)
    })

    it('should call onTypeChange with "household" when household button clicked', async () => {
      const user = userEvent.setup()
      const onTypeChange = vi.fn()

      render(<ManualTypeSelector {...defaultProps} type="fiscal" onTypeChange={onTypeChange} />)

      const householdButton = screen.getByRole('tab', { name: /household bill type/i })
      await user.click(householdButton)

      expect(onTypeChange).toHaveBeenCalledWith('household')
      expect(onTypeChange).toHaveBeenCalledTimes(1)
    })

    it('should allow clicking the currently active type', async () => {
      const user = userEvent.setup()
      const onTypeChange = vi.fn()

      render(<ManualTypeSelector {...defaultProps} type="fiscal" onTypeChange={onTypeChange} />)

      const fiscalButton = screen.getByRole('tab', { name: /fiscal receipt type/i })
      await user.click(fiscalButton)

      expect(onTypeChange).toHaveBeenCalledWith('fiscal')
    })
  })

  describe('Accessibility', () => {
    it('should have role="tab" on both type buttons', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      const buttons = screen.getAllByRole('tab')
      expect(buttons).toHaveLength(2)
    })

    it('should have aria-label on both buttons', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      expect(screen.getByLabelText(/fiscal receipt type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/household bill type/i)).toBeInTheDocument()
    })

    it('should have aria-selected attribute on both buttons', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      const buttons = screen.getAllByRole('tab')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-selected')
      })
    })

    it('should have type="button" to prevent form submission', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      const buttons = screen.getAllByRole('tab')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('should have tablist with aria-label', () => {
      render(<ManualTypeSelector {...defaultProps} />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-label', 'Select manual entry type')
    })
  })

  describe('Visual State', () => {
    it('should apply active styles to selected type', () => {
      render(<ManualTypeSelector {...defaultProps} type="fiscal" />)

      const fiscalButton = screen.getByRole('tab', { name: /fiscal receipt type/i })
      expect(fiscalButton.className).toMatch(/bg-white/)
      expect(fiscalButton.className).toMatch(/text-primary-600/)
    })

    it('should apply inactive styles to non-selected types', () => {
      render(<ManualTypeSelector {...defaultProps} type="fiscal" />)

      const householdButton = screen.getByRole('tab', { name: /household bill type/i })
      expect(householdButton.className).toMatch(/text-dark-600/)
      expect(householdButton.className).not.toMatch(/bg-white/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid type switching', async () => {
      const user = userEvent.setup()
      const onTypeChange = vi.fn()

      render(<ManualTypeSelector {...defaultProps} onTypeChange={onTypeChange} />)

      const fiscalButton = screen.getByRole('tab', { name: /fiscal receipt type/i })
      const householdButton = screen.getByRole('tab', { name: /household bill type/i })

      // Rapid clicks
      await user.click(householdButton)
      await user.click(fiscalButton)
      await user.click(householdButton)
      await user.click(fiscalButton)

      expect(onTypeChange).toHaveBeenCalledTimes(4)
    })

    it('should work with both valid ManualFormType values', () => {
      const types: ManualFormType[] = ['fiscal', 'household']

      types.forEach((type) => {
        const { unmount } = render(<ManualTypeSelector {...defaultProps} type={type} />)

        const selectedButtons = screen
          .getAllByRole('tab')
          .filter((button) => button.getAttribute('aria-selected') === 'true')

        expect(selectedButtons).toHaveLength(1)
        expect(selectedButtons[0]).toHaveAttribute(
          'aria-label',
          type === 'fiscal' ? 'Fiscal receipt type' : 'Household bill type'
        )

        unmount()
      })
    })
  })
})
