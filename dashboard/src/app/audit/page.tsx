import React from 'react'
import AuditPage from '../../components/pages/AuditPage'

export default function Page(){
  // In the real app, token/role come from auth context; for now read window.__INITIAL__
  const token = (typeof window !== 'undefined' && (window as any).__TOKEN__) || ''
  const role = (typeof window !== 'undefined' && (window as any).__ROLE__) || ''
  return <AuditPage token={token} role={role} />
}
