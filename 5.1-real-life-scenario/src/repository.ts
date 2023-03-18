import { DataSource } from "typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { env } from "../config";

@Entity()
export class AgeNamePair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;
}

export const repository = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "postgres",
    database: env.POSTGRES_DB,
    password: env.POSTGRES_PASSWORD,
    username: env.POSTGRES_USERNAME,
    entities: [AgeNamePair],
    logging: true,
  });
  await dataSource.initialize();
  await dataSource.synchronize();
  return {
    create: async (payload: { name: string; age: number }) => {
      await dataSource.getRepository(AgeNamePair).insert({ age: payload.age, name: payload.name });
    },
    getAverageForName: async (payload: { name: string }) => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .where("ageNamePair.name = :name", { name: payload.name })
        .getRawOne();
      return Number(result.average);
    },
    getAverage: async () => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .getRawOne();
      return Number(result.average);
    },
    getAmountForName: async (payload: { name: string }) => {
      return await dataSource.getRepository(AgeNamePair).count({
        where: { name: payload.name },
      });
    },
  };
};
