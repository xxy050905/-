import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  iconColor: string
}

export default function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-deep-600 mb-1">{title}</p>
          <p className="text-3xl font-heading font-bold text-white">{value}</p>
          {change && (
            <p className={`text-xs mt-2 ${
              changeType === 'positive' ? 'text-emerald' :
              changeType === 'negative' ? 'text-rose' :
              'text-deep-600'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}
