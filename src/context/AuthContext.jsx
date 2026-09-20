import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Laundry owner context
  const [organization, setOrganization] = useState(null)
  const [organizationType, setOrganizationType] = useState(null)
  const [membership, setMembership] = useState(null)
  const [branches, setBranches] = useState([])
  const [activeBranch, setActiveBranch] = useState(null)
  const [isLaundryOwner, setIsLaundryOwner] = useState(false)
  const lastResolvedSessionRef = useRef(null)

  const clearLaundryOwnerData = useCallback(() => {
    setOrganization(null)
    setOrganizationType(null)
    setMembership(null)
    setBranches([])
    setActiveBranch(null)
    setIsLaundryOwner(false)
  }, [])

  const fetchLaundryOwnerData = useCallback(async (userId) => {
    try {
      const { data: membershipsData, error: membershipError } = await supabase
        .from('memberships')
        .select('*, organizations(*)')
        .eq('user_id', userId)
        .eq('role', 'organization_admin')
        .eq('status', 'active')
        .is('branch_id', null)
        .limit(2)

      if (membershipError) {
        console.error('Error fetching membership:', membershipError)
        return
      }

      if (!membershipsData?.length) return

      if (membershipsData.length > 1) {
        console.error('Multiple active organization admin memberships found for user:', userId)
        return
      }

      const membershipData = membershipsData[0]

      if (membershipData && membershipData.organizations?.type === 'laundry') {
        setMembership(membershipData)
        setOrganization(membershipData.organizations)
        setOrganizationType(membershipData.organizations.type)
        setIsLaundryOwner(true)

        // Fetch branches
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('*')
          .eq('organization_id', membershipData.organization_id)
          .eq('status', 'active')

        if (branchesError) {
          console.error('Error fetching branches:', branchesError)
        } else {
          setBranches(branchesData || [])
        }
      }
    } catch (error) {
      console.error('Error fetching laundry owner data:', error)
    }
  }, [])

  const resolveSession = useCallback(async (session) => {
    const currentUser = session?.user ?? null
    const branchName = currentUser?.user_metadata?.branch ?? null

    setUser(currentUser)
    setBranch(branchName)
    clearLaundryOwnerData()

    if (!currentUser) return

    // Branch accounts are legacy branch users. They should not run the
    // organization_admin probe because the missing owner membership is expected.
    if (branchName) return

    await fetchLaundryOwnerData(currentUser.id)
  }, [clearLaundryOwnerData, fetchLaundryOwnerData])

  useEffect(() => {
    let isMounted = true
    const getSessionKey = (session) => {
      const currentUser = session?.user
      if (!currentUser) return 'signed-out'
      return `${currentUser.id}:${currentUser.user_metadata?.branch || 'owner'}`
    }

    const handleSession = async (session) => {
      const sessionKey = getSessionKey(session)
      if (lastResolvedSessionRef.current === sessionKey) return

      lastResolvedSessionRef.current = sessionKey
      await resolveSession(session)
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return
      await handleSession(session)
      if (!isMounted) return
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session)
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [resolveSession])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const archiveBranch = async (branchId) => {
    if (!organization?.id) throw new Error('تعذر تحديد الشركة')

    const { error } = await supabase
      .from('branches')
      .update({ status: 'archived' })
      .eq('id', branchId)
      .eq('organization_id', organization.id)

    if (error) throw error

    setBranches(current => current.filter(item => item.id !== branchId))
    setActiveBranch(current => current?.id === branchId ? null : current)
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        branch, 
        loading, 
        signIn, 
        signOut,
        organization,
        organizationType,
        membership,
        branches,
        activeBranch,
        setActiveBranch,
        archiveBranch,
        isLaundryOwner
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
