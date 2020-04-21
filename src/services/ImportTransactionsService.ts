import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  // Promise<Transaction[]>
  async execute(filePath: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const readStream = fs.createReadStream(filePath); // permite que leiamos o conteúdo do arquivo "filePath" a partir da sua stream.

    const parsers = csvParse({
      from_line: 2,
    });
    // artribuindo à variável parsers, um analisador que convete entrada de texto csv em matrizes ou objetos
    // csvParse é uma stream do tipo Readable e Writable
    // Está sendo definida uma opção que faz com que lide com registros iniciando em um número de linha solicitado

    const parseCSV = readStream.pipe(parsers);
    // pipe faz com que os dados do arquivo filePath que é uma stream de leitura, sejam enviados ao csvParse que é uma stream duplex
    // o pipe faz com que o envio de dados seja feito de maneira simultânea, no momento que a stream de leitura recebe os dados, ele envia simultanemante para a stream duplex csvParse

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];
    // Criando varíaveis listas vazias para armazenar os categorias e as transactions para que no final salvemos tudo de uma vez no banco de dados
    // evitando ao máximo a abertura e o fechamento de conexão para inserirmos algo no banco de dados

    parseCSV.on('data', async line => {
      // on('data') é um evento disparado sempre que a stream passa uma chunk(pequena parte) de dados para o consumidor
      const [title, type, value, category] = line.map((
        cell: string, // No momento em que recebemos o chunk, desestruturamos a linha que pode ser considerada o chunk ou uma parcela do chunk
      ) => cell.trim()); // cell.trim para remover os espaços que há entre as células no arquivo.csv
      if (!title || !type || !value) return; // Se algumas das variáveis estiverem como "undefined" ou "null" então terminaremos o fluxo por ai.

      categories.push(category); // pasando a variável "category" da destruturação para as categories[]
      transactions.push({ title, type, value, category }); // passando as variáveis da destruturação para as transactions[]
    });

    await new Promise(resolve => parseCSV.on('end', resolve));
    // on('end') é um evento disparado quando a stream não tem mais nenhum chunk a ser passado, ou seja, quando realmente finalizou o trafégo de chunks

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    // Procurando categorias no banco de dados que possuem o mesmo titles das categorias enviada no arquivo csv

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );
    // Dado que, a procura de categorias de mesmos titles retornou um array de categorias, faremos um map nesse array para armazenarmos somente os titles em um novo array

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category)) // Filtrará se as categorias do arquivo csv não está no array de categorias existentes
      .filter((value, index, self) => self.indexOf(value) === index); // Removerá as duplicadas

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    // Criando novas categorias utilizando o array de categorias que não existem no banco de dados

    await categoriesRepository.save(newCategories); // Salvando as novas categorias

    const finalCategories = [...newCategories, ...existentCategories]; // atribuindo a variavel, os arrays de novas categorias e categorias existentes utilizando spread operator

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    // Criando Transactions

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
