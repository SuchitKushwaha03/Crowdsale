/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@atixlabs/hardhat-time-n-mine");
require("@nomiclabs/hardhat-waffle")
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.5",
      },
      {
        version: "0.8.0",
        settings: {},
      },
    ],
  },
};
