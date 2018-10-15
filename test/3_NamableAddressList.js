const NamableAddressList = artifacts.require("NamableAddressList");

expectThrow = async promise => {
    try {
        await promise;
    } catch (error) {
        return;
    }
    assert.fail('Expected throw not received');
};

contract('3_NamableAddressList', function (accounts) {
    it("should work", async () => {
        const burnWhiteList = await NamableAddressList.new("Burn whitelist", false, {from: accounts[0]});

        let name = await burnWhiteList.name();
        assert.equal(name, "Burn whitelist", "Got wrong name");
        await expectThrow(burnWhiteList.changeName("fooList", {from: accounts[1]}));
        await burnWhiteList.changeName("fooList", {from: accounts[0]});
        name = await burnWhiteList.name();
        assert.equal(name, "fooList", "Got wrong name");

        let canBurn = await burnWhiteList.onList(accounts[0]);
        assert.equal(canBurn, false, "User should not be on white list");

        await burnWhiteList.changeList(accounts[0], true);
        canBurn = await burnWhiteList.onList(accounts[0]);
        assert.equal(canBurn, true, "User should be on white list");
    })
});
