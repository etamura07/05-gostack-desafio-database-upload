import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const findTransactionToDelete = await transactionsRepository.findOne(id);

    if (!findTransactionToDelete) {
      throw new AppError('Transaction id didnt exists.', 400);
    }
    await transactionsRepository.remove(findTransactionToDelete);
  }
}

export default DeleteTransactionService;
