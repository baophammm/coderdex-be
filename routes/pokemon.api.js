const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const router = express.Router();

/**
 * params: /
 * description: get all pokemons
 * query: name, types
 * method: get
 */

router.get("/", (req, res, next) => {
  //input validation
  const allowedFilter = ["type", "search", "page", "limit"];

  try {
    let { page, limit, ...filterQuery } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    //allow name, type, limit and page query string only
    const filterKeys = Object.keys(filterQuery);
    filterKeys.forEach((key) => {
      if (!allowedFilter.includes(key)) {
        const exception = new Error(`Query ${key} is not allowed`);
        exception.statusCode = 401;
        throw exception;
      }
      if (!filterQuery[key]) delete filterQuery[key];
    });

    //processing logic
    //Number of items skip for selection
    let offset = limit * (page - 1);

    //Read data from pokemon.json then parse to JSobject
    let db = fs.readFileSync("pokemon.json", "utf-8");
    db = JSON.parse(db);
    const { data } = db;

    //Filter data by name and type
    let result = [];

    if (filterKeys.length) {
      filterKeys.forEach((condition) => {
        let resultCondition;
        if (condition === "search") {
          resultCondition = "name";
        } else if (condition === "type") {
          resultCondition = "types";
        }
        result = result.length
          ? result.filter((pokemon) =>
              pokemon[resultCondition].includes(filterQuery[condition])
            )
          : data.filter((pokemon) =>
              pokemon[resultCondition].includes(filterQuery[condition])
            );
      });
    } else {
      result = data;
    }
    let totalPokemons = result.length;

    // then select number of result by offset
    result = result.slice(offset, offset + limit);

    // Object.data = { result, count };

    //send response

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * params: /:pokemonId
 * description: get detail of the selected pokemon
 * query:
 * method: get
 */
router.get("/:pokemonId", (req, res, next) => {
  try {
    // read data from pokemon.json and converse it to JSobject
    let db = fs.readFileSync("pokemon.json", "utf-8");
    db = JSON.parse(db);
    const { data } = db;

    // find selectedId, validate selectedId and find selected pokemon
    const { params } = req;
    const selectedId = parseInt(params.pokemonId);

    // selectedId validation
    if ((selectedId < 1) | (selectedId > data.length)) {
      const exception = new Error(`Pokemon not found`);
      exception.statusCode = 404;
      throw exception;
    }
    const pokemon = data.find((pokemon) => pokemon.id === selectedId);

    //find previous and next pokemons
    const previousId = selectedId === 1 ? data.length : selectedId - 1;
    const previousPokemon = data.find((pokemon) => pokemon.id === previousId);
    const nextId = selectedId === data.length ? 1 : selectedId + 1;
    const nextPokemon = data.find((pokemon) => pokemon.id === nextId);

    const result = {
      pokemon: pokemon,
      previousPokemon: previousPokemon,
      nextPokemon: nextPokemon,
    };

    //send response
    // res.status(200).send(result);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * params: /
 * description: post a pokemon
 * query:
 * method: post
 */

router.post("/", (req, res, next) => {
  //post input validation
  const allowData = [
    "id",
    "name",
    "description",
    "height",
    "weight",
    "category",
    "abilities",
    "types",
    "url",
  ];

  const pokemonTypes = [
    "bug",
    "dragon",
    "fairy",
    "fire",
    "ghost",
    "ground",
    "normal",
    "psychic",
    "steel",
    "dark",
    "electric",
    "fighting",
    "flying",
    "grass",
    "ice",
    "poison",
    "rock",
    "water",
  ];

  try {
    const {
      id,
      name,
      description,
      height,
      weight,
      category,
      abilities,
      types,
      url,
    } = req.body;

    if (!id || !name || !types || !url) {
      const exception = new Error(`Missing required data.`);
      exception.statusCode = 401;
      throw exception;
    }

    const newItem = req.body;
    const newItemKeys = Object.keys(newItem);

    //find update requests that are not allowed

    newItemKeys.map((key) => {
      if (!allowData.includes(key)) {
        const exception = new Error(`Key ${key} is not allowed`);
        exception.statusCode = 401;
        throw exception;
      }
    });

    //limit number of types
    if (types.length < 1 || types.length > 2) {
      const exception = new Error(`Pokémon can only have one or two types.`);
      exception.statusCode = 400;
      throw exception;
    }

    //validate type input
    types.forEach((type) => {
      if (!pokemonTypes.includes(type)) {
        const exception = new Error(
          `Pokémon's type is invalid. Allowed types are: ${pokemonTypes.map(
            (type) => type
          )}`
        );
        exception.statusCode = 400;
        throw exception;
      }
    });

    //Read data from pokemon.json then parse to JSobject
    let db = fs.readFileSync("pokemon.json", "utf-8");
    db = JSON.parse(db);
    let { data } = db;

    data.forEach((pokemon) => {
      if (name === pokemon.name || id === pokemon.id) {
        const exception = new Error(
          `The Pokémon already exists. Please check duplicated name or id`
        );
        exception.statusCode = 400;
        throw exception;
      }
    });

    //post processing logic
    const newPokemon = {
      id: parseInt(id),
      name,
      description: description ? description : "",
      height: height ? `${height}'` : `0'`,
      weight: weight ? `${weight} lbs` : "0 lbs",
      category: category ? category : "",
      abilities: abilities ? abilities : [],
      types,
      url,
    };

    // Add new pokemon to data JS object
    data.push(newPokemon);

    //Add new pokemon to db JS object
    db.data = data;
    db.totalPokemons += 1;

    //write and save to pokemon.json
    fs.writeFileSync("pokemon.json", JSON.stringify(db));

    //post send response
    res.status(200).json({ data: newPokemon });
  } catch (error) {
    next(error);
  }
});

/**
 * params: /:pokemonId
 * description: update a Pokemon
 * query:
 * method: put
 */

router.put("/:pokemonId", (req, res, next) => {
  //put input validation
  try {
    const allowUpdate = [
      "name",
      "description",
      "height",
      "weight",
      "category",
      "abilities",
      "types",
      "url",
    ];
    const { pokemonId } = req.params;

    const updates = req.body;
    const updateKeys = Object.keys(updates);

    //find update requests that are not allowed

    updateKeys.map((key) => {
      if (!allowUpdate.includes(key)) {
        const exception = new Error(`Update key ${key} is not allowed`);
        exception.statusCode = 401;
        throw exception;
      }
    });

    //put processing login
    //Read data from pokemon.json then parse to JSobject
    let db = fs.readFileSync("pokemon.json", "utf-8");
    db = JSON.parse(db);
    const { data } = db;

    //find pokemon by id
    const targetIndex = data.findIndex(
      (pokemon) => pokemon.id === parseInt(pokemonId)
    );
    if (targetIndex < 0) {
      const exception = new Error(`Pokemon not found`);
      exception.statusCode = 404;
      throw exception;
    }

    //Update new content to db pokemon JS object
    const updatedPokemon = {
      ...db.data[targetIndex],
      ...updates,
      height: updates.height ? `${updates.height}'` : height,
      weight: updates.weight ? `${updates.weight} lbs` : weight,
    };
    db.data[targetIndex] = updatedPokemon;

    //write and save to pokemon.json
    fs.writeFileSync("pokemon.json", JSON.stringify(db));

    //put send response
    res.status(200).json({ data: updatedPokemon });
  } catch (error) {
    next(error);
  }
});

/**
 * params: /:pokemonId
 * description: delete a Pokemon
 * query:
 * method: delete
 */

router.delete("/:pokemonId", (req, res, next) => {
  //delete input validation
  try {
    const { pokemonId } = req.params;
    //delete processing logic
    //read data from pokemon.json then parse to JSobject
    let db = fs.readFileSync("pokemon.json", "utf-8");
    db = JSON.parse(db);
    const { data } = db;

    //find pokemon by id
    const targetIndex = data.findIndex(
      (pokemon) => pokemon.id === parseInt(pokemonId)
    );
    if (targetIndex < 0) {
      const exception = new Error(`Pokemon not found`);
      exception.statusCode = 404;
      throw exception;
    }

    //filter db pokemon object
    db.data = data.filter((pokemon) => pokemon.id !== parseInt(pokemonId));
    db.totalPokemons -= 1;
    //write and save to pokemon.json
    fs.writeFileSync("pokemon.json", JSON.stringify(db));

    //delete send response
    res.status(200).send({});
  } catch (error) {
    next(error);
  }
});
module.exports = router;
