import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
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
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './CommandPalette.css'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
  category: 'navigation' | 'actions' | 'quick'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'home',
      label: 'Početna',
      description: 'Idi na početnu stranicu',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        navigate('/')
        setOpen(false)
      },
      keywords: ['home', 'početna', 'dashboard'],
      category: 'navigation',
    },
    {
      id: 'receipts',
      label: 'Svi Računi',
      description: 'Pregled svih fiskalnih računa',
      icon: <Receipt className="w-4 h-4" />,
      action: () => {
        navigate('/receipts')
        setOpen(false)
      },
      keywords: ['receipts', 'računi', 'fiskalni'],
      category: 'navigation',
    },
    {
      id: 'warranties',
      label: 'Garancije',
      description: 'Upravljaj garancijama uređaja',
      icon: <ShieldCheck className="w-4 h-4" />,
      action: () => {
        navigate('/warranties')
        setOpen(false)
      },
      keywords: ['warranties', 'garancije', 'uređaji'],
      category: 'navigation',
    },
    {
      id: 'search',
      label: 'Pretraga',
      description: 'Napredna pretraga računa',
      icon: <Search className="w-4 h-4" />,
      action: () => {
        navigate('/search')
        setOpen(false)
      },
      keywords: ['search', 'pretraga', 'traži'],
      category: 'navigation',
    },
    {
      id: 'settings',
      label: 'Podešavanja',
      description: 'Podesi aplikaciju',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        navigate('/profile')
        setOpen(false)
      },
      keywords: ['settings', 'podešavanja', 'profile'],
      category: 'navigation',
    },

    // Quick Actions
    {
      id: 'add-receipt',
      label: 'Dodaj Račun',
      description: 'Unesi novi fiskalni račun',
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        navigate('/add-receipt')
        setOpen(false)
      },
      keywords: ['add', 'new', 'dodaj', 'novi', 'račun'],
      category: 'actions',
    },
    {
      id: 'scan-receipt',
      label: 'Skeniraj Račun',
      description: 'Skeniraj QR kod sa računa',
      icon: <Camera className="w-4 h-4" />,
      action: () => {
        navigate('/add-receipt?scan=true')
        setOpen(false)
      },
      keywords: ['scan', 'skeniraj', 'camera', 'qr'],
      category: 'actions',
    },
    {
      id: 'add-device',
      label: 'Dodaj Uređaj',
      description: 'Registruj novi uređaj sa garancijom',
      icon: <Smartphone className="w-4 h-4" />,
      action: () => {
        navigate('/add-device')
        setOpen(false)
      },
      keywords: ['device', 'uređaj', 'garancija', 'dodaj'],
      category: 'actions',
    },

    // Quick Filters
    {
      id: 'recent',
      label: 'Nedavni Računi',
      description: 'Prikaži račune iz poslednjih 7 dana',
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => {
        navigate('/receipts?filter=recent')
        setOpen(false)
      },
      keywords: ['recent', 'nedavni', 'latest'],
      category: 'quick',
    },
    {
      id: 'export',
      label: 'Izvezi Podatke',
      description: 'Eksportuj sve račune',
      icon: <Download className="w-4 h-4" />,
      action: () => {
        // Will implement export functionality
        setOpen(false)
      },
      keywords: ['export', 'download', 'izvezi', 'preuzmi'],
      category: 'quick',
    },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="command-backdrop"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="command-dialog"
          >
            <Command className="command-root">
              <div className="command-input-wrapper">
                <Search className="command-search-icon" />
                <Command.Input
                  placeholder="Pretraži ili izvrši akciju..."
                  className="command-input"
                  autoFocus
                />
              </div>

              <Command.List className="command-list">
                <Command.Empty className="command-empty">Nema rezultata.</Command.Empty>

                <Command.Group heading="Navigacija" className="command-group">
                  {commands
                    .filter((cmd) => cmd.category === 'navigation')
                    .map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.label}
                        keywords={cmd.keywords}
                        onSelect={cmd.action}
                        className="command-item"
                      >
                        <div className="command-item-icon">{cmd.icon}</div>
                        <div className="command-item-content">
                          <div className="command-item-label">{cmd.label}</div>
                          {cmd.description && (
                            <div className="command-item-description">{cmd.description}</div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                </Command.Group>

                <Command.Group heading="Akcije" className="command-group">
                  {commands
                    .filter((cmd) => cmd.category === 'actions')
                    .map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.label}
                        keywords={cmd.keywords}
                        onSelect={cmd.action}
                        className="command-item"
                      >
                        <div className="command-item-icon">{cmd.icon}</div>
                        <div className="command-item-content">
                          <div className="command-item-label">{cmd.label}</div>
                          {cmd.description && (
                            <div className="command-item-description">{cmd.description}</div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                </Command.Group>

                <Command.Group heading="Brzi Filter" className="command-group">
                  {commands
                    .filter((cmd) => cmd.category === 'quick')
                    .map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.label}
                        keywords={cmd.keywords}
                        onSelect={cmd.action}
                        className="command-item"
                      >
                        <div className="command-item-icon">{cmd.icon}</div>
                        <div className="command-item-content">
                          <div className="command-item-label">{cmd.label}</div>
                          {cmd.description && (
                            <div className="command-item-description">{cmd.description}</div>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                </Command.Group>
              </Command.List>

              <div className="command-footer">
                <kbd>↑↓</kbd> navigacija
                <kbd>Enter</kbd> izaberi
                <kbd>Esc</kbd> zatvori
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
