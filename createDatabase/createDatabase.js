const fs = require("fs");
const csv = require("csvtojson");
const port = require("../bin/www");
const imagesLastId = 721;
const { faker } = require("@faker-js/faker");

const createDatabase = async () => {
  let newData = await csv().fromFile("createDatabase/pokemon_expanded.csv");

  let data = JSON.parse(fs.readFileSync("pokemon.json"));
  data = {
    data: [],
    totalPokemons: 0,
  };
  newData = newData.map((pokemon, index) => {
    let typeList = [];
    if (pokemon.type1) {
      typeList.push(pokemon.type1.toLowerCase());
    }
    if (pokemon.type2) {
      typeList.push(pokemon.type2.toLowerCase());
    }

    const height = `${Math.round(pokemon.height_m * 3.28084 * 100) / 100}'`;

    const weight = `${Math.round(pokemon.weight_kg * 2.20462 * 10) / 10} lbs`;

    const categoryIndex = pokemon.classfication.lastIndexOf(" ");
    const category = pokemon.classfication.substring(0, categoryIndex);
    const abilities = JSON.parse(pokemon.abilities.replaceAll("'", '"'));
    const newPokemon = {
      id: index + 1,
      name: pokemon.name.toLowerCase(),
      description: faker.lorem.sentence({ min: 5, max: 15 }),
      height: height,
      weight: weight,
      category: category,
      abilities: abilities,
      types: typeList,
      url: `http://localhost:${port}/images/${index + 1}.png`,
    };

    return newPokemon;
  });
  newData = newData.filter((pokemon) => pokemon.id <= imagesLastId);

  data.data = newData;
  data.totalPokemons = newData.length;

  fs.writeFileSync("pokemon.json", JSON.stringify(data));
  console.log("done");
};

createDatabase();
