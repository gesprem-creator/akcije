'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Plus, 
  Minus,
  RefreshCw,
  Trash2,
  X,
  ShoppingCart,
  DollarSign,
  PieChart,
  History,
  Loader2,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'

interface StockData {
  symbol: string
  name: string
  price: number
  changePct: number
}

interface Holding {
  symbol: string
  name: string
  shares: number
  avgBuyPrice: number
}

interface Transaction {
  id: string
  symbol: string
  name: string
  type: string
  shares: number
  price: number
  total: number
  timestamp: string
}

interface PortfolioData {
  balance: number
  initialBalance: number
  holdings: Holding[]
  transactions: Transaction[]
}

const INITIAL_BALANCE = 50000
const STORAGE_KEY = 'portfolio-data'

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(false)
  const [stocksLoading, setStocksLoading] = useState(true)
  const [allStocks, setAllStocks] = useState<StockData[]>([])
  const [recommendations, setRecommendations] = useState<{ symbol: string; name: string; signal: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [quantity, setQuantity] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [buying, setBuying] = useState(false)
  const [selling, setSelling] = useState(false)

  // Load portfolio from localStorage
  const loadPortfolio = useCallback(() => {
    setLoading(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPortfolio(JSON.parse(stored))
      } else {
        const newPortfolio: PortfolioData = {
          balance: INITIAL_BALANCE,
          initialBalance: INITIAL_BALANCE,
          holdings: [],
          transactions: []
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPortfolio))
        setPortfolio(newPortfolio)
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err)
      const newPortfolio: PortfolioData = {
        balance: INITIAL_BALANCE,
        initialBalance: INITIAL_BALANCE,
        holdings: [],
        transactions: []
      }
      setPortfolio(newPortfolio)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save portfolio to localStorage
  const savePortfolio = useCallback((data: PortfolioData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setPortfolio(data)
    } catch (err) {
      console.error('Failed to save portfolio:', err)
    }
  }, [])

  const fetchStocks = useCallback(async () => {
    setStocksLoading(true)
    try {
      const [stocksRes, insightsRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/insights')
      ])
      const stocksData = await stocksRes.json()
      const insightsData = await insightsRes.json()
      
      if (stocksData.success) {
        setAllStocks(stocksData.allStocks)
      }
      if (insightsData.success) {
        setRecommendations(insightsData.recommendations)
      }
    } catch (err) {
      console.error('Failed to fetch stocks:', err)
    } finally {
      setStocksLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolio()
    fetchStocks()
  }, [loadPortfolio, fetchStocks])

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase()
    return allStocks.filter(
      s => s.symbol.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [searchQuery, allStocks])

  const recommendedStocks = useMemo(() => {
    return recommendations
      .filter(r => r.signal === 'STRONG_BUY' || r.signal === 'BUY')
      .slice(0, 10)
      .map(r => allStocks.find(s => s.symbol === r.symbol))
      .filter(Boolean) as StockData[]
  }, [recommendations, allStocks])

  const handleBuy = () => {
    if (!selectedStock || !quantity || !portfolio) return
    const shares = parseInt(quantity)
    if (shares <= 0) return
    
    const total = shares * selectedStock.price

    if (total > portfolio.balance) {
      alert('Nemate dovoljno sredstava!')
      return
    }

    setBuying(true)
    try {
      const existingHolding = portfolio.holdings.find(h => h.symbol === selectedStock.symbol)
      let newHoldings: Holding[]

      if (existingHolding) {
        const newTotalShares = existingHolding.shares + shares
        const newAvgPrice = ((existingHolding.shares * existingHolding.avgBuyPrice) + (shares * selectedStock.price)) / newTotalShares
        newHoldings = portfolio.holdings.map(h => 
          h.symbol === selectedStock.symbol 
            ? { ...h, shares: newTotalShares, avgBuyPrice: newAvgPrice }
            : h
        )
      } else {
        newHoldings = [...portfolio.holdings, {
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          shares: shares,
          avgBuyPrice: selectedStock.price
        }]
      }

      const transaction: Transaction = {
        id: Date.now().toString(),
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        type: 'BUY',
        shares: shares,
        price: selectedStock.price,
        total: total,
        timestamp: new Date().toISOString()
      }

      savePortfolio({
        balance: portfolio.balance - total,
        initialBalance: portfolio.initialBalance,
        holdings: newHoldings,
        transactions: [transaction, ...portfolio.transactions]
      })

      setQuantity('')
      setSelectedStock(null)
    } catch (err) {
      console.error('Buy error:', err)
      alert('Greška prilikom kupovine')
    } finally {
      setBuying(false)
    }
  }

  const handleSell = (symbol: string, shares: number, currentPrice: number) => {
    if (!portfolio) return

    setSelling(true)
    try {
      const holding = portfolio.holdings.find(h => h.symbol === symbol)
      if (!holding || holding.shares < shares) {
        alert('Nemate dovoljno akcija za prodaju!')
        return
      }

      const total = shares * currentPrice
      let newHoldings: Holding[]

      if (holding.shares === shares) {
        newHoldings = portfolio.holdings.filter(h => h.symbol !== symbol)
      } else {
        newHoldings = portfolio.holdings.map(h => 
          h.symbol === symbol 
            ? { ...h, shares: h.shares - shares }
            : h
        )
      }

      const transaction: Transaction = {
        id: Date.now().toString(),
        symbol: symbol,
        name: holding.name,
        type: 'SELL',
        shares: shares,
        price: currentPrice,
        total: total,
        timestamp: new Date().toISOString()
      }

      savePortfolio({
        balance: portfolio.balance + total,
        initialBalance: portfolio.initialBalance,
        holdings: newHoldings,
        transactions: [transaction, ...portfolio.transactions]
      })
    } catch (err) {
      console.error('Sell error:', err)
      alert('Greška prilikom prodaje')
    } finally {
      setSelling(false)
    }
  }

  const handleReset = () => {
    const newPortfolio: PortfolioData = {
      balance: INITIAL_BALANCE,
      initialBalance: INITIAL_BALANCE,
      holdings: [],
      transactions: []
    }
    savePortfolio(newPortfolio)
  }

  const quickBuyAmounts = [10, 50, 100, 500]

  const getCurrentPrice = (symbol: string): number => {
    const stock = allStocks.find(s => s.symbol === symbol)
    return stock?.price || 0
  }

  const getHoldingValue = (holding: Holding): { value: number; profit: number; profitPercent: number } => {
    const currentPrice = getCurrentPrice(holding.symbol)
    const value = holding.shares * currentPrice
    const cost = holding.shares * holding.avgBuyPrice
    const profit = value - cost
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0
    return { value, profit, profitPercent }
  }

  const totalHoldingsValue = portfolio?.holdings.reduce((sum, h) => {
    const price = getCurrentPrice(h.symbol)
    return sum + (h.shares * price)
  }, 0) || 0

  // Profit/Gubitak = Trenutna ukupna vrednost - Početni kapital
  const totalPortfolioValue = portfolio ? portfolio.balance + totalHoldingsValue : 0
  const totalProfit = portfolio ? totalPortfolioValue - portfolio.initialBalance : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Nazad
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Moj Portfolio</h1>
                  <p className="text-sm text-muted-foreground">Početni kapital: ${INITIAL_BALANCE.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={loadPortfolio} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Portfolija?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ovo će obrisati sve vaše pozicije i vratiti balans na $50,000. 
                      Ova akcija se ne može poništiti.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Otkaži</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Resetuj</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-6">
        {loading && !portfolio ? (
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : portfolio ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Ukupna Vrednost</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {formatPrice(portfolio.balance + totalHoldingsValue)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Keš Balans</p>
                  <p className="text-2xl font-bold text-green-500">{formatPrice(portfolio.balance)}</p>
                </CardContent>
              </Card>
              <Card className={`${totalProfit >= 0 ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20'}`}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Profit/Gubitak</p>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatPrice(totalProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pozicije</p>
                  <p className="text-2xl font-bold text-purple-500">{portfolio.holdings.length}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview" className="gap-2">
                  <PieChart className="w-4 h-4" />
                  Pregled
                </TabsTrigger>
                <TabsTrigger value="trade" className="gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Trgovina
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  Istorija
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Holdings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Moje Pozicije ({portfolio.holdings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {portfolio.holdings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                          <p>Nemate nijednu akciju u portfoliju</p>
                          <Button variant="outline" className="mt-4" onClick={() => setActiveTab('trade')}>
                            Kupi Akcije
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px] pr-4">
                          <div className="space-y-3">
                            {portfolio.holdings.map((holding) => {
                              const { value, profit, profitPercent } = getHoldingValue(holding)
                              const currentPrice = getCurrentPrice(holding.symbol)
                              const invested = holding.shares * holding.avgBuyPrice // Ukupno uloženo
                              
                              return (
                                <div key={holding.symbol} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <span className="font-bold text-lg">{holding.symbol}</span>
                                      <span className="text-sm text-muted-foreground ml-2">{holding.name}</span>
                                    </div>
                                    <Badge variant={profit >= 0 ? 'default' : 'destructive'} 
                                      className={profit >= 0 ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : ''}>
                                      {profit >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                      {formatPercent(profitPercent)}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-2">
                                    <div className="bg-muted/30 rounded px-2 py-1">
                                      <p className="text-muted-foreground text-xs">Količina</p>
                                      <p className="font-medium text-sm">{holding.shares}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded px-2 py-1">
                                      <p className="text-muted-foreground text-xs">Prosečna Cena</p>
                                      <p className="font-medium text-sm">{formatPrice(holding.avgBuyPrice)}</p>
                                    </div>
                                    <div className="bg-muted/30 rounded px-2 py-1">
                                      <p className="text-muted-foreground text-xs">Trenutna Cena</p>
                                      <p className="font-medium text-sm">{formatPrice(currentPrice)}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1">
                                      <p className="text-blue-500 text-xs">Uloženo</p>
                                      <p className="font-medium text-sm">{formatPrice(invested)}</p>
                                    </div>
                                    <div className={`${profit >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded px-2 py-1`}>
                                      <p className={`${profit >= 0 ? 'text-green-500' : 'text-red-500'} text-xs`}>Trenutna Vrednost</p>
                                      <p className={`font-medium text-sm ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatPrice(value)}</p>
                                    </div>
                                  </div>
                                  <div className={`${profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded px-2 py-1 mb-2`}>
                                    <p className={`${profit >= 0 ? 'text-emerald-500' : 'text-red-500'} text-xs`}>
                                      {profit >= 0 ? 'Profit' : 'Gubitak'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className={`font-medium text-sm ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {profit >= 0 ? '+' : ''}{formatPrice(profit)}
                                      </p>
                                      <span className={`text-xs ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        ({profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      type="number"
                                      placeholder="Kom"
                                      className="w-20 h-7 text-sm"
                                      id={`sell-qty-${holding.symbol}`}
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="h-7 text-xs px-2"
                                      disabled={selling}
                                      onClick={() => {
                                        const input = document.getElementById(`sell-qty-${holding.symbol}`) as HTMLInputElement
                                        const qty = parseInt(input?.value || '0')
                                        if (qty > 0 && qty <= holding.shares) {
                                          handleSell(holding.symbol, qty, currentPrice)
                                          input.value = ''
                                        }
                                      }}
                                    >
                                      {selling ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Minus className="w-3 h-3 mr-1" />Prodaj</>}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-7 text-xs px-2"
                                      disabled={selling}
                                      onClick={() => handleSell(holding.symbol, holding.shares, currentPrice)}
                                    >
                                      Sve
                                    </Button>
                                    <a
                                      href={`https://www.google.com/search?q=${holding.symbol}+stock`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                        <ExternalLink className="w-3 h-3" />
                                      </Button>
                                    </a>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommended for Purchase */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Preporučene za Kupovinu
                      </CardTitle>
                      <CardDescription>Akcije sa BUY signalom iz AI preporuka</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stocksLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : recommendedStocks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
                          <p>Nema trenutnih preporuka</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px] pr-4">
                          <div className="space-y-2">
                            {recommendedStocks.map((stock) => (
                              <div key={stock.symbol} className="p-2 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-500/20 text-green-500 text-xs">BUY</Badge>
                                  <span className="font-bold text-sm text-green-500">{stock.symbol}</span>
                                  <span className="text-xs text-muted-foreground hidden sm:inline">{stock.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-bold text-sm">{formatPrice(stock.price)}</p>
                                    <p className={`text-xs ${stock.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {formatPercent(stock.changePct * 100)}
                                    </p>
                                  </div>
                                  <Button 
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setSelectedStock(stock)
                                      setActiveTab('trade')
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Kupi
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="trade" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Search & Select */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Pretraži Akcije
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stocksLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Pretraži po symbolu ili nazivu..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 h-12 text-base"
                            />
                          </div>

                          {searchQuery && filteredStocks.length > 0 && (
                            <div className="space-y-3">
                              <ScrollArea className="h-[250px] pr-4">
                                <div className="space-y-2">
                                  {filteredStocks.map((stock) => (
                                    <div 
                                      key={stock.symbol}
                                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                                        selectedStock?.symbol === stock.symbol 
                                          ? 'bg-primary/10 border border-primary/30' 
                                          : 'bg-muted/50 hover:bg-muted border border-transparent'
                                      }`}
                                      onClick={() => setSelectedStock(stock)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className={`font-bold text-lg ${stock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {stock.symbol}
                                          </span>
                                          <span className="text-sm text-muted-foreground ml-2">{stock.name}</span>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">{formatPrice(stock.price)}</p>
                                          <p className={`text-xs ${stock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formatPercent(stock.changePct * 100)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              
                              {/* Chart Preview when stock selected */}
                              {selectedStock && (
                                <div className="bg-card rounded-lg border border-border overflow-hidden h-[200px]">
                                  <iframe 
                                    key={selectedStock.symbol}
                                    src={`https://s.tradingview.com/embed-widget/symbol-overview/?symbols=${selectedStock.symbol}&interval=D&locale=en&colorTheme=dark&isTransparent=false&showSymbolLogo=true&displayMode=adaptive&width=100%25&height=100%25`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    loading="lazy"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {searchQuery && filteredStocks.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                              Nije pronađena nijedna akcija
                            </div>
                          )}

                          {!searchQuery && (
                            <div className="text-center text-muted-foreground py-12">
                              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>Upišite naziv ili symbol akcije</p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Buy Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Kupi Akcije
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!selectedStock ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                          <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                          <p>Selektujte akciju za kupovinu</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-bold text-xl ${selectedStock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {selectedStock.symbol}
                              </span>
                              <Badge variant="outline">{selectedStock.name}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-2xl font-bold">{formatPrice(selectedStock.price)}</p>
                              <p className={`text-sm ${selectedStock.changePct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatPercent(selectedStock.changePct * 100)} danas
                              </p>
                            </div>
                          </div>

                          {/* Quick Links */}
                          <div className="flex gap-2">
                            <a 
                              href={`https://www.tradingview.com/chart/?symbol=${selectedStock.symbol}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              TradingView
                            </a>
                            <a 
                              href={`https://www.google.com/finance/quote/${selectedStock.symbol}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Google Finance
                            </a>
                          </div>

                          <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Količina</label>
                            <Input
                              type="number"
                              placeholder="Broj akcija"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              className="text-lg h-12"
                            />
                            <div className="flex gap-2 mt-3">
                              {quickBuyAmounts.map((amt) => (
                                <Button 
                                  key={amt} 
                                  variant="outline" 
                                  onClick={() => setQuantity(amt.toString())}
                                >
                                  {amt}
                                </Button>
                              ))}
                              <Button 
                                variant="outline"
                                onClick={() => {
                                  const maxShares = Math.floor(portfolio.balance / selectedStock.price)
                                  setQuantity(maxShares.toString())
                                }}
                              >
                                Max
                              </Button>
                            </div>
                          </div>

                          {quantity && parseInt(quantity) > 0 && (
                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-muted-foreground">Ukupno:</span>
                                <span className="text-xl font-bold text-blue-500">
                                  {formatPrice(parseInt(quantity) * selectedStock.price)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Preostali balans:</span>
                                <span className={portfolio.balance - parseInt(quantity) * selectedStock.price < 0 ? 'text-red-500' : 'text-green-500'}>
                                  {formatPrice(portfolio.balance - parseInt(quantity) * selectedStock.price)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button 
                              className="flex-1 h-12"
                              size="lg"
                              disabled={!quantity || parseInt(quantity) <= 0 || parseInt(quantity) * selectedStock.price > portfolio.balance || buying}
                              onClick={handleBuy}
                            >
                              {buying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                              Kupi {quantity || 0} Akcija
                            </Button>
                            <Button variant="outline" size="lg" className="h-12" onClick={() => setSelectedStock(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Istorija Transakcija ({portfolio.transactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolio.transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <History className="w-12 h-12 mb-4 opacity-50" />
                        <p>Nema transakcija</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-2">
                          {portfolio.transactions.map((tx) => (
                            <div 
                              key={tx.id}
                              className={`p-2 rounded-lg border flex items-center justify-between ${
                                tx.type === 'BUY' 
                                  ? 'bg-green-500/5 border-green-500/20' 
                                  : 'bg-red-500/5 border-red-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Badge className={`${tx.type === 'BUY' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'} text-xs`}>
                                  {tx.type === 'BUY' ? 'KUPINA' : 'PRODAJA'}
                                </Badge>
                                <span className="font-bold text-sm">{tx.symbol}</span>
                                <span className="text-xs text-muted-foreground hidden sm:inline">{tx.name}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <div className="text-center">
                                  <p className="text-muted-foreground">{tx.shares} kom</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium">{formatPrice(tx.price)}</p>
                                </div>
                                <div className="text-center min-w-[70px]">
                                  <p className={`font-medium ${tx.type === 'BUY' ? 'text-red-500' : 'text-green-500'}`}>
                                    {tx.type === 'BUY' ? '-' : '+'}{formatPrice(tx.total)}
                                  </p>
                                </div>
                                <span className="text-muted-foreground text-xs hidden md:inline">
                                  {new Date(tx.timestamp).toLocaleDateString('sr-RS')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>
    </div>
  )
}
