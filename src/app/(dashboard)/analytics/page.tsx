'use client'

import { useState } from 'react'
import { useComparisonAnalytics } from '@/hooks/use-analytics'
import { useAccounts } from '@/hooks/use-accounts'
import { formatNumber, getInitials } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
  Sparkles,
  ShieldCheck,
  Zap,
  BookOpen,
  PieChart,
  Award,
  Flame,
} from 'lucide-react'

type Period = '1d' | '7d' | '30d' | '90d'

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('1d')

  const { data: comparisonData, isLoading: comparisonLoading, error: comparisonError } = useComparisonAnalytics(period)
  const { data: accounts, isLoading: accountsLoading } = useAccounts()

  const isLoading = comparisonLoading || accountsLoading
  const error = comparisonError

  // Calculate detailed performance metrics per account from history data
  const calculateDetailedMetrics = () => {
    const data = comparisonData?.history || []
    const usernames = comparisonData?.usernames || []

    return usernames.map((username) => {
      const accountInfo = accounts?.find((a) => a.username === username)
      
      const dataPoints = data
        .map((h) => ({
          date: h.date,
          followers: h[`${username}_followers`] || 0,
          following: h[`${username}_following`] || 0,
          posts: h[`${username}_posts`] || 0,
        }))
        .filter((dp) => dp.followers > 0 || dp.following > 0 || dp.posts > 0)

      if (dataPoints.length === 0) {
        return {
          username,
          displayName: accountInfo?.displayName || username,
          profileImage: accountInfo?.profileImage || null,
          currentFollowers: accountInfo?.metrics.followers || 0,
          followersGained: 0,
          followersLost: 0,
          followersNet: 0,
          currentFollowing: accountInfo?.metrics.following || 0,
          followingGained: 0,
          followingLost: 0,
          followingNet: 0,
          currentPosts: accountInfo?.metrics.posts || 0,
          postsNew: 0,
          postsPerDay: 0,
          ratio: 0,
          growthPerPost: 0,
          followersPerPost: 0,
          followConversion: 0,
        }
      }

      const oldest = dataPoints[0]
      const latest = dataPoints[dataPoints.length - 1]

      // Calculate fluctuations
      let followersGained = 0
      let followersLost = 0
      for (let i = 1; i < dataPoints.length; i++) {
        const diff = dataPoints[i].followers - dataPoints[i - 1].followers
        if (diff > 0) {
          followersGained += diff
        } else if (diff < 0) {
          followersLost += Math.abs(diff)
        }
      }

      let followingGained = 0
      let followingLost = 0
      for (let i = 1; i < dataPoints.length; i++) {
        const diff = dataPoints[i].following - dataPoints[i - 1].following
        if (diff > 0) {
          followingGained += diff
        } else if (diff < 0) {
          followingLost += Math.abs(diff)
        }
      }

      const followersNet = latest.followers - oldest.followers
      const followingNet = latest.following - oldest.following
      const postsNew = Math.max(0, latest.posts - oldest.posts)

      const t1 = new Date(oldest.date).getTime()
      const t2 = new Date(latest.date).getTime()
      const daysDiff = (t2 - t1) / (1000 * 60 * 60 * 24)
      const days = Math.max(1, Math.round(daysDiff))
      
      const postsPerDay = postsNew / days
      const ratio = latest.following > 0 ? latest.followers / latest.following : latest.followers

      // CROSS-RATIOS
      const growthPerPost = postsNew > 0 ? followersNet / postsNew : followersNet
      const followersPerPost = latest.posts > 0 ? latest.followers / latest.posts : latest.followers
      const followConversion = followingNet !== 0 ? followersNet / Math.abs(followingNet) : followersNet

      return {
        username,
        displayName: accountInfo?.displayName || username,
        profileImage: accountInfo?.profileImage || null,
        currentFollowers: latest.followers,
        followersGained,
        followersLost,
        followersNet,
        currentFollowing: latest.following,
        followingGained,
        followingLost,
        followingNet,
        currentPosts: latest.posts,
        postsNew,
        postsPerDay,
        ratio,
        growthPerPost,
        followersPerPost,
        followConversion,
      }
    })
  }

  const detailedMetrics = calculateDetailedMetrics()

  // Dynamic AI Strategy / Audit Report Generator
  const generateAIVerdict = (row: any) => {
    const isHealthyRatio = row.ratio >= 1.0
    const isGrowing = row.followersNet > 0
    const isShrinking = row.followersNet < 0
    const isHighPost = row.postsPerDay >= 1.0
    
    if (isShrinking && isHighPost) {
      return {
        status: 'Audience Fatigue ⚠️',
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        diagnosis: 'Intensitas posting Anda tinggi tetapi pengikut berkurang. Konten mungkin dianggap kurang relevan atau memicu kejenuhan (content fatigue).',
        action: 'Kurangi frekuensi posting, ganti gaya tulisan ke format Thread informatif, dan prioritaskan interaksi kolom komentar.'
      }
    }
    
    if (!isHealthyRatio && isGrowing) {
      return {
        status: 'Unbalanced Growth ⚠️',
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        diagnosis: 'Akun Anda bertumbuh, tetapi jumlah Following Anda jauh melebihi Followers. Akun berisiko dicap sebagai bot oleh algoritma X.',
        action: 'Mulai lakukan unfollow berkala terhadap akun pasif/tidak mem-back agar rasio kembali sehat di atas 1.0.'
      }
    }
    
    if (isGrowing && !isHighPost) {
      return {
        status: 'Organic Leverage 🚀',
        color: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
        diagnosis: 'Pertumbuhan followers organik sangat sehat meskipun postingan minim. Profil Anda memiliki daya tarik alami yang kuat.',
        action: 'Tingkatkan jadwal posting menjadi minimal 1-2 kali sehari untuk melipatgandakan daya jangkau konten Anda.'
      }
    }
    
    if (isGrowing && isHighPost) {
      return {
        status: 'Growth Engine ⚡',
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        diagnosis: 'Sinergi luar biasa! Aktivitas posting yang konsisten berkolerasi langsung dengan kenaikan followers yang sehat.',
        action: 'Pertahankan momentum ini. Sematkan (pin) postingan terbaik Anda di profil untuk memaksimalkan tingkat konversi profil visitor.'
      }
    }
    
    if (isShrinking) {
      return {
        status: 'Audience Bleeding 📉',
        color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
        diagnosis: 'Mengalami penurunan followers secara berkala tanpa ada aktivitas posting yang cukup untuk menjaring pengikut baru.',
        action: 'Jadwalkan minimal 1 posting per hari. Berinteraksilah di kolom komentar akun-akun besar yang relevan untuk memancing visibilitas.'
      }
    }
    
    return {
      status: 'Stagnant Profile 💤',
      color: 'text-zinc-400 border-zinc-800 bg-zinc-900/40',
      diagnosis: 'Akun pasif tanpa aktivitas posting baru dan tidak ada pergerakan pada statistik pengikut.',
      action: 'Segera buat postingan perdana Anda tentang topik yang sedang populer di niche Anda untuk meluncurkan algoritma profil.'
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Users className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Failed to load comparison data</h2>
        <p className="text-zinc-400 mb-4">Please verify database connectivity and try again.</p>
      </div>
    )
  }

  // Render comparative bar charts for multiple ratios (Cross-Ratio Matrix)
  const renderCrossRatioChart = (
    title: string,
    desc: string,
    dataKey: 'ratio' | 'growthPerPost' | 'followersPerPost' | 'followConversion',
    yLabel: string,
    gradientColors: [string, string]
  ) => {
    return (
      <div className="glass-card rounded-xl p-5 flex flex-col h-[320px] border border-zinc-900 relative overflow-hidden group hover:border-zinc-850 transition-all duration-300">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-zinc-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-300" />
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-blue-400" />
          <div>
            <h4 className="font-bold text-zinc-100 tracking-tight text-xs">{title}</h4>
            <p className="text-zinc-500 text-[10px] mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex-1 min-h-0 w-full">
          {isLoading ? (
            <div className="w-full h-full bg-zinc-900/10 rounded-lg animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
            </div>
          ) : detailedMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailedMetrics} margin={{ left: -20, right: 5, top: 10, bottom: 0 }} barSize={24}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradientColors[0]} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={gradientColors[1]} stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#141416" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="displayName"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val.toFixed(1)}${yLabel}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.01)' }}
                  contentStyle={{
                    background: 'rgba(9, 9, 11, 0.9)',
                    backdropFilter: 'blur(12px)',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                  }}
                  labelClassName="text-zinc-400 text-[9px] uppercase font-bold tracking-wider"
                  itemStyle={{ fontSize: '12px', color: '#f4f4f5', fontWeight: '600' }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}${yLabel}`, title]}
                />
                {dataKey === 'ratio' && (
                  <ReferenceLine 
                    y={1.0} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.2}
                  />
                )}
                <Bar dataKey={dataKey} fill={`url(#grad-${dataKey})`} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
    )
  }

  // Render a Comparison Line Chart (Trends)
  const renderComparisonChart = (
    title: string,
    metricKey: 'followers' | 'following' | 'posts',
    icon: any
  ) => {
    const Icon = icon
    const data = comparisonData?.history || []
    const usernames = comparisonData?.usernames || []

    return (
      <div className="glass-card rounded-xl p-5 flex flex-col h-[320px] border border-zinc-900 relative overflow-hidden group hover:border-zinc-800 transition-all duration-300">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-300" />
        
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-4 h-4 text-blue-400" />
          <h4 className="font-bold text-zinc-100 tracking-tight text-xs">{title}</h4>
        </div>

        <div className="flex-1 min-h-0 w-full">
          {isLoading ? (
            <div className="w-full h-full bg-zinc-900/10 rounded-lg animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -20, right: 5, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#141416" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatNumber(val, true)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(9, 9, 11, 0.9)',
                    backdropFilter: 'blur(12px)',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                  }}
                  labelClassName="text-zinc-400 text-xs font-semibold"
                  itemStyle={{ fontSize: '11px' }}
                  formatter={(val: any, name: any) => [formatNumber(Number(val)), name]}
                  labelFormatter={(label, items) => {
                    const payloadItem = items?.[0]?.payload
                    if (payloadItem?.date) {
                      const d = new Date(payloadItem.date)
                      return d.toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                    return label
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={24} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }}
                />
                {usernames.map((username, index) => {
                  const colors = [
                    '#3b82f6', // blue
                    '#ec4899', // pink
                    '#10b981', // green
                    '#f59e0b', // amber
                    '#8b5cf6', // violet
                    '#06b6d4', // cyan
                  ]
                  const color = colors[index % colors.length]
                  return (
                    <Line
                      key={username}
                      type="monotone"
                      dataKey={`${username}_${metricKey}`}
                      name={`@${username}`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-400" />
            Comparison & Analytics Audit
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Bandingkan detail followers, following, postingan, dan rasio performa antar semua akun Anda secara instan di satu halaman.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-inner">
            {(['1d', '7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {p === '1d' ? 'Today' : p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1: High-Density Comparison Table (raw stats, net changes, and calculated ratios) */}
      <div className="glass-card rounded-2xl border border-zinc-900 overflow-hidden relative group hover:border-zinc-850 transition-all duration-300">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-5 border-b border-zinc-900 bg-zinc-900/10 flex items-center justify-between relative z-10">
          <div>
            <h3 className="font-bold text-zinc-200 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-blue-400" />
              1. Detailed Account Metrics & Cross-Ratio Comparison Table
            </h3>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              Analisis komparatif followers, following, postingan, efisiensi pertumbuhan, serta status rasio balance.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-wider bg-zinc-950/30">
                <th className="py-4 px-6">Account Name</th>
                <th className="py-4 px-4">Followers & Net Change</th>
                <th className="py-4 px-4">Following & Net Change</th>
                <th className="py-4 px-4">Posts & Avg Speed</th>
                <th className="py-4 px-4">F/F Ratio</th>
                <th className="py-4 px-4">Post Efficiency (Gain/Post)</th>
                <th className="py-4 px-4 text-right">Performance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs text-zinc-300 bg-zinc-950/10">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-700" />
                  </td>
                </tr>
              ) : detailedMetrics.length > 0 ? (
                detailedMetrics.map((row) => {
                  let ratioText = 'Balanced'
                  let ratioBadge = 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                  if (row.ratio >= 2.0) {
                    ratioText = 'High Authority'
                    ratioBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  } else if (row.ratio < 1.0) {
                    ratioText = 'Following > Followers'
                    ratioBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }

                  let tierText = 'Stagnant'
                  let tierBadge = 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  if (row.followersNet > 0 && row.postsPerDay > 0.5) {
                    tierText = 'Power Performer'
                    tierBadge = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  } else if (row.followersNet > 0) {
                    tierText = 'Organic Growth'
                    tierBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  } else if (row.followersNet < 0 && row.postsPerDay > 0.5) {
                    tierText = 'High Churn'
                    tierBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  } else if (row.followersNet < 0) {
                    tierText = 'Losing Audience'
                    tierBadge = 'bg-red-500/10 text-red-400 border-red-500/20'
                  }

                  return (
                    <tr key={row.username} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {row.profileImage ? (
                            <img src={row.profileImage} alt={row.displayName} className="w-8 h-8 rounded-lg object-cover border border-zinc-850" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                              {getInitials(row.displayName)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-zinc-100 leading-none">{row.displayName}</div>
                            <div className="text-zinc-500 text-[10px] mt-1">@{row.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 font-bold">
                          <span>{formatNumber(row.currentFollowers)}</span>
                          {row.followersNet > 0 ? (
                            <span className="text-emerald-400 flex items-center font-bold text-[10px]"><ArrowUpRight className="w-3 h-3" />+{row.followersNet}</span>
                          ) : row.followersNet < 0 ? (
                            <span className="text-rose-400 flex items-center font-bold text-[10px]"><ArrowDownRight className="w-3 h-3" />{row.followersNet}</span>
                          ) : (
                            <span className="text-zinc-500 font-normal text-[10px]">0</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300">{formatNumber(row.currentFollowing)}</span>
                          {row.followingNet > 0 ? (
                            <span className="text-emerald-400 text-[10px] font-bold">+{row.followingNet}</span>
                          ) : row.followingNet < 0 ? (
                            <span className="text-rose-400 text-[10px] font-bold">{row.followingNet}</span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">0</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-100">{row.postsNew} posts</span>
                          <span className="text-[10px] text-zinc-500">{row.postsPerDay.toFixed(1)}/day</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-zinc-200">{row.ratio.toFixed(2)}x</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${ratioBadge} w-fit`}>{ratioText}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-black ${row.growthPerPost >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.growthPerPost >= 0 ? `+${row.growthPerPost.toFixed(1)}` : row.growthPerPost.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierBadge}`}>{tierText}</span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 italic">No account metrics found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: AI Audit Diagnosis & Strategy Cards */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-zinc-200 flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-purple-400" />
            2. AI Strategic Audits & Recommendations
          </h3>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            Laporan diagnosis kecerdasan buatan beserta anjuran tindakan strategis untuk mengoptimalkan performa tiap profil.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 py-8 bg-zinc-900/10 border border-zinc-900 rounded-2xl animate-pulse flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
            </div>
          ) : detailedMetrics.map((row) => {
            const isRatioHealthy = row.ratio >= 1.0
            const verdict = generateAIVerdict(row)

            return (
              <div key={row.username} className="glass-card rounded-2xl p-5 border border-zinc-900 relative overflow-hidden group hover:border-zinc-800 transition-all duration-300 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {row.profileImage ? (
                      <img src={row.profileImage} alt={row.displayName} className="w-10 h-10 rounded-xl object-cover border border-zinc-850" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {getInitials(row.displayName)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm leading-none">{row.displayName}</h4>
                      <p className="text-zinc-500 text-[10px] mt-1">@{row.username}</p>
                    </div>
                  </div>

                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${verdict.color}`}>
                    {verdict.status}
                  </span>
                </div>

                {/* Mini diagnostic bars */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-950/30 border border-zinc-900/60 rounded-xl p-3.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500">
                      <span>Following Health</span>
                      <span className={isRatioHealthy ? 'text-cyan-400' : 'text-amber-400'}>{row.ratio.toFixed(2)}x</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isRatioHealthy ? 'bg-cyan-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, row.ratio * 80)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500">
                      <span>Post Conversion</span>
                      <span className="text-purple-400">{(row.postsPerDay * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${Math.min(100, row.postsPerDay * 50)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Analysis paragraphs */}
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">AI Diagnosis:</span>
                    <p className="text-zinc-300 text-xs leading-relaxed">{verdict.diagnosis}</p>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-3">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Recommended Action:</span>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{verdict.action}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 3: Visual Analytics Matrix (Charts side-by-side) */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-zinc-200 flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-emerald-400" />
            3. Visual Ratios & Historical Trajectory Charts
          </h3>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            Komparasi tren linear fluktuasi pengikut serta pemetaan rasio efisiensi postingan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderCrossRatioChart(
            'Follower / Following Ratio',
            'Rasio pengikut dibanding target. Target sehat >= 1.0 (garis putus-putus).',
            'ratio',
            'x',
            ['#38bdf8', '#0284c7']
          )}
          {renderCrossRatioChart(
            'Content Efficiency (Growth per Post)',
            'Rata-rata penambahan followers bersih didapat per 1 postingan baru.',
            'growthPerPost',
            ' foll/post',
            ['#34d399', '#059669']
          )}
          {renderComparisonChart('Followers Growth Comparison (Line Chart)', 'followers', Users)}
          {renderComparisonChart('Posts Frequency Comparison (Line Chart)', 'posts', Flame)}
        </div>
      </div>
    </div>
  )
}
