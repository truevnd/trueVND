const AddressList = artifacts.require("AddressList");
const TrueVND = artifacts.require("TrueVND");
const BalanceSheet = artifacts.require("BalanceSheet");
const AllowanceSheet = artifacts.require("AllowanceSheet");

expectThrow = async promise => {
    try {
        await promise;
    } catch (error) {
        return;
    }
    assert.fail('Expected throw not received');
};

function toWei(num) {
    return web3.toWei(num, "ether");
}

function fromWei(num) {
    return web3.fromWei(num, "ether");
}

contract('2_TrueVND_Case', function (accounts) {
    it("should work", async () => {
        let decimals = 18;

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
        await trueVND.changeStaker(accounts[0]);
        await expectThrow(trueVND.mint(accounts[3], 10, {from: accounts[0]})); //user 3 is not (yet) on whitelist
        await expectThrow(mintWhiteList.changeList(accounts[3], true, {from: accounts[1]})); //user 1 is not the owner
        await mintWhiteList.changeList(accounts[3], true, {from: accounts[0]});

        async function userHasCoins(id, amount) {
            var balance = await trueVND.balanceOf(accounts[id]);
            let tvndBalance = fromWei(balance.toNumber());
            console.log("  Balance", accounts[id], "[" + id.toString() + "] =", Number(tvndBalance).toFixed(2).padStart(10), "TVND");
            assert.equal(tvndBalance, amount, "userHasCoins fail: actual balance " + balance);
        }

        await userHasCoins(3, 0);
        await trueVND.mint(accounts[3], toWei(12345), {from: accounts[0]});
        await userHasCoins(3, 12345);
        await userHasCoins(0, 0);
        await trueVND.transfer(accounts[4], toWei(11000), {from: accounts[3]});
        await userHasCoins(0, 5.5);
        await userHasCoins(3, 1345);
        await userHasCoins(4, 11000 - 5.5);
        await trueVND.pause();
        await expectThrow(trueVND.transfer(accounts[5], toWei(5000), {from: accounts[4]}));
        await trueVND.unpause();
        await expectThrow(trueVND.delegateTransfer(accounts[5], toWei(5000), accounts[4], {from: accounts[6]}));
        await trueVND.setDelegatedFrom(accounts[6], {from: accounts[0]});
        await trueVND.delegateTransfer(accounts[5], toWei(5000), accounts[4], {from: accounts[6]});
        await userHasCoins(4, 11000 - 5.5 - 5000);
        await userHasCoins(5, 5000 - 2.5);
        await userHasCoins(0, 5.5 + 2.5);
    });

    it("can change name", async () => {
        const trueVND = await TrueVND.new({gas: 65000000, from: accounts[0]});
        let name = await trueVND.name();
        assert.equal(name, "TrueVND");
        let symbol = await trueVND.symbol();
        assert.equal(symbol, "TVND");
        await trueVND.changeName("FooCoin", "FCN");
        name = await trueVND.name();
        assert.equal(name, "FooCoin");
        symbol = await trueVND.symbol();
        assert.equal(symbol, "FCN");
    })
});
