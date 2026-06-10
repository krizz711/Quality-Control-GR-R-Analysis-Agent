"use client"

import React, {useEffect, useState} from 'react'

export default function AuditPage({token, role}:{token:string, role:string}){
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [start, setStart] = useState(()=> new Date(Date.now()-7*24*3600*1000).toISOString().slice(0,16))
  const [end, setEnd] = useState(()=> new Date().toISOString().slice(0,16))
  const [eventType, setEventType] = useState('All')
  const [error, setError] = useState<string | null>(null)

  async function fetchData(){
    setLoading(true); setError(null)
    try{
      const params = new URLSearchParams()
      params.set('start', new Date(start).toISOString())
      params.set('end', new Date(end).toISOString())
      if(eventType !== 'All') params.set('event_type', eventType)
      params.set('format','json')
      const res = await fetch(`/api/v1/audit/export?${params.toString()}`, {headers:{'Authorization': `Bearer ${token}`}})
      if(!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
    }catch(e:any){
      setError(e.message)
    }finally{setLoading(false)}
  }

  useEffect(()=>{fetchData()}, [])

  return (
    <div style={{padding:20}}>
      <h1>Audit Log</h1>
      <p>Complete record of all system actions</p>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input type='datetime-local' value={start} onChange={e=>setStart(e.target.value)} />
        <input type='datetime-local' value={end} onChange={e=>setEnd(e.target.value)} />
        <select value={eventType} onChange={e=>setEventType(e.target.value)}>
          <option>All</option>
          <option>grr_study_run</option>
          <option>auth_failure</option>
          <option>alert_sent</option>
          <option>alert_acknowledged</option>
          <option>measurement_uploaded</option>
        </select>
        <button onClick={fetchData}>Apply Filters</button>
        <button onClick={()=>{setStart(new Date(Date.now()-7*24*3600*1000).toISOString().slice(0,16)); setEnd(new Date().toISOString().slice(0,16)); setEventType('All');}}>Clear</button>
        {token && <button onClick={async ()=>{
          const params = new URLSearchParams(); params.set('start', new Date(start).toISOString()); params.set('end', new Date(end).toISOString()); if(eventType!=='All') params.set('event_type', eventType); params.set('format','csv');
          const res = await fetch(`/api/v1/audit/export?${params.toString()}`, {headers:{'Authorization': `Bearer ${token}`}})
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='audit_export.csv'; a.click();
        }}>Export CSV</button>}
      </div>

      {loading && <p>Loading...</p>}
      {error && <div><p>Failed to load audit log. Please try again.</p><button onClick={fetchData}>Retry</button></div>}
      {!loading && !error && data.length===0 && <p>No audit events found for the selected filters</p>}

      <table style={{width:'100%',marginTop:12,borderCollapse:'collapse'}}>
        <thead><tr><th>Timestamp</th><th>Event Type</th><th>Component</th><th>User</th><th>Summary</th></tr></thead>
        <tbody>
          {data.slice(0,50).map((row:any,idx:number)=> (
            <tr key={row.id || idx} style={{borderTop:'1px solid #eee'}}>
              <td>{new Date(row.created_at||row.timestamp).toLocaleString()}</td>
              <td>{row.event_type}</td>
              <td>{row.component}</td>
              <td>{row.user_id || 'system'}</td>
              <td title={JSON.stringify(row.result_summary || row.metadata).slice(0,1000)}>{JSON.stringify(row.result_summary || row.metadata).slice(0,80)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
