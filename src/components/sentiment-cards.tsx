'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, TrendingDown, Minus, Gauge, Users } from 'lucide-react'

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
  investorSentiment: {
    bullish: number
    bearish: number
    neutral: number
  }
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* VIX Index */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">VIX Index</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-500">
              {data.vix.value.toFixed(2)}
            </span>
            <span className={`text-xs ${data.vix.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {data.vix.change >= 0 ? '+' : ''}{data.vix.change.toFixed(2)} ({data.vix.changePct.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.vix.value < 15 ? 'Low Volatility' : data.vix.value < 25 ? 'Normal Volatility' : 'High Volatility'}
          </p>
        </CardContent>
      </Card>

      {/* Fear & Greed Index */}
      <Card className={`${getFearGreedBg(data.fearGreed.value)} border`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Fear & Greed Index</span>
            <Gauge className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${getFearGreedColor(data.fearGreed.value)}`}>
              {Math.round(data.fearGreed.value)}
            </span>
            <Badge variant="outline" className={`${getFearGreedColor(data.fearGreed.value)} border-current`}>
              {data.fearGreed.label || getFearGreedLabel(data.fearGreed.value)}
            </Badge>
          </div>
          <div className="mt-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  Math.round(data.fearGreed.value) <= 25 ? 'bg-red-500' :
                  Math.round(data.fearGreed.value) <= 45 ? 'bg-orange-500' :
                  Math.round(data.fearGreed.value) <= 55 ? 'bg-yellow-500' :
                  Math.round(data.fearGreed.value) <= 75 ? 'bg-lime-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.round(data.fearGreed.value)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Fear</span>
              <span>Greed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investor Sentiment */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">US Investor Sentiment</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs">Bullish</span>
              </div>
              <span className="text-sm font-medium text-green-500">{data.investorSentiment.bullish.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-500" />
                <span className="text-xs">Bearish</span>
              </div>
              <span className="text-sm font-medium text-red-500">{data.investorSentiment.bearish.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Minus className="w-3 h-3 text-yellow-500" />
                <span className="text-xs">Neutral</span>
              </div>
              <span className="text-sm font-medium text-yellow-500">{data.investorSentiment.neutral.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
