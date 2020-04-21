import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const incomes = await this.find({
      where: { type: 'income' },
    });

    const incomeSum = incomes.reduce((sum: number, record) => {
      return sum + Number(record.value);
    }, 0);

    const outcomes = await this.find({
      where: { type: 'outcome' },
    });

    const outcomeSum = outcomes.reduce((sum: number, record) => {
      return sum + Number(record.value);
    }, 0);

    const total = incomeSum - outcomeSum;

    const balance = {
      income: incomeSum,
      outcome: outcomeSum,
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
