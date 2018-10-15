const HDWalletProvider = require('truffle-hdwallet-provider');
const HDWalletPrikeyProvider = require('truffle-hdwallet-provider-privkey');
const account = 'disclose';
const privKey = 'disclose';

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 7545,
            gas: 2000000,
            gasPrice: 10000000000,
            network_id: "*" // Match any network id
        },
        ropsten: {
            provider: function() {
                return new HDWalletPrikeyProvider(privKey, 'https://ropsten.infura.io/v3/disclose');
            },
            network_id: "3",
            gas: 4700000,
            gasPrice: 5000000000, // Specified in Wei
            from: account
        },
        rinkeby: {
            provider: new HDWalletProvider(process.env.MNEMONIC, "https://rinkeby.infura.io/v3/disclose"),
            network_id: "4",
            gas: 4700000,
            gasPrice: 5000000000 // Specified in Wei
        },
        production: {
            provider: new HDWalletProvider(process.env.MNEMONIC, "https://mainnet.infura.io/v3/disclose "),
            network_id: "1",
            gas: 4700000,
            gasPrice: 5000000000
        },
    }
};
