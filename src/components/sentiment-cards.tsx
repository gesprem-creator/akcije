'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Gauge, Users } from 'lucide-react'

interface SentimentData {
  vix: {
    value: number
    change: number
    changePct: number
  }
  fearGreed: {
    value: number
    label: string
  }
  investorSentiment: number // Single bullish percentage value
}

function getFearGreedColor(value: number): string {
  if (value <= 25) return 'text-red-500'
  if (value <= 45) return 'text-orange-500'
  if (value <= 55) return 'text-yellow-500'
  if (value <= 75) return 'text-lime-500'
  return 'text-green-500'
}

function getFearGreedBg(value: number): string {
  if (value <= 25) return 'bg-red-500/10 border-red-500/30'
  if (value <= 45) return 'bg-orange-500/10 border-orange-500/30'
  if (value <= 55) return 'bg-yellow-500/10 border-yellow-500/30'
  if (value <= 75) return 'bg-lime-500/10 border-lime-500/30'
  return 'bg-green-500/10 border-green-500/30'
}

function getFearGreedLabel(value: number): string {
  if (value <= 20) return 'Extreme Fear'
  if (value <= 40) return 'Fear'
  if (value <= 60) return 'Neutral'
  if (value <= 80) return 'Greed'
  return 'Extreme Greed'
}

export function SentimentCards() {
  const [data, setData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSentiment() {
      try {
        const res = await fetch('/api/sentiment')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      } catch (error) {
        console.error('Failed to fetch sentiment:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSentiment()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-2">
              <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
              <div className="h-5 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {/* VIX Index */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">VIX Index</span>
            <Activity className="w-3 h-3 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold text-purple-500">
              {data.vix.value.toFixed(2)}
            </span>
            <span className={`text-xs ${data.vix.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {data.vix.change >= 0 ? '+' : ''}{data.vix.change.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Fear & Greed Index */}
      <Card className={`${getFearGreedBg(data.fearGreed.value)} border`}>
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Fear & Greed</span>
            <Gauge className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-lg font-bold ${getFearGreedColor(data.fearGreed.value)}`}>
              {Math.round(data.fearGreed.value)}
            </span>
            <Badge variant="outline" className={`text-xs ${getFearGreedColor(data.fearGreed.value)} border-current`}>
              {data.fearGreed.label || getFearGreedLabel(data.fearGreed.value)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Investor Sentiment */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">US Investor Sentiment</span>
            <Users className="w-3 h-3 text-blue-500" />
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-lg font-bold text-blue-500">
              {data.investorSentiment.toFixed(1)}%
            </span>
            <Badge variant="outline" className="text-xs text-green-500 border-green-500">
              Bullish
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
