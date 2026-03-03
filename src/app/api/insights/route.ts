import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  day5Price: number;
  day10Price: number;
  day5Pct: number;
  day10Pct: number;
  marketCap: number;
  pe: string;
  category: string;
}

interface NewsItem {
  symbol: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  date: string;
}

interface Recommendation {
  symbol: string;
  name: string;
  price: number;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  score: number;
  reasons: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialGain: number;
}

async function fetchSheetData(sheetId: string, gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status}`);
  }
  return response.text();
}

function parseCSV(csvText: string): StockData[] {
  const lines = csvText.split('\n');
  const stocks: StockData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length < 10) continue;
    
    const parseNumber = (val: string): number => {
      if (!val || val === '-' || val === '') return 0;
      const cleaned = val.replace(/[$,%B]/g, '').replace(/\s/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };
    
    // Parse percentage - convert to decimal (e.g., "-2.0%" -> -0.02)
    const parsePercent = (val: string): number => {
      if (!val || val === '-' || val === '') return 0;
      const cleaned = val.replace(/[%]/g, '').replace(/\s/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num / 100;
    };
    
    const parseMarketCap = (val: string): number => {
      if (!val || val === '-') return 0;
      const cleaned = val.replace(/[$,\s]/g, '');
      if (cleaned.includes('B')) {
        return parseFloat(cleaned.replace('B', '')) * 1000000000;
      } else if (cleaned.includes('M')) {
        return parseFloat(cleaned.replace('M', '')) * 1000000;
      } else if (cleaned.includes('T')) {
        return parseFloat(cleaned.replace('T', '')) * 1000000000000;
      }
      return parseFloat(cleaned) || 0;
    };
    
    const stock: StockData = {
      symbol: values[0] || '',
      name: values[1] || '',
      price: parseNumber(values[3]),
      change: parseNumber(values[4]),
      changePct: parsePercent(values[5]),
      day5Price: parseNumber(values[6]),
      day10Price: parseNumber(values[7]),
      day5Pct: parsePercent(values[8]),
      day10Pct: parsePercent(values[9]),
      marketCap: parseMarketCap(values[10]),
      pe: values[11] || '-',
      category: values[12] || ''
    };
    
    if (stock.symbol && stock.symbol.length > 0 && stock.symbol !== 'cist' && stock.price > 0) {
      stocks.push(stock);
    }
  }
  
  return stocks;
}

function analyzeTechnical(stock: StockData): Recommendation {
  let score = 50;
  const reasons: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  
  const momentum1Day = stock.changePct;
  const momentum5Day = stock.day5Pct;
  const momentum10Day = stock.day10Pct;
  
  // Oversold conditions (potential buy)
  if (momentum10Day < -0.15) {
    score += 20;
    reasons.push(`📉 Oversold: Down ${(momentum10Day * 100).toFixed(1)}% in 10 days - potential bounce`);
  } else if (momentum10Day < -0.10) {
    score += 10;
    reasons.push(`📉 Approaching oversold territory`);
  }
  
  // Short-term momentum
  if (momentum1Day < -0.05) {
    score += 5;
    reasons.push(`⏱️ Short-term dip: Could be buying opportunity`);
  }
  
  // Trend reversal signals
  if (momentum5Day < 0 && momentum1Day > 0) {
    score += 15;
    reasons.push(`🔄 Potential reversal: 5-day downtrend but positive today`);
  }
  
  // Momentum continuation
  if (momentum5Day > 0.05 && momentum1Day > 0) {
    score += 10;
    reasons.push(`📈 Strong momentum: Continuing upward trend`);
  }
  
  // Overbought conditions
  if (momentum10Day > 0.20) {
    score -= 15;
    reasons.push(`⚠️ Overbought: Up ${(momentum10Day * 100).toFixed(1)}% in 10 days - potential pullback`);
    riskLevel = 'HIGH';
  } else if (momentum10Day > 0.15) {
    score -= 5;
    reasons.push(`⚠️ Approaching overbought territory`);
  }
  
  // Market cap stability
  if (stock.marketCap > 100000000000) {
    score += 5;
    reasons.push(`🏢 Large cap stability: $${(stock.marketCap / 1000000000).toFixed(0)}B market cap`);
    riskLevel = 'LOW';
  } else if (stock.marketCap < 10000000000) {
    score -= 5;
    reasons.push(`⚠️ Small cap: Higher volatility expected`);
    riskLevel = 'HIGH';
  }
  
  // Consistency check
  if (momentum5Day * momentum10Day > 0 && momentum1Day * momentum5Day > 0) {
    score += 5;
    reasons.push(`📊 Consistent trend direction`);
  } else {
    score -= 5;
    reasons.push(`📊 Mixed signals: Trend inconsistency`);
  }
  
  // Determine signal
  let signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  if (score >= 75) signal = 'STRONG_BUY';
  else if (score >= 60) signal = 'BUY';
  else if (score >= 40) signal = 'HOLD';
  else if (score >= 25) signal = 'SELL';
  else signal = 'STRONG_SELL';
  
  // Estimate potential gain/loss
  let potentialGain = 0;
  if (signal === 'STRONG_BUY') potentialGain = 15 + Math.random() * 10;
  else if (signal === 'BUY') potentialGain = 8 + Math.random() * 7;
  else if (signal === 'HOLD') potentialGain = -3 + Math.random() * 6;
  else if (signal === 'SELL') potentialGain = -10 - Math.random() * 5;
  else potentialGain = -15 - Math.random() * 10;
  
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price,
    signal,
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length > 0 ? reasons : ['No significant signals detected'],
    riskLevel,
    potentialGain
  };
}

export async function GET() {
  try {
    const zai = await ZAI.create();
    const sheetId = '1cNYOw3QIIJlK3ReruQHWsc_4c64_My8nOan-iTvpwzc';
    
    // All sheet gids discovered from the spreadsheet
    const sheets = [
      { gid: '0', name: 'Main' },
      { gid: '1904319929', name: 'MOJA LISTA' },
      { gid: '1649754649', name: 'Sheet 2' },
      { gid: '1698602070', name: 'Sheet 3' },
      { gid: '183878865', name: 'Sheet 4' },
      { gid: '2076185266', name: 'Sheet 5' },
      { gid: '322424790', name: 'Sheet 6' },
      { gid: '640865501', name: 'Sheet 7' },  // Contains AVAV
      { gid: '655216261', name: 'Sheet 8' },
      { gid: '76309403', name: 'Sheet 9' },
    ];
    
    // Fetch all stocks from all sheets
    let stocks: StockData[] = [];
    for (const sheet of sheets) {
      try {
        const csvText = await fetchSheetData(sheetId, sheet.gid);
        const sheetStocks = parseCSV(csvText);
        stocks = [...stocks, ...sheetStocks];
      } catch (error) {
        console.error(`Failed to fetch sheet ${sheet.name}:`, error);
      }
    }
    
    // Remove duplicates by symbol
    stocks = stocks.filter((stock, index, self) =>
      index === self.findIndex(s => s.symbol === stock.symbol)
    );
    
    // Get stocks with significant changes for news
    const significantStocks = stocks
      .filter(s => Math.abs(s.changePct) > 0.02 || Math.abs(s.day10Pct) > 0.05)
      .slice(0, 3);
    
    // Fetch news for significant stocks
    const newsItems: NewsItem[] = [];
    
    for (const stock of significantStocks) {
      try {
        const searchResults = await zai.functions.invoke('web_search', {
          query: `${stock.symbol} ${stock.name} stock news today`,
          num: 3
        });
        
        if (Array.isArray(searchResults)) {
          for (const result of searchResults.slice(0, 2)) {
            newsItems.push({
              symbol: stock.symbol,
              title: result.name || 'Stock News',
              url: result.url || '#',
              snippet: result.snippet || '',
              source: result.host_name || 'Unknown',
              date: result.date || new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch news for ${stock.symbol}:`, error);
      }
    }
    
    // Generate technical analysis recommendations
    const recommendations: Recommendation[] = stocks
      .map(analyzeTechnical)
      .sort((a, b) => {
        const signalOrder = { 'STRONG_BUY': 0, 'BUY': 1, 'HOLD': 2, 'SELL': 3, 'STRONG_SELL': 4 };
        return signalOrder[a.signal] - signalOrder[b.signal] || b.score - a.score;
      })
      .slice(0, 10);
    
    // Market summary
    const gainers = stocks.filter(s => s.changePct > 0).length;
    const losers = stocks.filter(s => s.changePct < 0).length;
    const avgChange = stocks.reduce((sum, s) => sum + s.changePct, 0) / stocks.length;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      news: newsItems,
      recommendations,
      marketSummary: {
        totalStocks: stocks.length,
        gainers,
        losers,
        avgChange: avgChange * 100,
        sentiment: avgChange > 0.01 ? 'BULLISH' : avgChange < -0.01 ? 'BEARISH' : 'NEUTRAL'
      }
    });
    
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch insights' 
      },
      { status: 500 }
    );
  }
}
