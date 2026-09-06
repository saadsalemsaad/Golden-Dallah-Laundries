import { createContext, useContext, useEffect, useState } from 'react'
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

  const fetchLaundryOwnerData = async (userId) => {
    try {
      // Fetch membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*, organizations(*)')
        .eq('user_id', userId)
        .eq('role', 'organization_admin')
        .eq('status', 'active')
        .is('branch_id', null)
        .single()

      if (membershipError) {
        if (membershipError.code !== 'PGRST116') {
          console.error('Error fetching membership:', membershipError)
        }
        return
      }

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
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setBranch(session?.user?.user_metadata?.branch ?? null)
      
      if (session?.user) {
        fetchLaundryOwnerData(session.user.id)
      }
      
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setBranch(session?.user?.user_metadata?.branch ?? null)
      
      if (session?.user) {
        fetchLaundryOwnerData(session.user.id)
      } else {
        // Clear laundry owner data on sign out
        setOrganization(null)
        setOrganizationType(null)
        setMembership(null)
        setBranches([])
        setActiveBranch(null)
        setIsLaundryOwner(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
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
        isLaundryOwner
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
