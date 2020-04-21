import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    // Create or find the category
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const actualBalance = await transactionsRepository.getBalance();
    let category_id;
    if (type === 'outcome' && value > actualBalance.total) {
      throw new AppError(
        'You dont have enought balance to do this transaction',
      );
    }

    const findCategoryWithSameName = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!findCategoryWithSameName) {
      const newCategory = categoriesRepository.create({
        title: category,
      });
      await categoriesRepository.save(newCategory);
      category_id = newCategory.id;
    }

    if (findCategoryWithSameName) category_id = findCategoryWithSameName.id;

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
