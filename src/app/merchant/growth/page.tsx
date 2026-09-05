'use client'

import { useState, useEffect } from 'react'

export default function GrowthDashboard() {
  const [merchantId, setMerchantId] = useState('mrc_aster_gear')
  const [actions, setActions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ revenue: 0, aiSalesPercentage: 0, activeAgents: 0 })

  const fetchActions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/growth/actions?merchantId=${merchantId}`)
      const data = await res.json()
      setActions(data.items || [])

      const statsRes = await fetch(`/api/merchant/stats?merchantId=${merchantId}`)
      const statsData = await statsRes.json()
      if (!statsData.error) {
        setStats(statsData)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchActions()
  }, [merchantId])

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/growth/actions/${id}/approve`, { method: 'POST' })
      fetchActions()
    } catch (err) {
      alert('Failed to approve')
    }
  }

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`/api/growth/actions/${id}/execute`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      }
      fetchActions()
    } catch (err) {
      alert('Failed to execute')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-porcelain-canvas)]">
      <div className="bg-[var(--color-obsidian)] pb-[80px]">
        <div className="max-w-[var(--page-max-width)] mx-auto py-[60px] px-4 sm:px-[25px]">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-[36px] font-medium text-[var(--color-porcelain-canvas)] uppercase tracking-[var(--tracking-heading)] leading-[var(--leading-heading)]">Merchant Growth Dashboard</h1>
              <p className="mt-[16px] text-white/70 max-w-2xl text-[16px] font-normal leading-[var(--leading-body)]">
                Monitor your AI Growth Agent, review high-leverage opportunities, and authorize strategic catalog actions securely.
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <select 
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="bg-[var(--color-obsidian)] border border-white/20 text-[var(--color-porcelain-canvas)] text-[14px] px-[16px] py-[8px] rounded uppercase tracking-[0.1em]"
              >
                <option value="mrc_aster_gear">Aster Gear</option>
                <option value="mrc_omega_sports">Omega Sports</option>
              </select>
            </div>
          </header>
        </div>
      </div>

      <main className="-mt-[40px] max-w-[var(--page-max-width)] mx-auto px-4 sm:px-[25px]">
        <div className="bg-[var(--color-porcelain-canvas)] rounded-none shadow-none mb-[80px] border border-[var(--color-mist)]">
          <div className="px-[40px] py-[32px] border-b border-[var(--color-mist)] bg-[var(--color-bone)]">
            <h2 className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em]">Revenue & Growth Overview</h2>
          </div>
          <div className="p-[40px] grid grid-cols-1 md:grid-cols-3 gap-[25px]">
            <div className="border border-[var(--color-mist)] rounded-none p-[32px] bg-[var(--color-porcelain-canvas)]">
              <p className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[16px]">Total Revenue (30d)</p>
              <p className="text-[36px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-heading)]">
                {stats.revenue > 0 ? `₹${stats.revenue.toLocaleString()}` : 'No Data'}
              </p>
              {stats.revenue > 0 && (
                <p className="text-[12px] text-[var(--color-graphite)] mt-[16px] font-medium flex items-center tracking-[0.143em] uppercase">
                  Calculated from verified orders
                </p>
              )}
            </div>
            <div className="border border-[var(--color-mist)] rounded-none p-[32px] bg-[var(--color-porcelain-canvas)]">
              <p className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[16px]">AI-Driven Sales</p>
              <p className="text-[36px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-heading)]">
                {stats.revenue > 0 ? `${stats.aiSalesPercentage}%` : '0%'}
              </p>
              <p className="text-[12px] text-[var(--color-graphite)] mt-[16px] font-medium tracking-[0.143em] uppercase">Of total checkout volume</p>
            </div>
            <div className="border border-[var(--color-mist)] rounded-none p-[32px] bg-[var(--color-porcelain-canvas)]">
              <p className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[16px]">Active Agents</p>
              <p className="text-[36px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-heading)]">{stats.activeAgents}</p>
              <p className="text-[12px] text-[var(--color-graphite)] mt-[16px] font-medium tracking-[0.143em] uppercase">Growth Agent analyzing catalog</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-porcelain-canvas)] rounded-none shadow-none border border-[var(--color-mist)] mb-[80px]">
          <div className="px-[40px] py-[32px] border-b border-[var(--color-mist)] bg-[var(--color-bone)] flex justify-between items-center">
            <h2 className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em]">Action Review Queue</h2>
            <div className="flex items-center gap-[16px]">
              <button
                onClick={async () => {
                  setLoading(true)
                  try {
                    const res = await fetch('/api/growth/analyze', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ merchantId })
                    })
                    const data = await res.json()
                    if (data.error) alert(data.error)
                    else if (data.status === 'INSUFFICIENT_DATA') alert(data.message)
                    else alert('Analysis complete. New opportunities found!')
                    fetchActions()
                  } catch (e) {
                    alert('Analysis failed')
                  }
                  setLoading(false)
                }}
                className="bg-transparent border border-[var(--color-obsidian)] text-[var(--color-obsidian)] text-[12px] font-medium px-[28px] py-[12px] rounded-[40px] uppercase tracking-[0.143em] hover:bg-[var(--color-obsidian)] hover:text-[var(--color-porcelain-canvas)] transition-colors"
              >
                Run Analysis
              </button>
              <span className="bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] text-[9px] font-medium px-[12px] py-[4px] rounded-[2px] uppercase tracking-[0.143em]">{actions.length} Pending</span>
            </div>
          </div>
          
          <div className="p-[40px]">
            {loading ? (
              <div className="flex justify-center items-center py-[60px]">
                <div className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">Loading...</div>
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-[80px]">
                <h3 className="text-[14px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em]">No pending actions</h3>
                <p className="mt-[16px] text-[16px] text-[var(--color-graphite)]">Your AI Growth Agent hasn't identified any new opportunities yet.</p>
              </div>
            ) : (
              <div className="space-y-[40px]">
                {actions.map(action => (
                  <div key={action.id} className="border border-[var(--color-mist)] rounded-none overflow-hidden bg-[var(--color-porcelain-canvas)]">
                    <div className="px-[40px] py-[24px] border-b border-[var(--color-mist)] bg-[var(--color-bone)] flex justify-between items-center">
                      <div className="flex items-center space-x-[16px]">
                        <span className="inline-block px-[12px] py-[4px] bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] text-[9px] font-medium uppercase tracking-[0.143em] rounded-[2px]">
                          {action.status.replace(/_/g, ' ')}
                        </span>
                        <h3 className="text-[16px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em]">{action.actionType.replace(/_/g, ' ')}</h3>
                      </div>
                      <div className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em]">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="p-[40px]">
                      <div className="mb-[40px]">
                        <h4 className="text-[12px] font-medium text-[var(--color-graphite)] uppercase tracking-[0.143em] mb-[16px]">AI Identified Opportunity</h4>
                        <p className="text-[24px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-subheading)]">{action.opportunity?.title}</p>
                        <p className="text-[16px] text-[var(--color-graphite)] mt-[16px] p-[24px] bg-[var(--color-bone)] border border-[var(--color-mist)] leading-[var(--leading-body)]">{action.opportunity?.explanation}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[25px] mb-[40px]">
                        <div className="bg-[var(--color-bone)] border border-[var(--color-mist)] p-[32px]">
                          <h4 className="text-[12px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em] mb-[16px]">Expected Financial Impact</h4>
                          <p className="text-[36px] font-medium text-[var(--color-obsidian)] tracking-[var(--tracking-heading)]">+{(action.opportunity?.estimatedImpact / 100).toFixed(2)} {action.currency || 'INR'}</p>
                        </div>
                        <div className="border border-[var(--color-mist)]">
                          <h4 className="text-[12px] font-medium text-[var(--color-obsidian)] uppercase tracking-[0.143em] mb-[16px] px-[32px] pt-[32px]">Proposed Database Change</h4>
                          <pre className="text-[12px] bg-[var(--color-obsidian)] text-white p-[32px] overflow-x-auto h-full">
                            {JSON.stringify(JSON.parse(action.proposedValues), null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="pt-[40px] border-t border-[var(--color-mist)] flex space-x-[16px]">
                        {action.status === 'REVIEW_REQUIRED' && (
                          <>
                            <button 
                              onClick={() => handleApprove(action.id)}
                              className="px-[28px] py-[12px] bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] rounded-[40px] hover:bg-[var(--color-graphite)] font-medium uppercase tracking-[0.143em] text-[12px] transition-colors"
                            >
                              Authorize Action
                            </button>
                            <button className="px-[28px] py-[12px] bg-transparent border border-[var(--color-obsidian)] text-[var(--color-obsidian)] rounded-[40px] hover:bg-[var(--color-bone)] font-medium uppercase tracking-[0.143em] text-[12px] transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        {action.status === 'APPROVED' && (
                          <button 
                            onClick={() => handleExecute(action.id)}
                            className="px-[28px] py-[12px] bg-[var(--color-obsidian)] text-[var(--color-porcelain-canvas)] rounded-[40px] hover:bg-[var(--color-graphite)] font-medium uppercase tracking-[0.143em] text-[12px] transition-colors"
                          >
                            Execute Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
