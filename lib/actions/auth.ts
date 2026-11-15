'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Authentication failed' }
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role, is_active')
    .eq('id', data.user.id)
    .single()

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'Account is deactivated or profile not found. Please contact administration.' }
  }

  // Record audit log
  await supabase.from('audit_logs').insert({
    shop_id: profile.shop_id || null,
    user_id: data.user.id,
    action_type: 'USER_LOGIN',
    table_name: 'profiles',
    record_id: data.user.id,
    new_value: { role: profile.role },
  })

  if (profile.role === 'ADMIN') {
    redirect('/admin')
  } else {
    redirect('/pos')
  }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, shops(*)')
    .eq('id', user.id)
    .single()

  return { user, profile }
}
