import { NextResponse } from 'next/server';

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
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (handle commas inside quotes)
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
    
    // Only add stocks with valid symbol and price
    if (stock.symbol && stock.symbol.length > 0 && stock.symbol !== 'cist' && stock.price > 0) {
      stocks.push(stock);
    }
  }
  
  return stocks;
}

export async function GET() {
  try {
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
    
    let allStocks: StockData[] = [];
    
    for (const sheet of sheets) {
      const csvText = await fetchSheetData(sheetId, sheet.gid);
      const stocks = parseCSV(csvText);
      allStocks = [...allStocks, ...stocks];
    }
    
    // Remove duplicates by symbol
    const uniqueStocks = allStocks.filter((stock, index, self) =>
      index === self.findIndex(s => s.symbol === stock.symbol)
    );
    
    // Sort for different views
    const topLosers1Day = [...uniqueStocks]
      .filter(s => s.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 10);
    
    const topLosers10Day = [...uniqueStocks]
      .filter(s => s.day10Pct < 0)
      .sort((a, b) => a.day10Pct - b.day10Pct)
      .slice(0, 10);
    
    const topGainers1Day = [...uniqueStocks]
      .filter(s => s.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 10);
    
    const topGainers10Day = [...uniqueStocks]
      .filter(s => s.day10Pct > 0)
      .sort((a, b) => b.day10Pct - a.day10Pct)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalStocks: uniqueStocks.length,
      allStocks: uniqueStocks,
      topLosers1Day,
      topLosers10Day,
      topGainers1Day,
      topGainers10Day
    });
    
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch data' 
      },
      { status: 500 }
    );
  }
}
