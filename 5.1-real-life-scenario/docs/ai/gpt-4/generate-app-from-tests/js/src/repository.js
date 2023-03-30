
const { getManager } = require("typeorm");

class AgeNamePair {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  static async getAgeForName(name) {
    const manager = getManager('postgres');
    const pair = await manager.findOne(AgeNamePair, { name });
    return pair.age;
  }

  static async getRequestsForAge(name) {
    const manager = getManager('postgres');
    const count = await manager.count(AgeNamePair, { name });
    return count;
  }

  static async getAverageAge() {
    const manager = getManager('postgres');
    const pairs = await manager.find(AgeNamePair);
    const totalAge = pairs.reduce((acc, pair) => acc + pair.age, 0);
    return totalAge / pairs.length;
  }

  static async getAverageAgeForName(name) {
    const manager = getManager('postgres');
    const pairs = await manager.find(AgeNamePair, { name });
    const totalAge = pairs.reduce((acc, pair) => acc + pair.age, 0);
    return totalAge / pairs.length;
  }
}

module.exports = { AgeNamePair };