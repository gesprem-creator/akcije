import { NextResponse } from 'next/server';

interface SentimentData {
  vix: {
    value: number;
    change: number;
    changePct: number;
  };
  fearGreed: {
    value: number;
    label: string;
  };
  investorSentiment: number; // Single bullish percentage value
}

// VIX data - fetch from Yahoo Finance
async function getVIXData(): Promise<{ value: number; change: number; changePct: number }> {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=2d', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const meta = result.meta;
        const currentPrice = meta?.regularMarketPrice || 25;
        const previousClose = meta?.previousClose || currentPrice;
        const change = currentPrice - previousClose;
        const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        return {
          value: Math.round(currentPrice * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePct: Math.round(changePct * 100) / 100
        };
      }
    }
  } catch (error) {
    console.error('Error fetching VIX:', error);
  }
  
  return { value: 25.0, change: 0, changePct: 0 };
}

// Fear & Greed Index from CNN
async function getFearGreedIndex(): Promise<{ value: number; label: string }> {
  try {
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      // CNN API structure: fear_and_greed: { score: number, rating: string }
      const score = data?.fear_and_greed?.score;
      const rating = data?.fear_and_greed?.rating;
      
      if (typeof score === 'number') {
        return {
          value: Math.round(score), // Round to integer
          label: rating || getFearGreedLabel(score)
        };
      }
    }
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
  }
  
  return { value: 17, label: 'Extreme Fear' };
}

function getFearGreedLabel(value: number): string {
  if (value <= 20) return 'Extreme Fear';
  if (value <= 40) return 'Fear';
  if (value <= 60) return 'Neutral';
  if (value <= 80) return 'Greed';
  return 'Extreme Greed';
}

// US Investor Sentiment - AAII survey data (Bullish percentage)
async function getInvestorSentiment(): Promise<number> {
  // Current AAII survey value (as of latest)
  // These are typically updated weekly on Thursday
  // Source: https://ycharts.com/indicators/us_investor_sentiment_bullish
  return 31.94;  // 31.94% bullish from YCharts
}

export async function GET() {
  try {
    const [vix, fearGreed, investorSentiment] = await Promise.all([
      getVIXData(),
      getFearGreedIndex(),
      getInvestorSentiment()
    ]);
    
    const sentimentData: SentimentData = {
      vix,
      fearGreed,
      investorSentiment
    };
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: sentimentData
    });
    
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch sentiment data' 
      },
      { status: 500 }
    );
  }
}
