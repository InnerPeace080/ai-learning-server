module.exports ={
  TRAIN:false,

  NUM_CLIENT:4,

  WIDTH:80,
  HEIGHT:46,
  PLAYER_AMOUNT:40,
  PLAYER_FROM_TRAIN:1,
  MUTATION_RATE:0.5,
  ELITISM_PERCENT:0.2,

  START_HIDDEN_SIZE:100,

  MY_PROPS : 10,
  NUMBER_OUTPUT:6,

  FISH_PROPS : 6,
  FISH_NUM : 20,
  PLAYER_PROPS : 6,
  PLAYER_NUM : 10,
  ITEM_PROPS : 3,
  ITEM_NUM : 5,
  ROCK_PROPS : 3,
  ROCK_NUM : 5,
  BULLET_PROPS : 5,
  BULLET_NUM : 20,

  qNet:{
    GAMMA:0.9,
    subTrainingSize:100,

    ITERATIONS:1000,
    RATE : 0.3,
    ERROR:0.5,

      WIDTH:80,
      HEIGHT:46,

      MY_PROPS : 10,

      FISH_PROPS : 6,
      FISH_NUM : 20,
      PLAYER_PROPS : 6,
      PLAYER_NUM : 10,
      ITEM_PROPS : 3,
      ITEM_NUM : 5,
      ROCK_PROPS : 3,
      ROCK_NUM : 5,
      BULLET_PROPS : 5,
      BULLET_NUM : 20,


      NUMBER_DIRECTION:16,

    }
}
