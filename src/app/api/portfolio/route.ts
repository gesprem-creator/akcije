import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const INITIAL_BALANCE = 50000;

// GET - Get or create portfolio
export async function GET() {
  try {
    // Get or create the default portfolio
    let portfolio = await db.portfolio.findFirst({
      include: {
        holdings: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    });

    if (!portfolio) {
      portfolio = await db.portfolio.create({
        data: {
          name: 'Moj Portfolio',
          balance: INITIAL_BALANCE,
          initialBalance: INITIAL_BALANCE,
        },
        include: {
          holdings: true,
          transactions: true
        }
      });
    }

    // Calculate totals
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + (h.shares * h.avgBuyPrice), 0);
    const totalValue = portfolio.balance + holdingsValue;
    const profit = totalValue - portfolio.initialBalance;
    const profitPercent = (profit / portfolio.initialBalance) * 100;

    return NextResponse.json({
      success: true,
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        balance: portfolio.balance,
        initialBalance: portfolio.initialBalance,
        holdings: portfolio.holdings.map(h => ({
          symbol: h.symbol,
          name: h.name,
          shares: h.shares,
          avgBuyPrice: h.avgBuyPrice
        })),
        transactions: portfolio.transactions.map(t => ({
          id: t.id,
          symbol: t.symbol,
          name: t.name,
          type: t.type,
          shares: t.shares,
          price: t.price,
          total: t.total,
          timestamp: t.createdAt.toISOString()
        })),
        totalValue,
        profit,
        profitPercent
      }
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// DELETE - Reset portfolio
export async function DELETE() {
  try {
    const portfolio = await db.portfolio.findFirst();
    
    if (portfolio) {
      // Delete all transactions and holdings first (cascade)
      await db.transaction.deleteMany({
        where: { portfolioId: portfolio.id }
      });
      await db.holding.deleteMany({
        where: { portfolioId: portfolio.id }
      });
      
      // Reset balance
      await db.portfolio.update({
        where: { id: portfolio.id },
        data: {
          balance: INITIAL_BALANCE,
          initialBalance: INITIAL_BALANCE
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting portfolio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset portfolio' },
      { status: 500 }
    );
  }
}
