pragma solidity ^0.4.24;

import "../openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "../openzeppelin-solidity/contracts/ownership/HasNoTokens.sol";
import "../openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "../openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./TrueVND.sol";
import "./NamableAddressList.sol";

// The TimeLockedController contract is intended to be the initial Owner of the TrueVND
// contract and TrueVND's AddressLists. It splits ownership into two accounts: an "admin" account and an
// "owner" account. The admin of TimeLockedController can initiate minting TrueVND.
// However, these transactions must be stored for ~1 day's worth of blocks first before they can be forwarded to the
// TrueVND contract. In the event that the admin account is compromised, this setup allows the owner of TimeLockedController
// (which can be stored extremely securely since it is never used in normal operation) to replace the admin.
// Once a day has passed, requests can be finalized by the admin.
// Requests initiated by an admin that has since been deposed cannot be finalized.
// The admin is also able to update TrueVND's AddressLists (without a day's delay).
// The owner can mint without the day's delay, and also change other aspects of TrueVND like the staking fees.
contract TimeLockedController is HasNoEther, HasNoTokens, Claimable {
    using SafeMath for uint256;

    uint public constant blocksDelay = 24 * 60 * 60 / 15; // 5760 blocks

    struct MintOperation {
        address to;
        uint256 amount;
        address admin;
        uint deferBlock;
    }

    address public admin;
    TrueVND public trueVND;
    MintOperation[] public mintOperations;

    modifier onlyAdminOrOwner() {
        require(msg.sender == admin || msg.sender == owner);
        _;
    }

    event MintOperationEvent(address indexed _to, uint256 amount, uint deferBlock, uint opIndex);
    event TransferChildEvent(address indexed _child, address indexed _newOwner);
    event ReclaimEvent(address indexed other);
    event ChangeBurnBoundsEvent(uint newMin, uint newMax);
    event WipedAccount(address indexed account);
    event ChangeStakingFeesEvent(uint80 _transferFeeNumerator,
        uint80 _transferFeeDenominator,
        uint80 _mintFeeNumerator,
        uint80 _mintFeeDenominator,
        uint256 _mintFeeFlat,
        uint80 _burnFeeNumerator,
        uint80 _burnFeeDenominator,
        uint256 _burnFeeFlat);
    event ChangeStakerEvent(address newStaker);
    event DelegateEvent(DelegateERC20 delegate);
    event SetDelegatedFromEvent(address source);
    event ChangeTrueVNDEvent(TrueVND newContract);
    event ChangeNameEvent(string name, string symbol);
    event AdminshipTransferred(address indexed previousAdmin, address indexed newAdmin);

    // admin initiates a request to mint _amount TrueVND for account _to
    function requestMint(address _to, uint256 _amount) public onlyAdminOrOwner {
        uint deferBlock = block.number;
        if (msg.sender != owner) {
            deferBlock = deferBlock.add(blocksDelay);
        }
        MintOperation memory op = MintOperation(_to, _amount, admin, deferBlock);
        emit MintOperationEvent(_to, _amount, deferBlock, mintOperations.length);
        mintOperations.push(op);
    }

    // after a day, admin finalizes mint request by providing the
    // index of the request (visible in the MintOperationEvent accompanying the original request)
    function finalizeMint(uint index) public onlyAdminOrOwner {
        MintOperation memory op = mintOperations[index];
        require(op.admin == admin);
        //checks that the requester's adminship has not been revoked
        require(op.deferBlock <= block.number);
        //checks that enough time has elapsed
        address to = op.to;
        uint256 amount = op.amount;
        delete mintOperations[index];
        trueVND.mint(to, amount);
    }

    // Transfer ownership of _child to _newOwner
    // Can be used e.g. to upgrade this TimeLockedController contract.
    function transferChild(Ownable _child, address _newOwner) public onlyOwner {
        emit TransferChildEvent(_child, _newOwner);
        _child.transferOwnership(_newOwner);
    }

    // Transfer ownership of a contract from trueVND
    // to this TimeLockedController. Can be used e.g. to reclaim balance sheet
    // in order to transfer it to an upgraded TrueVND contract.
    function requestReclaim(Ownable other) public onlyOwner {
        emit ReclaimEvent(other);
        trueVND.reclaimContract(other);
    }

    // Change the minimum and maximum amounts that TrueVND users can
    // burn to newMin and newMax
    function changeBurnBounds(uint newMin, uint newMax) public onlyOwner {
        emit ChangeBurnBoundsEvent(newMin, newMax);
        trueVND.changeBurnBounds(newMin, newMax);
    }

    function wipeBlacklistedAccount(address account) public onlyOwner {
        emit WipedAccount(account);
        trueVND.wipeBlacklistedAccount(account);
    }

    // Change the transaction fees charged on transfer/mint/burn
    function changeStakingFees(uint80 _transferFeeNumerator,
        uint80 _transferFeeDenominator,
        uint80 _mintFeeNumerator,
        uint80 _mintFeeDenominator,
        uint256 _mintFeeFlat,
        uint80 _burnFeeNumerator,
        uint80 _burnFeeDenominator,
        uint256 _burnFeeFlat) public onlyOwner {
        emit ChangeStakingFeesEvent(_transferFeeNumerator,
            _transferFeeDenominator,
            _mintFeeNumerator,
            _mintFeeDenominator,
            _mintFeeFlat,
            _burnFeeNumerator,
            _burnFeeDenominator,
            _burnFeeFlat);
        trueVND.changeStakingFees(_transferFeeNumerator,
            _transferFeeDenominator,
            _mintFeeNumerator,
            _mintFeeDenominator,
            _mintFeeFlat,
            _burnFeeNumerator,
            _burnFeeDenominator,
            _burnFeeFlat);
    }

    // Change the recipient of staking fees to newStaker
    function changeStaker(address newStaker) public onlyOwner {
        emit ChangeStakerEvent(newStaker);
        trueVND.changeStaker(newStaker);
    }

    // Future ERC20 calls to trueVND be delegated to _delegate
    function delegateToNewContract(DelegateERC20 delegate) public onlyOwner {
        emit DelegateEvent(delegate);
        trueVND.delegateToNewContract(delegate);
    }

    // Incoming delegate* calls from _source will be accepted by trueVND
    function setDelegatedFrom(address _source) public onlyOwner {
        emit SetDelegatedFromEvent(_source);
        trueVND.setDelegatedFrom(_source);
    }

    // Update this contract's trueVND pointer to newContract (e.g. if the
    // contract is upgraded)
    function setTrueVND(TrueVND newContract) public onlyOwner {
        emit ChangeTrueVNDEvent(newContract);
        trueVND = newContract;
    }

    // change trueVND's name and symbol
    function changeName(string name, string symbol) public onlyOwner {
        emit ChangeNameEvent(name, symbol);
        trueVND.changeName(name, symbol);
    }

    // Replace the current admin with newAdmin
    function transferAdminship(address newAdmin) public onlyOwner {
        emit AdminshipTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // Swap out TrueVND's address lists
    function setLists(AddressList _canReceiveMintWhiteList, AddressList _canBurnWhiteList, AddressList _blackList, AddressList _noFeesList) onlyOwner public {
        trueVND.setLists(_canReceiveMintWhiteList, _canBurnWhiteList, _blackList, _noFeesList);
    }

    // Update a whitelist/blacklist
    function updateList(address list, address entry, bool flag) public onlyAdminOrOwner {
        AddressList(list).changeList(entry, flag);
    }

    // Rename a whitelist/blacklist
    function renameList(address list, string name) public onlyAdminOrOwner {
        NamableAddressList(list).changeName(name);
    }

    // Claim ownership of an arbitrary Claimable contract
    function issueClaimOwnership(address _other) public onlyAdminOrOwner {
        Claimable other = Claimable(_other);
        other.claimOwnership();
    }
}
