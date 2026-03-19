import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, shares, price } = body;

    if (!symbol || !shares || !price || shares <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const total = shares * price;

    // Get portfolio
    const portfolio = await db.portfolio.findFirst();
    if (!portfolio) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Check if holding exists
    const holding = await db.holding.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase()
        }
      }
    });

    if (!holding || holding.shares < shares) {
      return NextResponse.json(
        { success: false, error: 'Nemate dovoljno akcija za prodaju!' },
        { status: 400 }
      );
    }

    // Update or delete holding
    if (holding.shares === shares) {
      // Delete holding if selling all shares
      await db.holding.delete({
        where: { id: holding.id }
      });
    } else {
      // Update holding with remaining shares
      await db.holding.update({
        where: { id: holding.id },
        data: {
          shares: holding.shares - shares
        }
      });
    }

    // Create transaction record
    await db.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol: symbol.toUpperCase(),
        name: holding.name,
        type: 'SELL',
        shares: shares,
        price: price,
        total: total
      }
    });

    // Update balance (add money from sale)
    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        balance: portfolio.balance + total
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selling stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sell stock' },
      { status: 500 }
    );
  }
}
