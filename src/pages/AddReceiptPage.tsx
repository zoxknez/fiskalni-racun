import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QrCode, Camera, PenSquare, ArrowLeft } from 'lucide-react'
import { addReceipt } from '@/hooks/useDatabase'
import toast from 'react-hot-toast'

export default function AddReceiptPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') as 'qr' | 'photo' | 'manual' || 'qr'
  const [mode, setMode] = useState<'qr' | 'photo' | 'manual'>(initialMode)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [merchantName, setMerchantName] = useState('')
  const [pib, setPib] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('groceries')
  const [notes, setNotes] = useState('')

  const categories = [
    'groceries', 'electronics', 'clothing', 'health', 'home',
    'automotive', 'entertainment', 'education', 'sports', 'other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!merchantName || !date || !amount || !pib) {
      toast.error(t('addReceipt.requiredFields'))
      return
    }

    setLoading(true)
    
    try {
      await addReceipt({
        merchantName,
        pib,
        date: new Date(date),
        time,
        totalAmount: parseFloat(amount),
        category,
        notes: notes || undefined,
      })
      
      toast.success(t('addReceipt.success'))
      navigate('/receipts')
    } catch (error) {
      toast.error(t('common.error'))
      console.error('Add receipt error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScanQR = () => {
    toast.error(t('addReceipt.qrNotRecognized'))
    setMode('manual')
  }

  const handleTakePhoto = () => {
    toast.error(t('common.comingSoon'))
    setMode('manual')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          {t('addReceipt.title')}
        </h1>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 bg-dark-100 dark:bg-dark-800 p-1 rounded-lg">
        {[
          { key: 'qr', icon: QrCode, label: t('addReceipt.scanQR') },
          { key: 'photo', icon: Camera, label: t('addReceipt.photo') },
          { key: 'manual', icon: PenSquare, label: t('addReceipt.manual') },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              mode === key
                ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-dark-600 dark:text-dark-400 hover:text-dark-900 dark:hover:text-dark-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* QR Mode */}
      {mode === 'qr' && (
        <div className="card">
          <div className="empty-state">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <QrCode className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              {t('addReceipt.scanningQR')}
            </p>
            <button onClick={handleScanQR} className="btn-primary">
              {t('common.comingSoon')}
            </button>
          </div>
        </div>
      )}

      {/* Photo Mode */}
      {mode === 'photo' && (
        <div className="card">
          <div className="empty-state">
            <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              {t('addReceipt.takingPhoto')}
            </p>
            <button onClick={handleTakePhoto} className="btn-primary">
              {t('common.comingSoon')}
            </button>
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              {t('addReceipt.vendorRequired')}
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="input"
              placeholder="Maxi, Idea, Tehnomanija..."
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              PIB {t('common.required')}
            </label>
            <input
              type="text"
              value={pib}
              onChange={(e) => setPib(e.target.value)}
              className="input"
              placeholder="12345678"
              required
              minLength={8}
              maxLength={9}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('addReceipt.dateRequired')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                {t('receiptDetail.time')}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              {t('addReceipt.amountRequired')}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              {t('addReceipt.selectCategory')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              <option value="">—</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              {t('receiptDetail.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder={t('addReceipt.addNote')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
