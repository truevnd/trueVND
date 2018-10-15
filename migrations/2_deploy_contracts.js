var AddressValidation = artifacts.require("AddressValidation");
var AllowanceSheet = artifacts.require("AllowanceSheet");
var BalanceSheet = artifacts.require("BalanceSheet");
var NamableAddressList = artifacts.require("NamableAddressList");
var TimeLockedController = artifacts.require("TimeLockedController");
var TrueVND = artifacts.require("TrueVND");

module.exports = async function (deployer) {
    await deployer;

    // const addressValidation = AddressValidation.at("0x42Af5f733e8ecE22063FD516a5f1b246D6923eC0")
    // const mintWhiteList = NamableAddressList.at("0xf2ec422d6eeb805eff207b1e358947cbd73b129d")
    // const canBurnWhiteList = NamableAddressList.at("0x844De59c9A8D428283923fb752002fafe2aa694a")
    // const blackList = NamableAddressList.at("0xf5de41317a8fde99108e2fa2d26822bebad1427e")
    // const noFeesList = NamableAddressList.at("0x9f59b4f7d3bd00caa85e61c57761768291155084")
    // const balances = BalanceSheet.at("0x6dea55ba04a37fddd05e1fd979c30aa0e634e837")
    // const allowances = AllowanceSheet.at("0x811c5f8dfbdd70c245e66e4cd181040b2630424a")
    // const trueVND = TrueVND.at("0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E")
    // const timeLockedController = TimeLockedController.at("0x9978d2d229a69b3aef93420d132ab22b44e3578f")

    /*******************************************************************/
    console.log("\nCREATE THE SMALL CONTRACTS THAT TRUEVND DEPENDS ON...");

    let account0 = "disclose";
    let account1 = "disclose";
    let account2 = "disclose";
    let account19 = "disclose";

    const addressValidation = await AddressValidation.new({from: account0});
    console.log("... addressValidation Address:", addressValidation.address);

    const mintWhiteList = await NamableAddressList.new("mintWhiteList", false, {from: account0});
    console.log("... mintWhiteList Address:", mintWhiteList.address);

    const canBurnWhiteList = await NamableAddressList.new("canBurnWhiteList", false, {from: account0});
    console.log("... canBurnWhiteList Address:", canBurnWhiteList.address);

    const blackList = await NamableAddressList.new("blackList", true, {from: account0});
    console.log("... blackList Address:", blackList.address);

    const noFeesList = await NamableAddressList.new("noFeesList", false, {from: account0});
    console.log("... noFeesList Address:", noFeesList.address);

    const balances = await BalanceSheet.new({from: account0});
    console.log("... balanceSheet Address:", balances.address);

    const allowances = await AllowanceSheet.new({from: account0});
    console.log("... allowanceSheet Address:", allowances.address);

    /*******************************************************************/
    console.log("\nCREATE AND CONFIGURE TRUEVND...");
    const trueVND = await TrueVND.new({from: account0});
    console.log("... trueVND Address:", trueVND.address);
    console.log("... transfering [balances] ownership to trueVND:", trueVND.address);
    await balances.transferOwnership(trueVND.address);
    console.log("... transfering [allowances] ownership to trueVND:", trueVND.address);
    await allowances.transferOwnership(trueVND.address);
    console.log("... setting trueVND's BalanceSheet address to:", balances.address);
    await trueVND.setBalanceSheet(balances.address);
    console.log("... setting trueVND's AllowanceSheet address to:", allowances.address);
    await trueVND.setAllowanceSheet(allowances.address);
    console.log("... setting trueVND's mintWhiteList address to:", mintWhiteList.address);
    console.log("... setting trueVND's canBurnWhiteList address to:", canBurnWhiteList.address);
    console.log("... setting trueVND's blackList address to:", blackList.address);
    console.log("... setting trueVND's noFeesList address to:", noFeesList.address);
    await trueVND.setLists(mintWhiteList.address, canBurnWhiteList.address, blackList.address, noFeesList.address);
    let stakerAccount = account1;
    console.log("... changing staker account to:", stakerAccount);
    await trueVND.changeStaker(stakerAccount);

    /*******************************************************************/
    console.log("\nCREATE TIMELOCKEDCONTROLLER AND TRANSFER OWNERSHIP OF OTHER CONTRACTS TO IT...");
    const timeLockedController = await TimeLockedController.new();
    console.log("... timeLockedController Address:", timeLockedController.address);

    console.log("... transfering [mintWhiteList] ownership to timeLockedController:", timeLockedController.address);
    await mintWhiteList.transferOwnership(timeLockedController.address);
    console.log("... timeLockedController claiming [mintWhiteList] ownership of:", mintWhiteList.address);
    await timeLockedController.issueClaimOwnership(mintWhiteList.address);

    console.log("... transfering [canBurnWhiteList] ownership to timeLockedController:", timeLockedController.address);
    await canBurnWhiteList.transferOwnership(timeLockedController.address);
    console.log("... timeLockedController claiming [canBurnWhiteList] ownership of:", canBurnWhiteList.address);
    await timeLockedController.issueClaimOwnership(canBurnWhiteList.address);

    console.log("... transfering [blackList] ownership to timeLockedController:", timeLockedController.address);
    await blackList.transferOwnership(timeLockedController.address);
    console.log("... timeLockedController claiming [blackList] ownership of:", blackList.address);
    await timeLockedController.issueClaimOwnership(blackList.address);

    console.log("... transfering [noFeesList] ownership to timeLockedController:", timeLockedController.address);
    await noFeesList.transferOwnership(timeLockedController.address);
    console.log("... timeLockedController claiming [noFeesList] ownership of:", noFeesList.address);
    await timeLockedController.issueClaimOwnership(noFeesList.address);

    console.log("... transfering [trueVND] ownership to timeLockedController:", timeLockedController.address);
    await trueVND.transferOwnership(timeLockedController.address);
    console.log("... timeLockedController claiming [trueVND] ownership of:", trueVND.address);
    await timeLockedController.issueClaimOwnership(trueVND.address);

    console.log("... setting timeLockedController's TrueVND contract to:", trueVND.address);
    await timeLockedController.setTrueVND(trueVND.address);

    /*******************************************************************/
    console.log("\nTRANSFER ADMIN/OWNERSHIP OF TIMELOCKEDCONTROLLER...");
    let adminAccount = account2;
    let ownerAccount = account19;

    console.log("... setting [timeLockedController]'s admin to:", adminAccount);
    await timeLockedController.transferAdminship(adminAccount);

    console.log("... transfering [timeLockedController] ownership to:", ownerAccount);
    await timeLockedController.transferOwnership(ownerAccount);
    console.log("... [timeLockedController]'s owner:", await timeLockedController.getOwner());

    await timeLockedController.transferOwnership(account0);
    console.log("... [timeLockedController]'s owner:", await timeLockedController.getOwner());

    /*******************************************************************/
    console.log("\nDEPLOYMENT SUCCESSFUL");
};
