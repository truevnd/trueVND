# TrueVND

This repository contains the TrueVND ERC20 contract and related contracts.

## TrueVND.sol

TrueVND.sol is the main ERC20 contract. It inherits the following from
[TrueUSD](https://github.com/trusttoken/trueusd)'s open source fiat-based stable coin contracts:
 1. Standard ERC20 functionality
 2. Burning tokens
 3. Pausing all ERC20 functionality in an emergency
 4. Transferring ownership of the contract

Additionally, it adds the following features:

### Whitelists

In order to deposit VND and receive newly minted TrueVND, or to burn TrueVND to redeem it for VND, users must first get onto the corresponding whitelists (AddressList.sol) by going through a KYC process (which includes proving they control their ethereum address using AddressValidation.sol).

### Blacklist

Addresses can also be blacklisted, preventing them from sending or receiving TrueVND.
This can be used to prevent the use of TrueVND by bad actors in accordance with law enforcement.
The blacklist will only be used in accordance with the [TrueVND Terms of Use](https://truevnd.com/terms-of-use).

### Delegation to a new contract

If TrueVND.sol ever needs to be upgraded, the new contract will implement the interface from DelegateERC20.sol and will be stored in the 'delegate' address of the TrueVND contract. This allows all TrueVND ERC20 calls to be forwarded to the new contract, to allow for a seamless transition for exchanges and other services that may choose to keep using the old contract.

## TimeLockedController.sol

This contract allows us to split ownership of the TrueVND contract into two addresses. One, called the "owner" address, has unfettered control of the TrueVND contract -
it can mint new tokens, transfer ownership of the contract, etc.
However to make extra sure that TrueVND is never compromised, this owner key will not be used in day-to-day operations, allowing it to be stored at a heightened level of security.
Instead, the owner appoints an "admin" address. The admin can do most things the owner can do, and will be used in every-day operation.
However, for critical operations like minting new tokens or transferring the contract, the admin can only perform these operations by calling a pair of functions - e.g. `requestMint` and `finalizeMint` - with (roughly) 24 hours in between the two calls.
This allows us to watch the blockchain and if we discover the admin has been compromised and there are unauthorized operations underway, we can use the owner key to cancel those operations and replace the admin.

## AddressList.sol / AddressValidation.sol

See "Whitelists" and "Blacklist" above.

## DelegateERC20.sol

See "Delegation to a new contract" above.
