import { NextResponse } from 'next/server';

interface FinancialData {
  pe: number | null;
  eps: number | null;
  revenue: number | null;
  netIncome: number | null;
  totalDebt: number | null;
  totalAssets: number | null;
  dividendYield: number | null;
  roe: number | null;
  profitMargin: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  avgVolume: number | null;
  sharesOutstanding: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  grossMargin: number | null;
}

async function fetchYahooFinanceData(symbol: string): Promise<FinancialData | null> {
  try {
    const summaryResponse = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (!summaryResponse.ok) return null;
    
    const summaryJson = await summaryResponse.json();
    const summaryData = summaryJson.quoteSummary?.result?.[0];

    if (!summaryData) return null;

    const summary = summaryData.summaryDetail || {};
    const keyStats = summaryData.defaultKeyStatistics || {};
    const financials = summaryData.financialData || {};

    return {
      pe: keyStats.trailingPE || keyStats.forwardPE || null,
      eps: keyStats.trailingEps || null,
      revenue: financials.totalRevenue || null,
      netIncome: financials.netIncomeToCommon || null,
      totalDebt: financials.totalDebt || null,
      totalAssets: financials.totalAssets || null,
      dividendYield: summary.dividendYield || null,
      roe: keyStats.returnOnEquity || null,
      profitMargin: keyStats.profitMargins || null,
      beta: keyStats.beta || null,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow || null,
      avgVolume: summary.averageVolume || null,
      sharesOutstanding: keyStats.sharesOutstanding || null,
      priceToBook: keyStats.priceToBook || null,
      currentRatio: financials.currentRatio || null,
      grossMargin: financials.grossMargins || null
    };
  } catch (error) {
    console.error('Error fetching Yahoo Finance data:', error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }
  
  const data = await fetchYahooFinanceData(symbol);
  
  if (!data) {
    return NextResponse.json({ error: 'Could not fetch financial data' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true, data });
}
