import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bdcbzbixcwnsitjbjjrs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY2J6Yml4Y3duc2l0amJqanJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTAyMzEsImV4cCI6MjA5Njc2NjIzMX0.v8gVHjW8OLZd5m_TD5EK2mGs1jbFbXkxGBteYvAqfAE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
