pragma solidity ^0.4.24;

contract AddressValidation {
    string public name = "AddressValidation";
    mapping(address => bytes32) public keyValidations;

    event ValidateKey(address indexed account, bytes32 indexed message);

    function validateKey(bytes32 _message) public {
        keyValidations[msg.sender] = _message;
        emit ValidateKey(msg.sender, _message);
    }
}
