import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import AddBranchForm from '../components/AddBranchForm'

export default function LaundryPage() {
  const { organization, branches, activeBranch, setActiveBranch, archiveBranch, isLaundryOwner } = useAuth()
  const navigate = useNavigate()
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [archivingId, setArchivingId] = useState(null)

  const handleSelectBranch = (branch) => {
    setActiveBranch(branch)
    navigate('/entry')
  }

  const handleBranchAdded = (newBranch) => {
    setShowAddBranch(false)
    toast.success('تم إضافة العميل بنجاح')
  }

  const handleArchive = async (branch) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم إخفاؤه من العملاء النشطين مع الاحتفاظ بالسجلات السابقة.')
    if (!confirmed) return

    setArchivingId(branch.id)
    try {
      await archiveBranch(branch.id)
      if (activeBranch?.id === branch.id) navigate('/laundry')
      toast.success('تم حذف العميل من العملاء النشطين')
    } catch (error) {
      toast.error('فشل حذف العميل: ' + error.message)
    } finally {
      setArchivingId(null)
    }
  }

  if (!isLaundryOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-gray-500 text-lg">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {organization?.name || 'المغسلة'}
        </h1>
        <p className="text-slate-500">
          إدارة عملائك
        </p>
      </div>

      {/* Branches Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">عملاء المغسلة</h2>
          <button
            onClick={() => setShowAddBranch(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            إضافة عميل
          </button>
        </div>

        {branches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-slate-500 text-lg mb-6">لا يوجد عملاء حتى الآن</p>
            <button
              onClick={() => setShowAddBranch(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              إضافة عميل
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between gap-3 text-right p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleSelectBranch(branch)}
                  className="flex-1 text-right font-medium text-slate-800"
                >
                  {branch.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleArchive(branch)}
                  disabled={archivingId === branch.id}
                  className="shrink-0 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  {archivingId === branch.id ? 'جاري الحذف...' : 'حذف العميل'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {showAddBranch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">إضافة عميل جديد</h3>
              <AddBranchForm
                organizationId={organization?.id}
                onSuccess={handleBranchAdded}
                onCancel={() => setShowAddBranch(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
