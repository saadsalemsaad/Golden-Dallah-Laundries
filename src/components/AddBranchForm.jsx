import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AddBranchForm({ organizationId, onSuccess, onCancel }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }

    setLoading(true)

    try {
      // Generate safe unique slug
      const slug = 'branch-' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 10)

      const { error } = await supabase
        .from('branches')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          slug,
          status: 'active',
          legacy_branch: null
        })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error creating branch:', error)
      toast.error('فشل إضافة العميل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          اسم العميل
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: العميل الرئيسي"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          disabled={loading}
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}
