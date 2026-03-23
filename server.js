const app = require("./app.js");

const PORT = process.env.PORT;
app.listen(PORT, (err) => {
  console.log(`App running on PORT ${PORT}!`);
});
