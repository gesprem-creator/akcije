'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingDown, 
  TrendingUp, 
  RefreshCw, 
  Clock,
  BarChart3,
  Activity,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Target,
  Shield,
  Newspaper,
  Search,
  X,
  Expand,
  Maximize2
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  day5Price: number
  day10Price: number
  day5Pct: number
  day10Pct: number
  marketCap: number
  pe: string
  category: string
}

interface NewsItem {
  symbol: string
  title: string
  url: string
  snippet: string
  source: string
  date: string
}

interface Recommendation {
  symbol: string
  name: string
  price: number
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  score: number
  reasons: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  potentialGain: number
}

interface MarketSummary {
  totalStocks: number
  gainers: number
  losers: number
  avgChange: number
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

interface InsightsData {
  success: boolean
  timestamp: string
  news: NewsItem[]
  recommendations: Recommendation[]
  marketSummary: MarketSummary
}

interface ApiResponse {
  success: boolean
  timestamp: string
  totalStocks: number
  allStocks: StockData[]
  topLosers1Day: StockData[]
  topLosers10Day: StockData[]
  topGainers1Day: StockData[]
  topGainers10Day: StockData[]
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatMarketCap(value: number): string {
  if (value >= 1000000000000) {
    return `$${(value / 1000000000000).toFixed(1)}T`
  } else if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}B`
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return `$${value.toFixed(0)}`
}

function getSignalColor(signal: string): string {
  switch (signal) {
    case 'STRONG_BUY': return 'bg-green-500 text-white'
    case 'BUY': return 'bg-green-400 text-white'
    case 'HOLD': return 'bg-yellow-500 text-white'
    case 'SELL': return 'bg-red-400 text-white'
    case 'STRONG_SELL': return 'bg-red-600 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

function getSignalIcon(signal: string) {
  switch (signal) {
    case 'STRONG_BUY': return <TrendingUp className="w-4 h-4" />
    case 'BUY': return <TrendingUp className="w-4 h-4" />
    case 'HOLD': return <Activity className="w-4 h-4" />
    case 'SELL': return <TrendingDown className="w-4 h-4" />
    case 'STRONG_SELL': return <TrendingDown className="w-4 h-4" />
    default: return null
  }
}

function getRiskIcon(risk: string) {
  switch (risk) {
    case 'LOW': return <Shield className="w-4 h-4 text-green-500" />
    case 'MEDIUM': return <AlertCircle className="w-4 h-4 text-yellow-500" />
    case 'HIGH': return <AlertTriangle className="w-4 h-4 text-red-500" />
    default: return null
  }
}

function StockTable({ stocks, sortBy = 'changePct', sortOrder = 'asc' }: { stocks: StockData[], sortBy?: 'changePct' | 'day10Pct', sortOrder?: 'asc' | 'desc' }) {
  // Sort stocks by the specified key and order
  const sortedStocks = [...stocks].sort((a, b) => {
    const aVal = sortBy === 'changePct' ? a.changePct : a.day10Pct
    const bVal = sortBy === 'changePct' ? b.changePct : b.day10Pct
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return (
    <div className="overflow-x-auto pr-4 mr-2">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">#</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Symbol</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Name</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground pl-4">Price</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">1 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">5 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">10 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Mkt Cap</th>
          </tr>
        </thead>
        <tbody>
          {sortedStocks.map((stock, index) => (
            <tr key={stock.symbol} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
              <td className="py-2 px-2 text-sm font-medium">{index + 1}</td>
              <td className="py-2 px-2">
                <span className="font-bold text-sm">{stock.symbol}</span>
              </td>
              <td className="py-2 px-2 text-sm text-muted-foreground hidden md:table-cell max-w-[180px] truncate">
                {stock.name}
              </td>
              <td className="py-2 px-2 text-sm text-left font-mono pl-4">
                {formatPrice(stock.price)}
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.changePct)}
                </span>
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.day5Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.day5Pct)}
                </span>
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.day10Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.day10Pct)}
                </span>
              </td>
              <td className="py-2 px-2 text-sm text-right text-muted-foreground hidden lg:table-cell">
                {formatMarketCap(stock.marketCap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockDetailModal({ stock, isOpen, onClose }: { 
  stock: StockData | null, 
  isOpen: boolean, 
  onClose: () => void 
}) {
  const [modalSize, setModalSize] = useState({ width: 85, height: 93 })
  const [chartInterval, setChartInterval] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1M')

  const intervalMap: Record<string, string> = {
    '1D': '1',
    '1W': 'W',
    '1M': 'D',
    '3M': 'D',
    '1Y': 'W',
    '5Y': 'W'
  }

  const rangeMap: Record<string, string> = {
    '1D': '1D',
    '1W': '1W',
    '1M': '1M',
    '3M': '3M',
    '1Y': '12M',
    '5Y': '60M'
  }

  // Map symbols to their correct exchanges
  const getTradingViewSymbol = (symbol: string): string => {
    // Known NYSE stocks
    const nyseStocks = ['NKE', 'KO', 'WMT', 'JPM', 'V', 'MA', 'DIS', 'MCD', 'GS', 'IBM', 'CAT', 'BA', 'HON', 'TRV', 'UNH', 'JNJ', 'PG', 'PFE', 'MRK', 'CVX', 'XOM', 'COP', 'SLB', 'EOG', 'F', 'GM', 'C', 'BAC', 'WFC', 'USB', 'T', 'VZ', 'TMUS'];
    
    // Known German stocks (XETRA)
    const xetraStocks = ['PUM', 'ADS', 'BMW', 'VOW3', 'DAI', 'SAP', 'SIE', 'ALV', 'DTE', 'DBK', 'BAS', 'BAYN', 'FRE', 'HEI', 'MUV2', 'CON', 'IFX', 'MRK', 'FME'];
    
    // Known London stocks
    const lseStocks = ['BP', 'SHEL', 'HSBA', 'BARC', 'LLOY', 'RDSA', 'AZN', 'GSK', 'ULVR', 'NG', 'TSCO', 'BT-A'];
    
    // Known Amsterdam stocks  
    const aexStocks = ['ASML', 'INGA', 'PHIA', 'UNA', 'RDSA', 'AD', 'HEIA', 'MT'];
    
    // Known Hong Kong stocks
    const hkStocks = ['0700', '9988', '0005', '0941', '2318', '1299'];
    
    // Known Tokyo stocks
    const tseStocks = ['7203', '6758', '9984', '6861', '4519', '6702'];

    const upperSymbol = symbol.toUpperCase();
    
    if (nyseStocks.includes(upperSymbol)) return `NYSE:${upperSymbol}`;
    if (xetraStocks.includes(upperSymbol)) return `XETRA:${upperSymbol}`;
    if (lseStocks.includes(upperSymbol)) return `LSE:${upperSymbol}`;
    if (aexStocks.includes(upperSymbol)) return `AEX:${upperSymbol}`;
    if (hkStocks.includes(upperSymbol)) return `HKEX:${upperSymbol}`;
    if (tseStocks.includes(upperSymbol)) return `TSE:${upperSymbol}`;
    
    // Default: try NASDAQ first, then just symbol
    return upperSymbol;
  }

  if (!stock) return null

  const newsLinks = [
    { label: 'Google Finance', url: `https://www.google.com/finance/quote/${stock.symbol}` },
    { label: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${stock.symbol}` },
    { label: 'MarketWatch', url: `https://www.marketwatch.com/investing/stock/${stock.symbol.toLowerCase()}` },
    { label: 'Seeking Alpha', url: `https://seekingalpha.com/symbol/${stock.symbol}` },
    { label: 'TipRanks', url: `https://www.tipranks.com/stocks/${stock.symbol.toLowerCase()}` },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        style={{ 
          width: `${modalSize.width}vw`, 
          height: `${modalSize.height}vh`,
          maxWidth: '95vw',
          maxHeight: '95vh',
          minWidth: '50vw',
          minHeight: '50vh'
        }}
        className="overflow-hidden flex flex-col p-0 !top-[1%] !translate-y-0"
      >
        <DialogHeader className="px-8 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-4 text-3xl">
            <span className="font-bold">{stock.symbol}</span>
            <span className="text-xl text-muted-foreground font-normal">{stock.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 px-8 pb-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Left side - Chart */}
            <div className="min-h-[300px] flex flex-col">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Price Chart - {stock.symbol}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex-1 flex flex-col">
                  {/* Time Period Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartInterval(period)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          chartInterval === period 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                  {/* TradingView Chart Widget */}
                  <div className="bg-card rounded-lg border border-border overflow-hidden h-[400px]">
                    <iframe 
                      key={`${stock.symbol}-${chartInterval}`}
                      src={`https://s.tradingview.com/embed-widget/symbol-overview/?symbols=${getTradingViewSymbol(stock.symbol)}&interval=${intervalMap[chartInterval]}&locale=en&colorTheme=dark&isTransparent=false&showSymbolLogo=true&displayMode=adaptive&width=100%25&height=100%25`}
                      style={{ width: '100%', height: '100%', minHeight: '350px', border: 'none' }}
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a 
                      href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol(stock.symbol)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      TradingView
                    </a>
                    <a 
                      href={`https://www.google.com/finance/quote/${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Google Finance
                    </a>
                    <a 
                      href={`https://finance.yahoo.com/quote/${stock.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Yahoo Finance
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Info & Links */}
            <div className="space-y-5">
              {/* Price Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Price Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="text-base text-muted-foreground">Current Price</p>
                      <p className="text-3xl font-bold font-mono">{formatPrice(stock.price)}</p>
                    </div>
                    <div>
                      <p className="text-base text-muted-foreground">Market Cap</p>
                      <p className="text-2xl font-bold">{formatMarketCap(stock.marketCap)}</p>
                    </div>
                    <div>
                      <p className="text-base text-muted-foreground">1 Day Change</p>
                      <p className={`text-xl font-bold font-mono ${stock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatPercent(stock.changePct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-base text-muted-foreground">5 Day Change</p>
                      <p className={`text-xl font-bold font-mono ${stock.day5Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatPercent(stock.day5Pct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-base text-muted-foreground">10 Day Change</p>
                      <p className={`text-xl font-bold font-mono ${stock.day10Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatPercent(stock.day10Pct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-base text-muted-foreground">P/E Ratio</p>
                      <p className="text-xl font-bold">{stock.pe || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* News Links */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Newspaper className="w-6 h-6" />
                    News & Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {newsLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <span className="font-medium text-lg">{link.label}</span>
                        <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Quick Search</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://www.google.com/search?q=${stock.symbol}+stock+news`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors font-medium"
                    >
                      <Newspaper className="w-5 h-5" />
                      Google News
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${stock.symbol}+earnings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors font-medium"
                    >
                      <Activity className="w-5 h-5" />
                      Earnings
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${stock.symbol}+analyst+ratings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors font-medium"
                    >
                      <Target className="w-5 h-5" />
                      Analyst Ratings
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SearchResultsTable({ stocks, onStockClick }: { 
  stocks: StockData[],
  onStockClick: (stock: StockData) => void 
}) {
  return (
    <div className="overflow-x-auto pr-4 mr-2">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Symbol</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Name</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground pl-4">Price</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">1 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">5 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">10 Day</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Mkt Cap</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr 
              key={stock.symbol} 
              className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onStockClick(stock)}
            >
              <td className="py-2 px-2">
                <span className="font-bold text-sm text-blue-500 hover:underline">{stock.symbol}</span>
              </td>
              <td className="py-2 px-2 text-sm text-muted-foreground hidden md:table-cell max-w-[180px] truncate">
                {stock.name}
              </td>
              <td className="py-2 px-2 text-sm text-left font-mono pl-4">
                {formatPrice(stock.price)}
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.changePct)}
                </span>
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.day5Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.day5Pct)}
                </span>
              </td>
              <td className="py-2 px-2 text-right">
                <span className={`text-sm font-bold font-mono ${stock.day10Pct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatPercent(stock.day10Pct)}
                </span>
              </td>
              <td className="py-2 px-2 text-sm text-right text-muted-foreground hidden lg:table-cell">
                {formatMarketCap(stock.marketCap)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockChart({ stocks, dataKey, type }: { 
  stocks: StockData[], 
  dataKey: 'changePct' | 'day10Pct',
  type: 'loss' | 'gain'
}) {
  const chartData = stocks.map(stock => ({
    symbol: stock.symbol,
    value: stock[dataKey] * 100,
    name: stock.name
  }))

  const color = type === 'loss' ? '#ef4444' : '#22c55e'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis 
          type="number" 
          tick={{ fill: '#888', fontSize: 12 }}
          tickFormatter={(value) => `${value.toFixed(1)}%`}
        />
        <YAxis 
          type="category" 
          dataKey="symbol" 
          tick={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
          width={60}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#2a2a2a', 
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            padding: '12px'
          }}
          labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
          itemStyle={{ color: '#ccc' }}
          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Promena']}
          labelFormatter={(label) => `${label}`}
        />
        <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function SummaryCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  trend?: 'up' | 'down'
}) {
  const bgClass = trend === 'up' 
    ? 'bg-green-500/10 border-green-500/30' 
    : trend === 'down' 
    ? 'bg-red-500/10 border-red-500/30' 
    : 'bg-gradient-to-br from-card to-card/50 border-border/50'
    
  return (
    <Card className={`${bgClass}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-500/20' : trend === 'down' ? 'bg-red-500/20' : 'bg-primary/10'}`}>
            <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewsCard({ news }: { news: NewsItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setIsOpen(true)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-500" />
                Najnovije Vesti
              </CardTitle>
              <CardDescription>Vesti za akcije sa značajnim promenama</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px] pr-4">
            {news.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No news available at the moment
              </div>
            ) : (
              <div className="space-y-3">
                {news.slice(0, 5).map((item, index) => (
                  <div 
                    key={index}
                    className="block p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <Badge variant="outline" className="mb-2 text-xs">{item.symbol}</Badge>
                    <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.snippet}</p>
                  </div>
                ))}
                {news.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    +{news.length - 5} more articles • Click to expand
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Newspaper className="w-6 h-6 text-blue-500" />
              Najnovije Vesti
            </DialogTitle>
            <DialogDescription>
              Potpune vesti za akcije sa značajnim promenama ({news.length} članaka)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-6 h-full">
            {news.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No news available at the moment
              </div>
            ) : (
              <div className="space-y-4">
                {news.map((item, index) => (
                  <a 
                    key={index} 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{item.symbol}</Badge>
                        <h4 className="font-medium mb-2">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.snippet}</p>
                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                          <span className="font-medium">{item.source}</span>
                          <span>•</span>
                          <span>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecommendationsCard({ recommendations, marketSummary }: { 
  recommendations: Recommendation[],
  marketSummary: MarketSummary 
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setIsOpen(true)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                AI Preporuke
              </CardTitle>
              <CardDescription>Predlozi tehničke analize</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <Badge 
              variant="outline" 
              className={`${
                marketSummary.sentiment === 'BULLISH' ? 'border-green-500 text-green-500' :
                marketSummary.sentiment === 'BEARISH' ? 'border-red-500 text-red-500' :
                'border-yellow-500 text-yellow-500'
              }`}
            >
              {marketSummary.sentiment}
            </Badge>
          </div>
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div 
                  key={rec.symbol} 
                  className="p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{rec.symbol}</span>
                      <Badge className={getSignalColor(rec.signal)}>
                        <span className="flex items-center gap-1 text-xs">
                          {getSignalIcon(rec.signal)}
                          {rec.signal.replace('_', ' ')}
                        </span>
                      </Badge>
                    </div>
                    <span className={`text-xs ${rec.potentialGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {rec.potentialGain >= 0 ? '+' : ''}{rec.potentialGain.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          rec.score >= 60 ? 'bg-green-500' :
                          rec.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${rec.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{rec.score}/100</span>
                  </div>
                </div>
              ))}
              {recommendations.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{recommendations.length - 5} more recommendations • Click to expand
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Target className="w-6 h-6 text-purple-500" />
              AI Preporuke
            </DialogTitle>
            <DialogDescription>
              Potpuna tehnička analiza za sve akcije ({recommendations.length} preporuka)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-6 h-full">
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div 
                  key={rec.symbol} 
                  className="p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <a 
                        href={`https://www.google.com/search?q=${rec.symbol}+stock+chart`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-lg text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rec.symbol}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <span className="text-sm text-muted-foreground">{rec.name}</span>
                      <Badge className={getSignalColor(rec.signal)}>
                        <span className="flex items-center gap-1">
                          {getSignalIcon(rec.signal)}
                          {rec.signal.replace('_', ' ')}
                        </span>
                      </Badge>
                      {getRiskIcon(rec.riskLevel)}
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{formatPrice(rec.price)}</span>
                      <span className={`text-sm ml-2 ${rec.potentialGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({rec.potentialGain >= 0 ? '+' : ''}{rec.potentialGain.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1 mb-3">
                    {rec.reasons.map((reason, i) => (
                      <p key={i}>• {reason}</p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Score:</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          rec.score >= 60 ? 'bg-green-500' :
                          rec.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${rec.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{rec.score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('losers')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tablePeriod, setTablePeriod] = useState<'1D' | '10D'>('10D')

  const handleStockClick = (stock: StockData) => {
    setSelectedStock(stock)
    setIsModalOpen(true)
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/stocks')
      const result = await response.json()
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    setInsightsLoading(true)
    try {
      const response = await fetch('/api/insights')
      const result = await response.json()
      if (result.success) {
        setInsights(result)
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    } finally {
      setInsightsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchInsights()
  }, [])

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchInsights()])
  }

  // Filter stocks based on search query
  const searchResults = useMemo(() => {
    if (!data?.allStocks || !searchQuery.trim()) return []
    const query = searchQuery.toLowerCase().trim()
    return data.allStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(query) ||
      stock.name.toLowerCase().includes(query) ||
      (stock.category && stock.category.toLowerCase().includes(query))
    )
  }, [data?.allStocks, searchQuery])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-green-500">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Stock Dashboard</h1>
                <p className="text-sm text-muted-foreground">Top Gainers & Losers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {data?.timestamp && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {new Date(data.timestamp).toLocaleString()}</span>
                </div>
              )}
              <ThemeToggle />
              <Button 
                onClick={handleRefresh} 
                disabled={loading || insightsLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading || insightsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading stock data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Search Box */}
            <Card className="border-primary/20 bg-gradient-to-r from-card to-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Pretraga po symbolu ili imenu (npr. NKE, Nike, Intel)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Pronađeno <span className="font-bold text-foreground">{searchResults.length}</span> rezultata za &quot;{searchQuery}&quot; (od {data.totalStocks} akcija)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Search Results
                  </CardTitle>
                  <CardDescription>Stocks matching your search</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[400px]">
                    <SearchResultsTable stocks={searchResults} onStockClick={handleStockClick} />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* No results message */}
            {searchQuery && searchResults.length === 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nema rezultata</h3>
                  <p className="text-muted-foreground mb-4">
                    Nije pronađena akcija &quot;{searchQuery}&quot; među {data.totalStocks} učitanih akcija.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dostupni simboli: {data.allStocks.slice(0, 10).map(s => s.symbol).join(', ')}{data.allStocks.length > 10 ? '...' : ''}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards - hide when searching */}
            {!searchQuery && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard
                    title="Ukupno Akcija"
                    value={data.totalStocks.toString()}
                    subtitle="u listi"
                    icon={Activity}
                  />
                  <SummaryCard
                    title="Biggest Loser (1D)"
                    value={data.topLosers1Day[0] ? formatPercent(data.topLosers1Day[0].changePct) : 'N/A'}
                    subtitle={data.topLosers1Day[0]?.symbol || ''}
                    icon={TrendingDown}
                    trend="down"
                  />
                  <SummaryCard
                    title="Biggest Gainer (1D)"
                    value={data.topGainers1Day[0] ? formatPercent(data.topGainers1Day[0].changePct) : 'N/A'}
                    subtitle={data.topGainers1Day[0]?.symbol || ''}
                    icon={TrendingUp}
                    trend="up"
                  />
                  <SummaryCard
                    title="Biggest Loser (10D)"
                    value={data.topLosers10Day[0] ? formatPercent(data.topLosers10Day[0].day10Pct) : 'N/A'}
                    subtitle={data.topLosers10Day[0]?.symbol || ''}
                    icon={TrendingDown}
                    trend="down"
                  />
                </div>

                {/* News & Recommendations */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <NewsCard news={insights?.news || []} />
                  <RecommendationsCard 
                    recommendations={insights?.recommendations || []} 
                    marketSummary={insights?.marketSummary || {
                      totalStocks: 0,
                      gainers: 0,
                      losers: 0,
                      avgChange: 0,
                      sentiment: 'NEUTRAL'
                    }}
                  />
                </div>

                {/* Main Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 lg:w-[400px] bg-transparent border border-border">
                    <TabsTrigger value="losers" className="gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=inactive]:bg-red-100 data-[state=inactive]:text-red-700 data-[state=inactive]:hover:bg-red-200">
                      <TrendingDown className="w-4 h-4" />
                      Top Losers
                    </TabsTrigger>
                    <TabsTrigger value="gainers" className="gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=inactive]:bg-green-100 data-[state=inactive]:text-green-700 data-[state=inactive]:hover:bg-green-200">
                      <TrendingUp className="w-4 h-4" />
                      Top Gainers
                    </TabsTrigger>
                  </TabsList>

                  {/* Losers Tab */}
                  <TabsContent value="losers" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-500" />
                            Top 10 Losers - 1 Day
                          </CardTitle>
                          <CardDescription>Stocks with biggest single-day drops</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StockChart stocks={data.topLosers1Day} dataKey="changePct" type="loss" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-500" />
                            Top 10 Losers - 10 Days
                          </CardTitle>
                          <CardDescription>Stocks with biggest 10-day drops</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StockChart stocks={data.topLosers10Day} dataKey="day10Pct" type="loss" />
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setTablePeriod('1D')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                tablePeriod === '1D'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              1 Dan
                            </button>
                            <button
                              onClick={() => setTablePeriod('10D')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                tablePeriod === '10D'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              10 Dana
                            </button>
                          </div>
                          <div>
                            <CardTitle>Detaljan Pregled - Top Losers</CardTitle>
                            <CardDescription>Sortirano po {tablePeriod === '1D' ? '1-dnevnom' : '10-dnevnom'} učinku (najgori prvo)</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <StockTable stocks={tablePeriod === '1D' ? data.topLosers1Day : data.topLosers10Day} sortBy={tablePeriod === '1D' ? 'changePct' : 'day10Pct'} sortOrder="asc" />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Gainers Tab */}
                  <TabsContent value="gainers" className="space-y-6">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Top 10 Gainers - 1 Day
                          </CardTitle>
                          <CardDescription>Stocks with biggest single-day gains</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StockChart stocks={data.topGainers1Day} dataKey="changePct" type="gain" />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Top 10 Gainers - 10 Days
                          </CardTitle>
                          <CardDescription>Stocks with biggest 10-day gains</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StockChart stocks={data.topGainers10Day} dataKey="day10Pct" type="gain" />
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setTablePeriod('1D')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                tablePeriod === '1D'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              1 Dan
                            </button>
                            <button
                              onClick={() => setTablePeriod('10D')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                tablePeriod === '10D'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              10 Dana
                            </button>
                          </div>
                          <div>
                            <CardTitle>Detaljan Pregled - Top Gainers</CardTitle>
                            <CardDescription>Sortirano po {tablePeriod === '1D' ? '1-dnevnom' : '10-dnevnom'} učinku (najbolji prvo)</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[400px]">
                          <StockTable stocks={tablePeriod === '1D' ? data.topGainers1Day : data.topGainers10Day} sortBy={tablePeriod === '1D' ? 'changePct' : 'day10Pct'} sortOrder="desc" />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        ) : null}
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal 
        stock={selectedStock} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Stock Dashboard • Podaci sa Google Sheets • AI preporuke
          </p>
        </div>
      </footer>
    </div>
  )
}
