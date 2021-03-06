pragma solidity ^0.4.24;

import "../openzeppelin-solidity/contracts/ownership/Claimable.sol";

contract AddressList is Claimable {
    string public name;
    mapping(address => bool) public onList;

    constructor(string _name, bool nullValue) public {
        name = _name;
        onList[0x0] = nullValue;
    }

    event ChangeWhiteList(address indexed to, bool onList);

    // Set whether _to is on the list or not. Whether 0x0 is on the list
    // or not cannot be set here - it is set once and for all by the constructor.
    function changeList(address _to, bool _onList) onlyOwner public {
        require(_to != 0x0);
        if (onList[_to] != _onList) {
            onList[_to] = _onList;
            emit ChangeWhiteList(_to, _onList);
        }
    }
}
