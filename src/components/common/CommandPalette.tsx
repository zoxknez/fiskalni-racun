import { Command } from 'cmdk'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  Download,
  Home,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './CommandPalette.css'

interface CommandItem {
  id: string
  labelKey: string
  descriptionKey?: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
  category: 'navigation' | 'actions' | 'quick'
}

function CommandPalette() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Close palette handler
  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Memoized navigation action creators
  const createNavigateAction = useCallback(
    (path: string) => () => {
      navigate(path)
      setOpen(false)
    },
    [navigate]
  )

  // Memoized commands list
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'home',
        labelKey: 'commandPalette.home',
        descriptionKey: 'commandPalette.homeDesc',
        icon: <Home className="h-4 w-4" />,
        action: createNavigateAction('/'),
        keywords: ['home', 'početna', 'dashboard'],
        category: 'navigation',
      },
      {
        id: 'receipts',
        labelKey: 'commandPalette.receipts',
        descriptionKey: 'commandPalette.receiptsDesc',
        icon: <Receipt className="h-4 w-4" />,
        action: createNavigateAction('/receipts'),
        keywords: ['receipts', 'računi', 'fiskalni'],
        category: 'navigation',
      },
      {
        id: 'warranties',
        labelKey: 'commandPalette.warranties',
        descriptionKey: 'commandPalette.warrantiesDesc',
        icon: <ShieldCheck className="h-4 w-4" />,
        action: createNavigateAction('/warranties'),
        keywords: ['warranties', 'garancije', 'uređaji'],
        category: 'navigation',
      },
      {
        id: 'search',
        labelKey: 'commandPalette.search',
        descriptionKey: 'commandPalette.searchDesc',
        icon: <Search className="h-4 w-4" />,
        action: createNavigateAction('/search'),
        keywords: ['search', 'pretraga', 'traži'],
        category: 'navigation',
      },
      {
        id: 'settings',
        labelKey: 'commandPalette.settings',
        descriptionKey: 'commandPalette.settingsDesc',
        icon: <Settings className="h-4 w-4" />,
        action: createNavigateAction('/profile'),
        keywords: ['settings', 'podešavanja', 'profile'],
        category: 'navigation',
      },

      // Quick Actions
      {
        id: 'add-receipt',
        labelKey: 'commandPalette.addReceipt',
        descriptionKey: 'commandPalette.addReceiptDesc',
        icon: <Plus className="h-4 w-4" />,
        action: createNavigateAction('/add-receipt'),
        keywords: ['add', 'new', 'dodaj', 'novi', 'račun'],
        category: 'actions',
      },
      {
        id: 'scan-receipt',
        labelKey: 'commandPalette.scanReceipt',
        descriptionKey: 'commandPalette.scanReceiptDesc',
        icon: <Camera className="h-4 w-4" />,
        action: createNavigateAction('/add-receipt?scan=true'),
        keywords: ['scan', 'skeniraj', 'camera', 'qr'],
        category: 'actions',
      },
      {
        id: 'add-device',
        labelKey: 'commandPalette.addDevice',
        descriptionKey: 'commandPalette.addDeviceDesc',
        icon: <Smartphone className="h-4 w-4" />,
        action: createNavigateAction('/add-device'),
        keywords: ['device', 'uređaj', 'garancija', 'dodaj'],
        category: 'actions',
      },

      // Quick Filters
      {
        id: 'recent',
        labelKey: 'commandPalette.recent',
        descriptionKey: 'commandPalette.recentDesc',
        icon: <TrendingUp className="h-4 w-4" />,
        action: createNavigateAction('/receipts?filter=recent'),
        keywords: ['recent', 'nedavni', 'latest'],
        category: 'quick',
      },
      {
        id: 'export',
        labelKey: 'commandPalette.export',
        descriptionKey: 'commandPalette.exportDesc',
        icon: <Download className="h-4 w-4" />,
        action: createNavigateAction('/import-export'),
        keywords: ['export', 'download', 'izvezi', 'preuzmi'],
        category: 'quick',
      },
    ],
    [createNavigateAction]
  )

  // Memoized filtered commands by category
  const navigationCommands = useMemo(
    () => commands.filter((cmd) => cmd.category === 'navigation'),
    [commands]
  )
  const actionCommands = useMemo(
    () => commands.filter((cmd) => cmd.category === 'actions'),
    [commands]
  )
  const quickCommands = useMemo(
    () => commands.filter((cmd) => cmd.category === 'quick'),
    [commands]
  )

  // Animation variants - respect reduced motion
  const backdropVariants = useMemo(
    () =>
      prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    [prefersReducedMotion]
  )

  const dialogVariants = useMemo(
    () =>
      prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
            initial: { opacity: 0, scale: 0.95, y: -20 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.95, y: -20 },
          },
    [prefersReducedMotion]
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={backdropVariants.initial}
            animate={backdropVariants.animate}
            exit={backdropVariants.exit}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="command-backdrop"
            onClick={handleClose}
          />

          {/* Command Dialog */}
          <motion.div
            initial={dialogVariants.initial}
            animate={dialogVariants.animate}
            exit={dialogVariants.exit}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
            }
            className="command-dialog"
          >
            <Command className="command-root">
              <div className="command-input-wrapper">
                <Search className="command-search-icon" />
                <Command.Input
                  placeholder={t('commandPalette.searchPlaceholder')}
                  className="command-input"
                  autoFocus
                />
              </div>

              <Command.List className="command-list">
                <Command.Empty className="command-empty">
                  {t('commandPalette.noResults')}
                </Command.Empty>

                <Command.Group heading={t('commandPalette.navigation')} className="command-group">
                  {navigationCommands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={t(cmd.labelKey as never)}
                      {...(cmd.keywords ? { keywords: cmd.keywords } : {})}
                      onSelect={cmd.action}
                      className="command-item"
                    >
                      <div className="command-item-icon">{cmd.icon}</div>
                      <div className="command-item-content">
                        <div className="command-item-label">{t(cmd.labelKey as never)}</div>
                        {cmd.descriptionKey && (
                          <div className="command-item-description">
                            {t(cmd.descriptionKey as never)}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading={t('commandPalette.actions')} className="command-group">
                  {actionCommands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={t(cmd.labelKey as never)}
                      {...(cmd.keywords ? { keywords: cmd.keywords } : {})}
                      onSelect={cmd.action}
                      className="command-item"
                    >
                      <div className="command-item-icon">{cmd.icon}</div>
                      <div className="command-item-content">
                        <div className="command-item-label">{t(cmd.labelKey as never)}</div>
                        {cmd.descriptionKey && (
                          <div className="command-item-description">
                            {t(cmd.descriptionKey as never)}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading={t('commandPalette.quickFilter')} className="command-group">
                  {quickCommands.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={t(cmd.labelKey as never)}
                      {...(cmd.keywords ? { keywords: cmd.keywords } : {})}
                      onSelect={cmd.action}
                      className="command-item"
                    >
                      <div className="command-item-icon">{cmd.icon}</div>
                      <div className="command-item-content">
                        <div className="command-item-label">{t(cmd.labelKey as never)}</div>
                        {cmd.descriptionKey && (
                          <div className="command-item-description">
                            {t(cmd.descriptionKey as never)}
                          </div>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              <div className="command-footer">
                <kbd>↑↓</kbd> {t('commandPalette.navigate')}
                <kbd>Enter</kbd> {t('commandPalette.select')}
                <kbd>Esc</kbd> {t('commandPalette.close')}
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default memo(CommandPalette)
