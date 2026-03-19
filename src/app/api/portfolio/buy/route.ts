import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name, shares, price } = body;

    if (!symbol || !shares || !price || shares <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const total = shares * price;

    // Get or create portfolio
    let portfolio = await db.portfolio.findFirst();
    if (!portfolio) {
      portfolio = await db.portfolio.create({
        data: {
          name: 'Moj Portfolio',
          balance: 50000,
          initialBalance: 50000,
        }
      });
    }

    // Check if enough balance
    if (portfolio.balance < total) {
      return NextResponse.json(
        { success: false, error: 'Nemate dovoljno sredstava!' },
        { status: 400 }
      );
    }

    // Check if holding exists
    const existingHolding = await db.holding.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase()
        }
      }
    });

    if (existingHolding) {
      // Update existing holding - calculate new average price
      const newTotalShares = existingHolding.shares + shares;
      const newAvgPrice = ((existingHolding.shares * existingHolding.avgBuyPrice) + (shares * price)) / newTotalShares;
      
      await db.holding.update({
        where: { id: existingHolding.id },
        data: {
          shares: newTotalShares,
          avgBuyPrice: newAvgPrice
        }
      });
    } else {
      // Create new holding
      await db.holding.create({
        data: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          name: name || symbol,
          shares: shares,
          avgBuyPrice: price
        }
      });
    }

    // Create transaction record
    await db.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol: symbol.toUpperCase(),
        name: name || symbol,
        type: 'BUY',
        shares: shares,
        price: price,
        total: total
      }
    });

    // Update balance
    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        balance: portfolio.balance - total
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error buying stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to buy stock' },
      { status: 500 }
    );
  }
}
