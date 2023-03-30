const { Entity, PrimaryGeneratedColumn, Column } = require("typeorm");

@Entity()
class AgeNamePair {
  @PrimaryGeneratedColumn()
  id = undefined;

  @Column("text")
  name = "";

  @Column("integer")
  age = 0;
}

module.exports = { AgeNamePair };