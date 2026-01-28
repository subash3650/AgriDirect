const generate = (length = 4) => Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
module.exports = { generate };
