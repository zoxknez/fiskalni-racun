/**
 * Component tests for ModeSelector
 *
 * Test Coverage:
 * - Rendering all mode buttons
 * - Active mode highlighting
 * - Mode change interactions
 * - Accessibility (ARIA attributes, roles)
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FormMode } from '../types'
import { ModeSelector } from './ModeSelector'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'addReceipt.scanQR': 'Scan QR',
        'addReceipt.photo': 'Photo',
        'addReceipt.manual': 'Manual',
      }
      return translations[key] || key
    },
  }),
}))

describe('ModeSelector', () => {
  const defaultProps = {
    mode: 'qr' as FormMode,
    onModeChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render all three mode buttons', () => {
      render(<ModeSelector {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /scan qr code mode/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /take photo mode/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /manual entry mode/i })).toBeInTheDocument()
    })

    it('should render mode labels on desktop', () => {
      render(<ModeSelector {...defaultProps} />)

      expect(screen.getByText('Scan QR')).toBeInTheDocument()
      expect(screen.getByText('Photo')).toBeInTheDocument()
      expect(screen.getByText('Manual')).toBeInTheDocument()
    })

    it('should have tablist role on container', () => {
      render(<ModeSelector {...defaultProps} />)

      const tablist = screen.getByRole('tablist', { name: /add receipt modes/i })
      expect(tablist).toBeInTheDocument()
    })
  })

  describe('Active Mode', () => {
    it('should mark QR mode as selected when active', () => {
      render(<ModeSelector {...defaultProps} mode="qr" />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      expect(qrButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark Photo mode as selected when active', () => {
      render(<ModeSelector {...defaultProps} mode="photo" />)

      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })
      expect(photoButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark Manual mode as selected when active', () => {
      render(<ModeSelector {...defaultProps} mode="manual" />)

      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })
      expect(manualButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark only one mode as selected at a time', () => {
      render(<ModeSelector {...defaultProps} mode="photo" />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })
      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })

      expect(qrButton).toHaveAttribute('aria-selected', 'false')
      expect(photoButton).toHaveAttribute('aria-selected', 'true')
      expect(manualButton).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('User Interactions', () => {
    it('should call onModeChange with "qr" when QR button clicked', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(<ModeSelector {...defaultProps} mode="manual" onModeChange={onModeChange} />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      await user.click(qrButton)

      expect(onModeChange).toHaveBeenCalledWith('qr')
      expect(onModeChange).toHaveBeenCalledTimes(1)
    })

    it('should call onModeChange with "photo" when Photo button clicked', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(<ModeSelector {...defaultProps} mode="qr" onModeChange={onModeChange} />)

      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })
      await user.click(photoButton)

      expect(onModeChange).toHaveBeenCalledWith('photo')
      expect(onModeChange).toHaveBeenCalledTimes(1)
    })

    it('should call onModeChange with "manual" when Manual button clicked', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(<ModeSelector {...defaultProps} mode="qr" onModeChange={onModeChange} />)

      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })
      await user.click(manualButton)

      expect(onModeChange).toHaveBeenCalledWith('manual')
      expect(onModeChange).toHaveBeenCalledTimes(1)
    })

    it('should allow clicking the currently active mode', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(<ModeSelector {...defaultProps} mode="qr" onModeChange={onModeChange} />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      await user.click(qrButton)

      // Should still call onModeChange even if clicking active mode
      expect(onModeChange).toHaveBeenCalledWith('qr')
    })
  })

  describe('Accessibility', () => {
    it('should have role="tab" on all mode buttons', () => {
      render(<ModeSelector {...defaultProps} />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)
    })

    it('should have aria-label on all buttons', () => {
      render(<ModeSelector {...defaultProps} />)

      expect(screen.getByRole('tab', { name: /scan qr code mode/i })).toHaveAttribute('aria-label')
      expect(screen.getByRole('tab', { name: /take photo mode/i })).toHaveAttribute('aria-label')
      expect(screen.getByRole('tab', { name: /manual entry mode/i })).toHaveAttribute('aria-label')
    })

    it('should have aria-selected attribute on all buttons', () => {
      render(<ModeSelector {...defaultProps} mode="photo" />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })
      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })

      expect(qrButton).toHaveAttribute('aria-selected')
      expect(photoButton).toHaveAttribute('aria-selected')
      expect(manualButton).toHaveAttribute('aria-selected')
    })

    it('should have type="button" to prevent form submission', () => {
      render(<ModeSelector {...defaultProps} />)

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('type', 'button')
      })
    })

    it('should have tablist with aria-label', () => {
      render(<ModeSelector {...defaultProps} />)

      const tablist = screen.getByRole('tablist')
      expect(tablist).toHaveAttribute('aria-label', 'Add receipt modes')
    })
  })

  describe('Visual State', () => {
    it('should apply active styles to selected mode', () => {
      render(<ModeSelector {...defaultProps} mode="photo" />)

      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })

      // Active button should have specific classes (we can't check exact classes, but we can check it's marked as selected)
      expect(photoButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should apply inactive styles to non-selected modes', () => {
      render(<ModeSelector {...defaultProps} mode="photo" />)

      const qrButton = screen.getByRole('tab', { name: /scan qr code mode/i })
      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })

      expect(qrButton).toHaveAttribute('aria-selected', 'false')
      expect(manualButton).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid mode switching', async () => {
      const user = userEvent.setup()
      const onModeChange = vi.fn()

      render(<ModeSelector {...defaultProps} mode="qr" onModeChange={onModeChange} />)

      const photoButton = screen.getByRole('tab', { name: /take photo mode/i })
      const manualButton = screen.getByRole('tab', { name: /manual entry mode/i })

      await user.click(photoButton)
      await user.click(manualButton)
      await user.click(photoButton)

      expect(onModeChange).toHaveBeenCalledTimes(3)
      expect(onModeChange).toHaveBeenNthCalledWith(1, 'photo')
      expect(onModeChange).toHaveBeenNthCalledWith(2, 'manual')
      expect(onModeChange).toHaveBeenNthCalledWith(3, 'photo')
    })

    it('should work with all valid FormMode values', () => {
      const modes: FormMode[] = ['qr', 'photo', 'manual']

      modes.forEach((mode) => {
        const { unmount } = render(<ModeSelector {...defaultProps} mode={mode} />)

        const buttons = screen.getAllByRole('tab')
        const selectedButtons = buttons.filter(
          (btn) => btn.getAttribute('aria-selected') === 'true'
        )

        expect(selectedButtons).toHaveLength(1)

        // Cleanup before next iteration
        unmount()
      })
    })
  })
})
