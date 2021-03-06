const AddressList = artifacts.require("AddressList");
const TrueVND = artifacts.require("TrueVND");
const BalanceSheet = artifacts.require("BalanceSheet");
const AllowanceSheet = artifacts.require("AllowanceSheet");
const TimeLockedController = artifacts.require("TimeLockedController");

expectThrow = async promise => {
    try {
        await promise;
    } catch (error) {
        return;
    }
    assert.fail('Expected throw not received');
};

contract('1_TimeLockedController', function (accounts) {
    it("should work", async () => {
        const mintWhiteList = await AddressList.new("Mint whitelist", false, {from: accounts[0]});
        const burnWhiteList = await AddressList.new("Burn whitelist", false, {from: accounts[0]});
        const blackList = await AddressList.new("Blacklist", true, {from: accounts[0]});
        const noFeesList = await AddressList.new("No Fees list", false, {from: accounts[0]});
        const balances = await BalanceSheet.new({from: accounts[0]});
        const allowances = await AllowanceSheet.new({from: accounts[0]});
        const trueVND = await TrueVND.new({gas: 65000000, from: accounts[0]});
        await trueVND.setLists(mintWhiteList.address, burnWhiteList.address, blackList.address, noFeesList.address, {from: accounts[0]});
        await balances.transferOwnership(trueVND.address);
        await allowances.transferOwnership(trueVND.address);
        await trueVND.setBalanceSheet(balances.address);
        await trueVND.setAllowanceSheet(allowances.address);
        await mintWhiteList.changeList(accounts[3], true, {from: accounts[0]});

        async function userHasCoins(id, amount) {
            var balance = await trueVND.balanceOf(accounts[id]);
            console.log("account ", id, " has balance ", balance);
            assert.equal(balance, amount, "userHasCoins fail: actual balance " + balance)
        }

        const timeLockedController = await TimeLockedController.new({gas: 65000000, from: accounts[0]});
        await mintWhiteList.transferOwnership(timeLockedController.address, {from: accounts[0]});
        await burnWhiteList.transferOwnership(timeLockedController.address, {from: accounts[0]});
        await blackList.transferOwnership(timeLockedController.address, {from: accounts[0]});
        await trueVND.transferOwnership(timeLockedController.address, {from: accounts[0]});
        await trueVND.mint(accounts[3], 10, {from: accounts[0]}); //user 0 is still the owner until claimOwnership
        await userHasCoins(3, 10);
        await timeLockedController.issueClaimOwnership(mintWhiteList.address, {from: accounts[0]});
        await timeLockedController.issueClaimOwnership(burnWhiteList.address, {from: accounts[0]});
        await timeLockedController.issueClaimOwnership(blackList.address, {from: accounts[0]});
        await timeLockedController.issueClaimOwnership(trueVND.address, {from: accounts[0]});
        await timeLockedController.setTrueVND(trueVND.address);
        await expectThrow(trueVND.mint(accounts[3], 10, {from: accounts[0]})); //user 0 is no longer the owner
        await timeLockedController.requestMint(accounts[3], 9, {from: accounts[0]});
        await timeLockedController.finalizeMint(0, {from: accounts[0]}); // the owner can finalize immediately
        await userHasCoins(3, 19);
        await expectThrow(timeLockedController.requestMint(accounts[3], 200, {from: accounts[1]})); //user 1 is not (yet) the admin
        await timeLockedController.transferAdminship(accounts[1], {from: accounts[0]});
        await timeLockedController.requestMint(accounts[3], 200, {from: accounts[1]});
        await userHasCoins(3, 19);
        await expectThrow(timeLockedController.finalizeMint(1, {from: accounts[3]})); //mint request cannot be finalized this early
        let blocksDelay = 20; //NOTE: this should be a day's worth of blocks (24*60*60/15), but testing that takes too long, so instead change that value to 20 in the contract for testing
        let i;
        for (i = 0; i < blocksDelay / 2; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
        }
        await expectThrow(timeLockedController.finalizeMint(1, {from: accounts[3]})); //still not enough time has passed
        for (i = 0; i < blocksDelay / 2; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
        }
        await timeLockedController.finalizeMint(1, {from: accounts[1]}); //only target of mint can finalize
        await userHasCoins(3, 219);
        await timeLockedController.requestMint(accounts[3], 3000, {from: accounts[1]});
        await timeLockedController.requestMint(accounts[3], 40000, {from: accounts[1]});
        for (i = 0; i < blocksDelay; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
        }
        await timeLockedController.finalizeMint(3, {from: accounts[1]});
        await expectThrow(timeLockedController.finalizeMint(3, {from: accounts[1]})); //can't double-finalize
        await userHasCoins(3, 40219);
        await timeLockedController.transferAdminship(accounts[2], {from: accounts[0]});
        await expectThrow(timeLockedController.finalizeMint(2, {from: accounts[3]})); //can't finalize because admin has been changed
        await expectThrow(timeLockedController.transferChild(trueVND.address, accounts[2], {from: accounts[1]})); //only owner
        await timeLockedController.requestMint(accounts[3], 500000, {from: accounts[2]});
        await timeLockedController.transferChild(trueVND.address, accounts[2], {from: accounts[0]});
        await timeLockedController.transferChild(mintWhiteList.address, accounts[2], {from: accounts[0]});
        await timeLockedController.transferChild(burnWhiteList.address, accounts[2], {from: accounts[0]});
        await timeLockedController.transferChild(blackList.address, accounts[2], {from: accounts[0]});
        await trueVND.claimOwnership({from: accounts[2]});
        await expectThrow(timeLockedController.finalizeMint(4, {from: accounts[2]})); //timeLockedController is no longer the owner of trueVND
        await trueVND.transferOwnership(timeLockedController.address, {from: accounts[2]});
        await timeLockedController.issueClaimOwnership(trueVND.address, {from: accounts[0]});
        for (i = 0; i < blocksDelay; i++) {
            web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
        }
        await timeLockedController.finalizeMint(4, {from: accounts[2]});
        await userHasCoins(3, 540219);
    })
});
